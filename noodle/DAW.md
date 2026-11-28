# Noodle → DAW: phone as a MIDI controller and capture tool

Scoping for sending Noodle's MIDI (and later audio) straight into a DAW, with no export step. Owner + Claude, started 28 Nov 2026.
Future sessions: read this before any DAW, MIDI-out or controller work; tick items off and log decisions here.
Status words: **agreed** (owner confirmed), **proposed** (waiting on the owner), **unknown** (needs a test).

## Owner's answers (28 Nov)
- Owner's setup: MacBook + Ableton Live. Test there first.
- First test: **Play Pad as a live controller** (notes go into the DAW as you play). Everything else matters too, later.
- Cable is fine for now, and maybe for good. Wireless is a nice-to-have, never at the cost of quality or lag.
- Wants it **at launch** if possible: it fits Noodle's ethos (quick, novel, organic ways to get ideas into a DAW instead of drawing MIDI).
- This session builds it end to end, including the Swift in `noodle-ios/` (tell the app session before touching its files).
- 28 Nov, second answers: build the prototype now and put it **fully on in TestFlight** (the owner is the only tester; no hidden switch).
  More analytics is better. "Live MIDI out" was Claude's name for the idea; in the app it's **Send to computer**.

## Is it feasible? Yes for MIDI on a Mac by cable, with no desktop app
- **Cable, Mac: built in.** Plug the iPhone into the Mac with a data cable, open Audio MIDI Setup → MIDI Studio, click
  **Enable** on the iPhone once (macOS remembers it per device). Its MIDI ports then appear in Ableton like any keyboard
  ("Track" and "Remote" on for that input). This is Apple's IDAM ("Inter-Device Audio and MIDI", since iOS 11). No driver, no companion.
  Common snags people report: charge-only cables, USB hubs, forgetting Enable, not arming the track.
- **The same cable can also carry the phone's audio** into the Mac as an input (IDAM audio): a likely free route to "audio straight
  into the DAW" on a Mac. **Unknown:** whether the phone's speaker goes quiet, how much delay, and whether it still works on current macOS.
- **Bluetooth LE MIDI: built in on Mac and iPhone.** The app advertises itself (Apple's `CABTMIDILocalPeripheralViewController`), the
  Mac connects in Audio MIDI Setup → Bluetooth. Connection steps are ~7.5–15 ms, so jitter is the risk; fine for chords, weaker for drums.
  Needs Bluetooth permission text in the app. Later phase.
- **Windows:** Bluetooth MIDI is still in preview (Windows MIDI Services); IDAM is Mac-only; Wi-Fi network MIDI needs the free rtpMIDI
  driver. Windows is a later phase, or the existing DAW pack export.
- **Tempo sync** (only needed when Noodle plays a take *into* the DAW, not for live playing): MIDI clock (free, built into CoreMIDI) or
  Ableton Link (Ableton's LinkKit SDK under its own licence; the GPL version can't go on the App Store). Check the LinkKit licence
  before using it.

## The main unknown: delay from finger to DAW
Noodle is a web app inside the iPhone shell. A touch goes page → `postMessage` → Swift → CoreMIDI → cable → Ableton. USB MIDI itself is
~1–2 ms. No reliable public numbers exist for the page → Swift hop (a 2016 study found some bridges caused noticeable delay). The prototype
below measures it. If it's too slow, the fallback is to handle the Play Pad's touches in Swift (a native overlay), which is more work.

## Options and trade-offs
| Option | What the user does | Build effort | Cost | Risk |
|---|---|---|---|---|
| A. Live MIDI out over cable (IDAM) | plug in, Enable once, play | small: Swift bridge + Play Pad hook | $0 | page → Swift delay; Mac only |
| B. Same over Bluetooth LE | pair in Audio MIDI Setup | small on top of A | $0 | jitter; Bluetooth permission |
| C. Play a take into the DAW in time (MIDI clock / Link) | press record in Ableton, press play in Noodle | medium | $0 (Link: check licence) | sync drift |
| D. Live hum/sing → MIDI out | sing, notes appear in the DAW | medium–large | $0 | detection needs look-ahead → delay; wrong notes in a live take |
| E. Audio into the DAW over the cable (IDAM audio) | pick the iPhone as an audio input | small–medium (if IDAM audio works) | $0 | unknown on current macOS |
| F. Desktop companion (plugin/app, Wi-Fi or USB, Windows) | install on the computer | large | Windows code signing (~$200–400/yr), Apple notarisation ($99/yr dev account, already have), plugin SDK terms | support load; out of scope for launch |

Rivals: Vochlea Dubler 2 (desktop voice-to-MIDI, ~$99–249, needs a mic; MIDI often needs editing), StudioMux (USB audio/MIDI,
mixed reliability reviews), phone controller apps (midiOS, Skym, LK, touchAble; most need a Mac bridge app, several reviews complain of
disconnects or failing to connect). Noodle's edge: no bridge app for the cable route, plus voice and touch ways to play that controllers don't have.

## Phases (proposed)
1. **Prototype (next):** answer "does the iPhone show up in Ableton, and does the delay feel OK?" See below.
2. **v1, at launch if the prototype passes:** Play Pad → MIDI out over cable. X = note (snapped to the key, as now), Y = brightness as
   MIDI CC 74 (with a choice of CC later). A "Send to computer" switch on the Play Pad, a one-screen setup guide (Enable in Audio MIDI
   Setup, arm the track), MIDI channel setting. Also Note pads, Chord pads and Drum pads (same code path, cheap once the Play Pad works).
3. **v1.1:** Bluetooth LE (option B) if the prototype's Bluetooth try feels tight enough.
4. **v1.2:** play a take into the DAW in time (C), then audio over the cable (E).
5. **Later:** live voice → MIDI (D); Windows (rtpMIDI guide or companion, F).
Launch rule: v1 ships only if it's solid. If it slips, launch without it and make it the first big update (press story).

## Prototype (built 28 Nov, in the app for everyone; details in `eval/README.md`, DAW round 1)
- Where: an instrument track → Record → Note pads, Chord pads, Drum pads or Play pad → **Send to computer** (and **Set up**).
- What it sends: notes and chords on channel 1, drums on channel 10 (General MIDI, same as the MIDI export), Play pad up = CC 74.
- Set up sheet: what the phone is connected to, cable and Bluetooth steps, a timing test (4 bars of 16ths at 120 BPM), and the delay on
  the phone (finger down → MIDI sent, median and worst of recent notes).
- Not compiled yet (no Xcode in Claude's sessions): the owner's next archive is the first build. If Xcode shows errors, paste them.
- Owner's test, cable: archive to TestFlight, install; plug the iPhone into the MacBook, Audio MIDI Setup → Window → Show MIDI Studio →
  iPhone → Enable; Ableton → Settings → Link, Tempo & MIDI → Track on for the iPhone; arm a MIDI track with an instrument. In Noodle open
  the Play pad, turn on Send to computer, play. Then Set up → Play a timing test while Ableton records.
- Then Bluetooth: Set up → Show Noodle over Bluetooth; on the Mac, Audio MIDI Setup → MIDI Studio → Bluetooth button → Connect. Same checks.
- Report: (1) did Ableton see it (cable / Bluetooth), (2) how playing feels, (3) the delay numbers in Set up, (4) a zoomed-in screenshot of
  the recorded 16ths, (5) optional: does the iPhone also show up as an audio input in Ableton over the cable.
- Pass: shows up without a bridge app; playing feels immediate; 16ths land within a few ms of each other.
- Note: the owner's phones are left out of the usage dashboard's numbers, so the owner's own test won't show there; the delay readout in
  Set up is the place to look.

## Free vs Pro (proposed, waiting on the owner; mirrored in `PRO.md`; not gated in the prototype)
- Claude's suggestion: **live MIDI out is Pro**, like the DAW pack (it's for producers, who pay; Dubler shows they pay a lot more),
  with the usual Pro try so people can feel it first. Alternative: free, as a hook for producers and press. Owner to decide.

## Analytics (agreed 28 Nov: "the more the merrier"; built with the prototype)
- One event, `daw`, with a label: `on` / `off`, `setup`, `bluetooth`, `timing test`, `connected cable` / `connected other` (value: how
  many destinations), `notes <pad kind>` (value: notes sent while the pad screen was open), `delay ms` / `delay ms worst`,
  `phone sound on` / `off`. No device or computer names, no notes played.
- Counted only after the takes service is deployed with `daw` in `EVENTS` (owner, by hand). Privacy page and App Store privacy text
  updated; Product Interaction is already declared. Bluetooth adds a permission prompt text, not data sent.

## Action items
- [x] Owner: OK to build the prototype, fully on in TestFlight (28 Nov).
- [x] Claude: build the prototype (28 Nov).
- [ ] Owner: archive a TestFlight build; paste any Xcode errors.
- [ ] Owner: run the prototype test (cable, then Bluetooth) and report the five results.
- [ ] Owner: Free or Pro.
- [ ] Owner: deploy the takes service so `daw` events count.
- [ ] Claude: check the LinkKit licence text before phase C.
- [ ] Claude: add v1 to `ROADMAP.md` once the prototype passes.

## Sources (checked 28 Nov 2026)
- iPhone MIDI over USB, Enable step: https://pounding.systems/blog/iphone-midi-usb-audio-midi-setup
- iOS audio and MIDI in Live (IDAM): https://patches.zone/ios-audio-and-midi-in-ableton-live
- Ableton, audio over USB from iOS: https://help.ableton.com/hc/en-us/articles/209073129
- Apple, Bluetooth MIDI peripheral: https://developer.apple.com/documentation/coreaudiokit/cabtmidilocalperipheralviewcontroller
- Bluetooth MIDI timing: https://www.cme-pro.com/the-truth-about-bluetooth-midi/
- Windows MIDI status: https://devblogs.microsoft.com/windows-music-dev/windows-midi-services-rollout-known-issues-and-workarounds
- LinkKit licence: https://ableton.github.io/linkkit and https://www.ableton.com/en/link/sdk/license-request/
- WKWebView bridge delay study: https://core.ac.uk/download/78561467.pdf
- Controller apps: App Store listings for midiOS, Skym, LK, touchAble Pro; StudioMux
- Dubler 2 review: https://musictech.net/reviews/software-instruments/vochlea-dubler-2-review/
