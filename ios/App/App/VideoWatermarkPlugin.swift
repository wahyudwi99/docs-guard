import Foundation
import Capacitor
import AVFoundation
import UIKit

@objc(VideoWatermarkPlugin)
public class VideoWatermarkPlugin: CAPPlugin {

    @objc func addTextWatermark(_ call: CAPPluginCall) {
        guard let videoUriString = call.getString("videoUri"),
              let text = call.getString("text") else {
            call.reject("Missing required parameters: videoUri or text")
            return
        }
        
        let sanitizedUri = videoUriString.replacingOccurrences(of: "file://", with: "")
        let videoURL = URL(fileURLWithPath: sanitizedUri)
        let asset = AVAsset(url: videoURL)
        
        let colorHex = call.getString("colorHex") ?? "#FFFFFF"
        let fontSize = CGFloat(call.getFloat("fontSize") ?? 40.0)
        let opacity = CGFloat(call.getFloat("opacity") ?? 0.5)
        let layout = call.getString("layout") ?? "single"

        Task {
            do {
                let videoTracks = try await asset.loadTracks(withMediaType: .video)
                guard let assetVideoTrack = videoTracks.first else {
                    call.reject("No video track found")
                    return
                }
                
                let naturalSize = try await assetVideoTrack.load(.naturalSize)
                let preferredTransform = try await assetVideoTrack.load(.preferredTransform)
                let renderSize = naturalSize.applying(preferredTransform)
                let absSize = CGSize(width: abs(renderSize.width), height: abs(renderSize.height))
                
                let composition = AVMutableComposition()
                guard let compositionVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
                    call.reject("Could not create composition track")
                    return
                }
                
                let timeRange = CMTimeRange(start: .zero, duration: try await asset.load(.duration))
                try compositionVideoTrack.insertTimeRange(timeRange, of: assetVideoTrack, at: .zero)
                
                if let assetAudioTrack = try await asset.loadTracks(withMediaType: .audio).first,
                   let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
                    try compositionAudioTrack.insertTimeRange(timeRange, of: assetAudioTrack, at: .zero)
                }
                
                let videoLayer = CALayer()
                videoLayer.frame = CGRect(origin: .zero, size: absSize)
                
                let parentLayer = CALayer()
                parentLayer.frame = CGRect(origin: .zero, size: absSize)
                parentLayer.addSublayer(videoLayer)
                
                let watermarkLayer = CALayer()
                watermarkLayer.frame = CGRect(origin: .zero, size: absSize)
                
                let textColor = self.hexToColor(colorHex).withAlphaComponent(opacity)
                
                if layout == "tiled" {
                    let cols = 4
                    let rows = 8
                    let cellWidth = absSize.width / CGFloat(cols)
                    let cellHeight = absSize.height / CGFloat(rows)
                    for r in 0..<rows {
                        for c in 0..<cols {
                            let textLayer = CATextLayer()
                            textLayer.string = text
                            textLayer.fontSize = fontSize
                            textLayer.foregroundColor = textColor.cgColor
                            textLayer.alignmentMode = .center
                            textLayer.contentsScale = 2.0
                            let x = CGFloat(c) * cellWidth
                            let y = CGFloat(r) * cellHeight
                            textLayer.frame = CGRect(x: x, y: y, width: cellWidth, height: cellHeight)
                            textLayer.transform = CATransform3DMakeRotation(-CGFloat.pi / 4, 0, 0, 1)
                            watermarkLayer.addSublayer(textLayer)
                        }
                    }
                } else {
                    let textLayer = CATextLayer()
                    textLayer.string = text
                    textLayer.fontSize = fontSize * 1.5
                    textLayer.foregroundColor = textColor.cgColor
                    textLayer.alignmentMode = .center
                    textLayer.contentsScale = 2.0
                    let labelWidth = absSize.width * 0.8
                    let labelHeight = fontSize * 3
                    textLayer.frame = CGRect(x: (absSize.width - labelWidth) / 2, y: (absSize.height - labelHeight) / 2, width: labelWidth, height: labelHeight)
                    watermarkLayer.addSublayer(textLayer)
                }
                
                parentLayer.addSublayer(watermarkLayer)
                
                let videoComposition = AVMutableVideoComposition()
                videoComposition.renderSize = absSize
                videoComposition.frameDuration = try await assetVideoTrack.load(.minFrameDuration)
                videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
                
                let instruction = AVMutableVideoCompositionInstruction()
                instruction.timeRange = timeRange
                let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
                layerInstruction.setTransform(preferredTransform, at: .zero)
                instruction.layerInstructions = [layerInstruction]
                videoComposition.instructions = [instruction]
                
                let outputURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("watermarked_\(UUID().uuidString).mp4")
                
                guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
                    call.reject("Could not create export session")
                    return
                }
                
                exportSession.videoComposition = videoComposition
                exportSession.outputURL = outputURL
                exportSession.outputFileType = .mp4
                exportSession.shouldOptimizeForNetworkUse = true
                
                await exportSession.export()
                
                switch exportSession.status {
                case .completed:
                    call.resolve(["uri": outputURL.absoluteString])
                case .failed:
                    call.reject("Export failed: \(exportSession.error?.localizedDescription ?? "Unknown error")")
                default:
                    call.reject("Export ended with status: \(exportSession.status.rawValue)")
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private func hexToColor(_ hex: String) -> UIColor {
        var cString: String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
        if cString.count != 6 { return UIColor.white }
        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)
        return UIColor(red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0, green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0, blue: CGFloat(rgbValue & 0x0000FF) / 255.0, alpha: 1.0)
    }
}
