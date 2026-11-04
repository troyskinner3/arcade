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

- **Mouth Machine** (`mouth-machine/`, mobile and desktop): a beatbox-to-beat studio. Pick an instrument, record a part with the mic (with count-in and metronome) or import a voice memo, and it becomes real instruments.
  - Drums: beatbox the whole kit in one take (default B = kick, ch = snare, k = clap, ts = hi-hat) or record each drum on its own. Drum takes layer onto the same Drums part (one grid; Undo last take removes a layer). Hits snap to 16th (or 8th) notes.
  - Your kit (on the Drum kit pad): up to 12 slots, each playing one of 19 synthesized sounds (toms, rim, cowbell, shaker, crash, ride, 808 boom…) or "My own noise" (your taught recording). Teach each slot your trigger noise with a short take on the click; hits are then sorted by comparing a spectral fingerprint (tone shape at the attack and body, plus length, brightness, bass and hiss) against your examples. Look-alike noises get a warning.
  - Bass, lead, keys and pad: hum or whistle. Pitch is tracked and snapped to the detected key and scale; whistling (1-4 kHz) is followed by its own tracker and moved down whole octaves into the part's range. A new take records over the existing part of that instrument unless you choose to add another part.
  - Chords: Keys and Pad play each note as a triad built from the key (on by default, toggle per part); Bass and Lead stay single notes unless switched on.
  - Drawing notes: press and drag to draw a long note, drag a note's end to resize it or its middle to move it, tap to delete. Drawn notes stay exactly where you put them.
  - Each part gets its own sound, volume, pan, reverb, tone, octave and nudge controls, plus an editable grid. Master swing, room, drive and punch.
  - Export a .zip with the mix WAV, dry stems and a MIDI file. Parts (not the recordings) are saved in `localStorage`.
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
