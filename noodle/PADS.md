# Pads (Note pads, Chord pads, Drum pads, Play pad)

Ways to record into an instrument track: the track's Record asks once how to record (Mic or a pad); "Record with" in the track's sheet
changes it. Code: `noodle/js/beats.js` (`tapOpen`, `tapSound`, `xyMount`, `padVoice`, `padBus`). Free and Pro: `PRO.md` (Play pad free,
its settings Pro). Sending the pads to a computer: `DAW.md`.

## Decisions
- **Pads record notes (MIDI), not audio** (owner, 28 Nov: "I'd prefer midi"). A Kaossilator records the sound it outputs; Noodle keeps
  the notes so the part stays editable (move notes, change the sound, the key, the envelope) and small, and so Send to computer can play
  them into a DAW. Agreed.
- **What you play live sounds the same as the part it makes** (owner, 28 Nov: the live pad and the timeline didn't sound the same).
  Since 28 Nov the live sound is made the way the part is rendered: the lane's volume, pan, reverb, effects (drive, chorus, echo) and
  envelope; its brightness; its chord type; guitar strums; glides; the same loudness for chords; a lifted finger rings out by the sound's
  own release; mono sounds made stereo first, as a rendered part is. `padmatch_test` compares the two (loudness over time, level,
  brightness). What can't be identical: Mix effects that only play with the song, and noise in drums (random each time, same sound).
- **Every setting a finger moves on a pad is recorded as a curve and plays back as played** (owner, 28 Nov: "that's really the core
  value / fun / creative aspect of the play pad", and "this should go for all future versions of the pad too when we add different
  styles and effects"). Agreed rule for every pad, now and later:
  - each setting is one entry in `MODS` (`js/instruments.js`): the audio node it moves, how 0..1 maps to it, how fast it follows, and its
    MIDI controller;
  - the pad sounds it live through that node (`padBus`, `padMod`) and records it in a take (`T.mod`), kept with the part as
    `tr.mods = {key: [[step, value, jump], ...]}` (steps from the part's start, like notes);
  - the part plays it back through the same node and mapping (`renderStem`), so live and timeline match; trims and splits move it with
    the notes (`modsCut`, `modsShift`); MIDI export writes it as the controller (Brightness = CC 74, the same one Send to computer sends
    live); a song file's curves are checked before use (`modPts`).
  - A new pad style or effect adds a `MODS` entry and calls `padMod` when the finger moves it; nothing else is needed for it to be
    recorded, played back, trimmed and exported.
- **Play pad: up and down = Brightness** (a low-pass filter, 400 Hz to 9.4 kHz), swept live while you hold a note and kept as the
  part's curve (the sweep from before 28 Nov, now recorded). Each note also starts with the brightness it began with (`nt.tn`).
- Usage: a kept pad take sends `take` with label `<instrument> <pad>` (e.g. `lead xy`) and, for the Play pad, how many sweep points it
  has (is the sweep used?). Privacy page updated.

- **Sweep free; editing curves Pro** (owner, 28 Nov): the Play pad sweep stays free. Editing the curves (automation) directly in the
  timeline or note editor is wanted, as an advanced setting for Noodle Pro only. Not built yet (ROADMAP).

## Open questions
- None open.

## Feedback log
- 28 Nov: the Play pad sweep is kept and plays back (above). After switching apps, the Play pad's sound came about a second late until
  the pad was closed: the audio's delay check now runs on every screen and while playing (see `eval/README.md`, round 31).
- 28 Nov: the pads made no sound the first time a track was armed with the Play pad (fixed 27 Nov with the silent-after-Pause fix,
  `liveIn`; `padsound_test`). The live sound and the timeline differed (fixed 28 Nov, above).
