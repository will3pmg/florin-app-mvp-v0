/* The studio's 22 claims rules, copied from js/data-brand.js (claimsRules) so the prototype can run the same live check.
   Keep in sync with the studio: the studio is the source of truth. */
window.FLORIN = Object.assign(window.FLORIN || {}, {
  claimsRules: [
    {
      "id": "predict",
      "sev": "high",
      "re": "\\bpredict(s|ed|ing|ion|ions|ive)?\\b",
      "why": "Prediction is a medical claim we can't substantiate yet.",
      "fix": "spots patterns that may come before a rough day"
    },
    {
      "id": "warning",
      "sev": "high",
      "re": "\\bearly[- ]warning(s)?\\b|\\bwarns? you\\b",
      "why": "Warning language implies prediction.",
      "fix": "shows you when things shift"
    },
    {
      "id": "diagnose",
      "sev": "high",
      "re": "\\bdiagnos(e|es|ed|is|tic|ing)\\b",
      "why": "Wellness devices never diagnose.",
      "fix": "helps you understand your gut patterns"
    },
    {
      "id": "treat",
      "sev": "high",
      "re": "\\b(treat|treats|treating|treatment|cure|cures|cured)\\b",
      "why": "Treatment and cure claims cross into medical device territory.",
      "fix": "supports the conversations you have with your doctor"
    },
    {
      "id": "proven",
      "sev": "high",
      "re": "\\bclinically (proven|validated|tested)\\b|\\bmedical[- ]grade\\b|\\bFDA[- ](approved|cleared)\\b",
      "why": "Unsupported validation claim.",
      "fix": "built on published VOC research"
    },
    {
      "id": "detect",
      "sev": "high",
      "re": "\\bdetect(s|ed|ing|ion)?\\b[^.]{0,40}\\b(inflammation|disease|cancer|infection|SIBO|IBD)\\b",
      "why": "Detecting a condition is diagnostic.",
      "fix": "tracks signals linked to gut activity"
    },
    {
      "id": "doctor",
      "sev": "high",
      "re": "\\bdoctor[- ]recommended\\b|\\bgastroenterologist[- ]approved\\b",
      "why": "Needs documented endorsement.",
      "fix": "designed to share with your provider"
    },
    {
      "id": "ibd",
      "sev": "high",
      "re": "\\bIBD\\b|\\bCrohn'?s\\b|\\bulcerative colitis\\b",
      "why": "IBD is an excluded audience for compliance.",
      "fix": "remove, or say 'digestive issues'"
    },
    {
      "id": "microbiome",
      "sev": "med",
      "re": "\\breads? (your )?microbiome\\b|\\bmicrobiome (test|analysis)\\b",
      "why": "Overstates what gas sensing measures.",
      "fix": "reads gases your gut produces"
    },
    {
      "id": "guarantee",
      "sev": "med",
      "re": "\\bguarantee(s|d)?\\b|\\b100% accurate\\b",
      "why": "Overpromise. Burned audiences punish it.",
      "fix": "state what it does, not what it guarantees"
    },
    {
      "id": "toilet",
      "sev": "med",
      "re": "\\btoilet (sensor|monitor|monitoring|tracker)\\b|\\bsmart toilet\\b",
      "why": "Old category language.",
      "fix": "passive gut health monitor"
    },
    {
      "id": "crude",
      "sev": "med",
      "re": "\\bpoop(s|ing|y)?\\b|\\bfarts?\\b|\\bstool gas\\b|\\bnumber two\\b|\\bpotty\\b|\\btoots?\\b|\\bdump\\b|\\bbutt\\b|\\blol\\b",
      "why": "Humor is retired. It put off 45% of people with gut issues in testing.",
      "fix": "the gases your gut produces"
    },
    {
      "id": "inference",
      "sev": "high",
      "re": "\\b(indicat\\w*|suggest\\w*|means?|sign of)\\b[^.]{0,60}?\\b(dehydrat\\w*|inflammat\\w*|sensitivit\\w*|intoleran\\w*|deficien\\w*|infection|transit times?|malabsorption|leaky gut|dysbiosis|fiber content|hydration)\\b",
      "why": "Reading a physiological cause into pattern data is a diagnostic claim.",
      "fix": "say what changed and what showed up with it"
    },
    {
      "id": "judgment",
      "sev": "med",
      "re": "\\b(healthy|unhealthy|abnormal)\\b|\\bnormal (duration|range|levels?|type|pattern)s?\\b|\\bexcellent (for|regularity|digestion|pattern)\\b",
      "why": "Calling gut data 'healthy' or 'normal' implies a clinical standard we don't have. Compare with the person's own usual.",
      "fix": "within your usual range"
    },
    {
      "id": "causal",
      "sev": "med",
      "re": "\\b(is|are) working\\b|\\b(clearly |is |are )?responding well\\b|\\bcausing\\b|\\bkey factor in\\b",
      "why": "Pattern data can't show cause. Say what happened together.",
      "fix": "seen together"
    },
    {
      "id": "outcome",
      "sev": "med",
      "re": "\\b(dramatically|significantly|drastically) (improve|reduce|boost|fix)\\w*|\\bwithin \\d+( ?(-|to) ?\\d+)? (days|weeks)\\b",
      "why": "Timed outcome promises overpromise, and burned audiences punish it.",
      "fix": "try one change and compare"
    },
    {
      "id": "term",
      "sev": "low",
      "re": "\\bdigestive health\\b|\\bgut health management\\b|\\btoilet monitoring\\b|\\bbowel movements?\\b",
      "why": "Off-brand or clinical term from the SNIFR era.",
      "fix": "gut health optimization, or 'visits' in the app"
    },
    {
      "id": "modifier",
      "sev": "low",
      "re": "\\bFlorin (Labs|Science|Tech)\\b",
      "why": "'Health' tested as the most credible descriptor. 'Labs' felt cold and 'Science' raised doubts.",
      "fix": "Florin Health"
    },
    {
      "id": "hype",
      "sev": "low",
      "re": "\\b(revolutionary|disrupt\\w*|game[- ]chang\\w*|breakthrough|cutting[- ]edge)\\b",
      "why": "Anti-theater: show, don't hype.",
      "fix": "say what it does"
    },
    {
      "id": "legacy",
      "sev": "low",
      "re": "\\bSNIFR\\b",
      "why": "Legacy name.",
      "fix": "Florin Health"
    },
    {
      "id": "emdash",
      "sev": "low",
      "re": "—",
      "why": "House style: no em dashes.",
      "fix": "use a period, comma or colon"
    },
    {
      "id": "bang",
      "sev": "low",
      "re": "!",
      "why": "House style: no exclamation points.",
      "fix": "end on a period"
    }
  ]
});
