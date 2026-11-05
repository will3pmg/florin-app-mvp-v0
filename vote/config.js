/* Florin app vote: the settings. Read by the voting page (and the results page). For the hosted site, run
   `node vote/build.js --endpoint <exec url>`: it stamps the endpoint into vote/site/config.js and leaves this file as
   it is. The claude.ai artifact is published with this file as it stands, endpoint empty, so ballots go by Slack. */
window.VOTE_CONFIG = {
  /* the id on every ballot. A link with ?test=1 adds "-test" to it, for Will's own runs (?test=0 clears it) */
  vote: "florin-app-vote-1",

  /* the Google Apps Script web app's /exec URL (focus/apps-script/Code.gs, the votes piece). Empty: the page copies the
     ballot for Slack and posts nothing */
  endpoint: "",

  /* false closes the vote: the page says "Voting has closed." and takes no new picks */
  open: true,

  /* a ballot longer than this many characters is offered in parts, each one Slack message */
  slackMax: 3500,

  /* a link that opens Slack to Will, shown as Open Slack after copying. Empty: no button */
  slackOpen: "",

  /* who the ballot goes to, as the page names him */
  to: "Will"
};
