import Foundation
import Capacitor
import AVFoundation
import UIKit

@objc(VideoWatermarkPlugin)
public class VideoWatermarkPlugin: CAPPlugin {

    @objc func addTextWatermark(_ call: CAPPluginCall) {
        guard let videoUriString = call.getString("videoUri"),
              let text = call.getString("text"),
              let videoURL = URL(string: videoUriString) else {
            call.reject("Missing required parameters: videoUri or text")
            return
        }

        let colorHex = call.getString("colorHex") ?? "#FFFFFF"
        let fontSize = CGFloat(call.getFloat("fontSize") ?? 40.0)
        let opacity = CGFloat(call.getFloat("opacity") ?? 0.5)
        let layout = call.getString("layout") ?? "single"

        let asset = AVAsset(url: videoURL)
        
        // Setup composition
        let composition = AVMutableComposition()
        guard let compositionVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let assetVideoTrack = asset.tracks(withMediaType: .video).first else {
            call.reject("Could not create video track")
            return
        }
        
        do {
            try compositionVideoTrack.insertTimeRange(CMTimeRangeMake(start: .zero, duration: asset.duration), of: assetVideoTrack, at: .zero)
        } catch {
            call.reject("Failed to insert video track: \(error.localizedDescription)")
            return
        }
        
        // Handle audio if present
        if let assetAudioTrack = asset.tracks(withMediaType: .audio).first,
           let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
            do {
                try compositionAudioTrack.insertTimeRange(CMTimeRangeMake(start: .zero, duration: asset.duration), of: assetAudioTrack, at: .zero)
            } catch {
                print("Failed to insert audio track (continuing without audio): \(error.localizedDescription)")
            }
        }

        let videoSize = assetVideoTrack.naturalSize.applying(assetVideoTrack.preferredTransform)
        let renderSize = CGSize(width: abs(videoSize.width), height: abs(videoSize.height))
        
        // Create watermark layer
        let parentLayer = CALayer()
        let videoLayer = CALayer()
        parentLayer.frame = CGRect(origin: .zero, size: renderSize)
        videoLayer.frame = CGRect(origin: .zero, size: renderSize)
        parentLayer.addSublayer(videoLayer)
        
        let watermarkLayer = CALayer()
        watermarkLayer.frame = CGRect(origin: .zero, size: renderSize)
        
        let textColor = self.hexToColor(colorHex).withAlphaComponent(opacity)
        
        if layout == "tiled" {
            // Tiled layout: create a pattern or multiple labels
            let cols = 4
            let rows = 8
            let cellWidth = renderSize.width / CGFloat(cols)
            let cellHeight = renderSize.height / CGFloat(rows)
            
            for r in 0..<rows {
                for c in 0..<cols {
                    let textLayer = CATextLayer()
                    textLayer.string = text
                    textLayer.fontSize = fontSize
                    textLayer.foregroundColor = textColor.cgColor
                    textLayer.alignmentMode = .center
                    textLayer.opacity = Float(opacity)
                    
                    // Rotate and position
                    let x = CGFloat(c) * cellWidth
                    let y = CGFloat(r) * cellHeight
                    textLayer.frame = CGRect(x: x, y: y, width: cellWidth, height: cellHeight)
                    
                    // Add a slight rotation for style
                    textLayer.transform = CATransform3DMakeRotation(-CGFloat.pi / 4, 0, 0, 1)
                    
                    watermarkLayer.addSublayer(textLayer)
                }
            }
        } else {
            // Single layout: center
            let textLayer = CATextLayer()
            textLayer.string = text
            textLayer.fontSize = fontSize * 1.5
            textLayer.foregroundColor = textColor.cgColor
            textLayer.alignmentMode = .center
            textLayer.opacity = Float(opacity)
            
            let labelWidth = renderSize.width * 0.8
            let labelHeight = fontSize * 3
            textLayer.frame = CGRect(x: (renderSize.width - labelWidth) / 2,
                                     y: (renderSize.height - labelHeight) / 2,
                                     width: labelWidth,
                                     height: labelHeight)
            
            watermarkLayer.addSublayer(textLayer)
        }
        
        parentLayer.addSublayer(watermarkLayer)
        
        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = renderSize
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
        
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRangeMake(start: .zero, duration: asset.duration)
        
        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
        layerInstruction.setTransform(assetVideoTrack.preferredTransform, at: .zero)
        instruction.layerInstructions = [layerInstruction]
        videoComposition.instructions = [instruction]
        
        // Export
        let outputURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("watermarked_\(UUID().uuidString).mp4")
        
        guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            call.reject("Could not create export session")
            return
        }
        
        exportSession.videoComposition = videoComposition
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        exportSession.shouldOptimizeForNetworkUse = true
        
        exportSession.exportAsynchronously {
            switch exportSession.status {
            case .completed:
                call.resolve(["uri": outputURL.absoluteString])
            case .failed:
                call.reject("Export failed: \(exportSession.error?.localizedDescription ?? "Unknown error")")
            case .cancelled:
                call.reject("Export cancelled")
            default:
                call.reject("Export status unknown: \(exportSession.status.rawValue)")
            }
        }
    }
    
    private func hexToColor(_ hex: String) -> UIColor {
        var cString: String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()

        if cString.hasPrefix("#") {
            cString.remove(at: cString.startIndex)
        }

        if cString.count != 6 {
            return UIColor.white
        }

        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)

        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: CGFloat(1.0)
        )
    }
}
