# Onboarding survey and profile in the app that ships today

Will sent these as screenshots on Oct 27. The shipping app still carries its earlier name, SNIFR, on these screens.
Transcribed here so the refresh can keep what works and fix what breaks Florin's rules.

## Onboarding

1. **Welcome to SNIFR.** "Let's learn about your digestive health to provide personalized insights." A card, "What to
   expect": 14 quick questions about your health; takes about 1 to 3 minutes; your data is private and secure; you can
   skip questions if needed. Each line starts with an emoji. One button: GET STARTED.
2. **Tell Us About You.** Age (number field); Height (feet, inches); Weight (lbs); Biological Sex (Male, Female,
   Prefer not to say, as three full-width choices). CONTINUE, then SKIP THIS QUESTION under it.
3. **What Brings You to SNIFR?** Select all that apply: IBS-D symptoms; Food sensitivities; Digestive discomfort;
   Weight management; Athletic performance; General wellness; Curiosity about my gut. Two-column tiles, all caps.
   CONTINUE and SKIP THIS QUESTION.
4. **What Do You Want to Achieve?** Choose up to 3 goals, with a counter ("Select up to 3 (0/3 selected)"): Reduce
   IBS-D flare-ups; Identify food triggers; Improve digestive comfort; Optimize microbiome health; Support weight
   management; Better understand my gut; Get personalized recommendations; Track patterns over time. CONTINUE and SKIP.
5. **Typical stool consistency**, "Based on the Bristol Stool Scale": a slider from 1 to 7 labelled Hard, Firm, Normal,
   Ideal, Soft, Mushy, Loose, with Hard and Loose at the ends. "Move the slider to select your typical stool type."
6. **What Symptoms Are You Currently Experiencing?** Chips, select all: Bloating; Abdominal pain; Cramping; Urgency;
   Heartburn; Acid reflux; Nausea; Gas; General indigestion; Diarrhea; Constipation; Bloody stool; Mucus in stool;
   Incomplete evacuation; Fatigue; Brain fog; Poor sleep; + Add your own.
7. **What Best Describes Your Eating Pattern?** One choice: Standard Western; Mediterranean; Plant-based/vegetarian;
   Low-carb/keto; Low-FODMAP; Other restrictive diet; No specific pattern.
8. **How Are Your Stress and Sleep Levels?** Both are good; High stress, good sleep; Low stress, poor sleep; Both are
   challenging; It varies a lot.
9. **Any Known Food Triggers?** Dairy/lactose; Gluten; FODMAPs; Spicy foods; Fatty/fried foods; Caffeine; Alcohol;
   Other; None known.
10. **Are You Currently Taking Any of These?** Probiotics; Prebiotics; Digestive enzymes; Antacids/PPIs; Antibiotics
    (past 3 months); Prescription digestive meds; None.
11. **Any Diagnosed Gut Health Conditions?** (Section 13 of 14, with a progress bar): IBS; IBD (Crohn's/ulcerative
    colitis); Celiac disease; Food allergies; Lactose intolerance; SIBO; None.
12. **Help Advance Gut Health Research** (Section 14 of 14): "Would you like to contribute your anonymized data to help
    advance gut health science?" Yes, contribute my anonymized data; No thanks; Decide later.
13. Sections 2, 3 and some others between weren't sent; the progress bar counts 14.

## Profile

A header with the app name, a theme switch and a profile icon. Cards, top to bottom:

- **Profile**, "Your personal information": Name, Email, and an EDIT PROFILE button.
- **Demo Settings**, "Configure demo mode for testing": a Demo Mode switch, "Requires assessment every visit to Insights".
- **Health Survey**, "Manage your comprehensive health profile": UPDATE HEALTH SURVEY.
- Then full-width buttons: Support & Feedback; Terms & Service; Privacy Policy; Delete Profile (red); Log Out (grey).

## What the refresh should change

- Florin's name and voice throughout; no emoji; sentence case, not all caps.
- Goals that promise an outcome break the claims rules: "Reduce IBS-D flare-ups" (treatment), "Optimize microbiome
  health" (a health claim Florin can't measure without hardware), "Improve digestive comfort" (an outcome). Reword as
  what Florin does: know your own usual, see what tends to come before a rough day, find foods worth a 14-day check,
  bring your logs to a clinician, keep a simple record.
- "IBS-D symptoms" as a reason someone came is self-description, not a diagnosis; keep it only as the person's own words
  ("I have IBS-D" or "I've been told I might have IBS"), never as something Florin decides.
- Weight is on the alarm list (weight loss). Asking for it at sign-up invites reading it later; leave it out, or keep it
  optional and never interpreted.
- Biological sex matters for cycle context (47% of women want it). Ask it as optional, with "I have periods" as the
  useful follow-up rather than a demographic.
- A red Delete Profile breaks the app colour rules (no red). Delete stays, quieter, with a confirmation.
- "Demo Settings" belongs to the prototype page, not the app's profile.
- The consistency question names the Bristol Stool Scale (a Rome Foundation instrument: don't name it without a
  licence) and labels steps "Normal" and "Ideal", which reads a person's body against a norm. Use the chosen option's own
  words (C: Pellets to Watery) and ask "Most often, lately?" with "It varies" allowed; it seeds the first usual guess
  only, and the logs take over by day 14.
- "Bloody stool" and "Mucus in stool" as onboarding symptoms are alarm features: choosing blood (or black stools) must
  show the Teal primary-care note right there, never a quiet tick.
- The conditions list names IBD; Florin never mentions IBD. Keep conditions optional, self-reported, and short (IBS,
  celiac disease, lactose intolerance, food allergy, other, none, prefer not to say), never used to label the person.
- Medications and supplements: useful context for a clinician report, never interpreted. Optional.
- Eating pattern, known triggers, stress and sleep: context that can seed what Florin looks at first (known triggers
  become foods to watch, low-FODMAP explains a short food list). Optional, and asked later in context where possible.
- Research consent should be its own clear, revocable choice in Profile, not a survey step.
- 14 questions is long for Marcus (60% of men want setup under 10 minutes). Keep onboarding to what changes the app on
  day 1, and ask the rest later, in context.
