# Noodle style guide (UI, UX and copy)

The owner's rules, gathered from reviews. Read this before any UI or copy change, and check the result against it with screenshots
(iPhone 13 size, dark and light). Keep it current: when a review adds, changes or drops a rule, add, edit or delete it here.

## Words
- **Name things, don't describe them.** A control's label is a short name for what it is (2-3 words): "Silent metronome", "Tap pad",
  "Echo cancellation". Not a sentence ("Feel the beat while recording: ..."), not a colon or a parenthetical in a label.
- **Explanations go behind an ⓘ** next to the name, never as a sentence under every control. Most people shouldn't need it.
- **Plain, specific words a beginner knows.** Avoid jargon ("haptic", "quantize", "envelope") in labels; avoid AI-sounding copy:
  no "Let's...", "magic", "seamlessly", "effortlessly", exclamation marks, emoji, or chatty asides.
- **The same word for the same thing everywhere:** song (never project), track, part, note, hit, section, preset, take.
- **Buttons say what happens:** a verb and its object. "Save kit as a preset", "Delete song", "Keep it", "Mark a section".
  Avoid "Add" where it could mean something else (say "Mark a section", not "Add section").
- **Short help text.** Editor tips are one line ("Tap to add a hit. Drag to move."). Toasts are one or two short sentences.

## Look
- **Buttons look like buttons:** filled (primary, one per screen) or outlined (secondary). Never bare text for an action. Rows that
  open something have a chevron.
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

## Layout and behaviour
- **Progressive disclosure:** the basics a beginner needs are on the first screen; the rest is under More settings or •••.
  Pitch correction stays visible on vocals.
- **One control per job on a screen:** no two buttons that do the same thing.
- **Choices:** 2-4 options are a row of buttons (segmented); more than that opens a list. Lists stay open so you can tap through
  and hear each option, with Done to go back.
- **Fixed frame:** top bar, track headers and bottom bar never move; only the content scrolls. No rubber-band overscroll.
- **Do it where you see it:** editing that involves the timeline (sections, the playhead) happens on the timeline itself, not in a
  form with dropdowns.
- **Hear before you keep:** sounds, presets and Pro features play on your part while a menu is open.
- **Feedback:** a light haptic for placing things, medium for record start and stop.
- **Big targets while recording:** anything you touch while singing (the tap pad) is huge and easy to hit without looking.

## Process
- Before and after screenshots of every changed screen.
- Run the text check: no sentences under controls, no "project", no uppercase labels, buttons look like buttons.
