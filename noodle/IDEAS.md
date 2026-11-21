# Noodle: potential future ideas

Tabled ideas, kept for later. Not planned or built. Each says what it is and what it would take.

## Using the touchscreen, camera and motion while recording
- **Strum chords:** on a chord track, swipe across the screen to strum the chord at that moment; swipe speed sets how hard,
  direction sets up or down. Turns "chords from your melody" into something you play.
- **Thumb effects pad:** a one-thumb pad while recording; one direction moves the filter, the other the amount. Recorded as a
  moving effect curve (track effects already support curves).
- **Face tracking:** the front camera follows mouth openness, jaw and eyebrows (ARKit on iPhones with Face ID) to shape sounds
  (filter, vibrato, brightness). Mouth closing ("mm", "b") could also tell the reader when a note ends, which helps in noisy rooms.
  Needs native iPhone code, and face data handled on the phone only and declared in the privacy policy. Many people won't want the
  camera on while singing, so it would be opt-in (a fun Pro feature).
- **Tilt for expression:** tilt the phone for pitch bend or vibrato on a lead. Easy to trigger by accident while singing: opt-in.
- **Nod for tempo:** the camera or motion sensors catch head bobbing before recording and set the tempo (tap tempo covers this today).

## Being discussed or built (see the conversation and eval/README.md)
- Felt metronome (count-in clicks and buzzes, then buzz only while recording).
- Hold to sing (finger down starts a note, up ends it; slides while held glide as one note).
- Beat pads (Voice or Pads when recording drums; optional shake for shaker and knock for kick).
