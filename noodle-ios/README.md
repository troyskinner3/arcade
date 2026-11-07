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

## Noodle app (TestFlight build): `NoodleWeb/`
The full Noodle web app inside a native shell (`NoodleWebApp.swift`): plays through the silent switch, mic permission asked once,
exports (WAV, MIDI, video) go to the share sheet. Later builds move pitch reading, the note reader and live expression into Swift.

### Run it on your iPhone
1. Xcode → File → New → Project → iOS → **App**. Product Name **Noodle**, Team = your developer team,
   Organization Identifier e.g. `com.persnickety` (bundle ID becomes `com.persnickety.Noodle`), Interface **SwiftUI**, Language **Swift**.
2. Delete the generated `NoodleApp.swift` and `ContentView.swift`. Drag `NoodleWeb/NoodleWebApp.swift` into the project (tick "Copy items if needed").
3. Target **Noodle** → **General**: Minimum Deployments **iOS 16.0**.
4. Target → **Info** → add these keys (the + button on any row):
   - `Privacy - Microphone Usage Description` = `Noodle listens to your voice to turn it into music.`
   - `App Uses Non-Exempt Encryption` = `NO` (skips the export-compliance question on every upload)
5. **Assets** → **AppIcon** → drag `NoodleWeb/AppIcon-1024.png` into the 1024 slot.
6. Target → **Signing & Capabilities**: Automatically manage signing, your team.
7. Plug in the iPhone, pick it as the run destination at the top, press ▶. (First time: on the phone, Settings → Privacy & Security → Developer Mode on; and Settings → General → VPN & Device Management → trust your developer certificate if asked.)

### TestFlight
1. https://appstoreconnect.apple.com → Apps → **+** → New App: platform iOS, name (e.g. "Noodle: Hum to Music" if "Noodle" is taken), the bundle ID from step 1, any SKU.
2. Xcode: destination **Any iOS Device (arm64)** → Product → **Archive** → Distribute App → **App Store Connect** → Upload.
3. App Store Connect → your app → **TestFlight**: the build appears after ~10–30 min of processing. Add yourself (and friends) under Internal Testing.
4. Install **TestFlight** from the App Store on the iPhone and accept the invite.
Internal testers (people on your developer team, up to 100) need no review. External testers need a short beta review.
