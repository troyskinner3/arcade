# Sound credits

Noodle's recorded instruments come from these open libraries. Each library's own LICENSE file was checked before use; only
public domain (CC0) and attribution (CC BY) material is used. CC BY libraries are also credited in the app (More > Sound credits).

| Noodle sound | Library | Author | License | Source |
|---|---|---|---|---|
| Piano | Salamander Grand Piano v3 (Yamaha C5) | Alexander Holm | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | https://github.com/sfzinstruments/SalamanderGrandPiano (originally https://archive.org/details/SalamanderGrandPianoV3) |
| Strings | Violin, viola and cello sections (sustain with vibrato), from VS Chamber Orchestra: Community Edition | Versilian Studios (Sam Gossner, Simon Dalzell; cut by Elan Hickler) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://github.com/sgossner/VSCO-2-CE |
| E-piano | Wurlitzer EP200, from Greg Sullivan's E-Pianos | Greg Sullivan (SFZ mapping by kinwie) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | https://github.com/sfzinstruments/GregSullivan.E-Pianos (originally http://www.sullivang.net/) |
| Rock bass | Growlybass (electric bass, clean) | Karoryfer Samples | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://github.com/sfzinstruments/karoryfer.growlybass |
| Guitar | Emilyguitar (electric guitar, clean) | Karoryfer Samples | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://github.com/sfzinstruments/karoryfer.emilyguitar |
| Rock drums | Big Rusty Drums (24" rock kit) | Karoryfer Samples | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://github.com/sfzinstruments/karoryfer.big-rusty-drums |

What was changed (Piano): notes were trimmed (with a fade-out) to 3.5–8 seconds depending on register, three of the sixteen velocity
layers were kept, and the files were converted to MP3 (`build_samples.py`). Strings: cellos below C3, violas C3–A3, violins from A♯3; the fuller of the dynamics layers; 6 s per note with a crossfaded sustain loop from 2.5 s. E-piano: all four velocity layers kept, mapped and tuned from its SFZ file, mono, converted to MP3. Rock bass and Guitar: mapped from their SFZ files (first round-robin of each note; noise and release samples left out), mono, 4 s per note, MP3; the bass is mapped an octave lower than its SFZ file says, to its true pitch. Guitar plays through a light amp (drive and a speaker-like filter) in the app. Rock drums: kick, snare, sidestick, closed and open hat, three toms, crash and ride; four of each drum's velocity layers, first round robin, its microphones mixed at the levels the kit's own SFZ uses by default, trimmed with a fade, stereo MP3.

Considered and not used: jRhodes3d (its samples are CC BY-NC, non-commercial only); Splendid Grand Piano (labelled public domain,
but listed as made by AKAI, so its origin is unclear); SM Drums (its repository has no license file).
