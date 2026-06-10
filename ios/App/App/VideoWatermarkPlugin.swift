import Foundation
import Capacitor
import AVFoundation
import CoreMedia
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
                let outputURL = try await self.processVideo(asset: asset, text: text, colorHex: colorHex, fontSize: fontSize, opacity: opacity, layout: layout)
                call.resolve(["uri": outputURL.absoluteString])
            } catch {
                call.reject("Video processing failed: \(error.localizedDescription)")
            }
        }
    }

    private func processVideo(asset: AVAsset, text: String, colorHex: String, fontSize: CGFloat, opacity: CGFloat, layout: String) async throws -> URL {
        guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
            throw NSError(domain: "VideoWatermark", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
        }
        
        let size = try await videoTrack.load(.naturalSize)
        let transform = try await videoTrack.load(.preferredTransform)
        let videoSize = size.applying(transform)
        let renderSize = CGSize(width: abs(videoSize.width), height: abs(videoSize.height))
        
        let outputURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("watermarked_\(UUID().uuidString).mp4")
        if FileManager.default.fileExists(atPath: outputURL.path) {
            try? FileManager.default.removeItem(at: outputURL)
        }

        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
        
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: renderSize.width,
            AVVideoHeightKey: renderSize.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 6_000_000, // Balanced for 1080p60
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoExpectedSourceFrameRateKey: 60
            ]
        ]
        
        let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        writerInput.expectsMediaDataInRealTime = false
        writerInput.transform = transform
        
        let pixelBufferAttributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: renderSize.width,
            kCVPixelBufferHeightKey as String: renderSize.height,
            kCVPixelBufferIOSurfacePropertiesKey as String: [:]
        ]
        
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: pixelBufferAttributes)
        writer.add(writerInput)
        
        // Audio track setup
        var audioReader: AVAssetReader?
        var audioWriterInput: AVAssetWriterInput?
        if let audioTrack = try await asset.loadTracks(withMediaType: .audio).first {
            let aReader = try AVAssetReader(asset: asset)
            let aOutput = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: nil)
            aReader.add(aOutput)
            audioReader = aReader
            
            audioWriterInput = AVAssetWriterInput(mediaType: .audio, outputSettings: nil)
            audioWriterInput?.expectsMediaDataInRealTime = false
            writer.add(audioWriterInput!)
        }
        
        let reader = try AVAssetReader(asset: asset)
        let videoOutput = AVAssetReaderTrackOutput(track: videoTrack, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
        reader.add(videoOutput)
        
        writer.startWriting()
        writer.startSession(atSourceTime: .zero)
        reader.startReading()
        
        let textColor = self.hexToColor(colorHex).withAlphaComponent(opacity)
        let watermarkLayer = self.createWatermarkLayer(text: text, size: renderSize, color: textColor, fontSize: fontSize, layout: layout)
        let ciContext = CIContext(options: nil)

        return try await withCheckedThrowingContinuation { continuation in
            let group = DispatchGroup()
            
            group.enter()
            writerInput.requestMediaDataWhenReady(on: DispatchQueue(label: "videoExport", qos: .userInitiated)) {
                while writerInput.isReadyForMoreMediaData {
                    autoreleasepool {
                        if let sampleBuffer = videoOutput.copyNextSampleBuffer() {
                            let presentationTime = sampleBuffer.presentationTimeStamp
                            guard let pixelBuffer = sampleBuffer.imageBuffer else { return }
                            
                            var newPixelBuffer: CVPixelBuffer?
                            let status = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, adaptor.pixelBufferPool!, &newPixelBuffer)
                            
                            if status == kCVReturnSuccess, let nb = newPixelBuffer {
                                let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
                                ciContext.render(ciImage, to: nb)
                                
                                CVPixelBufferLockBaseAddress(nb, [])
                                if let context = CGContext(data: CVPixelBufferGetBaseAddress(nb),
                                                         width: Int(renderSize.width),
                                                         height: Int(renderSize.height),
                                                         bitsPerComponent: 8,
                                                         bytesPerRow: CVPixelBufferGetBytesPerRow(nb),
                                                         space: CGColorSpaceCreateDeviceRGB(),
                                                         bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) {
                                    
                                    // Use Core Animation to render watermark on top of the frame
                                    UIGraphicsPushContext(context)
                                    watermarkLayer.render(in: context)
                                    UIGraphicsPopContext()
                                }
                                adaptor.append(nb, withPresentationTime: presentationTime)
                                CVPixelBufferUnlockBaseAddress(nb, [])
                            }
                        } else {
                            writerInput.markAsFinished()
                            group.leave()
                        }
                    }
                }
            }
            
            if let aReader = audioReader, let aWriterInput = audioWriterInput {
                group.enter()
                aReader.startReading()
                aWriterInput.requestMediaDataWhenReady(on: DispatchQueue(label: "audioExport", qos: .userInitiated)) {
                    while aWriterInput.isReadyForMoreMediaData {
                        if let output = aReader.outputs.first, let sampleBuffer = output.copyNextSampleBuffer() {
                            aWriterInput.append(sampleBuffer)
                        } else {
                            aWriterInput.markAsFinished()
                            group.leave()
                            break
                        }
                    }
                }
            }
            
            group.notify(queue: .main) {
                writer.finishWriting {
                    if writer.status == .completed {
                        continuation.resume(returning: outputURL)
                    } else {
                        continuation.resume(throwing: writer.error ?? NSError(domain: "VideoWatermark", code: 2, userInfo: [NSLocalizedDescriptionKey: "Export failed"]))
                    }
                }
            }
        }
    }
    
    private func createWatermarkLayer(text: String, size: CGSize, color: UIColor, fontSize: CGFloat, layout: String) -> CALayer {
        let watermarkLayer = CALayer()
        watermarkLayer.frame = CGRect(origin: .zero, size: size)
        
        // Correcting Y-axis because Core Animation is bottom-left by default in some contexts
        watermarkLayer.isGeometryFlipped = true 

        if layout == "tiled" {
            let cols = 4
            let rows = 8
            let cellWidth = size.width / CGFloat(cols)
            let cellHeight = size.height / CGFloat(rows)
            for r in 0..<rows {
                for c in 0..<cols {
                    let textLayer = CATextLayer()
                    textLayer.string = text
                    textLayer.fontSize = fontSize
                    textLayer.foregroundColor = color.cgColor
                    textLayer.alignmentMode = .center
                    textLayer.contentsScale = 2.0 // High quality
                    let x = CGFloat(c) * cellWidth
                    let y = CGFloat(r) * cellHeight
                    textLayer.frame = CGRect(x: x, y: y, width: cellWidth, height: cellHeight)
                    textLayer.transform = CATransform3DMakeRotation(CGFloat.pi / 4, 0, 0, 1)
                    watermarkLayer.addSublayer(textLayer)
                }
            }
        } else {
            let textLayer = CATextLayer()
            textLayer.string = text
            textLayer.fontSize = fontSize * 1.5
            textLayer.foregroundColor = color.cgColor
            textLayer.alignmentMode = .center
            textLayer.contentsScale = 2.0
            let labelWidth = size.width * 0.8
            let labelHeight = fontSize * 3
            textLayer.frame = CGRect(x: (size.width - labelWidth) / 2, y: (size.height - labelHeight) / 2, width: labelWidth, height: labelHeight)
            watermarkLayer.addSublayer(textLayer)
        }
        return watermarkLayer
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
