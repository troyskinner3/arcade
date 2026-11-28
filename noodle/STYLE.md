# Noodle style guide (UI, UX and copy)

The owner's rules, gathered from reviews. Read this before any UI or copy change, and check the result against it with screenshots
(iPhone 13 size, dark and light). Keep it current: when a review adds, changes or drops a rule, add, edit or delete it here.

## Words
- **Name things, don't describe them.** A control's label is a short name for what it is (2-3 words): "Silent metronome", "Tap pad",
  "Echo cancellation". Not a sentence ("Feel the beat while recording: ..."), not a colon or a parenthetical in a label.
- **Explanations go behind an ⓘ** next to the name, never as a sentence under every control. Most people shouldn't need it. Tapping
  ⓘ opens a small bubble pointing at it (not a message at the top of the screen); a tap anywhere closes it.
- **Plain, specific words a beginner knows.** Avoid jargon ("haptic", "quantize", "envelope") in labels; avoid AI-sounding copy:
  no "Let's...", "magic", "seamlessly", "effortlessly", exclamation marks, emoji, or chatty asides.
- **The same word for the same thing everywhere:** song (never project), track, part, note, hit, section, preset, take.
- **Buttons say what happens:** a verb and its object. "Save kit as a preset", "Delete song", "Keep it", "Mark a section".
  Avoid "Add" where it could mean something else (say "Mark a section", not "Add section").
- **Short help text.** Editor tips are one line ("Tap to add a hit. Drag to move."). Toasts are one or two short sentences.

## Look
- **Buttons look like buttons:** filled (primary, one per screen) or outlined (secondary). Never bare text for an action (not even
  "Restore purchase" or "Edit"). Menu actions are outlined rows. Rows that open something have a chevron.
- **Every interactive element has a visible edge:** outlined inputs, outlined dropdowns, outlined chips.
- **Dropdowns look like DAW combo boxes:** an outlined, slightly sunken box with the value and a chevron in its own segment. Picking
  opens a list (the same list sheet as Sound ›), not the plain iPhone picker.
- **Destructive actions:** in a confirm, two buttons side by side: a neutral outlined one ("Keep it") and a red filled one
  ("Delete song"). Delete in a ••• menu is red text.
- **Type:** Barlow for text, Barlow Semi Condensed for titles, labels and numbers (tabular figures). No monospace, no spaced-out
  uppercase labels. Unbounded only for the Noodle logo.
- **No "made by AI" look:** avoid generic gradients, glows, emoji icons, pill-everything, and decorative mono type. Take cues from
  audio software (BandLab, Ableton, Logic, Serum): defined edges, clear controls, dense but calm.
- **Different actions look different:** two things that do different jobs must not look alike (the track's arm button is an "R",
  not a second red record button).

- **Selling Pro:** show what you get, grouped by what it's for (cards with example chips), not a bullet list; plain copy, no slogans. The
  buy button is visible as soon as the sheet opens: pinned to the bottom while the cards scroll under it.

## Layout and behaviour
- **Progressive disclosure, always (owner, Nov 2026):** the basics a beginner needs are on the first screen; the rest is under More settings
  or •••. For every new feature or setting, choose a good default and don't show the choice; if some people will want to change it, put it
  under More settings (e.g. Vinyl brake → More settings → Catching up). Never add a control to the first screen when a default will do.
  Where it's applied: Mic and timing (two basics; the rest under More settings), every Mix effect's own settings, a Transition's left /
  right and octave, Musical / As heard in the note editor's •••, the DAW pack last in Share, and first run (straight to the Studio; each
  question asked once, when it makes sense).
- **More settings starts closed every time** a sheet opens (it isn't remembered), and inside it only the everyday controls show; groups such as
  Effects, Your kit and Voice are sections that open in place with a summary of what's on ("Off", "Echo, Drive"), not another screen
  (owner, 26 Nov). No heading over a single control.
- **A button that can't do anything right now is greyed out**, not tappable with an error message after ("This part has no other likely
  version"). Its ⓘ stays tappable.
- **An ⓘ sits right after the control it explains**, never between two controls.
- **Note editing follows the big editors:** both ends of a note can be dragged; a note stretched or moved into another at the same pitch
  pushes that one's start later (and removes it once covered), live while dragging; different pitches overlap freely. The grid scrolls
  up and down through every octave with the keys, and Octave − / + moves selected notes.
- **After a pick, the next step is pinned:** when choosing something in a sheet has an obvious next step ("Use this beat"), that button is
  pinned to the bottom of the sheet as soon as something is picked (as Get Pro is in the Pro sheet), so finishing never needs a scroll
  (owner, 26 Nov).
- **Features live where they're used:** a way to record (pads, Play pad, Tap a rhythm) belongs to Record on a track, not to Add track as if it
  were another track type. Ask at the moment it matters (the first Record on a track), remember the answer, and let it be changed in the
  track's sheet (owner, 26 Nov).
- **Name the input, not the activity:** "Mic" (people hum, sing, whistle or beatbox into it), not "Sing".
- **Lists of options are compact rows, not big cards:** an icon, a plain name and at most a short muted tag ("WAV", "Audio + MIDI"); no
  sentence under each, no marketing copy ("For TikTok, Reels and YouTube: ..."). Anything more goes behind an ⓘ (owner, 26 Nov: the Share
  sheet looked AI-generated).
- **Things Noodle reads are picked, not typed:** a section's type comes from a list (Finish song uses it); repeats are numbered for you.
- **Rows line up:** a control that one row doesn't have leaves its space empty, so the others stay in the same column (a Mix effects track
  has no R, and its M and S sit where every other track's are).
- **Don't show a button that has nothing to act on** (Copy on an empty spot); show the action that fits instead (Paste here).
- **The screen shows what you hear:** the playhead follows the sound coming out of the phone, not the audio being prepared.
- **No page zoom:** no double-tap zoom anywhere; no pinch zoom in the app (the website keeps pinch for people who need it).
- **A tool that changes what a finger does shows it's on:** Draw turns amber, the hint line says what to do, and it turns off when you
  leave the editor.
- **Plain names for effect settings:** Speed, Tone, Echo length, Repeats (not LFO rate, center frequency, delay time, feedback).
  Pitch correction stays visible on vocals.
- **One control per job on a screen:** no two buttons that do the same thing.
- **Every setting a beginner might not understand has an ⓘ** (sliders too, like Mic sensitivity).
- **A group heading sits above everything in its group**, cards included.
- **Choices:** 2-4 options are a row of buttons (segmented); more than that opens a list. Lists stay open so you can tap through
  and hear each option, with Done to go back.
- **Fixed frame:** top bar, track headers and bottom bar never move; only the content scrolls. No rubber-band overscroll.
- **Do it where you see it:** editing that involves the timeline (sections, the playhead) happens on the timeline itself, not in a
  form with dropdowns.
- **Don't bury things:** an action goes where people look for it (entering someone's invite code is its own row, not inside
  Invite friends).
- **Hear before you keep:** sounds, presets and Pro features play on your part while a menu is open. The line under a Pro
  preview says what it is and how to keep it: "Previewing Horns. Add to your song with Pro." (not "Trying ... It plays while ...").
- **Common actions stay in sight:** Delete track is a red trash button next to •••, not hidden in the menu (Undo brings it back).
- **Tapping empty space deselects:** a tap on the empty area under the tracks clears the selected part or empty spot.
- **One Loop button:** with a part selected it loops that part, with nothing selected the whole song. Whatever loops shows as
  the yellow band on the ruler; tapping the band stops it.
- **Settings for one part live in that part's editor** (drum fills in the drum editor), not in the track's sheet.
- **Effects sit in the background:** a new Transitions effect starts at volume 40.
- **Names say what something is for:** Transitions (risers, sweeps, impacts you make with your mouth) and Mix effects (filters and effects
  across the whole song), under the FX heading in Add track. Not "Sound FX" / "Song FX" (too alike), not "Ear candy".
- **Track names follow the pick:** a track is named after the sound or effect chosen ("Bell", "Phaser", "Punchy kit", "Pop vocals") until
  someone types a name, which is never changed. Until a pick, or when its parts differ, it shows the type ("Lead", "Mix effects").
- **Every part editor has bar numbers on top** (the song's bars), tap or drag them to move the playhead.
- **Whole-number settings show whole numbers** ("4 bit", not "4.00 bit").
- **Light and dark are both real themes:** light is a near-white page with white cards and a light tab bar (not mid-grey); nothing stays dark
  in light mode except readouts that are meant to look like a display (the position counter). The strip behind the status bar follows the theme.
- **Ask for trust after value:** the share-takes question comes after the first kept take, not on first open.
- **Noodle speaks as "Noodle"**, never "I".
- **Errors say what to do next:** "Noodle can't hear you" with Open Settings and Import a recording, not a toast that hides the way out.
  Offline is not "gone": say to check the connection.
- **Checkbox and switch labels are names too** ("Count-in chord" with ⓘ, not "Play the home chord during the count-in").
- **VoiceOver:** every control has a name; an ⓘ reads its explanation aloud (its label is the bubble's text).
- **Outlined buttons stay outlined everywhere**, in the Studio and in sheets ("Start from a beat", "Tap the beat").
- **Feedback:** a light haptic for placing things, medium for record start and stop.
- **Big targets while recording:** anything you touch while singing (the tap pad) is huge and easy to hit without looking.
- What you play live (pads, tapped notes) sounds exactly like what plays back afterwards: same sound, level, effects and settings (owner, 28 Nov).

## Process
- Before and after screenshots of every changed screen.
- Run the text check: no sentences under controls, no "project", no uppercase labels, buttons look like buttons.
