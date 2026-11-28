<overview>
Noodle (repo troyskinner3/arcade: web app in noodle/, iPhone shell in noodle-ios/, takes service in noodle-api/) is my iPhone music app. Pro is a one-time $4.99 purchase. For launch we want growth over money (plan: noodle/GROWTH.md). Agreed offers, in order:
1. **Founding 250:** the first 250 people who make a song get Pro free for life.
2. **Founder gifts:** each founder can give 2 friends Pro. Gifted friends are standard users, not founders: they don't take a founding spot and get no gifts of their own (no chains). Worst case 750 free Pro.
3. **Invite deal:** once the founding spots are gone, for one calendar month (picked later), 1 friend who makes a song earns the inviter Pro instead of the usual 3. Then back to 3.
A second founding batch is possible later, only after looking at how many gifts were used.

I'd like you to be my lead engineer on this: work out how to give Pro safely and fairly, build it on what exists, and make the numbers visible.
</overview>

<rules>
Don't do anything that costs money or creates security risks. Abuse is the main risk: one person faking phones to collect free Pro, or anyone being able to claim or hand out codes they shouldn't. You may suggest things that cost money or carry risk for me to approve.

Research before big conclusions (Apple offer codes for non-consumables today, App Review rules on free unlocks and giveaways, how StoreKit redemption works). Don't rely on memory alone.

Read CLAUDE.md and the docs it names first (noodle/ROADMAP.md, PRO.md, STYLE.md, GROWTH.md, noodle-api/README.md). Follow its rules: PRO.md must list the offers (mark "proposed" until I confirm wording), analytics with every change, the three privacy files, STYLE.md for UI and copy, sync-web.sh and the eval suite, merge to main after each round. The takes service deploys by hand only and has its own session: say so before changing noodle-api/. Keep changes focused.

I work a full-time job, about 5–10 hours a week, often from my phone. Keep responses short. When you need answers, give a numbered list and restate every open question in full each time. Document decisions in the repo and keep a list of agreed action items. Ask me clarifying questions.
</rules>

<inputs to consider (from the growth-planning session; check and challenge them)>
- An invite system already exists (takes service `/v1/invites/*`, page `/i/<code>`): a code per phone, friends counted once (hashed IDs), 3 friends who make a song earn an App Store offer code; invites are refused until the DeviceCheck key is set (ROADMAP §7). Reuse it.
- Apple offer codes (checked 27 Nov): available for non-consumables, up to 1 million codes per app per quarter, one-time codes expire after at most 6 months, so hand each out when earned.
- Counting a founder at "made a song" (`first_song2`) keeps the spots for real users. The founding spot number could be shown to the founder ("Founder #37") as something fun to share.
- Show spots left only once fewer than ~50 remain, so a slow start doesn't look lame.
- Events to plan: founder spot claimed (number), gift sent, gift redeemed, invite-deal reward earned; dashboard shows spots left, gifts used, how many gifted friends make a song.
- Website has no Pro (it can't be bought there); decide what founders who use the web get.
</inputs to consider>

<goal>
Before launch: the offers work end to end on TestFlight (sandbox), can't easily be abused, and I can see the counts on the dashboard. We agree on the wording people see and when each offer switches on and off.

Does this make sense? Ask me anything you need to get started.
</goal>
