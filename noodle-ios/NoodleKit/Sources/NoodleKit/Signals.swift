// Continuous "mouth" signals every 10 ms, the raw material for expression (mouth shape -> filter, etc.):
// loudness, brightness (spectral centroid), noisiness (spectral flatness), onset strength (spectral flux),
// and vowel shape: F1 (mouth open) and F2 (tongue front/back) from an LPC envelope.
import Foundation

public struct Signals: Equatable {
  public var t: Double, db: Double, brightness: Double, noisiness: Double, onset: Double, f1: Double, f2: Double
}

/// In-place radix-2 FFT (n a power of two).
func fft(_ re: inout [Double], _ im: inout [Double]) {
  let n = re.count; var j = 0
  for i in 1..<n { var bit = n >> 1; while j & bit != 0 { j ^= bit; bit >>= 1 }; j |= bit; if i < j { re.swapAt(i, j); im.swapAt(i, j) } }
  var len = 2
  while len <= n {
    let ang = -2 * Double.pi / Double(len), wr = cos(ang), wi = sin(ang)
    var i = 0
    while i < n { var cr = 1.0, ci = 0.0
      for k in 0..<len / 2 { let a = i + k, b = a + len / 2
        let tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti
        let nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr }
      i += len }
    len <<= 1
  }
}

/// LPC coefficients by autocorrelation + Levinson-Durbin.
func lpc(_ x: [Double], order: Int) -> [Double] {
  var r = [Double](repeating: 0, count: order + 1)
  for k in 0...order { var s = 0.0; for i in k..<x.count { s += x[i] * x[i - k] }; r[k] = s }
  r[0] *= 1.0001; var a = [Double](repeating: 0, count: order + 1); a[0] = 1; var e = r[0]
  if e <= 0 { return a }
  for i in 1...order {
    var acc = r[i]; for j in 1..<i { acc += a[j] * r[i - j] }
    let k = -acc / e; var na = a
    for j in 1..<i { na[j] = a[j] + k * a[i - j] }; na[i] = k; a = na; e *= (1 - k * k)
    if e <= 0 { break }
  }
  return a
}

public struct SignalReader {
  public static let rate = 16000.0, hop = 160, n = 512
  public init() {}
  public func read(_ x: [Float], sr: Double) -> [Signals] {
    // plain resample to 16 kHz (no low-pass beyond Nyquist protection: one 7 kHz biquad)
    let y = biquadLowpass(x, f0: 7000, q: 0.707, sr: sr), ratio = sr / Self.rate
    let len = Int(Double(y.count - 1) / ratio); var z = [Double](repeating: 0, count: max(0, len))
    for i in 0..<z.count { let p = Double(i) * ratio, i0 = Int(p), fr = p - Double(i0); z[i] = Double(y[i0]) * (1 - fr) + Double(y[i0 + 1]) * fr }
    let N = Self.n, win = (0..<N).map { 0.5 - 0.5 * cos(2 * Double.pi * Double($0) / Double(N)) }
    var prev = [Double](repeating: 0, count: N / 2 + 1); var out: [Signals] = []
    var s = 0
    while s + N <= z.count {
      var re = (0..<N).map { z[s + $0] * win[$0] }, im = [Double](repeating: 0, count: N)
      let frame = re; fft(&re, &im)
      var mag = [Double](repeating: 0, count: N / 2 + 1), e = 0.0
      for k in 0...N / 2 { mag[k] = sqrt(re[k] * re[k] + im[k] * im[k]); e += mag[k] * mag[k] }
      let db = 10 * log10(e / Double(N * N) + 1e-12)
      var num = 0.0, den = 1e-12, lsum = 0.0, flux = 0.0
      for k in 1...N / 2 { let f = Double(k) * Self.rate / Double(N); num += f * mag[k]; den += mag[k]; lsum += log(mag[k] + 1e-9)
        let lm = log(mag[k] + 1e-6), lp = log(prev[k] + 1e-6); flux += max(0, lm - lp) }
      let flat = exp(lsum / Double(N / 2)) / (den / Double(N / 2))
      prev = mag
      // formants: LPC on a 10 kHz-band, pre-emphasised frame; peaks of the envelope
      var pe = frame; for i in stride(from: pe.count - 1, to: 0, by: -1) { pe[i] -= 0.95 * pe[i - 1] }
      let a = lpc(pe, order: 14); var env: [Double] = []
      let G = 256
      for g in 0..<G { let w = Double.pi * Double(g) / Double(G) * (4000 / 8000); var cr = 0.0, ci = 0.0
        for (k, ak) in a.enumerated() { cr += ak * cos(w * Double(k)); ci -= ak * sin(w * Double(k)) }
        env.append(-log(cr * cr + ci * ci + 1e-12)) }
      var peaks: [Double] = []
      for g in 1..<G - 1 where env[g] > env[g - 1] && env[g] >= env[g + 1] { let f = Double(g) / Double(G) * 4000; if f > 180 { peaks.append(f) } }
      let f1 = peaks.first ?? .nan, f2 = peaks.count > 1 ? peaks[1] : .nan
      out.append(Signals(t: Double(s + N / 2) / Self.rate, db: db, brightness: num / den, noisiness: flat, onset: flux / Double(N / 2), f1: f1, f2: f2))
      s += Self.hop
    }
    return out
  }
}
