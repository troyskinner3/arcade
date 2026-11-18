# Sound credits

Noodle's recorded instruments come from these open libraries. Each library's own LICENSE file was checked before use; only
public domain (CC0) and attribution (CC BY) material is used. CC BY libraries are also credited in the app (More > Sound credits).

| Noodle sound | Library | Author | License | Source |
|---|---|---|---|---|
| Piano | Salamander Grand Piano v3 (Yamaha C5) | Alexander Holm | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | https://github.com/sfzinstruments/SalamanderGrandPiano (originally https://archive.org/details/SalamanderGrandPianoV3) |
| E-piano | Wurlitzer EP200, from Greg Sullivan's E-Pianos | Greg Sullivan (SFZ mapping by kinwie) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | https://github.com/sfzinstruments/GregSullivan.E-Pianos (originally http://www.sullivang.net/) |

What was changed (Piano): notes were trimmed (with a fade-out) to 3.5–8 seconds depending on register, three of the sixteen velocity
layers were kept, and the files were converted to MP3 (`build_samples.py`). E-piano: all four velocity layers kept, mapped and tuned from its SFZ file, mono, converted to MP3.

Considered and not used: jRhodes3d (its samples are CC BY-NC, non-commercial only); Splendid Grand Piano (labelled public domain,
but listed as made by AKAI, so its origin is unclear).
