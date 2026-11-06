// Live microphone -> pitch every 10 ms, using NoodleKit's PitchTracker (same reading as the web app).
import AVFoundation; import NoodleKit

final class LiveMic: ObservableObject {
  @Published var midi: Double? = nil        // current sung pitch, nil when silent / unsure
  @Published var level: Double = -80        // dB
  @Published var recording = false
  private(set) var take: [Float] = []; private(set) var sampleRate = 48000.0
  private let engine = AVAudioEngine(); private var ring: [Float] = []
  private let tracker = PitchTracker(); private var d = [Double](repeating: 0, count: 281)

  func start() throws {
    let s = AVAudioSession.sharedInstance()
    try s.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothA2DP])
    try s.setPreferredIOBufferDuration(0.005); try s.setActive(true)
    let input = engine.inputNode, fmt = input.outputFormat(forBus: 0); sampleRate = fmt.sampleRate
    input.installTap(onBus: 0, bufferSize: 512, format: fmt) { [weak self] buf, _ in
      guard let self, let ch = buf.floatChannelData?[0] else { return }
      let x = Array(UnsafeBufferPointer(start: ch, count: Int(buf.frameLength)))
      if self.recording { self.take += x }
      self.ring += x; let need = Int(self.sampleRate * 0.06)          // ~60 ms window is enough for YIN at 16 kHz
      if self.ring.count >= need {
        let z = self.tracker.prepare(Array(self.ring.suffix(need)), sr: self.sampleRate)
        if z.count >= self.tracker.window + self.tracker.tauMax + 1 {
          let f = self.tracker.frame(z, at: z.count - self.tracker.window - self.tracker.tauMax - 1, d: &self.d)
          DispatchQueue.main.async { self.level = f.db; self.midi = (f.conf < 0.2 && f.db > -50) ? f.midi : nil }
        }
        self.ring = Array(self.ring.suffix(need))
      }
    }
    try engine.start()
  }
  func beginTake() { take = []; recording = true }
  func endTake() -> [Float] { recording = false; return take }
}
