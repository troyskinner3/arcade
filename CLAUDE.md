# arcade (Noodle and small games)

## Noodle (`noodle/`, iPhone shell `noodle-ios/`)
- **Free vs Pro:** `noodle/PRO.md` is the list of what is free and what Noodle Pro unlocks. Every time a feature is added or changed, add it
  there and suggest to the owner whether it should be free or Pro (ask when unsure); mark it "proposed" until the owner confirms.
  The code that enforces it (`PRO_SOUNDS`, `MFX[...].free`, `isPro()` checks) must match the list.
- Before committing Noodle changes, run `noodle-ios/sync-web.sh` so the iPhone app's bundled copy (`noodle-ios/NoodleWeb/web`) matches.
- Pushing `main` deploys the website (GitHub Pages). The takes service (`noodle-api/`) deploys by hand only: see its README.
- Privacy: `noodle-ios/NoodleWeb/PrivacyInfo.xcprivacy`, `noodle/privacy/` and `noodle-ios/APP_STORE_PRIVACY.md` must match whatever Noodle sends.
- Tests and the evaluation log: `noodle/eval/` (README has every round).
