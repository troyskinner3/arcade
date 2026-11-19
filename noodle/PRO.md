# Noodle: Free and Pro

The one list of what is free and what Noodle Pro unlocks. Update it with every new feature: each one gets a line here, marked
**proposed** until the owner confirms it.

## How Pro is sold
- **Noodle Pro, one-time purchase** at launch (confirmed) (about $5–10; a short free trial is optional).
- **If a yearly plan comes later (confirmed):** everyone who bought the one-time Pro keeps Pro for life, including features added later (early adopters
  are rewarded, never asked to pay again). The yearly plan is then simply the way new people get Pro. Only something with real running
  costs (for example cloud sync) might be subscription-only, and even then lifetime buyers should be considered for it.
- In the app, "has Pro" = owns the one-time purchase **or** has an active yearly plan (StoreKit), so both can coexist.

## In the app
Enforced in `noodle/js/` (mostly `engine.js`, `studio.js`, `export.js`): `PRO_SOUNDS` (Pro sounds, including Vocoder and Talkbox), `CHORD_STYLES[...].pro`, `isPro()` for track effects and backing vocals, `MFX[...].free` (free mix effects), the DAW pack and the video tag in Share, curve drawing in
the Song FX editor. The purchase is `ProStore` in `noodle-ios/NoodleWeb/NoodleWebApp.swift` (product `io.tuttii.Noodle.pro`). Keep this list and the code in step.
**How free users see Pro (confirmed):** every Pro option carries a small amber sparkle (`PRO_LOCK`), gone once Pro is owned. Free users can *try*
Pro sounds, the 9 Pro song effects, track effects, backing vocals and the Pulse / Arp chord styles: the part plays, looping, with the Pro thing
on it, but a try is never saved, undone, shared or exported (`pvKeep` writes the song without it), and it goes back when the menu or editor
closes, with a "… is Pro. Get Pro to keep it." note. Buying Pro during a try keeps it. Not previewable (badge only): DAW pack, copy a part to
another song, video without the tag.
**Songs that already contain Pro content (confirmed, the generous rule):** e.g. a friend's remix with a Trumpet part. It plays and exports as it is
for everyone, and normal editing (notes, volume, moving, new parts) keeps the Pro sound. Changing the Pro thing itself is a try (goes back),
and once swapped for a free one, choosing the Pro one again needs Pro. Deleting is always allowed.

## Rules of thumb
- Free must be great on its own: hum a tune, get a song that sounds good, share it. Never gate the first wow.
- Pro is depth and polish: more sounds, more control, pro-quality exports.
- Never gate people's own data: their songs, recordings and backups are always theirs.
- Free shares carry a small "Made with Noodle" tag (marketing for Tuttii); Pro removes it.

## The list
Status: **confirmed** (owner agreed) or **proposed** (waiting on the owner).

### Free
| Feature | Status |
|---|---|
| Recording into every part type: drums, bass, lead, keys, pad, arp, vocals, FX | proposed |
| Guided takes, hum-along, Teach Noodle your voice, mic and timing setup, your own drum sounds | proposed |
| Editing: notes and drum hits, snap, trims, undo/redo, velocity, duplicate track, empty parts, Another version | proposed |
| Styles (Pop, Hip hop, Rock, EDM, ...) | proposed |
| Synth sounds: Saw, Supersaw, Square, Bell, Pluck, Sub, 808 glide, Synth bass, Reese, Warm pad, Choir, Sweep, Organ, Stab | proposed |
| Synth drum kits: 808, Punchy, EDM, Lo-fi | proposed |
| Recorded Piano, Strings and Rock drum kit (the first impression) | confirmed |
| Recorded E-piano, Rock bass and Guitar (the Hip hop and Rock styles use them by default, so every style sounds right for free) | confirmed |
| Mix: volume, pan, reverb, drive, punch; Expression (follows your voice) | proposed |
| Export a mixdown (WAV) and video, with a small "Made with Noodle" tag on video | proposed |
| Song list, song files (save, back up all, open), sharing takes, email news, crash reports | proposed |
| Change key moves the whole song (transpose), loop a section, tap tempo, lock-screen controls, haptic taps | confirmed |
| Faster fixes: ▼ ▲ on a note, split into 2 / 3 / 4, select several notes and move or delete them together | proposed |
| Tap along while you hum (catches repeated notes) and learning from your fixes (accuracy for everyone) | proposed |
| Chords from your melody: Pad and Piano styles, chords every bar or half bar | proposed |
| Drum fills every 4 or 8 bars (with a crash after each) | proposed |
| Song sections: name, loop and duplicate Intro / Verse / Chorus / Bridge / Outro | proposed |
| Song links: share a song by link; friends listen and remix it in Noodle (growth: always free) | proposed |
| Invite friends: 3 friends who make a song earn you Noodle Pro (an App Store offer code) | proposed |
| Free videos end on a 2.5 s Noodle card ("Free on the App Store"); Pro videos end with the music | proposed |

### Pro
| Feature | Status |
|---|---|
| Recorded instruments: Marimba, Glockenspiel, Flute, Horns | proposed |
| Your voice (Lead and Pad made from your own singing) | proposed |
| Wavetable sounds: Glass, Chip, Theremin, Vowel pad, Digital pad, Growl | proposed |
| Coded sounds: Acid, Wobble, String pluck, Chorus pad, Pump pad | proposed |
| MIDI export, stems (each part as its own file), video without the tag | proposed |
| Copy a part to another song (Paste part in Add track) | confirmed |
| Chords from your melody in the Pulse and Arp styles | proposed |
| Effects on one track: Echo, Chorus, Drive (in the track's sheet) | proposed |
| Backing vocals: two harmonies made from your own voice, a third above and below | proposed |
| Vocal sounds Vocoder and Talkbox (your voice shapes a synth) | proposed |
| Recorded Trumpet, Clarinet, Xylophone | proposed |

### Planned for Pro (the owner's direction: make Pro really great)
| Feature | Status |
|---|---|
| More instruments than today (recorded and synth) | confirmed direction |
| Premium FX with automation curves you draw over time, reusing the mechanics of the Tuttii prototype (feedback from both apps) | confirmed direction |
| Song FX (mix effects) from the prototype (`troyskinner3/tuttii-fx-prototype`): free gets High pass and Low pass **with full control** (draw and bow the curve, controls, Reset); Pro gets the other 9 (Phaser, Washout, Echo throw, Tremolo, Auto-pan, Bitcrusher, Vinyl brake, Reverse swell, Ring mod), which free users can try | confirmed |

### Limits on free
- None at launch (confirmed): no caps on song length, parts or number of songs. Pro sells depth (sounds, FX, exports, no tag), not walls. Adding limits later would take away what people had, so start without them.
- The "Made with Noodle" tag goes on video and the share caption only, never into the audio.
