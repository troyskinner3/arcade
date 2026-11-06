# Noodle for iPhone (prototype)

- `NoodleKit/`: the shared core in plain Swift (no Apple-only frameworks), so it builds and is tested on Linux too.
  - `PitchTracker`: the web app's pitch reading (YIN, 16 kHz, 10 ms). Matches the web app within 0.06 semitones on sung frames.
  - `SignalReader`: continuous mouth signals every 10 ms (loudness, brightness, noisiness, onset strength, F1/F2 vowel shape), for expression.
  - `NoteReader`: notes from a take.
  - `noodle-cli frames file.wav`: dumps frames as JSON, for checking against the web app.
- `NoodleApp/`: SwiftUI app: live pitch trail while you hum, Record/Stop, notes drawn after the take.

## Build on a Mac
1. Xcode → File → New → Project → iOS App "Noodle" (SwiftUI). Delete its ContentView/App files.
2. Add `NoodleApp/*.swift` to the target. File → Add Package Dependencies → Add Local… → `NoodleKit`.
3. Info.plist: add `NSMicrophoneUsageDescription` = "Noodle listens to your voice to turn it into music."
4. Run on your iPhone.

Tests on Linux/Mac: `cd NoodleKit && swift test`.
