# Florin app refresh: data display research

October 12, 2026. Research for the manual-logging app refresh: how Oura and Function Health show data, how GI apps log bowel movements, and how weekly IBS check-ins work. Items marked "unverified" couldn't be confirmed from a primary source.

## 1. Oura (2024 to 2026)

- Three tabs since the October 2025 redesign: Today, Vitals and My Health replaced Home, Readiness, Sleep, Activity and Resilience.
- Today reads like a news app's top stories. Score shortcuts (Sleep, Readiness, Activity, heart rate, Daytime Stress, Cycle), then one daily highlight that changes with the time of day, then a timeline you can add tags and activities to, then Discoveries.
- Vitals has one card per metric, each showing your personal baseline. A down-arrow expands the top contributors inline. A side-arrow opens the full detail. Swipe between metric details.
- My Health holds slow-moving metrics (Cardiovascular Age, Resilience), long-term graphs, and weekly, quarterly and yearly reports you can share with a clinician.
- Score bands: 85 to 100 Optimal, 70 to 84 Good, 60 to 69 Fair, 0 to 59 Pay attention. A weak contributor shows a red bar with "Pay attention". Whether every contributor carries a word label: unverified.
- Baselines are explained in plain terms. Resting heart rate against the past 2 months. HRV balance, 14 days against 3 months. Temperature as a +/- deviation, where 0.0 means "your usual". Up to 2 weeks of learning before it judges anything.
- Trend graphs: a Day, Week, Month and Year toggle. The current value large at top left, the average small beside it. Dotted lines mark unreliable data.
- Colour shifts with your biometrics as a glanceable cue.
- Tags and Discoveries: a Discovery appears only after a tag is used about 5 to 40 times, with 14 days of data in the last 30. It is one sentence ("Your sleep efficiency lowers after you tag alcohol"), split into yours and community, with a "not guaranteed for you" caveat.
- Oura Advisor, the in-app AI chat: opened from a "+" at the bottom right of Today, and from My Health. It reads scores, contributors, the last 7 days of tags, the profile and saved memories, which the person can view and delete. Opt-in check-in notifications at a frequency and time the person picks. Answers include charts. A same-day thread resumes. Suggested prompts: unverified.
- The weekly report is a dismissible card on Today, archived under Reports: average scores plus contributor trend charts.

## 2. Function Health

- Home opens with summary counts ("100 in range, 14 out of range"), filling in as results arrive. A third bucket, "other", holds markers with no optimal range.
- Results are grouped by category (Heart, Thyroid, Liver, Kidneys, Nutrients), each with in and out counts, expanding into a category summary.
- Each marker row shows the value, its status and a small sparkline across testing rounds.
- Status words: "In range", "Out of range", "above range", "below range", on a colour-coded range graph. Exact colours unverified (one review says green, yellow, red).
- Two range systems: the standard lab range by default, the tighter "optimal" range only on the detail page. Users complain there's no toggle.
- Detail page: your value, the range graph, "Why it matters", ways to support it (food, supplements, lifestyle) and the trend. Reviewers find the amount of text overwhelming.
- Pending is a normal state: markers waiting on results say "pending", not an error.
- Clinician notes arrive after all results (about 28 days): strengths, areas to watch, recommendations, by category, tied to intake goals.
- Action plan (labelled alpha): foods to enjoy, limit and avoid, top five first.
- Recent additions: a private AI chat about results, Protocols, wearable integration. A visual redesign is unverified.

## 3. Bowel movement logging in GI apps

- Bristol types 1 to 7 are standard. Apps claim "2 taps" (Bellyx) or "a few taps" (Stool Log). Whether pickers use illustrations or icons: unverified.
- GutLog keeps its visual Bristol guide behind an (i) instead of crowding the picker.
- Stool Log makes every extra optional, added "only when you want to": urgency, pain, colour, amount, blood, mucus, straining, incomplete emptying.
- Logging without opening the app: home and lock screen widgets, Control Center, Siri, an Apple Watch one-tap log (Stool Log, Bellyx, GutLog).
- Catch-up logging: CareClinic records several bowel movements and symptoms in one session.
- Days with nothing to log: GutLog has a journal. Throne's guidance says to log no-BM days explicitly.
- Throne's guidance on what to record: the type number, not a description. Urgency, straining and incomplete emptying as three separate items. Blood or mucus flagged every time.
- Bowelle uses its own 1 to 5 scale and was criticised by a clinical reviewer for not matching Bristol.
- Sliders: the only slider example found is research grade (a 100-point slider, 4 times a day), which participants found heavy. Chips for urgency are an inference, not a confirmed app pattern.
- Insights in these apps: 7, 30 and 90-day charts of stool type, frequency and urgency, with "possible links" to food.

## 4. Weekly IBS check-ins

- **IBS-SSS:** recall "the last 10 days or so". Pain yes/no, pain severity 0 to 100, days with pain out of 10, bloating yes/no and severity 0 to 100, satisfaction with bowel habits 0 to 100, interference with life 0 to 100. Five scores sum to 0 to 500. Bands: under 75 remission, 75 to 175 mild, 175 to 300 moderate, over 300 severe. A 50-point change counts as meaningful. On the Rome Foundation's license list (July 2026).
- **IBS-VAS:** 7 items on 0 to 100 lines. Nerva uses an IBS-VAS subset at onboarding, weekly and at program end. Licensing unverified.
- **GSRS-IBS:** 13 items about the past week, 7 answer options each. AstraZeneca copyright, permission required.
- **IBS-QOL:** 34 items, quality of life rather than symptoms, distributed through Mapi. Too long for a weekly check.
- **PROMIS GI:** 8 scales (diarrhea 5 items, belly pain 6, gas and bloating 12, incontinence 4). English has no fee but needs a license; commercial use carries fees.
- **Rome IV and Rome V** questionnaires are diagnostic and licensed.
- **Delivery patterns:** Oura's weekly report as a dismissible Today card, archived in Reports. Opt-in check-ins at a chosen frequency and time. Nerva: baseline, weekly, end. Ayble: event-triggered surveys and goal streaks.

## Steal this for Florin

1. "Your usual" on every card, in words: "Your usual: 1 to 2 a day, mostly type 4 to 5." For the first 14 days, a "learning your usual" state instead of a judgment.
2. Two drill-down affordances: a down-arrow expands "what shaped this week" inline, a side-arrow opens the full detail. Swipe between metrics.
3. One daily highlight on Today: a single sentence from the person's own logs.
4. Discoveries as plain sentences, only after a food or tag shows up 5 or more times, phrased "tends to follow", never "causes", with an empty state that says how many more logs it needs.
5. Summary counts in the person's terms: "This week: 9 of 14 in your usual range", with rows for Stool, Symptoms and Meals, each with a sparkline.
6. One detail template: value against your range, the trend, then "Why it matters" collapsed by default. No wall of text.
7. A Bristol row of 7 chips with abstract icons, plain one-liners and an (i) guide. Urgency as chips. "Add details" collapsed. A "No BM today" button. Catch-up logging.
8. Ask Florin with memories the person can see and delete, opt-in check-ins, and small charts in answers.
9. A weekly check-in of 5 questions or fewer, as a dismissible Today card, archived with the weekly report, shown as change against the person's own first weeks.
10. One range only: the person's own. No standard vs optimal confusion.

## Watch out

- **Licensing.** The research found the Bristol Stool Form Scale and IBS-SSS on the Rome Foundation's license list, and Rome says its instruments can't be altered without permission. Confirm before shipping Bristol imagery or wording, and before turning IBS-SSS lines into chips. Without a license, don't name or score these scales.
- GSRS-IBS, IBS-QOL and PROMIS all need permission or a license.
- Severity bands and Rome questionnaires are clinical labels. They break the "your own usual, never normal" rule and the no-diagnosis position.
- No red, no pass or fail. Function's "out of range" and Oura's red "Pay attention" can alarm people.
- Manual logs are sparse. Gate patterns on minimum repeats and say "possible pattern", or the coach overclaims.
- Keep chat numbers in sync with the screens. Oura admits Advisor's data "may not always match".
- Keep the disclaimer and the referral path. Blood or mucus goes to a clinician, not to interpretation.

## Sources

- **Oura:** ouraring.com/blog/new-oura-app-experience · 9to5google.com/2025/10/20/oura-app-redesign · support.ouraring.com/hc/en-us/articles/39512345699219 · ouraring.com/blog/how-to-use-oura-advisor · support.ouraring.com/hc/en-us/articles/360057791533 · ouraring.com/blog/readiness-score · support.ouraring.com/hc/en-us/articles/360055983614 · support.ouraring.com/hc/en-us/articles/4410656562579 · ouraring.com/blog/discoveries
- **Function Health:** apps.apple.com/us/app/function-health/id6471280307 · healnourishgrow.com/function-health-review · dannb.org/blog/2025/function-health · organicallybecca.com/function-health-membership-review · usebetterproducts.com/function-health-review · surges.co/guides/function-health-review
- **BM logging:** App Store listings for Stool Log, Bellyx and GutLog · healthify.nz (Bowelle, Cara Care) · thronescience.com/blogs/signals/my-doctor-told-me-to-log-my-poop-now-what · gi.org/?p=3851
- **Check-ins and licensing:** repository.niddk.nih.gov (IBS-SSS form) · theromefoundation.org/copyright-and-licensing · Rome Foundation instruments list, July 2026 · AstraZeneca GSRS-IBS · depts.washington.edu/seaqol/IBSQOL · facit.org (PROMIS) · nervahealth.com/article/nerva-symptom-improvement · mapi-trust.org/services/questionnaire-licensing
