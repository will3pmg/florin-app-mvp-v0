# Setting up the focus group test

For Will. This sets up the three pieces the study needs, then tests them on your own phone:

- **The Sheet**, in the Florin Health Google account, where every answer lands.
- **The script** (`focus/apps-script/Code.gs`), a small Google Apps Script web app that takes each answer from
  participants' phones and writes it into the Sheet.
- **The site** (`focus/site`), the study app participants open on their phones, hosted on Netlify.

It takes about 45 minutes the first time. You need: the Florin Health Google account that should own the data (not
a personal Gmail), access to the GitHub repository `will3pmg/florin-app-mvp-v0`, and a free Netlify account.

How it fits together: a participant opens the link on their phone. The site sends each answer, as it's given, to the
script's web address. The script checks it and adds a row to the Sheet. Thank-you codes go to a second, separate
spreadsheet for the recruiter, so they can never be matched to anyone's answers.

Prototype only. Not for patients.

---

## 1. Make the Sheet

**Either make it yourself:**

1. Go to [drive.google.com](https://drive.google.com), signed in as the Florin Health account that should own the
   data. Check the account picture at the top right.
2. Click **New**, then **Google Sheets**, then **Blank spreadsheet**.
3. Click **Untitled spreadsheet** at the top left, type `Florin focus group answers`, and press Enter.
4. Click **File**, **Settings**, and set **Time zone** to the one you work in (say, `(GMT-05:00) Eastern Time`). The
   `received` column uses it. Click **Save settings**.
5. Click **Share** at the top right. Under **General access**, keep **Restricted**. Add only the research team named in
   the consent. Click **Done**.

**Or ask Claude to make it.** Say "Make the focus group Sheet in my Google Drive." Claude can create it with the Google
Sheets connector and send you the link. Open the link, check that the owner is the Florin Health account (**Share**
shows the owner), and carry on from step 2 in that Sheet.

## 2. Add the script, run setup, and deploy it

### 2a. Paste the script

1. In the Sheet, click **Extensions**, then **Apps Script**. The script editor opens in a new tab, with a file called
   `Code.gs` holding `function myFunction() {}`.
2. Click **Untitled project** at the top, type `Florin focus group`, and click **Rename**.
3. In the editor, select everything (Cmd+A on a Mac, Ctrl+A on Windows) and delete it.
4. Open [Code.gs on GitHub](https://github.com/will3pmg/florin-app-mvp-v0/blob/main/focus/apps-script/Code.gs) (or
   the branch the study is on), click the **Copy raw file** button (two overlapping squares, top right of the file),
   and paste into the editor.
5. Check one line near the top: `var STUDIES = ["florin-fg-1"];`. It must match `study` in `focus/config.js`. They
   match now; change both if you ever run a second round.
6. Click the **Save** icon (a floppy disk), or press Cmd+S.

### 2b. Run setup

1. In the toolbar above the code, the menu next to **Debug** lists the functions. Choose **setup**, then click **Run**.
2. The first time, Google asks for permission:
   - Click **Review permissions** and choose the Florin Health account.
   - "Google hasn't verified this app" appears, because the script is yours and not reviewed by Google. Click
     **Advanced**, then **Go to Florin focus group (unsafe)**.
   - Click **Allow**. Google lists what the script may do, chiefly seeing, editing and creating your spreadsheets,
     which it needs to write the rows and make the recruiter's spreadsheet.
3. The **Execution log** at the bottom says `Done.`, then the link to the answers Sheet and the link to the
   recruiter's spreadsheet.
4. Go back to the Sheet's tab. It now has the tabs **README**, **Sessions**, **Answers**, **Tasks**, **Comments** and
   **Events**, each with its header row. Two hidden tabs, `_index` and `_log`, are the script's own; leave them.
5. In Drive there's a second spreadsheet, **Florin focus group: thank-you codes (recruiter only)**. Share it with the
   recruiter (**Share**, their email, **Editor**) and with nobody on the research team. Its **tokens** tab gets one
   thank-you code per finished session, at a random row, with nothing else. The recruiter can add a `paid` column
   beside it.
6. Reload the Sheet. A **Florin study** menu appears next to **Help**, with **Set up the tabs** and **Remove a session
   by its code**.

### 2c. Deploy it as a web app

1. In the script editor, click **Deploy** (blue, top right), then **New deployment**.
2. Click the gear next to **Select type** and choose **Web app**.
3. Fill in:
   - **Description**: `Focus group v1`
   - **Execute as**: **Me** (your Florin Health address)
   - **Who has access**: **Anyone**
4. Click **Deploy**. If Google asks for permission again, allow it as in 2b.
5. Copy the **Web app URL**. It starts `https://script.google.com/macros/s/` and ends `/exec`. Click **Done**.

If **Anyone** isn't in the list, Florin Health's Google Workspace doesn't allow sharing outside the organization. Ask
whoever runs the Workspace to turn it on for Drive (Admin console, **Apps**, **Google Workspace**, **Drive and Docs**,
**Sharing settings**), then deploy again. Participants have no Google login, so the study can't work without it.

### 2d. Check it from your browser

1. Open a **private window** (Safari: **File**, **New Private Window**; Chrome: **File**, **New Incognito Window**), so
   you aren't signed in to Google, and paste the Web app URL. The page says: `The Florin focus group endpoint is
   running.`
2. Add `?op=ping&study=florin-fg-1` to the end of the address and press Enter. The page says
   `{"ok":true,"open":true}`.

If either asks you to sign in, **Who has access** isn't **Anyone**: see section 7.

### Changing the script later

Paste the new Code.gs and save, then click **Deploy**, **Manage deployments**, the pencil (**Edit**), set **Version**
to **New version**, and click **Deploy**. The URL stays the same. (**New deployment** makes a new URL, which would mean
changing config.js and the site again.) If the change needs a new permission, run **setup** once first.

### A standalone script instead (only if you'd rather not attach it to the Sheet)

Go to [script.google.com](https://script.google.com), click **New project**, and paste Code.gs as in 2a. Click
**Project Settings** (the gear on the left), then **Add script property**: name `SHEET_ID`, value the Sheet's id (the
long part of its address between `/d/` and `/edit`). Or leave it out, and setup makes a Sheet and sets it. Then run
setup and deploy as above. Without a Sheet to attach to, there's no **Florin study** menu: to remove a session, add the
script property `REMOVE_CODE` with the code and run **removeByCodeProperty**.

## 3. Put the URL into config.js

**Either send it to Claude:** "Here's the web app URL: https://script.google.com/macros/s/.../exec. Put it in
config.js and rebuild the site." Claude puts it in, rebuilds `focus/site`, and commits it for you to push.

**Or do it yourself:**

1. Open `focus/config.js` and paste the URL between the quotes on the `endpoint` line:
   `endpoint: "https://script.google.com/macros/s/AKfy.../exec",`
2. While you're there, fill in `team`, `contact`, `recruiter`, `thanksHow` and `keepMonths` (the consent shows them),
   `tokenHow` (how a participant sends their thank-you code to the recruiter, as a clause after "To get your
   thank-you,"; left empty, the thanks screen says to reply to the message the study link came in), and `weekCard`,
   the week design you picked.
3. Run `node focus/build.js`, which copies everything into `focus/site`, then commit and push. The build ends with a
   line listing any of `endpoint`, `team`, `contact`, `recruiter` and `thanksHow` still empty: fill them before the
   link goes out.

Until `endpoint` is filled in, nothing is sent: every answer waits on the phone.

## 4. Put focus/site on the web

### Netlify (recommended)

1. Go to [app.netlify.com](https://app.netlify.com) and log in (**Log in with GitHub** is simplest).
2. Click **Add new site** (or **Add new project**), then **Import an existing project**, then **GitHub**. Allow
   Netlify to see the repository if it asks, and pick `will3pmg/florin-app-mvp-v0`.
3. Set:
   - **Branch to deploy**: the branch with the built `focus/site` (`main`, once this work is merged)
   - **Base directory**: leave empty
   - **Build command**: leave empty (the site is built and committed, so what participants get never changes behind
     your back)
   - **Publish directory**: `focus/site`
4. Click **Deploy**. After a minute the site is live at an address like `https://random-name-123.netlify.app`.
5. Give it a plain name: **Site configuration** (Netlify may call it **Project configuration**), **Change site name**,
   for example `try-florin`. The link becomes `https://try-florin.netlify.app`. Participants see this address, so keep
   it short and plain.
6. Stop changes reaching participants during the study: open **Deploys**, click the deploy marked **Published**, and
   click **Lock to stop auto publishing**. New pushes still build, but nothing goes live until you open that deploy and
   click **Publish deploy**. Do that only between batches of invites.

HTTPS is on from the start, which the home screen install needs.

### GitHub Pages (an alternative)

Pages serves a branch's root or `/docs` folder, not `focus/site`, so it needs a small workflow. GitHub Pages on a
private repository needs a paid GitHub plan.

1. In the repository on GitHub: **Settings**, **Pages**, and under **Source** choose **GitHub Actions**.
2. Add a file `.github/workflows/pages.yml` holding:

   ```yaml
   name: Study site
   on:
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment:
         name: github-pages
       steps:
         - uses: actions/checkout@v4
         - uses: actions/upload-pages-artifact@v3
           with:
             path: focus/site
         - uses: actions/deploy-pages@v4
   ```

3. **Actions**, **Study site**, **Run workflow**. It runs only when you click it, so nothing changes mid-study.
4. The site is at `https://will3pmg.github.io/florin-app-mvp-v0/`. It sits in a folder rather than at the root, so
   check the install on a phone (step 5) before sending it out.

### Cloudflare Pages (an alternative)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com), then **Workers & Pages**, **Create**, **Pages**,
   **Connect to Git**, and pick the repository.
2. Set **Framework preset** to **None**, leave **Build command** empty, and set **Build output directory** to
   `focus/site`. Click **Save and Deploy**.
3. The site is at `https://<name>.pages.dev`.
4. To stop changes reaching participants: **Settings**, **Builds**, **Branch control**, and turn off automatic
   deployments. Deploy by hand between batches.

## 5. Test it end to end on your own phone

Use `?test=1` on the link, for example `https://try-florin.netlify.app/?test=1`. That marks your session `-test`
(`florin-fg-1-test` in the `study` column), so it's left out of the results and uses its own balance of options.

1. On your iPhone, open the link in Safari. Go through consent and intake, do two or three tasks, and leave a comment:
   tap Comment at the top, then tap something in the app.
2. At **Put Florin on your phone**, follow the steps: the Share button, **Add to Home Screen**, **Add**. Open Florin
   from the home screen. If it asks for your study code, type the 6 characters from the Safari screen.
3. Finish: free use, the exit survey, **Submit**. Note the study code on the last screen.
4. In the Sheet:
   - **Sessions** has your row: `study` ends in `-test`, `stage` is `done`, `install` is `seen`, `installed` is `yes`,
     `submitted` is `yes`, and `comments` counts the comments you left in Safari and in the app. (`last_at` can trail
     by a minute.)
   - **Answers**, **Tasks**, **Comments** and **Events** have rows with your `sid`.
   - The recruiter's spreadsheet has one new thank-you code in **tokens**.
   - The hidden `_log` tab should be empty. To look: click the list icon at the bottom left of the Sheet (**All
     sheets**) and click `_log`. Any row there is a piece the script refused, with the reason and the field. Send it
     to Claude: it means the app and the script disagree about a list. (To hide the tab again, right-click it and
     click **Hide sheet**.)
5. Do it again on an Android phone in Chrome (the install button is **Install**), and once on an iPhone opening the
   link from an email in Gmail.
6. Your test rows can stay (the `-test` marks them), or remove them with **Florin study**, **Remove a session by its
   code**.

To try the whole thing on your computer first, without Google: `node focus/mock-endpoint.js --fresh --site focus/site`
serves the site at `http://localhost:8787` and a stand-in for the script at `http://localhost:8788/exec` (put that in
`endpoint` for the local run only). The rows land as JSON files, and the command prints where.

## 6. Send the link to participants

The recruiter sends it, from their own list, so the research team never sees who was invited. Send the link without
`?test=1`, and with nothing added to it: no names, no emails, no recruit numbers. Send the soft launch of 6 first (the
plan's Before launch, step 6), then the rest in batches.

**The invitation**, word for word from the plan (counsel reads it first). Subject: `Try an early version of the Florin
app`

> Florin Health is testing an early version of the Florin app. Would you try it on your phone for 30 to 45 minutes
> and tell us what you think? There's no account to make. Open this link on your phone, in Safari or Chrome:
> https://try-florin.netlify.app
>
> Prototype only. Not for patients.

**A reminder**, three days later, to anyone who hasn't finished (the recruiter knows only who claimed a thank-you, not
who started):

> A reminder: Florin Health's test of the Florin app is open until {date}. It takes 30 to 45 minutes on your phone,
> with no account. Open this link in Safari or Chrome: https://try-florin.netlify.app
>
> Prototype only. Not for patients.

**Paying the thank-you.** A participant sends the recruiter the thank-you code from their last screen (the screen
tells them how: `tokenHow`, or by default a reply to the message their link came in). The recruiter
finds it in **tokens** and marks it paid. Each code counts once. The address is public, so anyone could post a made-up
code; pay only codes a participant sends you, and if **tokens** ever holds more codes than **Sessions** has rows with
`submitted` `yes` (leaving out `-test`), tell Claude.

## 7. When something fails

| What you see | Why | What to do |
|---|---|---|
| The Web app URL asks you to sign in, or says "Sorry, unable to open the file at this time" | **Who has access** isn't **Anyone**, or the deployment was archived | **Deploy**, **Manage deployments**, **Edit**: set **Who has access** to **Anyone**, **Version** to **New version**, **Deploy**. Check again in a private window |
| **Anyone** isn't offered | The Workspace blocks sharing outside the organization | Ask the Workspace admin (section 2c) |
| Nothing reaches the Sheet | `endpoint` in config.js is empty, or is the `/dev` address rather than `/exec`, or the site wasn't rebuilt and published after the change | Check `endpoint`, run `node focus/build.js`, push, publish the deploy. In the script editor, **Executions** (the list icon on the left) shows every `doPost`; none means nothing is arriving |
| **Executions** shows errors | Usually a tab or column renamed by hand, or a permission the script lost | Open the error. Run **Florin study**, **Set up the tabs**, which puts back what's missing. Send Claude the error's first line |
| Some answers are missing | The script refused them: the app and the script disagree about a list | Look at `_log` (section 5, step 4) and send its rows to Claude. Refused pieces stay on the participant's phone, so fixing the script and publishing a new version lets the retries in |
| `Authorization is required` after you changed the script | The change needs a new permission | Run **setup** once in the editor and allow it, then publish a new version |
| You changed Code.gs and nothing changed | The deployment still runs the old version | **Manage deployments**, **Edit**, **Version**: **New version**, **Deploy** |
| Lock or timeout errors in **Executions** when many people take part at once | Every answer waits its turn to be written | Nothing is lost: phones send again every 20 seconds. If it keeps happening, invite in smaller batches |
| The installed iPhone app asks for a code the person doesn't have | It's on the Safari screen where they added Florin | They can go back to Safari, or finish there. The plan's words cover this |
| A participant emails their study code to have their answers removed | | In the Sheet: **Florin study**, **Remove a session by its code**, paste the code. It deletes every row of that session on every tab. Then delete the email. A thank-you code can't be removed with it, since nothing links the two |
| A participant lost their study code | By design, nothing else finds their session | Their answers stay unless they can give the code |
| A comment sounds like someone's own alarm sign | | The research lead hears the same day, checks the row's `alarm_note` says `yes`, and logs it. Nobody tries to find the person. (The plan, section 6.5) |
| You need to close the study | | Set `open: false` in config.js, rebuild and publish. In the script editor, **Project Settings**, **Add script property**: `CLOSED`, value `yes`, **Save**. Then **Deploy**, **Manage deployments**, **Archive** |

**At the end.** Delete the answers Sheet the number of months after the study closes that the consent says
(`keepMonths`). The recruiter deletes their spreadsheet once every thank-you is paid. Archive the deployment.

## What's in focus/apps-script

| File | What it is |
|---|---|
| `Code.gs` | The script. The only file that goes into Google |
| `gas-stub.js` | A stand-in for Google's services, so Code.gs runs on a computer for the tests and the local endpoint |
| `test.js` | 36 tests of Code.gs: `node focus/apps-script/test.js` |
| `contract-test.js` | The app's own `focus.js` sends to Code.gs, and every piece must be taken: `node focus/apps-script/contract-test.js` |
| `browser-test.js` | The real browser path, on an emulated iPhone and Android phone: `NODE_PATH=$(npm root -g) node focus/apps-script/browser-test.js` |

`focus/mock-endpoint.js` runs Code.gs on your computer as a web server (section 5). `focus/CONTRACT.md` is the
agreement between the app and the script: every piece, every field and every reply.
