// Noodle iOS prototype: hum -> live pitch line -> notes on a piano roll -> play back.
import SwiftUI; import NoodleKit

@main struct NoodleApp: App { var body: some Scene { WindowGroup { ContentView() } } }

struct ContentView: View {
  @StateObject var mic = LiveMic()
  @State var trail: [Double?] = []
  @State var notes: [Note] = []
  var body: some View {
    VStack(spacing: 16) {
      Text("🍜 Noodle").font(.largeTitle.bold())
      Canvas { ctx, size in                      // live pitch trail: last 3 s
        let n = max(1, trail.count)
        for (i, m) in trail.enumerated() { guard let m else { continue }
          let x = size.width * Double(i) / Double(n), y = size.height * (1 - (m - 40) / 45)
          ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: 4, height: 4)), with: .color(.orange)) }
      }.frame(height: 180).background(Color.black.opacity(0.85)).cornerRadius(12)
      Canvas { ctx, size in                      // notes heard
        guard let end = notes.map(\.t1).max(), end > 0 else { return }
        for n in notes { let x0 = size.width * n.t0 / end, x1 = size.width * n.t1 / end, y = size.height * (1 - (n.midi - 40) / 45)
          ctx.fill(Path(roundedRect: CGRect(x: x0, y: y, width: max(3, x1 - x0 - 1), height: 6), cornerRadius: 2), with: .color(.mint)) }
      }.frame(height: 140).background(Color.black.opacity(0.85)).cornerRadius(12)
      Button(mic.recording ? "Stop" : "Record") {
        if mic.recording { let x = mic.endTake(); notes = NoteReader().notes(x, sr: mic.sampleRate) } else { mic.beginTake() }
      }.font(.title2.bold()).buttonStyle(.borderedProminent).tint(mic.recording ? .red : .orange)
      Text(notes.isEmpty ? "Hum a tune" : "\(notes.count) notes").foregroundStyle(.secondary)
    }
    .padding()
    .onAppear { try? mic.start() }
    .onReceive(mic.$midi) { m in trail.append(m); if trail.count > 300 { trail.removeFirst(trail.count - 300) } }
  }
}
