import XCTest; @testable import NoodleKit
final class PitchTests: XCTestCase {
  func testSineIsA4() {
    let sr = 44100.0; let x = (0..<Int(sr)).map { Float(0.5 * sin(2 * Double.pi * 440 * Double($0) / sr)) }
    let fr = PitchTracker().frames(x, sr: sr); XCTAssertGreaterThan(fr.count, 80)
    let mid = fr[fr.count / 2]; XCTAssertEqual(mid.midi, 69, accuracy: 0.05); XCTAssertLessThan(mid.conf, 0.05)
  }
}
final class SignalTests: XCTestCase {
  // a buzz through two resonances at 700 / 1200 Hz should read back roughly those formants
  func testFormantsOfSyntheticVowel() {
    let sr = 16000.0; var x = [Float](repeating: 0, count: 16000)
    for i in 0..<x.count where i % 133 == 0 { x[i] = 1 }   // 120 Hz pulses
    func res(_ x: [Float], _ f: Double, _ bw: Double) -> [Float] { let r = exp(-Double.pi * bw / sr), c = -r * r, b = 2 * r * cos(2 * Double.pi * f / sr)
      var y = [Float](repeating: 0, count: x.count); for i in 0..<x.count { y[i] = Float(Double(x[i]) * (1 - b - c) + b * Double(i > 0 ? y[i-1] : 0) + c * Double(i > 1 ? y[i-2] : 0)) }; return y }
    let v = zip(res(x, 700, 80), res(x, 1200, 100)).map { $0 + 0.5 * $1 }
    let s = SignalReader().read(v, sr: sr); let m = s[s.count / 2]
    XCTAssertEqual(m.f1, 700, accuracy: 120); XCTAssertEqual(m.f2, 1200, accuracy: 200)
    let noise = (0..<16000).map { _ in Float.random(in: -1...1) }; let ns = SignalReader().read(noise, sr: sr)
    XCTAssertGreaterThan(ns[50].noisiness, m.noisiness); XCTAssertGreaterThan(ns[50].brightness, m.brightness)
  }
}
