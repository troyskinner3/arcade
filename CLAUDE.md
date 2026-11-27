# arcade (Noodle and small games)

## Noodle (`noodle/`, iPhone shell `noodle-ios/`)
- **UI, UX and copy:** follow `noodle/STYLE.md` (the owner's rules: name things plainly with ⓘ for explanations, buttons look like
  buttons, outlined dropdowns, progressive disclosure, no AI-sounding copy or look). Add new rules from reviews there.
- **Free vs Pro:** `noodle/PRO.md` is the list of what is free and what Noodle Pro unlocks. Every time a feature is added or changed, add it
  there and suggest to the owner whether it should be free or Pro (ask when unsure); mark it "proposed" until the owner confirms.
  The code that enforces it (`PRO_SOUNDS`, `MFX[...].free`, `isPro()` checks) must match the list.
- **Launch roadmap:** `noodle/ROADMAP.md` is the running pre-launch list. Tick items off and add new ones as work lands.
- **Growth and marketing:** `noodle/GROWTH.md` is the launch and growth plan (phases, channels, funnel tracking, results log). Read it
  before any marketing, launch or growth work; log results there.
- Before committing Noodle changes, run `noodle-ios/sync-web.sh` so the iPhone app's bundled copy (`noodle-ios/NoodleWeb/web`) matches.
- Pushing `main` deploys the website (GitHub Pages). The takes service (`noodle-api/`) deploys by hand only: see its README.
- **Merge to `main` after every round of updates** (owner's standing instruction): once `bash noodle/eval/run.sh` ends ALL PASS, commit,
  push the working branch, open a pull request and merge it, so the next TestFlight build has the changes. No need to ask each time.
- Privacy: `noodle-ios/NoodleWeb/PrivacyInfo.xcprivacy`, `noodle/privacy/` and `noodle-ios/APP_STORE_PRIVACY.md` must match whatever Noodle sends.
- Tests: `bash noodle/eval/run.sh` must end ALL PASS before committing Noodle changes. The evaluation log is `noodle/eval/README.md` (every round).
