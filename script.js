(function () {
  /* the theme is already set by the small inline script in <head>, before this file loads */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  var toggles = document.querySelectorAll(".theme-toggle");
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  function paintToggles() {
    var dark = root.getAttribute("data-theme") === "dark";
    var label = dark ? "Switch to light mode" : "Switch to dark mode";
    toggles.forEach(function (b) { b.setAttribute("aria-label", label); b.setAttribute("title", label); });
  }
  toggles.forEach(function (b) {
    b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      saved = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
      paintToggles();
      if (!reduce) {
        b.classList.remove("turn"); void b.offsetWidth; b.classList.add("turn");
      }
    });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var follow = function (e) {
      if (saved === "light" || saved === "dark") return;
      root.setAttribute("data-theme", e.matches ? "dark" : "light");
      paintToggles();
    };
    if (mq.addEventListener) mq.addEventListener("change", follow);
  }
  paintToggles();

  /* ---------- responsive layout demo ---------- */
  var range = document.getElementById("w");
  var frame = document.getElementById("frame");
  var stage = document.getElementById("stage");
  var out = document.getElementById("wout");
  var sweep = null;

  function colsFor(w) { return w >= 580 ? 3 : (w >= 440 ? 2 : 1); }
  function apply(v) {
    v = Math.round(v);
    var max = Number(range.max);
    if (v > max) v = max;
    range.value = v;
    frame.style.width = v + "px";
    var c = colsFor(v);
    var text = v + " px wide, " + c + (c === 1 ? " column" : " columns");
    out.textContent = text;
    range.setAttribute("aria-valuetext", text);
  }
  function fitMax() {
    var avail = stage.clientWidth - 32;
    range.max = Math.max(261, Math.min(640, avail));
    apply(Number(range.value));
  }
  function stopSweep() { if (sweep) { cancelAnimationFrame(sweep); sweep = null; } }

  range.addEventListener("input", function () { stopSweep(); apply(Number(range.value)); });
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { range.addEventListener(ev, stopSweep, { passive: true }); });
  window.addEventListener("resize", fitMax);
  fitMax();

  /* one intro sweep on load: wide, then narrow, then settle in the middle */
  if (!reduce) {
    var maxNow = Number(range.max);
    var path = [Math.min(600, maxNow), 290, Math.min(460, maxNow)];
    var seg = 1400, t0 = null;
    apply(path[0]);
    setTimeout(function () {
      function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var el = ts - t0, i = Math.min(Math.floor(el / seg), path.length - 2);
        var p = Math.min((el - i * seg) / seg, 1);
        apply(path[i] + (path[i + 1] - path[i]) * ease(p));
        if (el < seg * (path.length - 1)) { sweep = requestAnimationFrame(tick); } else { sweep = null; }
      }
      if (!sweep && document.activeElement !== range) { sweep = requestAnimationFrame(tick); }
    }, 900);
  }

  /* ---------- project filters ---------- */
  var buttons = document.querySelectorAll(".filters button");
  var projects = document.querySelectorAll(".project");
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.getAttribute("data-filter");
      buttons.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      projects.forEach(function (p) { p.hidden = !(f === "all" || p.getAttribute("data-cat") === f); });
    });
  });

  /* ---------- current section in the nav ---------- */
  var links = document.querySelectorAll(".rail-nav a, .top-nav a");
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section"));
  var locked = null, ticking = false;

  function keepVisible(a) {
    var nav = a.parentNode;
    if (nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    }
  }
  function setActive(id) {
    links.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.setAttribute("aria-current", on ? "true" : "false");
      if (on && a.parentNode.classList.contains("top-nav")) keepVisible(a);
    });
  }
  function compute() {
    ticking = false;
    if (locked) { setActive(locked); return; }
    var line = Math.max(120, window.innerHeight * 0.3);
    var id = sections[0].id;
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) id = s.id; });
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) id = sections[sections.length - 1].id;
    setActive(id);
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(compute); } }

  /* a clicked link stays highlighted until the person scrolls on their own */
  links.forEach(function (a) {
    a.addEventListener("click", function () {
      locked = a.getAttribute("href").slice(1);
      setActive(locked);
    });
  });
  ["wheel", "touchmove", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (ev === "keydown" && (e.key === "Tab" || e.key === "Enter")) return;
      locked = null;
    }, { passive: true });
  });
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  compute();

  /* ---------- copy helpers ---------- */
  var toast = document.getElementById("toast"), timer;
  function say(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(timer); timer = setTimeout(function () { toast.classList.remove("show"); }, 3500);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta); return ok;
  }
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else { done(fallbackCopy(text)); }
  }

  /* ---------- email: copy the address, then offer Gmail or Outlook ---------- */
  var sheet = document.getElementById("mailSheet");
  var status = document.getElementById("sheetStatus");
  var closeBtn = document.getElementById("sheetClose");
  var opener = null;

  function openSheet(trigger, email) {
    opener = trigger;
    status.className = "sheet-status";
    status.textContent = "Copying the address...";
    sheet.hidden = false;
    document.getElementById("optGmail").focus();
    copyText(email, function (ok) {
      status.className = ok ? "sheet-status ok" : "sheet-status";
      status.textContent = ok ? "Email address copied to your clipboard." : "Could not copy automatically. Select the address above to copy it.";
    });
  }
  function closeSheet() {
    sheet.hidden = true;
    if (opener) { opener.focus(); opener = null; }
  }
  closeBtn.addEventListener("click", closeSheet);
  sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
  document.addEventListener("keydown", function (e) {
    if (sheet.hidden) return;
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key === "Tab") {
      var f = sheet.querySelectorAll("a[href], button");
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  sheet.querySelectorAll(".opt, .sheet-foot a").forEach(function (a) {
    a.addEventListener("click", function () { setTimeout(closeSheet, 150); });
  });

  document.querySelectorAll('a[data-copy]').forEach(function (a) {
    var isMail = a.getAttribute("href").indexOf("mailto:") === 0;
    a.addEventListener("click", function (e) {
      var text = a.getAttribute("data-copy");
      if (isMail) { e.preventDefault(); openSheet(a, text); return; }
      copyText(text, function (ok) { say(ok ? "Number copied: " + text : "Phone: " + text); });
    });
  });
})();
