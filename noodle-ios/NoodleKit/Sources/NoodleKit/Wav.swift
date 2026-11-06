import Foundation
/// Minimal 16-bit / float PCM WAV reader (mono mixdown) for tests and the command line tool.
public func readWav(_ url: URL) throws -> (samples: [Float], sr: Double) {
  let data = try Data(contentsOf: url); var i = 12; var sr = 44100.0, ch = 1, bits = 16, fmt = 1
  func u32(_ o: Int) -> Int { Int(data[o]) | Int(data[o+1]) << 8 | Int(data[o+2]) << 16 | Int(data[o+3]) << 24 }
  func u16(_ o: Int) -> Int { Int(data[o]) | Int(data[o+1]) << 8 }
  while i + 8 <= data.count {
    let id = String(bytes: data[i..<i+4], encoding: .ascii) ?? "", n = u32(i + 4), b = i + 8
    if id == "fmt " { fmt = u16(b); ch = u16(b + 2); sr = Double(u32(b + 4)); bits = u16(b + 14) }
    if id == "data" {
      let bps = bits / 8, frames = min(n, data.count - b) / (bps * ch); var out = [Float](repeating: 0, count: frames)
      data.withUnsafeBytes { (p: UnsafeRawBufferPointer) in
        for f in 0..<frames { var s: Float = 0
          for c in 0..<ch { let o = b + (f * ch + c) * bps
            if bits == 16 { s += Float(Int16(bitPattern: UInt16(p[o]) | UInt16(p[o+1]) << 8)) / 32768 }
            else if bits == 32 && fmt == 3 { s += p.loadUnaligned(fromByteOffset: o, as: Float.self) }
            else if bits == 24 { let v = Int32(bitPattern: UInt32(p[o]) << 8 | UInt32(p[o+1]) << 16 | UInt32(p[o+2]) << 24); s += Float(v) / 2147483648 } }
          out[f] = s / Float(ch) } }
      return (out, sr) }
    i = b + n + (n & 1)
  }
  throw NSError(domain: "wav", code: 1)
}
