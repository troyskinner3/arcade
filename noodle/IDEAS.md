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

- **Hold to sing (owner unsure: may over-complicate things):** finger down starts a note, lifting ends it; a slide while the finger
  stays down glides as one note with no new attack (needs a "joined to the previous note" flag and gliding playback). Today the tap pad
  only splits notes the mic heard as one.

## Being discussed
- Beat pads: Voice or Pads when recording drums; six pads (Kick, Snare, Hat, Open hat, Clap, Tom); optional shake for a shaker and knock
  for a kick; Play pads in the drum editor to add hits over a looping beat. Waiting for the owner's OK on the plan.

## Built
- Silent metronome (iPhone app): the count-in clicks and buzzes, then only the buzz while recording.
