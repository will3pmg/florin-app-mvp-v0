# Publishing options/ask (Ask button options)

The artifact is https://claude.ai/artifact/DtAd6USZyoR1yngyHjX4SW (first published Nov 8). Publish `index.html` as the page (no doctype: the publisher wraps it), with these files at
the same relative paths:

```
css/ask-options.css
img/pill-score-light.webp     img/pill-score-dark.webp     img/pill-timing-light.webp     img/pill-timing-dark.webp
img/compact-score-light.webp  img/compact-score-dark.webp  img/compact-timing-light.webp  img/compact-timing-dark.webp
img/link-score-light.webp     img/link-score-dark.webp     img/link-timing-light.webp     img/link-timing-dark.webp
img/icon-score-light.webp     img/icon-score-dark.webp     img/icon-timing-light.webp     img/icon-timing-dark.webp
img/chip-score-light.webp     img/chip-score-dark.webp     img/chip-timing-light.webp     img/chip-timing-dark.webp
img/bar-score-light.webp      img/bar-score-dark.webp      img/bar-timing-light.webp      img/bar-timing-dark.webp
img/pill-hero-light.webp      img/pill-hero-dark.webp      img/compact-hero-light.webp    img/compact-hero-dark.webp
img/link-hero-light.webp      img/link-hero-dark.webp      img/icon-hero-light.webp       img/icon-hero-dark.webp
img/chip-hero-light.webp      img/chip-hero-dark.webp      img/bar-hero-light.webp        img/bar-hero-dark.webp
```

38 files. Not `_local.html` (the same page with a document shell, for file:// and Playwright) and not this
file. No capabilities. Icon: `chat`. Title comes from the page: Ask Button Options.

The pictures are the prototype's Insights (Will's picks view, Sarah, 12 weeks, Member, 30 days) at 390 wide and
deviceScaleFactor 2, one per Ask button style, card and theme, saved as WebP at quality 88. To retake them after the
cards change, run `NODE_PATH=$(npm root -g) node work/shots-ask-options.js <raw dir>` (it sets `look` to `picks` and `askUI`
to each style through phone.set, opens Insights, and shoots the FloraScore trend card, the Timing card (in Will's pick for Timing: Oura's card since Nov 8, with its note on
the mornings outside the window; the pictures were retaken on Nov 8) and the
foot of the dark FloraScore card, with 12px of ground around each, the app's tab bar hidden so it never covers a
card's foot), then convert to WebP under img/ with the names above.

The page's link to the demo points at https://claude.ai/artifact/8Y7riZMHdzy5BqV4HXzeFB. Will picked B, Compact, on Nov 8: the page marks
it as his pick and the app's default, and its Ask button row (View, left bar) keeps the other five to compare.
