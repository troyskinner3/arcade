// The same pitch reading as the web app (trackNotes): low-pass, 16 kHz, YIN every 10 ms.
// Pure Swift (no Accelerate) so it builds and is tested on Linux and runs unchanged on iOS.
import Foundation

public struct Frame: Equatable { public var t: Double; public var db: Double; public var conf: Double; public var midi: Double }

public func biquadLowpass(_ x: [Float], f0: Double, q: Double, sr: Double) -> [Float] {
  let w = 2 * Double.pi * f0 / sr, cs = cos(w), al = sin(w) / (2 * q)
  var b0 = (1 - cs) / 2, b1 = 1 - cs, b2 = b0
  let a0 = 1 + al, a1 = -2 * cs / a0, a2 = (1 - al) / a0; b0 /= a0; b1 /= a0; b2 /= a0
  var y = [Float](repeating: 0, count: x.count); var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
  for i in 0..<x.count { let xi = Double(x[i]); let yi = b0*xi + b1*x1 + b2*x2 - a1*y1 - a2*y2; x2 = x1; x1 = xi; y2 = y1; y1 = yi; y[i] = Float(yi) }
  return y
}

public struct PitchTracker {
  public static let rate = 16000.0
  public var yinThreshold = 0.12, lowpass = 1000.0
  public let window = 400, tauMin = 16, tauMax = 280, hop = 160
  public init() {}

  /// Low-pass twice and resample to 16 kHz (linear), as the web app does.
  public func prepare(_ x: [Float], sr: Double) -> [Float] {
    let y = biquadLowpass(biquadLowpass(x, f0: lowpass, q: 0.707, sr: sr), f0: lowpass, q: 0.707, sr: sr)
    let ratio = sr / Self.rate, len = Int((Double(y.count - 1) / ratio).rounded(.down))
    var z = [Float](repeating: 0, count: max(0, len))
    for i in 0..<z.count { let p = Double(i) * ratio, i0 = Int(p), fr = Float(p - Double(i0)); z[i] = y[i0] * (1 - fr) + y[i0 + 1] * fr }
    return z
  }

  /// One YIN reading for the window starting at `s` in 16 kHz samples.
  public func frame(_ z: [Float], at s: Int, d: inout [Double]) -> Frame {
    var e = 0.0; for j in 0..<window { let v = Double(z[s + j]); e += v * v }
    let db = 10 * log10(e / Double(window) + 1e-12)
    var run = 0.0; d[0] = 1
    z.withUnsafeBufferPointer { zp in
      for tau in 1...tauMax {
        var sum: Float = 0
        for j in 0..<window { let df = zp[s + j] - zp[s + j + tau]; sum += df * df }
        run += Double(sum); d[tau] = run > 0 ? Double(sum) * Double(tau) / run : 1
      }
    }
    var tb = -1; var tau = tauMin
    while tau <= tauMax { if d[tau] < yinThreshold { while tau + 1 <= tauMax && d[tau + 1] < d[tau] { tau += 1 }; tb = tau; break }; tau += 1 }
    if tb < 0 { var mv = 9.0; for k in tauMin...tauMax where d[k] < mv { mv = d[k]; tb = k } }
    var tI = Double(tb)
    if tb > tauMin && tb < tauMax { let a = d[tb-1], b = d[tb], c = d[tb+1], den = a - 2*b + c; if abs(den) > 1e-9 { tI = Double(tb) + 0.5 * (a - c) / den } }
    return Frame(t: Double(s + window / 2) / Self.rate, db: db, conf: d[tb], midi: 69 + 12 * log2((Self.rate / tI) / 440))
  }

  public func frames(_ x: [Float], sr: Double) -> [Frame] {
    let z = prepare(x, sr: sr); var d = [Double](repeating: 0, count: tauMax + 1); var out: [Frame] = []
    var s = 0; while s + window + tauMax < z.count { out.append(frame(z, at: s, d: &d)); s += hop }
    return out
  }
}
