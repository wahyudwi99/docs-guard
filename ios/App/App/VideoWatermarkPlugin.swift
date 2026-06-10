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
        
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
        
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: renderSize.width,
            AVVideoHeightKey: renderSize.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 8_000_000,
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
            kCVPixelBufferHeightKey as String: renderSize.height
        ]
        
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: pixelBufferAttributes)
        
        writer.add(writerInput)
        
        // Audio handling
        var audioReader: AVAssetReader?
        var audioWriterInput: AVAssetWriterInput?
        if let audioTrack = try await asset.loadTracks(withMediaType: .audio).first {
            let reader = try AVAssetReader(asset: asset)
            let output = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: nil)
            reader.add(output)
            audioReader = reader
            
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
        
        return try await withCheckedThrowingContinuation { continuation in
            let group = DispatchGroup()
            
            group.enter()
            writerInput.requestMediaDataWhenReady(on: DispatchQueue(label: "videoExport")) {
                while writerInput.isReadyForMoreMediaData {
                    if let sampleBuffer = videoOutput.copyNextSampleBuffer() {
                        let presentationTime = CMSampleBufferGetPresentationTime(sampleBuffer)
                        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { continue }
                        
                        CVPixelBufferLockBaseAddress(pixelBuffer, [])
                        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
                        
                        // We use Core Animation tool for watermarking instead of CIImage for better quality text
                        // but here we are in a reader/writer loop, so we draw manually or use a layer.
                        // For simplicity and speed in this loop, let's use a context to draw the watermark.
                        let context = CIContext()
                        let renderer = UIGraphicsImageRenderer(size: renderSize)
                        let watermarkedImage = renderer.image { _ in
                            UIImage(ciImage: ciImage).draw(in: CGRect(origin: .zero, size: renderSize))
                            
                            // Draw watermark overlay
                            let ctx = UIGraphicsGetCurrentContext()
                            watermarkLayer.render(in: ctx!)
                        }
                        
                        var newPixelBuffer: CVPixelBuffer?
                        CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &newPixelBuffer)
                        
                        if let nb = newPixelBuffer {
                            self.drawUIImage(watermarkedImage, to: nb)
                            adaptor.append(nb, withPresentationTime: presentationTime)
                        }
                        
                        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
                    } else {
                        writerInput.markAsFinished()
                        group.leave()
                        break
                    }
                }
            }
            
            if let aReader = audioReader, let aWriterInput = audioWriterInput {
                group.enter()
                aReader.startReading()
                aWriterInput.requestMediaDataWhenReady(on: DispatchQueue(label: "audioExport")) {
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
                        continuation.resume(throwing: writer.error ?? NSError(domain: "VideoWatermark", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unknown export error"]))
                    }
                }
            }
        }
    }
    
    private func createWatermarkLayer(text: String, size: CGSize, color: UIColor, fontSize: CGFloat, layout: String) -> CALayer {
        let watermarkLayer = CALayer()
        watermarkLayer.frame = CGRect(origin: .zero, size: size)
        watermarkLayer.contentsScale = UIScreen.main.scale
        
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
                    textLayer.contentsScale = UIScreen.main.scale
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
            textLayer.foregroundColor = color.cgColor
            textLayer.alignmentMode = .center
            textLayer.contentsScale = UIScreen.main.scale
            let labelWidth = size.width * 0.8
            let labelHeight = fontSize * 3
            textLayer.frame = CGRect(x: (size.width - labelWidth) / 2, y: (size.height - labelHeight) / 2, width: labelWidth, height: labelHeight)
            watermarkLayer.addSublayer(textLayer)
        }
        return watermarkLayer
    }
    
    private func drawUIImage(_ image: UIImage, to pixelBuffer: CVPixelBuffer) {
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        let data = CVPixelBufferGetBaseAddress(pixelBuffer)
        let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
        let context = CGContext(data: data, width: Int(image.size.width), height: Int(image.size.height), bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer), space: rgbColorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
        
        context?.draw(image.cgImage!, in: CGRect(x: 0, y: 0, width: image.size.width, height: image.size.height))
        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
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
