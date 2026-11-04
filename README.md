# Arcade

Simple browser games for mobile and desktop. Plain HTML/CSS/JS with no build step, hosted on GitHub Pages.

## Games

- **Two Thumbs Up** (`two-thumbs-up/`, mobile; originally "Climber"): two thumbs, two hands. The left half of the screen controls the left hand and the right half controls the right.
  - Drag down and release to throw a free hand.
  - Tap while the hand is over a ledge to grab it, and keep your thumb down to hold on. Lift it and the hand lets go.
  - Arms are elastic: let go with the lower hand and the upper arm flings you up. A held hand limits how far the other can reach.
  - Balloons pop when a hand passes through them: green ones are power-ups (first at 30–50 m, then every 35–55 m), red ones are power-downs (first at 125–150 m, then mixed in every 20–35 m). Add `?powerups` to the URL to get balloons from the start. See [ROADMAP.md](ROADMAP.md).
  - Moving ledges slide back and forth along their long side, starting at 75–100 m and getting more common as you climb. Hold one and you ride along. Add `?moving` to the URL to get them from the start.
  - Ghost ledges are faint decoys with a dotted outline. Hands pass straight through them. They start at 175–200 m and get more common. Add `?ghosts` to the URL to get them from the start.
  - Every 100 m there's a golden checkpoint ledge and a celebration. Lines mark your best height and real landmarks at their real heights (a giraffe, Big Ben, the Eiffel Tower…). The sky goes from city to clouds to space.
  - Icy ledges (from 225–250 m) slowly slide you off; wind gusts (from 275–300 m) push thrown hands; birds (from 325–350 m) knock thrown hands away. Test from the start with `?icy`, `?wind` or `?birds`.
  - Sound is off for now, so the game never interrupts a podcast or music. The synthesized sounds live in `two-thumbs-up/sfx.js` and on the sound board, `two-thumbs-up/sounds.html` (play buttons, synthesis details, measured levels, WAV downloads). To turn sound back on, load `sfx.js` in `index.html` and set `SOUND_ON` in `game.js`.
  - Sharing adds `?beat=<height>&from=<name>` to the link; a friend who opens it gets a line to beat and a celebration when they pass it.
  - Game over shows your height in a random absurd unit (550+ of them in `two-thumbs-up/units.js`, never repeating your last 30; 🎲 picks another) and a Share button: the phone's share sheet, or copy to clipboard elsewhere.
  - The ☰ menu has four tabs:
    - **Stats:** best height, run count, average and totals, plus a chart of your last 30 runs with a table view.
    - **Passport:** the 32 landmarks you've climbed past.
    - **Badges:** 23 badges.
    - **Customize:** equip unlocked bodies, hats, faces, hand and arc colors (each hand and each arc set separately), backdrops, ledge styles and water.
  - Skins unlock at new best heights and with badges (`two-thumbs-up/progress.js`); their art is in `two-thumbs-up/skins.js`. Game over shows new badges, unlocks and the next unlock.
  - Progress is saved only in the browser (`localStorage`). There's no server or account, so it doesn't follow you to another device or browser.
- **Two Thumbs Up Classic** (`two-thumbs-up-classic/`): the original one-finger version. Drag to slingshot, and the hand auto-grabs near the top of its arc.

- **Mouth Machine** (`mouth-machine/`, mobile and desktop): a beatbox-to-beat studio. Tap + Add part, choose an instrument on the new card, then record into it with the mic (count-in and metronome) or import a voice memo, and it becomes real instruments.
  - Drums: beatbox the whole kit in one take (default "B" = kick, "ch" = snare, "k" = clap, "ts" = hi-hat) or record each drum on its own. Drum takes layer onto the same Drums part (one grid; Undo last take removes a layer). Hits snap to 16th (or 8th) notes.
  - Your kit (on the Drum kit pad): up to 12 slots, each playing one of 19 synthesized sounds (toms, rim, cowbell, shaker, crash, ride, 808 boom…) or "My own noise" (your taught recording). Teach each slot your trigger noise with a short take on the click; hits are then sorted by comparing a spectral fingerprint (tone shape at the attack and body, plus length, brightness, bass and hiss) against your examples. Look-alike noises get a warning.
  - Bass, lead, keys and pad: sing ("ahh", "ooo"), hum or whistle. Each take's own tuning offset from A=440 is measured and removed first. Notes are the steady pitches you settle on; scoops and slides belong to the note they slide into, and the note changes where a slide passes halfway. Where you slid, the synth slides too (Slides toggle per part). Save take downloads the raw recording (WAV + settings) for troubleshooting. Pitch is tracked and snapped to the detected key and scale; whistling (1-4 kHz) is followed by its own tracker and moved down whole octaves into the part's range. A new take records over the existing part of that instrument unless you choose to add another part.
  - Chords: every tonal part has a Chord setting (Single notes, Triad, 7th, 9th, Power), built from the song's key. Keys, Pad and Arp default to Triad; Bass and Lead to single notes.
  - Arp: sing or draw root notes and each plays its chord as an arpeggio. Controls: Pattern (Up, Down, Up & down, Random), Rate (1/8, 1/16, 1/32), Range (1-3 octaves), Gate. MIDI export contains the arpeggiated notes.
  - Editing notes: tap a note to select it, then drag it to a new step or pitch (snapped to the key), drag its end to trim or extend it, or use the edit bar (move, up/down through the key, shorter/longer, delete). Press and drag on an empty spot to draw a new note.
  - Each part gets its own sound, volume, pan, reverb, tone, octave and nudge controls, plus an editable grid. Master swing, room, drive and punch.
  - Styles: one tap sets every part's sound, the vocal preset and the mix for Pop, Hip hop, EDM, Rock or Lo-fi. More sounds per instrument (supersaw, guitar, piano, stab, choir, sweep, 808 glide, synth bass, rock bass) and EDM / Rock drum kits and vocal presets. Loops can be up to 16 bars.
  - Share your song: Share audio (WAV) or Share video (a vertical clip of the parts moving to the beat, recorded in real time; MP4 where supported) through the phone's share sheet, or Save to Files.
  - Producer pack (.zip): a folder named with tempo and key containing every part as a 24-bit WAV from bar 1 (same length), the full mix, processed and raw vocals, MIDI per part plus All parts.mid (tempo, 4/4, key signature, named tracks; drums on GM notes) and a README with import steps for Logic, Ableton, FL Studio and GarageBand.
  - Vocals: records your voice as audio (the other parts play while you sing) and runs it through a pop / hip-hop chain: Tune (pitch correction to the song's key with PSOLA; 100% is the hard-tuned sound), Low cut, Presence, Air, Compression, Double (stereo doubling), Echo (1/8-note delay), plus pan and reverb. Presets: Pop, Hip hop, Hard tune, Natural. The editor shows the waveform with your pitch and the tuned pitch. Vocal takes are saved in the browser (IndexedDB) so they survive a reload; MIDI export skips them.
  - Layout: a bottom bar holds Undo, Redo, Play and Record (labeled with the chosen instrument). Record opens a full-screen record screen (options, count-in, then a review with Keep, Retry or Discard; calibration and teaching run there too). Parts are slim rows with a pattern preview, volume, mute and solo; tap one to open its full-screen editor (bar numbers, wider grid when the phone is sideways). Undo/redo covers every change, including deleted parts and their takes.
  - Wear headphones while recording. Timing & mic has a clap-along calibration for mic delay.

The Two Thumbs Up games have a ⚙ button with live tuning sliders, saved in your browser.

`climber/` and `climber-classic/` just forward to the new addresses.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Deploy

Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`.
