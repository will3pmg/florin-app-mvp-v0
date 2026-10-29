/* Florin focus group test: comments. The composer a double tap (or the Comment button) opens, the list a person reviews,
   edits and deletes before submitting, and the pieces each sends (CONTRACT.md, section 2.5). FX.comments
   It draws into the page that owns FX: the flow, when the app is framed by it, so the box and the phone's keyboard
   belong to the top page; the app itself, when it's opened on its own. A comment keeps the screen key, where on the
   screen it was (x and y as shares of the app's screen), what was tapped (in the app's interface words, never what a
   log says), CM1's words, CM2's words (scrubbed), the time and the decisions on the phone. Words run through the app's
   own alarm net (L.alarmsIn), and the primary care note shows under the box on a match. */
(function () {
  const FX = window.FX, Q = window.FXQ;
  if (!FX || !Q || FX.comments) return;
  const CQ = Q.comment;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const list = () => FX.ls.get("comments", []) || [];
  const save = (a) => FX.ls.set("comments", a);
  const kindWords = (ks) => ks.map((k) => (CQ.kinds.find(([c]) => c === k) || [, ""])[1]).filter(Boolean).join(" | ");
  const live = () => list().filter((c) => !c.deleted);
  /* comments this session sent from another window (Safari, before Florin went on the home screen), from the code
     lookup: what they were about and CM1's words, never the words typed. They can be deleted here */
  const beforeAll = () => { const s = FX.session(); return (s && Array.isArray(s.before) ? s.before : []); };
  const before = () => beforeAll().filter((c) => !c.deleted);
  const count = () => live().length + before().length;

  let root = null, opts = null, lastFocus = null;
  const theme = () => (FX.dark() ? "dark" : "light");
  function mount() {
    if (root && document.body.contains(root)) return root;
    root = document.createElement("div");
    root.className = "ap fx-cm-root";
    root.setAttribute("data-theme", theme());
    document.body.appendChild(root);
    return root;
  }
  const chips = (sel) => `<div class="fx-cm-chips" role="group" aria-labelledby="fxCmQ">${CQ.kinds.map(([k, w]) => `<button type="button" class="fx-ch${sel.includes(k) ? " is-on" : ""}" data-cmk="${k}" aria-pressed="${sel.includes(k)}">${esc(w)}</button>`).join("")}</div>`;
  function draw(st) {
    const r = mount();
    r.setAttribute("data-theme", theme());
    const ok = st.kinds.length > 0 || st.words.trim().length > 0;
    const al = FX.alarm(st.words);
    r.innerHTML = `<div class="fx-cm-scrim" data-cm="cancel"></div>
      <div class="fx-cm" role="dialog" aria-modal="true" aria-labelledby="fxCmQ">
        <div class="fx-cm-h"><h2 id="fxCmQ" tabindex="-1">${esc(CQ.q)}</h2><p class="fx-cm-where">${esc(st.edit ? "Edit your comment" : st.where)}</p></div>
        <p class="fx-cm-pick">Pick any</p>
        ${chips(st.kinds)}
        <label class="fx-cm-l" for="fxCmW">${esc(CQ.more)}</label>
        <textarea id="fxCmW" class="fx-ta" rows="3" maxlength="1000" autocomplete="off">${esc(st.words)}</textarea>
        <p class="fx-leave">${esc(FX.LEAVE_OUT)}</p>
        <p class="fx-alarm" data-cm-alarm${al ? "" : " hidden"} role="note">${esc(FX.ALARM_NOTE)}</p>
        <div class="fx-cm-act">
          <button type="button" class="fx-btn fx-btn--line" data-cm="cancel">${esc(CQ.cancel)}</button>
          <button type="button" class="fx-btn" data-cm="send"${ok ? "" : ' aria-disabled="true"'}>${esc(st.edit ? "Save" : CQ.send)}</button>
        </div>
        <p class="fx-cm-need" data-cm-need hidden>Pick a word above, or write something.</p>
      </div>`;
    r.hidden = false;
  }
  let ST = null;
  function open(d, o = {}) {
    lastFocus = document.activeElement;
    opts = o;
    ST = { d: d || {}, kinds: (o.edit && o.edit.kinds) || [], words: (o.edit && o.edit.words) || "", edit: o.edit || null, where: d && d.where ? `About: ${d.where}` : "About this screen" };
    draw(ST);
    wire();
    requestAnimationFrame(() => { const h = root.querySelector("#fxCmQ"); if (h) h.focus({ preventScroll: true }); });
  }
  function close(sent) {
    if (!root) return;
    root.hidden = true;
    root.innerHTML = "";
    const o = opts; opts = null; ST = null;
    if (o && o.onClose) { try { o.onClose(!!sent); } catch (e) { console.error(e); } }
    if (lastFocus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
  }
  function syncSend() {
    if (!root || !ST) return;
    const ok = ST.kinds.length > 0 || ST.words.trim().length > 0;
    const b = root.querySelector('[data-cm="send"]');
    if (b) { if (ok) b.removeAttribute("aria-disabled"); else b.setAttribute("aria-disabled", "true"); }
    const al = root.querySelector("[data-cm-alarm]");
    if (al) al.hidden = !FX.alarm(ST.words);
    if (ok) { const n = root.querySelector("[data-cm-need]"); if (n) n.hidden = true; }
  }
  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    root.addEventListener("click", (e) => {
      const k = e.target.closest("[data-cmk]");
      if (k && ST) {
        const v = k.dataset.cmk, i = ST.kinds.indexOf(v);
        if (i >= 0) ST.kinds.splice(i, 1); else ST.kinds.push(v);
        k.classList.toggle("is-on", i < 0);
        k.setAttribute("aria-pressed", String(i < 0));
        syncSend();
        return;
      }
      const b = e.target.closest("[data-cm]");
      if (!b || !ST) return;
      if (b.dataset.cm === "cancel") { close(false); return; }
      if (b.dataset.cm === "send") {
        if (!ST.kinds.length && !ST.words.trim()) { const n = root.querySelector("[data-cm-need]"); if (n) n.hidden = false; return; }
        const st = ST;
        if (st.edit) edit(st.edit.cmid, { kinds: st.kinds.slice(), words: st.words });
        else add(st.d, st.kinds.slice(), st.words);
        close(true);
        toast(st.edit ? "Comment saved." : CQ.sent);
      }
    });
    root.addEventListener("input", (e) => { if (e.target.id === "fxCmW" && ST) { ST.words = e.target.value; syncSend(); } });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(false); return; }
      if (e.key !== "Tab") return;
      /* the box keeps focus inside it */
      const f = [...root.querySelectorAll("button, textarea, [tabindex='-1']")].filter((x) => x.getClientRects().length && !x.hidden);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  let tT = 0;
  function toast(msg) {
    let t = document.querySelector(".fx-toast");
    if (!t) { t = document.createElement("div"); t.className = "fx-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(tT);
    tT = setTimeout(() => t.classList.remove("is-on"), 2600);
  }

  /* ---------- the pieces ---------- */
  function add(d, kinds, words) {
    const c = {
      cmid: FX.newId(8), at: FX.iso(), phase: d.phase || FX.phase || "", screen: d.screen || "other", label: d.where || "This screen",
      target: d.target || "the screen", kinds, words: FX.scrub(words), how: d.how || "double tap"
    };
    const a = list(); a.push(c); save(a);
    FX.send("comment", {
      cmid: c.cmid, op: "add", phase: c.phase, screen: c.screen, state: d.state || "", target: c.target,
      x: d.x == null ? "" : d.x, y: d.y == null ? "" : d.y, tx: d.tx == null ? "" : d.tx, ty: d.ty == null ? "" : d.ty,
      vw: d.vw || 0, vh: d.vh || 0, scroll: d.scroll || 0, cm_kind: kindWords(kinds), words: c.words,
      alarm_note: FX.alarm(words) ? "yes" : "no", how: c.how
    });
    FX.emit("comments", count());
    return c;
  }
  function edit(cmid, f) {
    const a = list(), c = a.find((x) => x.cmid === cmid);
    if (!c) return;
    c.kinds = f.kinds; c.words = FX.scrub(f.words);
    save(a);
    FX.send("comment", { cmid, op: "edit", phase: c.phase, screen: c.screen, cm_kind: kindWords(c.kinds), words: c.words, alarm_note: FX.alarm(c.words) ? "yes" : "no", how: c.how });
    FX.emit("comments", count());
  }
  function del(cmid) {
    const a = list(), c = a.find((x) => x.cmid === cmid);
    if (!c) {
      /* one sent from the other window */
      const b = beforeAll(), x = b.find((y) => y.cmid === cmid);
      if (!x) return;
      x.deleted = true;
      FX.patch({ before: b });
      FX.send("comment", { cmid, op: "delete", phase: FX.phase || "", screen: "other", how: "button" });
      FX.emit("comments", count());
      return;
    }
    /* gone from the phone too: only the id stays, so a retry can't bring it back */
    Object.assign(c, { deleted: true, words: "", kinds: [] });
    save(a);
    FX.send("comment", { cmid, op: "delete", phase: c.phase, screen: c.screen, how: c.how });
    FX.emit("comments", count());
  }

  /* ---------- the list, for review ---------- */
  const time = (iso) => { try { const d = new Date(iso); return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } };
  function reviewHTML() {
    const a = live(), b = before();
    if (!a.length && !b.length) return `<p class="fx-p fx-muted">No comments yet. Tap Comment, then tap the part of the app you mean, to leave one.</p>`;
    const old = b.map((c) => `<li>
        <p class="fx-cm-li-h"><b>${esc(c.label)}</b><span>Sent earlier</span></p>
        ${c.kinds.length ? `<p class="fx-cm-li-k">${esc(kindWords(c.kinds).split(" | ").join(", "))}</p>` : ""}
        <p class="fx-cm-li-k">Left before you added Florin to your home screen. It's with the team already; its words show only there.</p>
        <div class="fx-cm-li-a"><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-cmd="${c.cmid}">Delete</button></div>
      </li>`).join("");
    return `<ul class="fx-cm-list">${old}${a.map((c) => `<li>
        <p class="fx-cm-li-h"><b>${esc(c.label)}</b><span>${esc(time(c.at))}</span></p>
        ${c.kinds.length ? `<p class="fx-cm-li-k">${esc(kindWords(c.kinds).split(" | ").join(", "))}</p>` : ""}
        ${c.words ? `<p class="fx-cm-li-w">${esc(c.words)}</p>` : ""}
        <div class="fx-cm-li-a"><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-cme="${c.cmid}">Edit</button><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-cmd="${c.cmid}">Delete</button></div>
      </li>`).join("")}</ul>`;
  }
  /* a review list inside el, kept up to date as comments change */
  function review(el) {
    const paint = () => { el.innerHTML = reviewHTML(); };
    paint();
    el.addEventListener("click", (e) => {
      const ed = e.target.closest("[data-cme]"), dl = e.target.closest("[data-cmd]");
      if (ed) { const c = live().find((x) => x.cmid === ed.dataset.cme); if (c) open({ where: c.label }, { edit: { cmid: c.cmid, kinds: c.kinds.slice(), words: c.words }, onClose: paint }); }
      if (dl) {
        const c = live().find((x) => x.cmid === dl.dataset.cmd) || before().find((x) => x.cmid === dl.dataset.cmd);
        if (!c) return;
        const li = dl.closest("li");
        if (li && !li.querySelector(".fx-cm-confirm")) {
          li.insertAdjacentHTML("beforeend", `<div class="fx-cm-confirm" role="alert"><p>Delete this comment? It's removed from the team's copy too.</p><div class="fx-cm-li-a"><button type="button" class="fx-btn fx-btn--s" data-cmdy="${c.cmid}">Delete</button><button type="button" class="fx-btn fx-btn--line fx-btn--s" data-cmdn="1">Keep it</button></div></div>`);
          const y = li.querySelector("[data-cmdy]"); if (y) y.focus();
        }
      }
      const y = e.target.closest("[data-cmdy]"), n = e.target.closest("[data-cmdn]");
      if (y) { del(y.dataset.cmdy); paint(); toast("Comment deleted."); }
      if (n) { const box = n.closest(".fx-cm-confirm"); if (box) box.remove(); }
    });
    return paint;
  }

  FX.comments = { open, close, add, edit, del, list: live, before, count, review, reviewHTML, toast, isOpen: () => !!ST };
})();
