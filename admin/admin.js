/* =========================================================
 * 관리자 공용 스크립트 (shared helpers)
 *  - 접근 게이트: store.adminSignIn / store.isAdmin
 *      · localStorage 백엔드 → 암호 프롬프트
 *      · supabase 백엔드     → 매직링크(이메일) 로그인
 *  - CSV 생성/파싱, HTML 이스케이프, 날짜 포맷, 다운로드
 *  - config override 병합 (edit/index 에서 사용)
 * 주의: 정적 사이트 특성상 localStorage 백엔드의 잠금은
 *       클라이언트 측 데모 게이트입니다. 실제 잠금은 Supabase
 *       Auth + RLS 로 동작합니다.
 * ========================================================= */
window.Admin = (function () {
  'use strict';

  /* ---------- HTML / 문자열 ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDateTime(ts) {
    if (ts == null || ts === '') return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------- 다운로드 / CSV ---------- */

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // rows: Array<Array<cell>>  →  CSV string (UTF-8 BOM, CRLF)
  // Guest-supplied cells (names, messages, +1s) are formula-neutralized so a
  // value like "=CMD()" can't execute when the CSV is opened in Excel/Sheets.
  function csvCell(c) {
    let s = String(c == null ? '' : c);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function toCsv(rows) {
    return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  }

  // CSV string → Array<Array<cell>>  (handles quotes, escaped "", CRLF/LF)
  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const src = String(text == null ? '' : text).replace(/^﻿/, '');
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inQuotes) {
        if (c === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\r') {
        /* ignore — handled by \n */
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* ---------- 사이트 바로가기 링크 ---------- */

  // 배포된 admin 은 자체 도메인(doremi.…)의 독립 루트입니다. 따라서
  // "../invite/" 같은 상대경로는 admin 도메인의 /invite/ 로 붙는데,
  // 그곳에는 assemble.mjs 가 config.js 만 복사해 두므로 페이지가 없어
  // 404 가 납니다. 배포 환경에서는 site-config.js 의 절대 URL 을 씁니다.
  // 반대로 로컬 개발은 저장소 루트를 그대로 서빙하므로 상대경로가
  // 맞습니다 — 그래야 배포본이 아니라 "지금 수정 중인" 사본이 열립니다.
  var LOCAL_SITE_PATHS = {
    invite: '../invite/index.html',
    kr: '../kr/index.html',
    en: '../en/index.html',
  };

  function isLocalPreview() {
    var h = location.hostname;
    return location.protocol === 'file:' ||
      h === '' || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  }

  function siteUrl(which) {
    var local = LOCAL_SITE_PATHS[which] || '../' + which + '/';
    if (isLocalPreview()) return local;
    return (window.SITE_URLS && window.SITE_URLS[which]) || local;
  }

  // [data-site-link="invite|kr|en"] 앵커를 환경에 맞는 주소로 맞춰 줍니다.
  // 마크업의 href 는 JS 가 죽었을 때를 위한 로컬 폴백으로 남겨 둡니다.
  function wireSiteLinks(root) {
    var els = (root || document).querySelectorAll('[data-site-link]');
    Array.prototype.forEach.call(els, function (a) {
      a.href = siteUrl(a.getAttribute('data-site-link'));
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- 사이트 미리보기 (side-by-side iframe) ---------- */

  // Mount a live preview of a public site into `host` (a .preview-pane el).
  //   which : 'invite' | 'kr' | 'en'   (the site to frame, via siteUrl())
  //   opts  : { pin, devWidth, defer, bg }
  //     pin      — fixed pane width in px (모청: 480, no scaling, no device tabs)
  //     devWidth — initial device width to render then scale-to-fit (website)
  //     defer    — don't auto-load; caller drives the first frame via setSite()
  //     bg       — stage background shown during load (match the site's bg)
  // Returns { reload, setSite, frame }.
  //
  // The frame is cross-origin in production (admin is its own domain), so it is
  // NOT sandboxed (the sites read their own localStorage) and cannot be reloaded
  // via contentWindow — reload() re-assigns src with a cache-busting ?t=.
  var PREVIEW_WIDTHS = [
    { w: 390,  label: '📱', title: '모바일 390' },
    { w: 820,  label: '📲', title: '태블릿 820' },
    { w: 1280, label: '🖥', title: '데스크톱 1280' },
  ];
  var PREVIEW_WIDTH_KEY = 'sd-admin-preview-width';

  function mountPreview(host, which, opts) {
    opts = opts || {};
    var scaled = !opts.pin;               // 모청 is pinned & unscaled; website scales
    var devWidth = opts.devWidth || 1280;

    if (opts.pin) {
      var wrap = host.closest ? host.closest('.split') : null;
      if (wrap) wrap.style.setProperty('--pane', opts.pin + 'px');
    }

    var bar = document.createElement('div');
    bar.className = 'preview-bar';

    var tabs = null;
    if (scaled) {
      var saved = parseInt(localStorage.getItem(PREVIEW_WIDTH_KEY), 10);
      if (PREVIEW_WIDTHS.some(function (x) { return x.w === saved; })) devWidth = saved;
      tabs = document.createElement('div');
      tabs.className = 'dev-tabs';
      PREVIEW_WIDTHS.forEach(function (x) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-ghost btn-sm' + (x.w === devWidth ? ' on' : '');
        b.textContent = x.label;
        b.title = x.title;
        b.addEventListener('click', function () {
          devWidth = x.w;
          try { localStorage.setItem(PREVIEW_WIDTH_KEY, String(x.w)); } catch (e) { /* private mode */ }
          Array.prototype.forEach.call(tabs.children, function (c) { c.classList.remove('on'); });
          b.classList.add('on');
          rescale();
        });
        tabs.appendChild(b);
      });
      bar.appendChild(tabs);
    }

    var reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'btn btn-ghost btn-sm';
    reloadBtn.textContent = '↻ 새로고침';
    reloadBtn.style.marginLeft = 'auto';
    bar.appendChild(reloadBtn);

    var hint = document.createElement('div');
    hint.className = 'preview-hint';
    hint.hidden = true;
    // Cross-origin localStorage is per-origin: on the localStorage backend the
    // admin's saved override is invisible to the framed site (different domain),
    // so the preview would show the plain defaults. In local dev both are the
    // same origin (localhost), so it works there even without Supabase.
    if (backend() !== 'supabase' && !isLocalPreview()) {
      hint.hidden = false;
      hint.textContent =
        'localStorage 백엔드에서는 저장한 내용이 미리보기(다른 도메인)에 보이지 않습니다. ' +
        'Supabase 연결 시 정상 반영됩니다.';
    }

    var stage = document.createElement('div');
    stage.className = 'preview-stage';
    if (opts.bg) stage.style.background = opts.bg;

    var frame = document.createElement('iframe');
    frame.title = '미리보기';
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('referrerpolicy', 'no-referrer');

    if (scaled) {
      var scaleWrap = document.createElement('div');
      scaleWrap.className = 'preview-scale';
      scaleWrap.appendChild(frame);
      stage.appendChild(scaleWrap);
    } else {
      stage.appendChild(frame);
    }

    host.appendChild(bar);
    host.appendChild(hint);
    host.appendChild(stage);

    var currentSite = which;

    var ready = false;      // the framed site finished boot and can accept preview msgs
    var lastPosts = {};     // most recent message PER channel (all re-applied once ready)
    var readyTimer = null;

    function srcFor(site) {
      var base = siteUrl(site);
      return base + (base.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    }
    // The framed site's origin (same-origin in local dev where siteUrl is
    // relative; the site's own domain in production). Used as postMessage's
    // targetOrigin so a preview message can only reach the intended site.
    function targetOrigin() {
      try { return new URL(siteUrl(currentSite), location.href).origin; }
      catch (e) { return '*'; }
    }
    function setSite(site) { currentSite = site; ready = false; frame.src = srcFor(site); }
    function reload() { setSite(currentSite); }

    // Push a live message to the framed site. The site applies it in memory and
    // never persists it (preview only). The latest message of each channel
    // (design / content / theme) is remembered and ALL are re-sent after every
    // navigation so the preview re-syncs on reload / tab switch. No-op if the
    // site engine has no receiver (older deploys).
    function channelOf(msg) {
      if (msg && msg.__sdDesignPreview) return 'design';
      if (msg && msg.__sdContentPreview) return 'content';
      if (msg && msg.__sdThemePreview) return 'theme';
      return 'misc';
    }
    function flushPosts() {
      if (!frame.contentWindow) return;
      Object.keys(lastPosts).forEach(function (k) {
        try { frame.contentWindow.postMessage(lastPosts[k], targetOrigin()); } catch (e) { /* timing */ }
      });
    }
    function post(msg) {
      lastPosts[channelOf(msg)] = msg;      // held; (re)applied when the frame is ready
      if (ready && frame.contentWindow) {
        try { frame.contentWindow.postMessage(msg, targetOrigin()); } catch (e) { /* cross-origin timing */ }
      }
    }
    // The framed site posts __sdPreviewReady when its boot has fully rendered;
    // only then do we (re)apply held design/content, so boot can't clobber it.
    window.addEventListener('message', function (e) {
      if (e.source !== frame.contentWindow) return;
      if (!e.data || !e.data.__sdPreviewReady) return;
      ready = true;
      clearTimeout(readyTimer);
      flushPosts();
    });

    function rescale() {
      if (!scaled) return;
      var w = stage.clientWidth || 1;
      stage.style.setProperty('--scale', w / devWidth);
      stage.style.setProperty('--dev-w', devWidth + 'px');
    }

    reloadBtn.addEventListener('click', reload);
    frame.addEventListener('load', function () {
      rescale();
      // Fallback: if the site never signals readiness (older deploy without the
      // preview receiver), flush anyway after a beat. A no-op on such sites.
      clearTimeout(readyTimer);
      readyTimer = setTimeout(function () { if (!ready) flushPosts(); }, 1500);
    });
    if (scaled) {
      if (window.ResizeObserver) {
        new ResizeObserver(rescale).observe(stage);
      } else {
        window.addEventListener('resize', rescale);
      }
    }

    if (!opts.defer) setSite(which);
    rescale();

    return { reload: reload, setSite: setSite, frame: frame, post: post };
  }

  /* ---------- config override 병합 ---------- */

  function deepMerge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) {
      return over == null ? base : over;
    }
    const out = Array.isArray(base) ? [] : Object.assign({}, base);
    for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
    return out;
  }

  // 모청(invite) 기본값 + 저장된 override 병합 (index/edit 전용 — config.js 로드 필요)
  async function mergedInviteConfig() {
    const override = await window.Store.getConfigOverride('invite');
    return deepMerge(window.MOCHUNG_DEFAULTS || {}, override);
  }

  /* ---------- 접근 게이트 ---------- */

  function backend() {
    return (window.Store && window.Store.backend) || 'localStorage';
  }

  function buildGate(isSupabase) {
    const gateEl = document.createElement('div');
    gateEl.className = 'gate';
    if (isSupabase) {
      gateEl.innerHTML =
        '<h1>관리자 로그인</h1>' +
        '<p>등록된 관리자 이메일로 로그인 링크를 보내드립니다.</p>' +
        '<input type="email" id="gateEmail" placeholder="admin@example.com" ' +
        'autocomplete="email" style="letter-spacing:normal;text-align:left;">' +
        '<button class="btn btn-primary btn-block" id="gateGo">로그인 링크 보내기</button>' +
        '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #e5ddd6;">' +
        '<p style="font-size:12px;color:#8b7f7a;margin:0 0 6px;">메일에 6자리 코드가 함께 온 경우, 링크 대신 코드를 입력해도 됩니다.</p>' +
        '<input id="gateOtp" inputmode="numeric" autocomplete="one-time-code" ' +
        'placeholder="6자리 코드" maxlength="8" style="text-align:center;letter-spacing:0.25em;">' +
        '<button class="btn btn-ghost btn-block" id="gateOtpGo" style="margin-top:6px;">코드로 로그인</button>' +
        '</div>' +
        '<p id="gateMsg" style="font-size:12px;color:#b55;margin:12px 0 0;min-height:1em;"></p>';
    } else {
      gateEl.innerHTML =
        '<h1>관리자 확인</h1>' +
        '<p>관리자 암호를 입력해 주세요.</p>' +
        '<input type="password" id="gatePw" maxlength="40" autocomplete="off">' +
        '<button class="btn btn-primary btn-block" id="gateGo">확인</button>' +
        '<p id="gateMsg" style="font-size:12px;color:#b55;margin:12px 0 0;min-height:1em;"></p>';
    }
    return gateEl;
  }

  // gate(renderFn): 이미 로그인되어 있으면 앱을 보여주고 renderFn() 실행,
  // 아니면 백엔드에 맞는 로그인 UI 표시.
  async function gate(renderFn) {
    const store = window.Store;
    if (!store) {
      document.body.innerHTML =
        '<p style="padding:24px;text-align:center;">저장소를 불러오지 못했습니다. ' +
        'store 스크립트 로드 순서를 확인하세요.</p>';
      return;
    }
    const app = document.getElementById('adminApp');

    // Auth links that fail (expired, already used, scanned by the mail
    // provider) bounce back here with the reason in the URL hash — read it
    // before it's lost, or the failure looks like a silent non-login.
    let authErr = null;
    if (/error/.test(location.hash)) {
      const hp = new URLSearchParams(location.hash.slice(1));
      if (hp.get('error') || hp.get('error_code')) {
        authErr = hp.get('error_code') === 'otp_expired'
          ? '로그인 링크가 만료되었거나 이미 사용되었습니다. 아래에서 새 링크를 받거나, 메일의 6자리 코드를 입력해 주세요.'
          : '로그인 실패: ' + (hp.get('error_description') || hp.get('error'));
        history.replaceState(null, '', location.pathname + location.search);
      }
    }

    if (await store.isAdmin()) {
      if (app) app.hidden = false;
      renderFn();
      return;
    }

    const isSupabase = backend() === 'supabase';
    const gateEl = buildGate(isSupabase);
    document.body.prepend(gateEl);
    const input = gateEl.querySelector('input');
    const msg = gateEl.querySelector('#gateMsg');
    if (authErr) msg.textContent = authErr;

    async function submit() {
      msg.textContent = '';
      if (isSupabase) {
        const email = input.value.trim();
        if (!email) { msg.textContent = '이메일을 입력해 주세요.'; return; }
        try {
          await store.adminSignIn(email);
          msg.style.color = '#3a7d5a';
          msg.textContent = '이메일을 보냈습니다. 메일함에서 링크를 눌러 주세요. ' +
            '(메일은 시간당 몇 통만 보낼 수 있으니 버튼을 여러 번 누르지 마세요.)';
        } catch (e) {
          msg.style.color = '#b55';
          msg.textContent = '메일 전송 실패: ' + (e && e.message ? e.message : e);
        }
      } else {
        const ok = await store.adminSignIn(input.value);
        if (ok) {
          gateEl.remove();
          if (app) app.hidden = false;
          renderFn();
        } else {
          input.value = '';
          msg.textContent = '암호가 일치하지 않습니다.';
        }
      }
    }

    gateEl.querySelector('#gateGo').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    const otpInput = gateEl.querySelector('#gateOtp');
    const otpGo = gateEl.querySelector('#gateOtpGo');
    if (otpGo) {
      const submitOtp = async () => {
        msg.style.color = '#b55';
        msg.textContent = '';
        const email = input.value.trim();
        const code = otpInput.value.trim();
        if (!email) { msg.textContent = '위에 이메일을 먼저 입력해 주세요.'; return; }
        if (!code) { msg.textContent = '메일에 적힌 6자리 코드를 입력해 주세요.'; return; }
        try {
          await store.adminVerifyOtp(email, code);
          location.reload();
        } catch (e) {
          msg.textContent = '코드 확인 실패: ' + (e && e.message ? e.message : e);
        }
      };
      otpGo.addEventListener('click', submitOtp);
      otpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitOtp(); });
    }
    input.focus();
  }

  async function logout() {
    try { await window.Store.adminSignOut(); } catch (e) { /* ignore */ }
    location.reload();
  }

  // admin.js 는 항상 site-config.js 뒤, </body> 직전에서 로드되므로
  // 이 시점에 DOM 과 SITE_URLS 가 모두 준비되어 있습니다.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { wireSiteLinks(); });
  } else {
    wireSiteLinks();
  }

  /* ---------- 글꼴 미리보기 드롭다운 (font picker) ---------- */

  // Fonts served by an external webfont provider (Sandoll), NOT Google Fonts.
  // They render only on registered domains; the admin (doremi.*) isn't one, so
  // their swatch falls back here — and they must never go into the Google Fonts
  // preview request (css2 400s the whole request on an unknown family).
  var FP_EXTERNAL = { 'SD Jeongche': 1 };
  var fpDocWired = false;

  function closeAllFontPickers() {
    var menus = document.querySelectorAll('.fp-menu');
    Array.prototype.forEach.call(menus, function (m) { m.hidden = true; });
  }

  // Load every Google font offered across all <datalist>s once, so each picker
  // option (and trigger) can render in its own typeface. External fonts skipped.
  function ensureFontPickerFonts() {
    var link = document.getElementById('fpPreviewFonts');
    if (!link) {
      link = document.createElement('link');
      link.id = 'fpPreviewFonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    var fams = {};
    var opts = document.querySelectorAll('datalist option');
    Array.prototype.forEach.call(opts, function (o) {
      var v = o.value;
      if (v && v !== 'None' && !FP_EXTERNAL[v]) fams[v] = 1;
    });
    var parts = Object.keys(fams).map(function (f) {
      return 'family=' + encodeURIComponent(f).replace(/%20/g, '+');
    });
    if (parts.length) {
      link.href = 'https://fonts.googleapis.com/css2?' + parts.join('&') + '&display=swap';
    }
  }

  // Enhance a font <input list="…"> with a dropdown whose options render in
  // their own typeface. The input stays as the value holder (the font-family
  // string) and gets an 'input' event on pick, so existing listeners (the live
  // preview) fire. A "직접 입력" option reveals the raw box for a custom name.
  function fontPicker(input) {
    if (!input || input.__fp) return;
    input.__fp = true;
    if (!fpDocWired) { document.addEventListener('click', closeAllFontPickers); fpDocWired = true; }

    var listId = input.getAttribute('list');
    var datalist = listId && document.getElementById(listId);
    var options = [];
    if (datalist) {
      Array.prototype.forEach.call(datalist.querySelectorAll('option'), function (o) {
        options.push({ value: o.value, label: (o.textContent || '').trim() || o.value });
      });
    }
    ensureFontPickerFonts();

    var wrap = document.createElement('div');
    wrap.className = 'fontpick';
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fp-trigger';
    var menu = document.createElement('div');
    menu.className = 'fp-menu';
    menu.hidden = true;
    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    input.style.display = 'none';
    input.parentNode.insertBefore(wrap, input.nextSibling);

    function fam(v) { return (v && v !== 'None') ? '"' + v + '", inherit' : ''; }
    function setTrigger(v) {
      trigger.textContent = v ? v : '(기본값)';
      trigger.style.fontFamily = fam(v);
    }
    function pick(v) {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTrigger(v);
      menu.hidden = true;
    }
    function opt(label, value, isCustom) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fp-opt' + (isCustom ? ' fp-custom' : '');
      b.textContent = label;
      if (!isCustom) b.style.fontFamily = fam(value);
      menu.appendChild(b);
      return b;
    }

    opt('(기본값)', '').addEventListener('click', function () { pick(''); });
    options.forEach(function (o) {
      opt(o.label, o.value).addEventListener('click', function () { pick(o.value); });
    });
    opt('직접 입력…', '', true).addEventListener('click', function () {
      menu.hidden = true;
      input.style.display = '';
      input.focus();
    });

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !menu.hidden;
      closeAllFontPickers();
      menu.hidden = open;
    });
    // custom box: hide again on blur, keep trigger in sync while typing
    input.addEventListener('input', function () { setTrigger(input.value); });
    input.addEventListener('blur', function () {
      if (input.style.display !== 'none') { input.style.display = 'none'; setTrigger(input.value); }
    });

    setTrigger(input.value);
  }

  return {
    esc: esc,
    fmtDateTime: fmtDateTime,
    download: download,
    toCsv: toCsv,
    parseCsv: parseCsv,
    copyText: copyText,
    deepMerge: deepMerge,
    mergedInviteConfig: mergedInviteConfig,
    backend: backend,
    siteUrl: siteUrl,
    wireSiteLinks: wireSiteLinks,
    mountPreview: mountPreview,
    fontPicker: fontPicker,
    gate: gate,
    logout: logout,
  };
})();
