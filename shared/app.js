/* ============================================================
   Joy engine — shared by the English (en) and Korean (kr)
   wedding websites. Content lives in the per-locale content
   file (en/content.en.js, kr/content.ko.js) as `window.SITE`;
   fixed UI strings live in shared/i18n.js.

   Responsibilities: hash router, page rendering, countdown,
   display-only gallery + lightbox, the RSVP widget mount, and
   the (optional) design customizer.
   ============================================================ */

"use strict";

/* ----------------------------------------------------------
   Design settings
   ---------------------------------------------------------- */

const FONT_CHOICES = {
  heading: ["Playfair Display", "Cormorant Garamond", "EB Garamond", "Libre Caslon Text", "DM Serif Display", "Marcellus", "Lora", "Nanum Myeongjo", "Noto Serif KR", "Gowun Batang"],
  brand: ["Clicker Script", "Great Vibes", "Parisienne", "Dancing Script", "Allura", "Charmonman", "Nanum Pen Script", "None"],
  body: ["Montserrat", "Inter", "Lato", "Karla", "Bitter", "Jost", "Nunito Sans", "Noto Sans KR", "Gowun Dodum"],
};

/* Korean-first font sets for the ko site's design panel. Every font here is
   loaded up front by kr/index.html's static <link>, so switching is instant. */
const FONT_CHOICES_KO = {
  heading: ["SD Jeongche", "Nanum Myeongjo", "Noto Serif KR", "Gowun Batang", "Song Myung", "Hahmlet", "Black Han Sans", "Do Hyeon", "Jua"],
  brand: ["Nanum Pen Script", "Gaegu", "Gamja Flower", "None"],
  body: ["Noto Sans KR", "SD Jeongche", "Gowun Dodum", "Nanum Gothic", "IBM Plex Sans KR", "Sunflower"],
};

function fontChoices() {
  return (typeof SITE !== "undefined" && SITE.locale === "ko") ? FONT_CHOICES_KO : FONT_CHOICES;
}

// Fonts served by an external webfont provider (Sandoll Cloud), NOT Google
// Fonts — each site loads them via its own <link>, so they must be excluded
// from the dynamic Google Fonts request (css2 400s the WHOLE request on an
// unknown family name, which would drop every other font too).
const EXTERNAL_FONTS = new Set(["SD Jeongche"]);

const PALETTES = [
  { id: "magnolia",  name: "Magnolia",   bg: "#f8f1ef", accent: "#875346", alt: "#5a6857", text: "#333333" },
  { id: "forest",    name: "Forest",     bg: "#faf7f0", accent: "#2f4a3c", alt: "#b08d57", text: "#26302b" },
  { id: "porcelain", name: "Porcelain",  bg: "#f7f8fa", accent: "#2c3e5d", alt: "#8593ad", text: "#232a35" },
  { id: "champagne", name: "Champagne",  bg: "#f9f4ec", accent: "#a67c52", alt: "#7d6b5d", text: "#3a332d" },
  { id: "blush",     name: "Blush",      bg: "#fdf4f5", accent: "#b0526c", alt: "#7a8574", text: "#3b3134" },
  { id: "noir",      name: "Noir",       bg: "#ffffff", accent: "#1a1a1a", alt: "#8c8c8c", text: "#111111" },
];

const DEFAULT_SETTINGS = {
  fonts: { heading: "EB Garamond", brand: "None", body: "Jost" },
  colors: { preset: "porcelain", bg: "#f7f8fa", accent: "#2c3e5d", alt: "#8593ad", text: "#232a35" },
  layout: { hero: "banner", header: "stacked", mode: "multi", width: "cozy" },
};

/* Fallback section titles (English) if a content file omits SITE.titles.
   All single-line — no script/heading split. */
const DEFAULT_TITLES = {
  welcome:  { script: "", title: "" },
  story:    { script: "", title: "Our Story" },
  schedule: { script: "", title: "Schedule" },
  stay:     { script: "", title: "Where to Stay" },
  travel:   { script: "", title: "Travel" },
  qanda:    { script: "", title: "Questions & Answers" },
  registry: { script: "", title: "Registry" },
  accounts: { script: "", title: "Gifts" },
  moments:  { script: "", title: "Our Moments" },
  rsvp:     { script: "", title: "RSVP" },
};

const SETTINGS_KEY = "sd-design";

let remoteDesign = null;      // admin-published design (config_overrides scope 'design')
let hasLocalSettings = false; // this browser has its own panel experiments
let SAVED_SITE = null;        // guest baseline (content file + saved override); live-preview merge base
let settings = loadSettings();
let fontPickers = {};

// The font role for the site title used to be called "script" (it also drove
// the page-title eyebrows back then). Old saved settings / fontDefaults may
// still carry that key — treat it as "brand" so nobody loses their pick.
function normFonts(f) {
  const out = { ...f };
  if (out.script) {
    if (!out.brand) out.brand = out.script;
    delete out.script;
  }
  return out;
}

// The effective site design before this browser's own panel picks:
// built-in defaults ← per-site fontDefaults ← the admin-published
// design (fonts for this locale + shared colors).
function baseSettings() {
  const siteFonts = normFonts((window.SITE && window.SITE.fontDefaults) || {});
  const s = {
    fonts: { ...DEFAULT_SETTINGS.fonts, ...siteFonts },
    colors: { ...DEFAULT_SETTINGS.colors },
    layout: { ...DEFAULT_SETTINGS.layout },
  };
  if (remoteDesign) {
    const rf = ((window.SITE && window.SITE.locale === "ko") ? remoteDesign.fontsKo : remoteDesign.fonts) || {};
    s.fonts = { ...s.fonts, ...normFonts(rf) };
    if (remoteDesign.colors) s.colors = { ...s.colors, ...remoteDesign.colors };
  }
  return s;
}

function loadSettings() {
  const base = baseSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    hasLocalSettings = !!raw;
    const saved = raw ? JSON.parse(raw) : {};
    return {
      fonts: { ...base.fonts, ...normFonts(saved.fonts || {}) },
      colors: { ...base.colors, ...saved.colors },
      layout: { ...base.layout, ...saved.layout },
    };
  } catch {
    hasLocalSettings = false;
    return base;
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  const d = document.documentElement;
  const { fonts, colors, layout } = settings;

  d.style.setProperty("--f-heading", `"${fonts.heading}", Georgia, serif`);
  d.style.setProperty("--f-brand", fonts.brand === "None" ? `"${fonts.heading}", serif` : `"${fonts.brand}", cursive`);
  d.style.setProperty("--f-body", `"${fonts.body}", "Helvetica Neue", sans-serif`);

  d.style.setProperty("--c-bg", colors.bg);
  d.style.setProperty("--c-accent", colors.accent);
  d.style.setProperty("--c-alt", colors.alt);
  d.style.setProperty("--c-text", colors.text);
  d.style.setProperty("--c-surface", mixWithWhite(colors.bg, 0.55));
  d.style.setProperty("--c-line", mixColors(colors.bg, colors.accent, 0.16));
  d.style.setProperty("--c-muted", mixColors(colors.text, colors.bg, 0.55));

  d.dataset.hero = layout.hero;
  d.dataset.header = layout.header;
  d.dataset.mode = layout.mode;
  d.dataset.width = layout.width;

  loadGoogleFonts();
  // NOTE: deliberately no saveSettings() here — settings persist only
  // when the visitor actually changes something in the design panel,
  // so admin-published design updates reach returning visitors too.
}

function loadGoogleFonts() {
  const fams = new Set([settings.fonts.heading, settings.fonts.body]);
  if (settings.fonts.brand !== "None") fams.add(settings.fonts.brand);
  // Request families WITHOUT a weight/italic axis: css2 rejects the whole
  // request if any one family lacks the requested axis (common with Korean and
  // single-weight display fonts), which would drop every font. Bold weights for
  // the built-in choices come from each page's static <link>; this dynamic link
  // just guarantees any custom-typed font also loads.
  const parts = [...fams]
    .filter((f) => f && !EXTERNAL_FONTS.has(f))
    .map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+"));
  const link = document.getElementById("gfonts");
  if (link) link.href = "https://fonts.googleapis.com/css2?" + parts.join("&") + "&display=swap";
}

/* tiny color helpers (hex in, hex out) */
function hexRgb(h) {
  const x = h.replace("#", "");
  const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}
function rgbHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function mixColors(a, b, t) {
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function mixWithWhite(c, t) { return mixColors(c, "#ffffff", t); }

/* ----------------------------------------------------------
   Photos (display-only — the curated set from shared/photos)
   ---------------------------------------------------------- */

function photoImg(src, alt, extraClass) {
  if (!src) return "";
  return `<div class="photo ${extraClass || ""}"><img src="${src}" alt="${alt || ""}" loading="lazy"></div>`;
}

/* ----------------------------------------------------------
   Page templates
   ---------------------------------------------------------- */

function titleFor(id) {
  return (SITE.titles && SITE.titles[id]) || DEFAULT_TITLES[id] || { script: "", title: "" };
}

function pageTitle(id) {
  const s = titleFor(id);
  const eyebrow = s.script ? `<span class="script">${s.script}</span>` : "";
  return `<div class="page-title">${eyebrow}<h2>${s.title || ""}</h2></div>`;
}

// One 혼주(parent) line: "아버지 · 어머니  의 아들/딸  이름".
function familyLine(father, mother, role, name) {
  const parents = [father, mother].filter(Boolean).join(" · ");
  if (!parents && !name) return "";
  return `<p class="invite-family"><span class="parents">${parents}</span>` +
    (role ? `<span class="rel">의 ${role}</span>` : "") +
    (name ? `<b>${name}</b>` : "") + "</p>";
}

// The formal invitation block (모시는 글 + 혼주). Renders only when the content
// file provides SITE.greeting / SITE.family — so the KR site shows it and the EN
// site (which has neither) is left exactly as before.
function inviteBlock() {
  const g = SITE.greeting, f = SITE.family;
  if (!g && !f) return "";
  let inner = "";
  if (g) {
    if (g.eyebrow) inner += `<p class="invite-eyebrow">${g.eyebrow}</p>`;
    if (g.heading) inner += `<h2 class="invite-heading">${g.heading}</h2>`;
    if (g.body) inner += `<p class="invite-body">${String(g.body).replace(/\n/g, "<br>")}</p>`;
  }
  if (f) {
    const lines = familyLine(f.groomFather, f.groomMother, f.groomRole, f.groomName) +
      familyLine(f.brideFather, f.brideMother, f.brideRole, f.brideName);
    if (lines) inner += `<div class="invite-families">${lines}</div>`;
  }
  return inner ? `<section class="invitation">${inner}</section>` : "";
}

function renderWelcome() {
  const w = SITE.wedding;
  const c = SITE.couple;
  const p1 = c.heroPartner1 || c.partner1;   // KR: full Korean names; EN: romanized
  const p2 = c.heroPartner2 || c.partner2;
  const names = `${p1} <span class="hero-amp">&amp;</span> ${p2}`;
  const heroText = `
    <div class="hero-names">${names}</div>
    <div class="hero-date">${w.dateDisplay}</div>
    <div class="hero-venue">${w.venue}</div>`;
  const heroPhoto = (SITE.photos && SITE.photos.hero)
    ? `<img class="hero-img" src="${SITE.photos.hero}" alt="" fetchpriority="high">` : "";
  const invite = inviteBlock();
  const countdown = `<div class="countdown" id="countdown"></div>`;
  // With an invitation (KR), the countdown moves below it so the invitation
  // sits right under the hero. Without one (EN), it stays in the hero — unchanged.
  return `
    <section class="hero">
      <div class="hero-photo-wrap">
        ${heroPhoto}
        <div class="hero-overlay" id="heroOverlay">${heroText}</div>
      </div>
      <div class="hero-inner" id="heroInner">${heroText}</div>
      ${invite ? "" : countdown}
    </section>
    ${invite}
    <section class="page-body" style="max-width:var(--w-content);margin:0 auto;padding:${invite ? "2.8rem" : "3rem"} 1.5rem 0">
      <div class="page-title">${titleFor("welcome").script ? `<span class="script">${titleFor("welcome").script}</span>` : ""}<h2>${SITE.welcome.heading}</h2></div>
      <p class="center">${SITE.welcome.message}</p>
    </section>
    ${invite ? `<section class="page-body" style="max-width:var(--w-content);margin:0 auto;padding:2.4rem 1.5rem 0">${countdown}</section>` : ""}`;
}

function renderStory() {
  const photo = (SITE.photos && SITE.photos.story)
    ? `<div class="story-photo">${photoImg(SITE.photos.story, "", "slot-tall")}</div>` : "";
  return `
    ${pageTitle("story")}
    <p class="center muted" style="margin-bottom:0.4rem">${SITE.story.intro}</p>
    ${photo}
    <p class="story-text">${SITE.story.text}</p>`;
}

function renderSchedule() {
  const items = SITE.schedule.map((it) => `
    <div class="timeline-item">
      <h3>${it.title}</h3>
      <div class="timeline-when">${it.time || ""}</div>
      <div class="timeline-where">${it.location}</div>
      <p style="font-size:0.92rem;margin-top:0.35rem">${it.note || ""}</p>
    </div>`).join("");
  return `${pageTitle("schedule")}<div class="timeline">${items}</div>`;
}

function renderStay() {
  const cards = SITE.hotels.map((h) => `
    <div class="hotel-card">
      <div class="hotel-body">
        <h3>${h.name}</h3>
        <div class="hotel-stars">${"★".repeat(Math.floor(h.stars))}${h.stars % 1 ? "½" : ""} <span class="muted">(${h.stars})</span></div>
        <div class="hotel-addr">${h.address}</div>
        <p class="hotel-blurb">${h.blurb}</p>
      </div>
    </div>`).join("");
  const intro = SITE.stayIntro ? `<p class="center" style="margin-bottom:2.2rem">${SITE.stayIntro}</p>` : "";
  return `${pageTitle("stay")}${intro}<div class="hotel-grid">${cards}</div>`;
}

// Travel bodies: lines starting with "- " become a styled list; plain
// lines stay as paragraphs, so an intro or outro can sit outside the
// bullets. Bare URLs become clickable links.
function travelLinkify(text) {
  return text.replace(/https?:\/\/[^\s<]+/g, (url) =>
    `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
}

function travelBody(body) {
  const lines = String(body || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const parts = [];
  let items = [];
  const flush = () => {
    if (items.length) {
      parts.push(`<ul class="travel-list">${items.map((li) => `<li>${li}</li>`).join("")}</ul>`);
      items = [];
    }
  };
  lines.forEach((line) => {
    const m = line.match(/^[-•]\s+(.*)/);
    if (m) items.push(travelLinkify(m[1]));
    else { flush(); parts.push(`<p>${travelLinkify(line)}</p>`); }
  });
  flush();
  return parts.join("");
}

function renderTravel() {
  const blocks = SITE.travel.map((t) => `
    <div class="travel-block"><h3>${t.title}</h3>${travelBody(t.body)}</div>`).join("");
  const maps = (SITE.wedding.maps || []).map((m) =>
    `<a class="map-pill" href="${m.url}" target="_blank" rel="noopener">${m.label}</a>`).join("");
  const mapRow = maps ? `<div class="travel-maps">${maps}</div>` : "";
  return `
    ${pageTitle("travel")}
    <p class="center muted" style="margin-bottom:${maps ? "1.1rem" : "2.4rem"}">${SITE.wedding.venue} · ${SITE.wedding.venueAddress}</p>
    ${mapRow}
    ${blocks}`;
}

function renderQanda() {
  // A row whose question starts with "## " is a group heading, not a question.
  const items = SITE.qanda.map((q) => {
    const group = /^##\s*(.*)/.exec(q.q || "");
    if (group) return `<h3 class="qa-group">${group[1]}</h3>`;
    return `
    <details class="qa-item">
      <summary>${q.q}</summary>
      <div class="qa-answer">${q.a}</div>
    </details>`;
  }).join("");
  return `${pageTitle("qanda")}${items}`;
}

function renderRegistry() {
  const links = SITE.registry.links.map((l) => `
    <a class="registry-card" href="${l.url}" target="_blank" rel="noopener">
      <h3>${l.label} →</h3>
      <p>${l.description || ""}</p>
    </a>`).join("");
  return `${pageTitle("registry")}<p class="center">${SITE.registry.note}</p><div class="registry-links">${links}</div>`;
}

// 마음 전하실 곳 — the KR take on a registry: bank accounts for money
// gifts, mirroring the 모청's accounts section (collapsible 신랑/신부
// groups, copy-to-clipboard). Data shape matches invite/config.js
// accounts so real values can be pasted 1:1 at launch.
function renderAccounts() {
  const a = SITE.accounts || {};
  const item = (acc) => {
    const pay = [
      acc.kakaopayUrl ? `<a class="acct-pay" href="${acc.kakaopayUrl}" target="_blank" rel="noopener">${t("accounts.kakaopay")}</a>` : "",
      acc.cardPayUrl ? `<a class="acct-pay" href="${acc.cardPayUrl}" target="_blank" rel="noopener">${t("accounts.cardpay")}</a>` : "",
    ].join("");
    return `
      <div class="acct-item">
        <p class="acct-who">${acc.label} ${acc.holder}</p>
        <p class="acct-num">${acc.bank} <b>${acc.number}</b></p>
        <div class="acct-btns">
          <button class="acct-copy" type="button" data-copy="${acc.bank} ${acc.number}">${t("accounts.copy")}</button>
          ${pay}
        </div>
      </div>`;
  };
  const group = (title, items) => {
    const rows = (items || []).filter((x) => x.number);
    const body = rows.length ? rows.map(item).join("") : `<p class="acct-empty">${t("accounts.empty")}</p>`;
    return `
      <div class="acct-group">
        <button class="acct-head" type="button">${title}<span class="acct-chevron">⌄</span></button>
        <div class="acct-body">${body}</div>
      </div>`;
  };
  return `
    ${pageTitle("accounts")}
    ${a.notice ? `<p class="center">${a.notice}</p>` : ""}
    <div class="accounts">
      ${group(t("accounts.groomSide"), a.groom)}
      ${group(t("accounts.brideSide"), a.bride)}
    </div>`;
}

function mountAccounts() {
  const sec = document.querySelector('section[data-page="accounts"]');
  if (!sec) return;
  sec.addEventListener("click", (e) => {
    const head = e.target.closest(".acct-head");
    if (head) { head.parentElement.classList.toggle("open"); return; }
    const btn = e.target.closest(".acct-copy");
    if (btn) copyAccountNumber(btn);
  });
}

// navigator.clipboard needs a secure context; the textarea path covers
// plain-http previews (same fallback as copyText in shared/mochung/main.js).
function copyAccountNumber(btn) {
  const text = btn.dataset.copy.trim();
  const flash = () => {
    const original = btn.textContent;
    btn.textContent = t("accounts.copied");
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1500);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(flash);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); flash(); } catch (e) { /* ignore */ }
  ta.remove();
}

function renderMoments() {
  return `
    ${pageTitle("moments")}
    <p class="center">${SITE.moments.intro}</p>
    <div class="gallery" id="gallery"></div>`;
}

function renderRsvp() {
  const deadline = SITE.rsvp && SITE.rsvp.deadline
    ? `<p class="center" style="margin-top:0.6rem"><strong>${t("respondBy", { date: SITE.rsvp.deadline })}</strong></p>` : "";
  const intro = SITE.rsvp && SITE.rsvp.message ? `<p class="center">${SITE.rsvp.message}</p>` : "";
  return `
    ${pageTitle("rsvp")}
    ${intro}
    ${deadline}
    <div id="rsvpWidget" class="rsvp-widget"></div>`;
}

const PAGE_RENDERERS = {
  welcome: renderWelcome,
  story: renderStory,
  schedule: renderSchedule,
  stay: renderStay,
  travel: renderTravel,
  qanda: renderQanda,
  registry: renderRegistry,
  accounts: renderAccounts,
  moments: renderMoments,
  rsvp: renderRsvp,
};

/* ----------------------------------------------------------
   Rendering + router
   ---------------------------------------------------------- */

function buildNav() {
  const nav = document.getElementById("siteNav");
  nav.innerHTML = SITE.navigation
    .map((p) => `<a href="#/${p.id}" data-page="${p.id}">${p.label}</a>`)
    .join("");
}

function renderAllPages() {
  const main = document.getElementById("main");
  main.innerHTML = SITE.navigation
    .map((p) => {
      const body = PAGE_RENDERERS[p.id] ? PAGE_RENDERERS[p.id]() : "";
      const cls = p.id === "welcome" ? "" : "page";
      return `<section class="${cls}" id="page-${p.id}" data-page="${p.id}">${body}</section>`;
    })
    .join("");

  renderGallery();
  mountRsvp();
  mountAccounts();
  startCountdown();
  syncHeroText();
}

function currentPage() {
  const m = location.hash.match(/^#\/([\w-]+)/);
  const id = m ? m[1] : SITE.navigation[0].id;
  return SITE.navigation.some((p) => p.id === id) ? id : SITE.navigation[0].id;
}

function route() {
  const id = currentPage();
  const multi = settings.layout.mode === "multi";

  document.querySelectorAll("#main > section").forEach((sec) => {
    sec.hidden = multi && sec.dataset.page !== id;
  });

  document.querySelectorAll("#siteNav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === id);
  });

  if (multi) {
    window.scrollTo({ top: 0 });
  } else {
    const el = document.getElementById("page-" + id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

/* ----------------------------------------------------------
   Countdown
   ---------------------------------------------------------- */

let countdownTimer = null;

function startCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;
  clearInterval(countdownTimer);
  const target = new Date(SITE.wedding.dateISO).getTime();

  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000); diff -= h * 3600000;
    const m = Math.floor(diff / 60000); diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    const cells = [[d, t("count.days")], [h, t("count.hours")], [m, t("count.minutes")], [s, t("count.seconds")]];
    el.innerHTML = cells
      .map(([n, l]) => `<div class="count-cell"><div class="count-num">${n}</div><div class="count-label">${l}</div></div>`)
      .join("");
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

/* ----------------------------------------------------------
   Hero variants — show overlay text only for banner style
   ---------------------------------------------------------- */

function syncHeroText() {
  const overlay = document.getElementById("heroOverlay");
  const inner = document.getElementById("heroInner");
  if (!overlay || !inner) return;
  const banner = settings.layout.hero === "banner";
  overlay.style.display = banner ? "" : "none";
  inner.style.display = banner ? "none" : "";
  const hasPhoto = !!(SITE.photos && SITE.photos.hero);
  overlay.classList.toggle("on-photo", hasPhoto);
}

/* ----------------------------------------------------------
   Gallery (display-only) + lightbox
   ---------------------------------------------------------- */

function renderGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  const urls = SITE.galleryDefaults || [];
  gallery.innerHTML = "";
  urls.forEach((url) => {
    const fig = document.createElement("figure");
    fig.className = "gallery-item";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Gallery photo";
    img.loading = "lazy";
    fig.append(img);
    fig.addEventListener("click", () => openLightbox(url));
    gallery.append(fig);
  });
}

function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  document.getElementById("lightboxImg").src = src;
  lb.hidden = false;
}

/* ----------------------------------------------------------
   RSVP widget mount
   ---------------------------------------------------------- */

function mountRsvp() {
  const host = document.getElementById("rsvpWidget");
  if (!host || !window.Store) return;
  const kind = SITE.rsvpKind || "wedding";
  const opts = { store: window.Store, config: SITE };
  if (kind === "afterparty" && window.mountAfterpartyRsvp) {
    window.mountAfterpartyRsvp(host, opts);
  } else if (window.mountWeddingRsvp) {
    window.mountWeddingRsvp(host, opts);
  }
}

/* ----------------------------------------------------------
   Design panel (optional — gated by SITE.designPanel)
   ---------------------------------------------------------- */

function designEnabled() {
  if (SITE.designPanel === true) return true;
  try { return new URLSearchParams(location.search).get("design") === "1"; }
  catch (e) { return false; }
}

/* Load every offered font (plus current picks) so each picker option and the
   trigger can render in its own typeface. Dedicated link, no weight axis. */
function ensurePreviewFonts() {
  const fams = new Set();
  for (const role of ["heading", "brand", "body"]) {
    for (const f of fontChoices()[role]) if (f && f !== "None" && !EXTERNAL_FONTS.has(f)) fams.add(f);
    const pick = settings.fonts[role];
    if (pick && pick !== "None" && !EXTERNAL_FONTS.has(pick)) fams.add(pick);
  }
  let link = document.getElementById("gfontsPreview");
  if (!link) {
    link = document.createElement("link");
    link.id = "gfontsPreview";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  const parts = [...fams].map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+"));
  link.href = "https://fonts.googleapis.com/css2?" + parts.join("&") + "&display=swap";
}

function closeAllFontMenus() {
  document.querySelectorAll(".fp-menu").forEach((m) => { m.hidden = true; });
}

/* A custom font picker: the trigger and every option render IN the font they
   name, so you can preview typefaces without selecting them first. The hidden
   native <select> is kept as a value holder. */
function makeFontPicker(role) {
  const id = "font" + role.charAt(0).toUpperCase() + role.slice(1);
  const select = document.getElementById(id);
  const customInput = document.getElementById(id + "Custom");
  const label = select.closest(".dp-field");
  select.style.display = "none";

  const picker = document.createElement("div");
  picker.className = "fp";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "fp-trigger";
  const menu = document.createElement("div");
  menu.className = "fp-menu";
  menu.hidden = true;
  picker.append(trigger, menu);
  label.appendChild(picker);

  const fallback = role === "brand" ? "cursive" : "serif";
  const styleAs = (elm, font) => { elm.style.fontFamily = (font && font !== "None") ? `"${font}", ${fallback}` : ""; };
  const setTrigger = (v) => { trigger.textContent = v === "None" ? "None" : v; styleAs(trigger, v); };

  function pick(v) {
    settings.fonts[role] = v;
    select.value = v;
    applySettings();
    saveSettings();
    hasLocalSettings = true;
    setTrigger(v);
    menu.hidden = true;
    menu.querySelectorAll(".fp-opt").forEach((o) => o.classList.toggle("selected", o.dataset.value === v));
  }

  function buildMenu() {
    menu.innerHTML = "";
    const choices = [...fontChoices()[role]];
    if (settings.fonts[role] && !choices.includes(settings.fonts[role])) choices.unshift(settings.fonts[role]);
    choices.forEach((v) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "fp-opt" + (v === settings.fonts[role] ? " selected" : "");
      opt.dataset.value = v;
      opt.textContent = v === "None" ? "None (use heading font)" : v;
      styleAs(opt, v);
      opt.addEventListener("click", () => pick(v));
      menu.append(opt);
    });
    const customBtn = document.createElement("button");
    customBtn.type = "button";
    customBtn.className = "fp-opt fp-custom";
    customBtn.textContent = "Custom Google Font…";
    customBtn.addEventListener("click", () => { menu.hidden = true; customInput.hidden = false; customInput.focus(); });
    menu.append(customBtn);
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = !menu.hidden;
    closeAllFontMenus();
    if (!wasOpen) {
      menu.hidden = false;
      const sel = menu.querySelector(".fp-opt.selected");
      if (sel) sel.scrollIntoView({ block: "nearest" });
    }
  });

  customInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const name = customInput.value.trim();
    if (!name) return;
    pick(name);
    ensurePreviewFonts();
    buildMenu();
    customInput.hidden = true;
    customInput.value = "";
  });

  buildMenu();
  setTrigger(settings.fonts[role]);
  return { buildMenu, setTrigger };
}

function buildDesignPanel() {
  ensurePreviewFonts();
  fontPickers = {
    heading: makeFontPicker("heading"),
    brand: makeFontPicker("brand"),
    body: makeFontPicker("body"),
  };
  document.addEventListener("click", closeAllFontMenus);

  const sw = document.getElementById("paletteSwatches");
  sw.innerHTML = PALETTES.map((p) => `
    <button class="dp-swatch" data-palette="${p.id}" title="${p.name}" aria-label="${p.name}">
      <i style="background:${p.accent}"></i><i style="background:${p.bg}"></i>
    </button>`).join("");
  sw.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-palette]");
    if (!btn) return;
    const p = PALETTES.find((x) => x.id === btn.dataset.palette);
    settings.colors = { preset: p.id, bg: p.bg, accent: p.accent, alt: p.alt, text: p.text };
    applySettings();
    saveSettings();
    hasLocalSettings = true;
    refreshPanelState();
  });

  for (const [key, id] of [["bg", "colBg"], ["accent", "colAccent"], ["alt", "colAlt"], ["text", "colText"]]) {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      settings.colors[key] = input.value;
      settings.colors.preset = "custom";
      applySettings();
      saveSettings();
      hasLocalSettings = true;
      refreshPanelState();
    });
  }

  document.querySelectorAll(".dp-radios").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      settings.layout[group.dataset.setting] = btn.dataset.value;
      applySettings();
      saveSettings();
      hasLocalSettings = true;
      refreshPanelState();
      route();
      syncHeroText();
    });
  });

  const panel = document.getElementById("designPanel");
  document.getElementById("designToggle").addEventListener("click", () => panel.classList.toggle("open"));
  document.getElementById("designClose").addEventListener("click", () => panel.classList.remove("open"));
  document.getElementById("designReset").addEventListener("click", () => {
    localStorage.removeItem(SETTINGS_KEY);
    hasLocalSettings = false;
    settings = baseSettings(); // defaults + site fonts + admin-published design
    applySettings();
    refreshPanelState();
    route();
    syncHeroText();
  });

  refreshPanelState();
}

function refreshPanelState() {
  for (const role of ["heading", "brand", "body"]) {
    if (fontPickers[role]) { fontPickers[role].buildMenu(); fontPickers[role].setTrigger(settings.fonts[role]); }
  }

  document.querySelectorAll(".dp-swatch").forEach((b) =>
    b.classList.toggle("selected", b.dataset.palette === settings.colors.preset));

  document.getElementById("colBg").value = settings.colors.bg;
  document.getElementById("colAccent").value = settings.colors.accent;
  document.getElementById("colAlt").value = settings.colors.alt;
  document.getElementById("colText").value = settings.colors.text;

  document.querySelectorAll(".dp-radios").forEach((group) => {
    group.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("selected", b.dataset.value === settings.layout[group.dataset.setting]));
  });
}

/* ----------------------------------------------------------
   Live design preview (admin → this page, only when embedded)
   ----------------------------------------------------------
   admin/edit-site.html frames this page and posts the design
   controls (fonts + colors) as they change, so the couple sees
   the result live BEFORE publishing to guests. Preview-only:
   applied to this in-memory instance via applySettings(), never
   saved and never shared. Guests view this page top-level, so
   the `window.parent === window` guard means they never receive
   or process any of these messages. */

function trustedAdminOrigin(origin) {
  if (origin === "https://doremi.soyeondoyoon.cloud") return true;
  // local dev / LAN: admin served from localhost, 127.0.0.1, or a private IP
  return /^https?:\/\/(localhost|127\.0\.0\.1|(?:192\.168|10\.\d{1,3})\.\d{1,3}\.\d{1,3})(?::\d+)?$/.test(origin);
}
function safeFontName(v) {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 60);
  return /^[\w .\-]+$/.test(s) ? s : null;   // letters/digits/space/dot/hyphen
}
function safeHexColor(v) {
  return (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())) ? v.trim() : null;
}
// The baseline the preview builds on: built-in defaults + this locale's site
// fontDefaults. It deliberately EXCLUDES remoteDesign/local picks so the preview
// mirrors exactly the admin's controls — a field the admin cleared falls back to
// the site default rather than clinging to a previously-applied value.
function previewDesignBase() {
  const siteFonts = normFonts((window.SITE && window.SITE.fontDefaults) || {});
  return {
    fonts: { ...DEFAULT_SETTINGS.fonts, ...siteFonts },
    colors: { ...DEFAULT_SETTINGS.colors },
    layout: { ...settings.layout },   // design panel here doesn't touch layout
  };
}
function applyDesignPreview(payload) {
  if (!payload || typeof payload !== "object") return;
  const base = previewDesignBase();
  const isKo = window.SITE && window.SITE.locale === "ko";
  const rf = normFonts((isKo ? payload.fontsKo : payload.fonts) || {});
  for (const role of ["heading", "brand", "body"]) {
    if (rf[role] === "None") base.fonts[role] = "None";
    else { const f = safeFontName(rf[role]); if (f) base.fonts[role] = f; }
  }
  const c = payload.colors || {};
  for (const k of ["bg", "accent", "alt", "text"]) {
    const hex = safeHexColor(c[k]);
    if (hex) base.colors[k] = hex;
  }
  if (typeof c.preset === "string") base.colors.preset = c.preset;
  settings = base;
  applySettings();
  if (designEnabled()) refreshPanelState();
}
// Content-derived page chrome (title, brand monogram/names, footer). Shared by
// boot() and the live content preview so both stay in sync with window.SITE.
function applyContentChrome() {
  // brandName (KR: Korean names) overrides displayName for the visible header /
  // footer / tab title. It's a separate field so a saved couple.displayName
  // override can't mask it; EN has no brandName, so it falls back unchanged.
  const brand = SITE.couple.brandName || SITE.couple.displayName;
  document.title = `${brand} — ${SITE.wedding.dateDisplay}`;
  // An empty monogram means "no abbreviation" → show the full names as the
  // brand instead of an initials-style monogram (see .brand.no-monogram CSS).
  const monoEl = document.getElementById("brandMonogram");
  const brandEl = document.querySelector(".brand");
  if (monoEl) {
    if (SITE.couple.monogram) {
      monoEl.textContent = SITE.couple.monogram;
      monoEl.hidden = false;
      if (brandEl) brandEl.classList.remove("no-monogram");
    } else {
      monoEl.hidden = true;
      if (brandEl) brandEl.classList.add("no-monogram");
    }
  }
  const namesEl = document.getElementById("brandNames");
  if (namesEl) namesEl.textContent = brand;
  const footMono = document.getElementById("footerMonogram");
  if (footMono) {
    footMono.textContent = SITE.couple.monogram || "";
    footMono.hidden = !SITE.couple.monogram;
  }
  const footLine = document.getElementById("footerLine");
  if (footLine) footLine.textContent =
    `${brand} · ${SITE.wedding.dateDisplay} · ${SITE.wedding.city}`;
}

// Live content preview: the admin posts the in-progress section edits (the same
// object Save would write) and this re-renders them over the saved guest
// baseline — in memory, never persisted. Rebuilding from SAVED_SITE each time
// means an edited field updates, an un-edited section keeps its saved value, and
// clearing an override doesn't compound across messages.
function applyContentPreview(override) {
  if (!SAVED_SITE || !override || typeof override !== "object") return;
  window.SITE = deepMerge(JSON.parse(JSON.stringify(SAVED_SITE)), override);
  applyContentChrome();
  buildNav();
  renderAllPages();
  route();
}

window.addEventListener("message", (e) => {
  if (window.parent === window) return;              // ignore unless embedded
  if (!trustedAdminOrigin(e.origin)) return;
  const d = e.data;
  if (!d) return;
  if (d.__sdDesignPreview) applyDesignPreview(d.design);
  else if (d.__sdContentPreview) applyContentPreview(d.content);
});

/* ----------------------------------------------------------
   Admin content override (edited in /admin/edit-site.html)
   ---------------------------------------------------------- */

function deepMerge(base, over) {
  if (over === null || over === undefined) return base;
  if (typeof over !== "object" || Array.isArray(over)) return over;
  const out = Array.isArray(base) ? [] : Object.assign({}, base);
  for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
  return out;
}

// Merge the admin's saved edits (per-site scope) over the static content, so
// the couple can change story/schedule/etc. from the admin without editing code.
// localStorage backend = per-browser; Supabase backend = shared with everyone.
async function applySiteOverride() {
  try {
    if (!window.Store || !window.Store.getConfigOverride) return;
    const scope = SITE.locale === "ko" ? "kr" : "en";
    const ov = await window.Store.getConfigOverride(scope);
    if (ov && typeof ov === "object") window.SITE = deepMerge(window.SITE, ov);
  } catch (e) { /* fall back to the static content file */ }
}

// Admin-published design (fonts/colors for ALL visitors), saved from the
// admin site under the shared scope 'design'. Browsers with their own
// panel experiments keep those until they hit Reset.
async function applyDesignOverride() {
  try {
    if (!window.Store || !window.Store.getConfigOverride) return;
    const d = await window.Store.getConfigOverride("design");
    if (!d || typeof d !== "object") return;
    remoteDesign = d;
    if (!hasLocalSettings) settings = baseSettings();
  } catch (e) { /* keep the built-in defaults */ }
}

/* ----------------------------------------------------------
   RSVP nudge — entry popup asking guests to respond by the
   deadline (the Joy-engine cousin of the 모청's entry popup).
   Shown when the content file sets rsvp.popup; skipped for
   browsers that already submitted (flag set by rsvp-widget.js)
   or that picked "don't show again today".
   ---------------------------------------------------------- */

const NUDGE_SNOOZE_KEY = "sd-rsvp-nudge-hideUntil";
const NUDGE_DONE_KEY = "sd-afterparty-responded";

function maybeShowRsvpNudge() {
  const cfg = SITE.rsvp || {};
  if (!cfg.popup || currentPage() === "rsvp") return;
  try {
    if (localStorage.getItem(NUDGE_DONE_KEY)) return;
    if (Date.now() < parseInt(localStorage.getItem(NUDGE_SNOOZE_KEY) || "0", 10)) return;
  } catch (e) { /* storage unavailable → just show it */ }

  const wrap = document.createElement("div");
  wrap.className = "nudge-overlay";
  wrap.innerHTML = `
    <div class="nudge" role="dialog" aria-modal="true" aria-label="${t("nudge.title")}">
      <button class="nudge-x" aria-label="${t("nudge.close")}">✕</button>
      <h3 class="nudge-title">${t("nudge.title")}</h3>
      ${cfg.message ? `<p class="nudge-body">${cfg.message}</p>` : ""}
      ${cfg.deadline ? `<p class="nudge-deadline">${t("respondBy", { date: cfg.deadline })}</p>` : ""}
      <button class="btn nudge-go">${t("nudge.cta")}</button>
      <button class="nudge-today">${t("nudge.today")}</button>
    </div>`;

  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector(".nudge-x").addEventListener("click", close);
  wrap.querySelector(".nudge-go").addEventListener("click", () => {
    close();
    location.hash = "#/rsvp";
  });
  wrap.querySelector(".nudge-today").addEventListener("click", () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    try { localStorage.setItem(NUDGE_SNOOZE_KEY, String(end.getTime())); } catch (e) { /* ignore */ }
    close();
  });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  setTimeout(() => document.body.appendChild(wrap), 900);
}

/* ----------------------------------------------------------
   Boot
   ---------------------------------------------------------- */

async function boot() {
  await Promise.all([applySiteOverride(), applyDesignOverride()]);
  SAVED_SITE = JSON.parse(JSON.stringify(window.SITE));  // file + saved override = the guest baseline
  document.documentElement.lang = SITE.locale || "en";
  applyContentChrome();

  applySettings();
  buildNav();
  renderAllPages();

  const toggle = document.getElementById("designToggle");
  if (designEnabled()) {
    if (toggle) toggle.hidden = false;
    buildDesignPanel();
  } else if (toggle) {
    toggle.hidden = true;
  }

  route();
  syncHeroText();
  maybeShowRsvpNudge();

  window.addEventListener("hashchange", route);

  const lightbox = document.getElementById("lightbox");
  if (lightbox) lightbox.addEventListener("click", (e) => { e.currentTarget.hidden = true; });

  // Tell an embedding admin preview we're fully rendered, so it (re)applies any
  // held live design/content AFTER our own boot — never racing against it.
  if (window.parent !== window) {
    try { window.parent.postMessage({ __sdPreviewReady: 1 }, "*"); } catch (e) { /* sandboxed */ }
  }
}

document.addEventListener("DOMContentLoaded", boot);
