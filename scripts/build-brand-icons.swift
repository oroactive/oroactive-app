// Build resources from the approved relief master; never stretch the source canvas.
// Run from the repository root: swift scripts/build-brand-icons.swift
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let sourceURL = root.appendingPathComponent("assets/oroactive-logo-rilievo-20261026.png")
guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let master = CGImageSourceCreateImageAtIndex(source, 0, nil),
      let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
    fatalError("Unable to load the approved OroActive relief logo")
}
let bitmapInfo = CGImageAlphaInfo.noneSkipLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
guard let scan = CGContext(data: nil, width: master.width, height: master.height,
    bitsPerComponent: 8, bytesPerRow: master.width * 4, space: colorSpace, bitmapInfo: bitmapInfo) else {
    fatalError("Unable to inspect logo bounds")
}
scan.draw(master, in: CGRect(x: 0, y: 0, width: master.width, height: master.height))
let bytes = scan.data!.assumingMemoryBound(to: UInt8.self)
var left = master.width, bottom = master.height, right = -1, top = -1
for y in 0..<master.height {
    for x in 0..<master.width {
        let i = (y * master.width + x) * 4
        if max(bytes[i], max(bytes[i + 1], bytes[i + 2])) > 80 {
            left = min(left, x); right = max(right, x)
            bottom = min(bottom, y); top = max(top, y)
        }
    }
}
let markWidth = right - left + 1, markHeight = top - bottom + 1
guard markWidth > 0, abs(markWidth - markHeight) <= 2 else {
    fatalError("The master mark is not circular: refusing to distort it")
}
let centerX = CGFloat(left + right + 1) / 2
// Bitmap rows start at the top; CGContext drawing coordinates start at the bottom.
let centerY = CGFloat(master.height) - CGFloat(bottom + top + 1) / 2
let markSide = CGFloat(max(markWidth, markHeight))

// Home icons need safe margins for Apple's rounded mask. The web manifest also
// declares maskable icons, whose mark must fit in the central 80% safe circle.
let outputs: [(String, Int, CGFloat)] = [
    ("oroactive-logo.png", 1024, 0.98),
    ("icons/apple-touch-icon-180.png", 180, 0.86),
    ("icons/oroactive-relief-apple-touch-180-20261026.png", 180, 0.86),
    ("icons/icon-192.png", 192, 0.78),
    ("icons/oroactive-relief-192-20261026.png", 192, 0.78),
    ("icons/icon-512.png", 512, 0.78),
    ("icons/oroactive-relief-512-20261026.png", 512, 0.78),
    ("ios/OroActiveTrial/Assets.xcassets/AppIcon.appiconset/icon.png", 1024, 0.86),
    ("ios/OroActiveTrial/Assets.xcassets/OroActiveLogo.imageset/logo.png", 1024, 0.98)
]
for (path, size, occupancy) in outputs {
    guard let canvas = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
        bytesPerRow: size * 4, space: colorSpace, bitmapInfo: bitmapInfo) else {
        fatalError("Unable to build \(path)")
    }
    canvas.setFillColor(CGColor(gray: 0, alpha: 1))
    canvas.fill(CGRect(x: 0, y: 0, width: size, height: size))
    canvas.interpolationQuality = .high
    let scale = CGFloat(size) * occupancy / markSide
    // The same scale on both axes preserves the circle, star and typography.
    canvas.translateBy(x: CGFloat(size) / 2 - centerX * scale,
                       y: CGFloat(size) / 2 - centerY * scale)
    canvas.scaleBy(x: scale, y: scale)
    canvas.draw(master, in: CGRect(x: 0, y: 0, width: master.width, height: master.height))
    let url = root.appendingPathComponent(path)
    guard let image = canvas.makeImage(),
          let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fatalError("Unable to export \(path)")
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("Unable to save \(path)") }
    print("Built \(path): \(size) × \(size), mark \(Int(occupancy * 100))%")
}
