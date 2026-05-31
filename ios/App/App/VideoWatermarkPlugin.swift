import Foundation
import Capacitor
import AVFoundation
import CoreImage

@objc(VideoWatermarkPlugin)
public class VideoWatermarkPlugin: CAPPlugin {
    
    @objc func ping(_ call: CAPPluginCall) {
        call.resolve(["value": "pong"])
    }
    
    @objc func addTextWatermark(_ call: CAPPluginCall) {
        guard let videoUri = call.getString("videoUri"),
              let text = call.getString("text") else {
            call.reject("Must provide videoUri and text")
            return
        }
        
        let colorHex = call.getString("colorHex") ?? "#FFFFFF"
        let opacity = call.getFloat("opacity") ?? 0.5
        let layout = call.getString("layout") ?? "tiled"
        let fontSizeMultiplier = call.getFloat("fontSize") ?? 40.0
        
        guard let url = URL(string: videoUri) else {
            call.reject("Invalid video URL")
            return
        }
        
        let asset = AVURLAsset(url: url)
        
        let mixComposition = AVMutableComposition()
        guard let compositionVideoTrack = mixComposition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let videoTrack = asset.tracks(withMediaType: .video).first else {
            call.reject("Failed to create video track")
            return
        }
        
        do {
            try compositionVideoTrack.insertTimeRange(CMTimeRangeMake(start: .zero, duration: asset.duration), of: videoTrack, at: .zero)
            compositionVideoTrack.preferredTransform = videoTrack.preferredTransform
            
            // Handle Audio if exists
            if let audioTrack = asset.tracks(withMediaType: .audio).first,
               let compositionAudioTrack = mixComposition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
                try compositionAudioTrack.insertTimeRange(CMTimeRangeMake(start: .zero, duration: asset.duration), of: audioTrack, at: .zero)
            }
        } catch {
            call.reject("Error assembling composition: \(error.localizedDescription)")
            return
        }
        
        let videoSize = videoTrack.naturalSize
        let isPortrait = videoTrack.preferredTransform.a == 0 && videoTrack.preferredTransform.d == 0
        let renderSize = isPortrait ? CGSize(width: videoSize.height, height: videoSize.width) : videoSize
        
        let videoLayerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
        videoLayerInstruction.setTransform(videoTrack.preferredTransform, at: .zero)
        
        let videoCompositionInstruction = AVMutableVideoCompositionInstruction()
        videoCompositionInstruction.timeRange = CMTimeRangeMake(start: .zero, duration: asset.duration)
        videoCompositionInstruction.layerInstructions = [videoLayerInstruction]
        
        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = renderSize
        videoComposition.frameDuration = CMTimeMake(value: 1, timescale: 30) // Fallback FPS
        // Use nominal frame rate if available and reasonable
        if videoTrack.nominalFrameRate > 0 {
            videoComposition.frameDuration = CMTimeMake(value: 1, timescale: Int32(videoTrack.nominalFrameRate))
        }
        videoComposition.instructions = [videoCompositionInstruction]
        
        // --- ADDING WATERMARK LAYER ---
        let backgroundLayer = CALayer()
        backgroundLayer.frame = CGRect(origin: .zero, size: renderSize)
        
        let videoLayer = CALayer()
        videoLayer.frame = CGRect(origin: .zero, size: renderSize)
        backgroundLayer.addSublayer(videoLayer)
        
        let overlayLayer = CALayer()
        overlayLayer.frame = CGRect(origin: .zero, size: renderSize)
        
        // Calculate font size based on video width for responsiveness
        let calculatedFontSize = CGFloat(renderSize.width / 800.0) * CGFloat(fontSizeMultiplier)
        
        let color = hexStringToUIColor(hex: colorHex).withAlphaComponent(CGFloat(opacity))
        
        if layout == "single" {
            let textLayer = createTextLayer(text: text, fontSize: calculatedFontSize, color: color, renderSize: renderSize)
            textLayer.position = CGPoint(x: renderSize.width / 2, y: renderSize.height / 2)
            // Diagonal rotation
            textLayer.transform = CATransform3DMakeRotation(-CGFloat.pi / 4, 0, 0, 1)
            overlayLayer.addSublayer(textLayer)
        } else {
            // Tiled layout
            let stepX: CGFloat = renderSize.width / 2.5
            let stepY: CGFloat = renderSize.height / 3.0
            
            for x in stride(from: -renderSize.width, to: renderSize.width * 2, by: stepX) {
                for y in stride(from: -renderSize.height, to: renderSize.height * 2, by: stepY) {
                    let textLayer = createTextLayer(text: text, fontSize: calculatedFontSize, color: color, renderSize: renderSize)
                    textLayer.position = CGPoint(x: x, y: y)
                    textLayer.transform = CATransform3DMakeRotation(-CGFloat.pi / 4, 0, 0, 1)
                    overlayLayer.addSublayer(textLayer)
                }
            }
        }
        
        backgroundLayer.addSublayer(overlayLayer)
        
        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: backgroundLayer)
        
        // --- EXPORTING ---
        let outputURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("docsguard_export_\(UUID().uuidString).mp4")
        
        guard let exporter = AVAssetExportSession(asset: mixComposition, presetName: AVAssetExportPresetHighestQuality) else {
            call.reject("Cannot create exporter")
            return
        }
        
        exporter.videoComposition = videoComposition
        exporter.outputURL = outputURL
        exporter.outputFileType = .mp4
        exporter.shouldOptimizeForNetworkUse = true
        
        exporter.exportAsynchronously {
            DispatchQueue.main.async {
                switch exporter.status {
                case .completed:
                    call.resolve(["uri": outputURL.absoluteString])
                case .failed:
                    call.reject("Export failed: \(exporter.error?.localizedDescription ?? "unknown error")")
                case .cancelled:
                    call.reject("Export cancelled")
                default:
                    call.reject("Export ended with status \(exporter.status.rawValue)")
                }
            }
        }
    }
    
    // Helper to create text layer
    private func createTextLayer(text: String, fontSize: CGFloat, color: UIColor, renderSize: CGSize) -> CATextLayer {
        let textLayer = CATextLayer()
        textLayer.string = text
        textLayer.fontSize = fontSize
        textLayer.font = UIFont.boldSystemFont(ofSize: fontSize)
        textLayer.foregroundColor = color.cgColor
        textLayer.alignmentMode = .center
        // Estimate bounds
        textLayer.bounds = CGRect(x: 0, y: 0, width: renderSize.width * 2, height: fontSize * 2)
        // Better quality
        textLayer.contentsScale = UIScreen.main.scale
        return textLayer
    }
    
    // Helper for hex color
    private func hexStringToUIColor(hex: String) -> UIColor {
        var cString:String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()

        if (cString.hasPrefix("#")) {
            cString.remove(at: cString.startIndex)
        }

        if ((cString.count) != 6) {
            return UIColor.gray
        }

        var rgbValue:UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)

        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: CGFloat(1.0)
        )
    }
}
