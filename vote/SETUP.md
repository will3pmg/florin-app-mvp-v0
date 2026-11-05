# Setting up the Florin app vote

For Will. The vote has three parts:

- **The voting page** (`vote/`), where your team and colleagues pick the app's screens and charts, with a note on why.
  No account, on a phone or a laptop.
- **The results page** (`vote/results/`), for you only: the votes per option for each question, who picked what, every
  note, and what we recommend beside the votes. The voting page never shows a recommendation.
- **Somewhere for the ballots to go.** Either Slack (voters paste their ballot to you), or the focus test's Google Sheet
  through its script, if the voting page is hosted on Netlify or Vercel. Slack works either way.

Pick one of the two ways in sections 1 and 2. Section 3 is counting, the same for both.

Prototype only. Not for patients.

---

## 1. Slack only: the voting page as a claude.ai artifact

The simplest way, with nothing to set up.

1. Ask Claude: "Publish the Florin app vote." Claude publishes `vote/` as a private artifact (the files it needs are in
   `vote/PUBLISH.md`) and gives you the link.
2. Open the link, click **Share**, and turn on the public link. Send that link to your voters. They need no claude.ai
   account.
3. Each voter ends with **Copy for Slack** (in the bar at the foot of their picks), then pastes the ballot to you in
   Slack, in a direct message or a channel you can see. Every ballot starts "Florin app vote:", so one Slack search
   finds them all.
   Optional: an **Open Slack** button after they copy. In Slack, open your profile, choose the three dots, **Copy link
   to profile**, and ask Claude to put that link in `slackOpen` in `vote/config.js` and republish. It only helps
   voters in your own Slack workspace; people outside it still paste the ballot to you however they reach you there.
4. Before you send the link: vote once yourself, copy, and paste it into a direct message to yourself. Check that it
   arrives as one message (or as a text snippet, which is fine too: Claude reads snippets). If Slack cut it, ask
   Claude to lower `slackMax` in `vote/config.js` and republish: the page then offers a long ballot in two parts.
   Your test ballot would count like anyone's, so when you count, say when the link went out ("count the ballots
   since 2 PM on Nov 6") and Claude leaves earlier ones out.

Why not a form on the artifact itself: an artifact shared by public link can't take writes from people outside your
organisation, and it can't post to another site. Slack keeps everyone counted the same way.

## 2. The hosted site, with the Sheet

The voting page on Netlify or Vercel sends each ballot straight to the focus test's Google Sheet, on a **Votes** tab,
and the results page reads it live. Voters can still copy for Slack instead.

If the focus test's script isn't set up yet, do `focus/SETUP.md` sections 1 and 2 first (the Sheet, then the script,
setup and the deployment). Then:

1. **Paste the new script.** In the script editor (the Sheet, **Extensions**, **Apps Script**), select everything in
   `Code.gs`, delete it, paste the current
   [Code.gs](https://github.com/will3pmg/florin-app-mvp-v0/blob/main/focus/apps-script/Code.gs), and save. The focus
   test works exactly as before: the vote is a separate part of the same script. The script also holds what we
   recommend, and gives it only with the results key, so the public site never carries it.
2. **Run setup again.** Choose **setup** in the menu next to **Debug**, then **Run**. It adds the **Votes** tab and
   prints, at the end of the log, "The vote's results key, for the results page's address:" and a long key. Copy the
   key somewhere private. It's what lets the results page read the votes. (It's also under **Project Settings**,
   **Script properties**, `VOTE_KEY`.) Running setup again later changes nothing.
3. **Deploy the new version.** **Deploy**, **Manage deployments**, the pencil (**Edit**), **Version**: **New version**,
   **Deploy**. The web app address (ending `/exec`) stays the same.
4. **Check it.** In your browser, open
   `<the /exec address>?op=results&vote=florin-app-vote-1&key=<the key>`. It should answer with text starting
   `{"ok":true,`. With a wrong key it answers `{"ok":false,"error":"key"}`.
5. **Build the site.** Ask Claude: "Build the vote site with this endpoint: <the /exec address>", or run
   `node vote/build.js --endpoint <the /exec address>`. It makes `vote/site`, the voting page at its top and the
   results page at `results/`. The results page there carries no votes and no recommendation of its own: it shows
   them only when its address has the key. To leave it off the site, add `--no-results`.
6. **Put it on the web.**
   - Vercel: from the repository's folder, run `npx vercel deploy vote/site --prod`. The first time, it asks you to
     log in, then: set up and deploy, yes; which scope, your own; link to an existing project, no; the project's
     name, for example `florin-app-vote`; where the code is, `./`; and when it says no framework was found, leave the
     settings as they are. It prints the address, `https://florin-app-vote.vercel.app` or similar. `vote/site` has its
     own `vercel.json`, so the page's security headers come with it. If a voter is asked to log in to Vercel, turn
     off **Vercel Authentication** in the project's **Settings**, **Deployment Protection**. To update the site later,
     build again and run the same command.
   - Or Netlify: go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the `vote/site` folder onto the
     page. Then **Site configuration**, **Change site name**, for example `florin-app-vote`.
7. **Test it on your phone.** Open `https://<your site>/?test=1`, vote, and press **Send to Will**. It should say
   "Sent. Will has your picks." In the Sheet, the **Votes** tab has a row per question you answered, with the vote id
   `florin-app-vote-1-test`. Test ballots are never counted with the real ones. (`?test=0` turns test mode off again
   on that phone.)
8. **Open your results.** `https://<your site>/results/#key=<the key>`. Bookmark it and keep it to yourself: the key
   in the address is what opens the votes. Send voters only `https://<your site>/`.

What a row on the Votes tab holds, and how to read it, is on the Sheet's README tab.

## 3. Counting

### With Claude

Say: **"Count the Florin app votes."** Claude then:

1. searches Slack for "Florin app vote" in the messages and channels you can see, and reads every hit, opening any
   snippet or file a ballot was posted as;
2. saves each message's text, as Slack gives it, to `vote/ballots/<date>-<message id>.txt` (kept out of git, since it
   holds names and notes);
3. if you use the hosted site, also fetches the Sheet's votes:
   `curl -sL "<the /exec address>?op=results&vote=florin-app-vote-1&key=<the key>" -o vote/ballots/sheet.json`;
4. runs `node vote/tools/aggregate.js vote/ballots --out vote/results/results.json` and tells you what it found: how
   many people voted, every ballot replaced by a later one, anything flagged, anything left out, and each question's
   counts;
5. publishes the results page as a private artifact with the new counts (you confirm first), or you open
   `vote/results/_local.html` on your computer.

### The rules it counts by

- **The latest ballot from each name counts, whole.** Someone who votes again replaces their earlier ballot. "Sam Lee"
  and " sam  lee " are one name; so are "José" and "Jose".
- **One ballot seen twice counts once:** the same ballot in Slack and in the Sheet, or sent twice.
- **Flagged, but counted:** two browsers sending ballots under one name (if they're two people, ask one to add a last
  name), a ballot whose last line was deleted (its picks are read from the numbered lines), a last line that was cut
  short or broken over two lines, where what's left of it agrees with the numbered lines, a note that went missing, a
  part of a two-part ballot that didn't arrive. A last line broken over two lines is joined again when its check
  confirms it, and then it isn't flagged at all. Numbered lines Slack turned into bullets, or numbered again from 1,
  are read by each question's name.
- **Held out until you look:** a ballot whose last line doesn't match its check and disagrees with its numbered lines
  on a pick or the name, which means something in it was changed after it was made. The results page shows it, as it
  came, under **Check these**.
- **One name, one spelling:** a voter's name is shown as their first ballot spelled it, everywhere on the page.
- **Left out:** test ballots, and with "since", ballots made before the date you give.

### The results page

It says where its votes came from: the Sheet (with **Refresh**), or the `results.json` beside it. Filter by role, or
by the app or the charts. Then, top to bottom: a table at a glance (a small bar of how each question's votes split,
the most picked, what we recommend, with "Not the most picked" on any row where the two differ, and No preference),
**Check these** folded to one line (open it for ballots replaced, flagged or held out), a section per question (a bar
per option with its count, the option's line as voters read it, who picked it, our recommendation beside the bars,
and every note under the option it was given with), who picked what, **Copy a summary** (plain text for Slack, counts
only, no names or notes), and **Add Slack ballots**, where you can paste ballots that arrived after the last count.
Pasted ballots stay in that browser only.

## 4. Closing the vote

- Slack only: tell people the vote has closed, and count. To stop new picks on the page, ask Claude to set
  `open: false` in `vote/config.js` and republish: the page then says "Voting has closed."
- Hosted: set `open: false` in `vote/config.js`, rebuild and put the site up again. In the script editor, **Project
  Settings**, **Add script property**: `VOTE_CLOSED`, value `yes`, **Save**. The focus test is not affected (its own
  switch is `CLOSED`).

## 5. When someone asks to take their vote back

- From the Sheet: the **Florin study** menu, **Remove a voter's ballots**, and type their name. Every ballot under
  that name goes. (A standalone script: add the script property `REMOVE_VOTER` with the name and run
  **removeVoterByProperty**.)
- From Slack: ask Claude to drop their messages from `vote/ballots` and count again. Then delete the messages
  themselves if they ask.

## For Claude: publishing the results page

A separate artifact from the voting page, so voters never reach it. Title "Florin Vote Results", icon "chart",
private. Never publish it with the sample ballots in `vote/tools/fixtures`: those are made-up test voters.

```
page                <- vote/results/index.html
css/results.css     <- vote/results/css/results.css
js/config.js        <- vote/config.js (endpoint empty)
js/questions.js     <- vote/js/questions.js
js/ballot.js        <- vote/js/ballot.js
js/count.js         <- vote/js/count.js
js/recs.js          <- vote/results/js/recs.js
js/results.js       <- vote/results/js/results.js
results.json        <- vote/results/results.json, from aggregate.js
```

Republishing with a new `results.json` updates the counts at the same link. Read the artifact before republishing.
Before either publish, run the checks below. `recs.js` speaks of Will by name ("Will's pick"), since the page may be
shared with the team; `test-results.js` applies the same changes to the sources before it compares them.

When a recommendation changes in `recs.js`, copy it into `VOTE_RECS_` in `focus/apps-script/Code.gs` too
(`focus/apps-script/test.js` fails until the two agree), and paste the script into the Sheet's editor again: the
hosted results page gets its recommendations from there.

## The files, and their checks

| File | What it is |
|---|---|
| `vote/js/questions.js`, `vote/js/ballot.js` | The 19 questions (each option's line, and on Part 2 each chart's own line), and the ballot: the Slack text, its last line (the machine line Claude counts by), the JSON, reading them all back, and the latest-per-name rule. `vote/BALLOT.md` spells the formats out |
| `vote/js/draw.js`, `vote/js/vote.js`, `vote/css/vote.css` | The voting page: each option drawn live from the prototype, the flow, the ballot leaving by Slack or by the script |
| `vote/build.js` | The hosted site, `vote/site` (`--endpoint`, `--vote`, `--no-results`) |
| `vote/tools/check.js` | The voting page walked at 390 and 1440 in both themes: errors, words, tap targets, the pictures, the picks, the month, the review and the copied ballot read back |
| `vote/js/count.js` | Reading Slack text, the Sheet's reply, a `results.json` and the Votes tab as CSV, and making `results.json`. The results page and `aggregate.js` both use it |
| `vote/tools/aggregate.js` | Ballots to `vote/results/results.json` (and `results-data.js`, the same for the page opened from a file) |
| `vote/results/` | The results page; `js/recs.js` is what we recommend, from `claude/Florin decisions.md` and the modules page |
| `focus/apps-script/Code.gs` | The script, with the vote's part at the end: the Votes tab, `op=vote`, `op=voted` and `op=results` (with `VOTE_RECS_`, what we recommend, only with the key) |
| `vote/tools/fixtures/` | Made-up test ballots, "Test voter 1" to "Test voter 8", in every form a ballot arrives in. `node vote/tools/make-fixtures.js` remakes them |

```
node focus/apps-script/test.js                                   # the script, the vote's tests included
node focus/apps-script/contract-test.js
NODE_PATH=$(npm root -g) node vote/tools/test-results.js         # ballots, aggregate.js, recs.js, the results page
NODE_PATH=$(npm root -g) node vote/tools/test-results.js --node  # the same without a browser
NODE_PATH=$(npm root -g) node vote/tools/check.js                # the voting page, walked (--url for the hosted build)
```

`test-results.js` fails when `recs.js` no longer says what `claude/Florin decisions.md` or `modules/js/modules.js`
recommends, so a changed recommendation can't go stale on the results page.
