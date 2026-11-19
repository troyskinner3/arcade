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

## Noodle app: `NoodleWeb/`
The full Noodle web app inside a native shell (`NoodleWebApp.swift`). The web app ships inside the app (`NoodleWeb/web`, served at `noodle://app/`), so it works offline
and each build is a fixed version. Native pieces: plays through the silent switch, mic permission asked once, exports go to the share sheet.
If iOS won't let the bundled page use the microphone, the app loads the live site instead.

### Run it on your iPhone
The Xcode project is in the repo (`NoodleWeb/Noodle.xcodeproj`): nothing to create or drag.
1. Terminal: `cd ~ && (test -d arcade && (cd arcade && git pull) || git clone https://github.com/troyskinner3/arcade.git)`
2. Terminal: `open ~/arcade/noodle-ios/NoodleWeb/Noodle.xcodeproj`
3. In Xcode: click the blue **Noodle** icon at the top of the left sidebar → under TARGETS click **Noodle** → **Signing & Capabilities** tab → **Team**: pick your team.
   If it says the bundle identifier is not available, change **Bundle Identifier** to something of your own (e.g. add your initials to the end).
4. Plug in the iPhone, pick it at the top of the window, press ▶.

To update later: `cd ~/arcade && git pull`, then ▶ again. (`sync-web.sh` copies `../noodle` into `NoodleWeb/web`; it is run before each commit, so the folder in the repo is already current.)
The App Store build should use Tuttii Inc.'s team and bundle identifier (it cannot be changed after release).

### Lock screen and haptics
The app shows what's playing on the lock screen and in Control Center (play/pause work there) and taps lightly when you place notes, move parts
or start recording (`NativeBridge` in `NoodleWebApp.swift`). For playback to keep going while the phone is locked: Xcode → target **Noodle** →
**Signing & Capabilities** → **+ Capability** → **Background Modes** → tick **Audio, AirPlay, and Picture in Picture**.

### Noodle Pro (in-app purchase)
The app sells one thing: **Noodle Pro**, a one-time purchase (Non-Consumable) with product ID `io.tuttii.Noodle.pro`, kept for life.
The code is `ProStore` in `NoodleWebApp.swift` (StoreKit 2); what Pro unlocks is `noodle/PRO.md` (and `PRO_SOUNDS`/`MFX` in the web app).
Owner setup, once:
1. https://appstoreconnect.apple.com → **Business** (or "Agreements, Tax, and Banking") → the **Paid Apps** agreement must be active, with bank and tax info. Purchases don't work without it.
2. App Store Connect → your app → **Monetization → In-App Purchases** → **+** → type **Non-Consumable**; Reference name `Noodle Pro`; Product ID **`io.tuttii.Noodle.pro`** (exactly).
   Then: price; under App Store Localization a display name (`Noodle Pro`) and description (`More instruments, 11 mix effects with shapes you draw, the DAW pack, and everything added to Pro later. Pay once.`);
   a Review screenshot (any screenshot of the Pro screen); Save.
3. Xcode → target **Noodle** → **Signing & Capabilities** → **+ Capability** → **In-App Purchase**.
4. Test before release: App Store Connect → **Users and Access → Sandbox** → add a tester (any email you control). On the iPhone: Settings → App Store → **Sandbox Account** → sign in with it.
   Build from Xcode, open More → Noodle Pro → Unlock: the purchase sheet says [Environment: Sandbox] and nothing is charged. TestFlight builds also buy for free.
5. The first time, the In-App Purchase is reviewed together with an app version: on the version page, under **In-App Purchases**, add Noodle Pro before you submit.
Trying both versions: in builds run from Xcode, More → **Test as** switches between Free, Pro and your real App Store purchase (not in TestFlight or App Store builds).
Adding a yearly plan later: create it in App Store Connect and add its product id to `ProStore.ids`; anyone with the one-time purchase keeps Pro.

### Song links (Share → Link to remix) and the rating prompt
Songs shared by link live on the takes service (`noodle-api/`, `/s/<id>` is the listen page). For a link to open the app instead of the page:
1. **Associated Domains:** Xcode → target **NoodleWeb** → Signing & Capabilities → **+ Capability** → Associated Domains → add
   `applinks:noodle-takes.cracked.workers.dev`.
2. **URL type** (the page's "Remix in Noodle" button): target → **Info** tab → URL Types → **+** → Identifier `io.tuttii.Noodle.links`,
   URL Schemes `noodleapp`.
3. **On the service** (Cloudflare → Workers → noodle-takes → Settings → Variables): `APPLE_APP_ID` = `<Team ID>.io.tuttii.Noodle` (Team ID:
   developer.apple.com → Membership), and once the app is live `APP_STORE_ID` (the number in its App Store URL, for Safari's Open banner) and
   `APP_STORE_URL`. Then run the takes service deploy (see `noodle-api/README.md`).
The rating prompt uses Apple's own `requestReview` after a song is shared (at most once every 120 days from Noodle; Apple shows it at most
3 times a year). Nothing to set up.

### TestFlight
1. https://appstoreconnect.apple.com → Apps → **+** → New App: platform iOS, name (e.g. "Noodle: Hum to Music" if "Noodle" is taken), the bundle ID from step 1, any SKU.
2. Xcode: destination **Any iOS Device (arm64)** → Product → **Archive** → Distribute App → **App Store Connect** → Upload.
3. App Store Connect → your app → **TestFlight**: the build appears after ~10–30 min of processing. Add yourself (and friends) under Internal Testing.
4. Install **TestFlight** from the App Store on the iPhone and accept the invite.
Internal testers (people on your developer team, up to 100) need no review. External testers need a short beta review.
