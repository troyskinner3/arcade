// Notes from a take: voiced frames (loudness + pitch confidence gates, as in the web app), a short pitch median,
// cut where the voice stops or the pitch settles on a new semitone, then the personal tuning offset removed.
// A first, simple reader for the prototype; the learned note reader replaces the cutting step.
import Foundation

public struct Note: Equatable { public var t0: Double, t1: Double, midi: Double }

func percentile(_ v: [Double], _ q: Double) -> Double { let s = v.sorted(); return s.isEmpty ? 0 : s[min(s.count - 1, Int(q * Double(s.count - 1)))] }
func median(_ v: [Double]) -> Double { let s = v.sorted(); let n = s.count; return n == 0 ? .nan : n % 2 == 1 ? s[n/2] : (s[n/2-1] + s[n/2]) / 2 }

public struct NoteReader {
  public var sensitivity = 55.0, minLength = 0.07, splitMin = 0.08
  public init() {}

  public func voiced(_ fr: [Frame]) -> [Bool] {
    let db = fr.map(\.db), floor = percentile(db, 0.15), top = percentile(db, 0.99), sN = sensitivity / 100
    let gate = floor + max(8, (top - floor) * (0.42 - 0.25 * sN)), cth = 0.2 + 0.12 * sN
    return fr.map { $0.db > gate && $0.conf < cth && $0.midi > 28 && $0.midi < 96 }
  }
  /// circular mean of how far steady frames sit from the nearest semitone (a singer's own tuning)
  public func tuning(_ fr: [Frame], _ v: [Bool]) -> Double {
    var c = 0.0, s = 0.0, n = 0
    for i in 2..<max(2, fr.count - 2) where v[i] && v[i-2] && v[i+2] && abs(fr[i].midi - fr[i-2].midi) <= 0.25 && abs(fr[i].midi - fr[i+2].midi) <= 0.25 {
      let a = 2 * Double.pi * (fr[i].midi - fr[i].midi.rounded()); c += cos(a); s += sin(a); n += 1 }
    return n >= 10 && hypot(c, s) / Double(n) > 0.12 ? atan2(s, c) / (2 * Double.pi) : 0
  }
  public func notes(frames fr: [Frame]) -> [Note] {
    guard fr.count > 4 else { return [] }
    let v = voiced(fr), tune = tuning(fr, v), n = fr.count
    var pm = [Double](repeating: .nan, count: n)
    for i in 0..<n where v[i] { pm[i] = median((max(0, i-4)...min(n-1, i+4)).filter { v[$0] }.map { fr[$0].midi }) }
    var out: [Note] = []; var i = 0
    while i < n {
      guard v[i] else { i += 1; continue }
      var a = i, cur = (pm[i] - tune).rounded(), j = i
      while j + 1 < n && (v[j+1] || (j + 3 < n && (v[j+2] || v[j+3]))) {
        j += 1; guard v[j] else { continue }
        let q = (pm[j] - tune).rounded()
        if q != cur {   // a new steady semitone for >= splitMin closes the note
          let k = Int(splitMin / 0.01); let ahead = (j..<min(n, j + k)).filter { v[$0] }.map { (pm[$0] - tune).rounded() }
          if ahead.count >= k - 1 && ahead.allSatisfy({ $0 == q }) {
            if fr[j-1].t - fr[a].t >= minLength { out.append(Note(t0: fr[a].t - 0.005, t1: fr[j-1].t + 0.005, midi: cur)) }
            a = j; cur = q }
        }
      }
      if fr[j].t - fr[a].t >= minLength { out.append(Note(t0: fr[a].t - 0.005, t1: fr[j].t + 0.005, midi: cur)) }
      i = j + 1
    }
    return out
  }
  public func notes(_ x: [Float], sr: Double) -> [Note] { notes(frames: PitchTracker().frames(x, sr: sr)) }
}
