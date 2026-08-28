/* =========================================================
 * 청모파티 초대 페이지 엔진
 * invite/config.js(기본값) + 백엔드 override(scope='invite')를
 * 합쳐 페이지 전체를 렌더링하고 상호작용을 담당합니다.
 * ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- config 병합 ---------- */

  function deepMerge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) {
      return over == null ? base : over;
    }
    var out = Array.isArray(base) ? [] : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      out[k] = deepMerge(base ? base[k] : undefined, over[k]);
    });
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // 설정 텍스트는 관리자만 쓸 수 있으므로(RLS) <b> 등 간단한 태그를 허용합니다.
  function rich(s) { return String(s == null ? '' : s); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  /* ---------- 공용 UI ---------- */

  var openCount = 0;
  function lockScroll(lock) {
    openCount = Math.max(0, openCount + (lock ? 1 : -1));
    document.body.style.overflow = openCount > 0 ? 'hidden' : '';
  }
  function openOverlay(el) {
    if (el && !el.classList.contains('open')) { el.classList.add('open'); lockScroll(true); }
  }
  function closeOverlay(el) {
    if (el && el.classList.contains('open')) { el.classList.remove('open'); lockScroll(false); }
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ---------- 렌더링 ---------- */

  function applyTheme(cfg) {
    var t = cfg.theme || {};
    var d = document.documentElement;
    d.style.setProperty('--font-scale', t.fontScale || 1);
    // 팔레트/글꼴 프리셋 → style.css 의 html[data-palette] / html[data-font] 블록
    d.dataset.palette = t.palette || 'warm';
    d.dataset.font = t.font || 'serif';
  }

  function renderMeta(cfg) {
    document.title = cfg.meta.title;
    var d = $('meta[name="description"]');
    if (d) d.setAttribute('content', cfg.meta.description);
  }

  function renderPosters(cfg) {
    $('#posters').innerHTML = (cfg.posters || []).map(function (p, i) {
      return '<section class="poster"' + (i === 0 ? ' id="top"' : '') + '>' +
        '<img src="' + esc(p.src) + '" alt="' + esc(p.alt || '') + '"' +
        (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + '></section>';
    }).join('');
    // 로드가 끝나면 서서히 나타나기 (style.css .poster img 참고) —
    // 캐시에서 이미 떠 있으면 바로, 실패해도 alt 가 보이게 클래스는 붙인다.
    $$('#posters img').forEach(function (img) {
      var show = function () { img.classList.add('is-loaded'); };
      if (img.complete && img.naturalWidth) show();
      else {
        img.addEventListener('load', show, { once: true });
        img.addEventListener('error', show, { once: true });
      }
    });
  }

  function renderIntro(cfg) {
    var p = cfg.party;
    $('#intro').innerHTML =
      '<p class="intro-title">' + esc(p.title) + '</p>' +
      '<p class="intro-venue">' + esc(p.venueLine) +
        (p.addressLine ? '<span class="addr">' + esc(p.addressLine) + '</span>' : '') + '</p>' +
      '<div class="intro-rule"></div>' +
      '<p class="intro-date">' + esc(p.dateLine) +
        (p.timeLine ? ' &nbsp;·&nbsp; ' + esc(p.timeLine) : '') + '</p>';
  }

  function renderNav(cfg) {
    $('#nav .nav-inner').innerHTML = '<ul>' + (cfg.nav || []).map(function (n) {
      return '<li><a href="#' + esc(n.id) + '"' + (n.ko ? ' class="ko"' : '') + '>' + esc(n.label) + '</a></li>';
    }).join('') + '</ul>';
  }

  function renderNotes(cfg) {
    var n = cfg.notes;
    $('#must').innerHTML =
      '<p class="sec-eyebrow">' + esc(n.eyebrow) + '</p>' +
      '<h2 class="sec-title">' + esc(n.title) + '</h2>' +
      (n.lead ? '<p class="sec-lead">' + nl2br(n.lead) + '</p>' : '') +
      '<ol class="notes">' + (n.items || []).map(function (it, i) {
        var btn = '';
        if (it.buttonLabel) {
          var href = it.buttonHref || '#rsvp';
          var ext = /^https?:/i.test(href);
          btn = '<a class="btn btn-primary" href="' + esc(href) + '"' +
            (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(it.buttonLabel) + '</a>';
        }
        return '<li class="note"><span class="n">' + (i + 1) + '</span><div>' +
          '<p>' + rich(it.text) + (it.sub ? '<span class="sub">' + rich(it.sub) + '</span>' : '') + '</p>' +
          btn + '</div></li>';
      }).join('') + '</ol>';
  }

  function renderStory(cfg) {
    var s = cfg.story;
    $('#story').innerHTML =
      '<p class="sec-eyebrow">' + esc(s.eyebrow) + '</p>' +
      '<h2 class="sec-title">' + esc(s.title) + '</h2>' +
      (s.photo ? '<div class="story-photo"><img src="' + esc(s.photo) + '" alt="" loading="lazy"></div>' : '') +
      '<div class="story-body">' +
        (s.paragraphs || []).map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') +
      '</div>';
  }

  function renderSchedule(cfg) {
    var s = cfg.schedule;
    $('#schedule').innerHTML =
      '<p class="sec-eyebrow">' + esc(s.eyebrow) + '</p>' +
      '<h2 class="sec-title">' + esc(s.title) + '</h2>' +
      '<div class="timeline">' + (s.items || []).map(function (it) {
        return '<div class="slot"><span class="t">' + esc(it.time) + '</span>' +
          '<h4>' + esc(it.title) + '</h4>' +
          (it.place ? '<p class="where">' + esc(it.place) + '</p>' : '') +
          (it.desc ? '<p class="desc">' + rich(it.desc) + '</p>' : '') +
          '</div>';
      }).join('') + '</div>';
  }

  function renderLocation(cfg) {
    var l = cfg.location, p = cfg.party;
    var q = encodeURIComponent(p.venueName || '');
    var sec = $('#location');
    if (l.showMap === false) { sec.hidden = true; return; }
    sec.hidden = false;
    sec.innerHTML =
      '<p class="sec-eyebrow">' + esc(l.eyebrow) + '</p>' +
      '<h2 class="sec-title">' + esc(l.title) + '</h2>' +
      '<p class="loc-venue">' + esc(p.venueName) + '</p>' +
      '<p class="loc-address">' + esc(p.address) + '</p>' +
      '<div class="map-box">' +
        '<a class="map-canvas" id="mapCanvas" target="_blank" rel="noopener" ' +
           'href="https://map.kakao.com/link/map/' + q + ',' + p.lat + ',' + p.lng + '">' +
          '<span class="pin"><span class="dot">📍</span>' +
          '<span class="label">' + esc(p.venueName) + '</span></span>' +
          '<iframe id="mapFrame" title="오시는 길 지도" loading="lazy"></iframe>' +
        '</a>' +
        '<div class="map-actions">' +
          '<a target="_blank" rel="noopener" href="https://map.naver.com/p/search/' + q + '">네이버 지도</a>' +
          '<a target="_blank" rel="noopener" href="https://map.kakao.com/link/search/' + q + '">카카오맵</a>' +
        '</div>' +
      '</div>';

    var frame = $('#mapFrame');
    if (frame) frame.src = 'https://maps.google.com/maps?hl=ko&q=' + p.lat + ',' + p.lng + '&z=16&output=embed';
  }

  function renderQanda(cfg) {
    var q = cfg.qanda;
    var open = true;   // 첫 문항만 펼쳐 둡니다
    $('#qa').innerHTML =
      '<p class="sec-eyebrow">' + esc(q.eyebrow) + '</p>' +
      '<h2 class="sec-title">' + esc(q.title) + '</h2>' +
      (q.groups || []).map(function (g) {
        var items = (g.items || []).filter(function (it) { return it.q; });
        if (!items.length) return '';
        return '<div class="qgroup">' +
          '<p class="qgroup-label"><span class="ko">' + esc(g.label) + '</span>' +
            (g.labelEn ? ' · ' + esc(g.labelEn) : '') + '</p>' +
          items.map(function (it) {
            var shut = !open; open = false;
            return '<div class="qa' + (shut ? ' shut' : '') + '">' +
              '<button type="button" class="q"><span>' + esc(it.q) + '</span>' +
              '<span class="car">' + (shut ? '+' : '−') + '</span></button>' +
              '<p class="a">' + rich(it.a || '준비 중입니다.') + '</p></div>';
          }).join('') + '</div>';
      }).join('');

    $$('#qa .qa .q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var shut = btn.parentElement.classList.toggle('shut');
        $('.car', btn).textContent = shut ? '+' : '−';
      });
    });
  }

  function renderRsvp(cfg) {
    var r = cfg.rsvp, party = r.party || {}, wed = r.wedding || {};
    var site = (cfg.links && cfg.links.weddingSite) || '';
    var cards = '';
    if (party.enabled !== false) {
      cards +=
        '<div class="rcard lead">' +
          '<p class="kind">' + esc(party.kind) + '</p>' +
          '<h4>' + esc(party.title) + '</h4>' +
          '<p class="when">' + esc(cfg.party.dateLine) + ' &nbsp;' + esc(cfg.party.timeLine) + '</p>' +
          '<p class="where">' + esc(cfg.party.venueName) + '</p>' +
          '<p class="asks">' + esc(askSummary(party)) + '</p>' +
          '<button type="button" class="btn btn-primary" id="btnPartyRsvp">' + esc(party.buttonLabel) + '</button>' +
          (party.note ? '<p class="goes">' + esc(party.note) + '</p>' : '') +
        '</div>';
    }
    if (wed.enabled !== false && site) {
      cards +=
        '<div class="rcard">' +
          '<p class="kind">' + esc(wed.kind) + '</p>' +
          '<h4>' + esc(wed.title) + '</h4>' +
          '<p class="when">' + esc(wed.dateLine) + ' &nbsp;' + esc(wed.timeLine) + '</p>' +
          '<p class="where">' + esc(wed.venueLine) + '</p>' +
          '<a class="btn btn-ghost" href="' + esc(site) + '" target="_blank" rel="noopener">' +
            esc(wed.buttonLabel) + '</a>' +
          '<p class="goes">' + esc(site.replace(/^https?:\/\//, '')) + ' 으로 이동합니다</p>' +
        '</div>';
    }
    $('#rsvp').innerHTML =
      '<p class="sec-eyebrow">' + esc(r.eyebrow) + '</p>' +
      '<h2 class="sec-title">' + esc(r.title) + '</h2>' +
      (r.lead ? '<p class="sec-lead">' + nl2br(r.lead) + '</p>' : '') +
      '<div class="rcards">' + cards + '</div>';
  }

  function askSummary(party) {
    var parts = ['성함', '참석 여부'];
    if ((party.menuOptions || []).length) parts.push('메뉴 선택');
    if (party.askCompanion !== false) parts.push('동반자');
    if (party.askPhone !== false) parts.push('연락처');
    return parts.join(' · ');
  }

  function renderFooter(cfg) {
    var site = (cfg.links && cfg.links.weddingSite) || '';
    var label = (cfg.links && cfg.links.weddingSiteLabel) || site;
    $('#foot').innerHTML =
      (site ? '<a class="site-link" href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(label) + '</a>' : '') +
      '<p class="names">' + esc((cfg.footer && cfg.footer.names) || '') + '</p>';
  }

  /* ---------- 파티 RSVP 폼 ---------- */

  function buildRsvpForm(cfg) {
    var party = cfg.rsvp.party || {};
    var menus = party.menuOptions || [];
    var extras = party.extraQuestions || [];

    var html =
      '<button type="button" class="sheet-close" data-close="rsvpOverlay" aria-label="닫기">✕</button>' +
      '<h3 class="sheet-title">' + esc(party.title) + '</h3>' +
      '<form id="rsvpForm" novalidate>' +
        '<div class="form-field"><label>참석 여부 <span class="req">*</span></label>' +
          '<div class="seg" id="fAttend">' +
            '<button type="button" data-v="yes" class="on">참석</button>' +
            '<button type="button" data-v="no">불참</button>' +
          '</div></div>' +
        '<div class="form-field"><label for="fName">성함 <span class="req">*</span></label>' +
          '<input type="text" id="fName" maxlength="20" placeholder="참석자 성함" required></div>' +
        (menus.length
          ? '<div class="form-field" data-only="yes"><label>메뉴 선택</label><div class="seg" id="fMenu">' +
              menus.map(function (m) { return '<button type="button" data-v="' + esc(m) + '">' + esc(m) + '</button>'; }).join('') +
            '</div></div>'
          : '') +
        (party.askCompanion !== false
          ? '<div class="form-field" data-only="yes"><label>동반자 (본인 제외)</label>' +
              '<div class="stepper"><button type="button" id="fMinus" aria-label="줄이기">−</button>' +
              '<output id="fCount">0</output>' +
              '<button type="button" id="fPlus" aria-label="늘리기">＋</button></div></div>' +
            '<div class="form-field" id="fCompanionWrap" data-only="yes" hidden>' +
              '<label for="fCompanion">동반자 성함</label>' +
              '<input type="text" id="fCompanion" maxlength="60" placeholder="쉼표로 구분해 입력"></div>'
          : '') +
        (party.askPhone !== false
          ? '<div class="form-field"><label for="fPhone">연락처</label>' +
              '<input type="tel" id="fPhone" maxlength="20" placeholder="010-0000-0000"></div>'
          : '') +
        extras.map(function (q, i) {
          var id = 'fx' + i;
          if (q.type === 'choice') {
            return '<div class="form-field"><label>' + esc(q.label) + '</label><div class="seg" data-extra="' + i + '">' +
              (q.options || []).map(function (o) { return '<button type="button" data-v="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') +
              '</div></div>';
          }
          if (q.type === 'yesno') {
            return '<div class="form-field"><label>' + esc(q.label) + '</label><div class="seg" data-extra="' + i + '">' +
              '<button type="button" data-v="예">예</button><button type="button" data-v="아니오">아니오</button>' +
              '</div></div>';
          }
          return '<div class="form-field"><label for="' + id + '">' + esc(q.label) + '</label>' +
            '<input type="text" id="' + id + '" data-extra-text="' + i + '" maxlength="120"></div>';
        }).join('') +
        '<div class="form-field"><label for="fMessage">남기실 말</label>' +
          '<textarea id="fMessage" maxlength="300" rows="2" placeholder="선택 입력"></textarea></div>' +
        (party.warnText ? '<p class="rsvp-warn">' + nl2br(party.warnText) + '</p>' : '') +
        '<div class="consent" id="consentBox">' +
          '<div class="consent-row"><input type="checkbox" id="fConsent">' +
            '<label for="fConsent">개인정보 수집 및 이용 동의 (필수)</label>' +
            '<button type="button" class="consent-toggle" id="consentToggle">보기</button></div>' +
          '<div class="consent-detail">' + nl2br(party.consentText || '') + '</div>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary">' + esc(party.buttonLabel) + '</button>' +
      '</form>';
    $('#rsvpSheet').innerHTML = html;
  }

  function initRsvp(cfg) {
    var party = cfg.rsvp.party || {};
    if (party.enabled === false) return;
    // 카드의 열기 버튼은 렌더링마다 새로 만들어지므로 여기서 한 번만 붙입니다.
    var btnOpen = $('#btnPartyRsvp');
    if (btnOpen) btnOpen.addEventListener('click', function () { openOverlay($('#rsvpOverlay')); });
    bindRsvpForm(cfg);
  }

  // 폼 마크업을 새로 만들고 그 안의 핸들러만 붙입니다 (제출 후 초기화에도 재사용).
  function bindRsvpForm(cfg) {
    var party = cfg.rsvp.party || {};
    buildRsvpForm(cfg);

    var overlay = $('#rsvpOverlay');
    var state = { attending: 'yes', menu: '', count: 0, extra: {} };
    var extras = party.extraQuestions || [];

    function segBind(wrap, onPick) {
      if (!wrap) return;
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]');
        if (!b) return;
        $$('button', wrap).forEach(function (x) { x.classList.toggle('on', x === b); });
        onPick(b.dataset.v);
      });
    }

    segBind($('#fAttend'), function (v) {
      state.attending = v;
      // 불참이면 메뉴·동반자 항목을 숨깁니다.
      $$('[data-only="yes"]').forEach(function (el) {
        el.hidden = v !== 'yes' || (el.id === 'fCompanionWrap' && state.count === 0);
      });
    });
    segBind($('#fMenu'), function (v) { state.menu = v; });
    extras.forEach(function (q, i) {
      segBind($('[data-extra="' + i + '"]'), function (v) { state.extra[q.label] = v; });
    });

    var cnt = $('#fCount');
    function setCount(n) {
      state.count = Math.min(10, Math.max(0, n));
      if (cnt) cnt.textContent = state.count;
      var wrap = $('#fCompanionWrap');
      if (wrap) wrap.hidden = state.count === 0 || state.attending !== 'yes';
    }
    if ($('#fMinus')) $('#fMinus').addEventListener('click', function () { setCount(state.count - 1); });
    if ($('#fPlus')) $('#fPlus').addEventListener('click', function () { setCount(state.count + 1); });

    var ct = $('#consentToggle');
    if (ct) ct.addEventListener('click', function () { $('#consentBox').classList.toggle('open'); });

    $('#rsvpForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = ($('#fName').value || '').trim();
      if (!name) { toast('성함을 입력해 주세요.'); $('#fName').focus(); return; }
      if (!$('#fConsent').checked) { toast('개인정보 수집·이용에 동의해 주세요.'); return; }
      var attending = state.attending === 'yes';
      if (attending && (party.menuOptions || []).length && !state.menu) {
        toast('메뉴를 선택해 주세요.'); return;
      }
      extras.forEach(function (q, i) {
        var el = $('[data-extra-text="' + i + '"]');
        if (el && el.value.trim()) state.extra[q.label] = el.value.trim();
      });

      var submit = $('#rsvpForm button[type="submit"]');
      submit.disabled = true;
      Promise.resolve(window.Store.submitPartyRsvp({
        name: name,
        attending: attending,
        menu: attending ? state.menu : '',
        companionCount: attending ? state.count : 0,
        companion: attending && $('#fCompanion') ? $('#fCompanion').value : '',
        phone: $('#fPhone') ? $('#fPhone').value : '',
        message: $('#fMessage') ? $('#fMessage').value : '',
        extra: state.extra,
      })).then(function () {
        closeOverlay(overlay);
        toast(party.doneText || '전달되었습니다. 감사합니다!');
        bindRsvpForm(cfg);
      }, function (err) {
        toast((err && err.message) || '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }).then(function () { submit.disabled = false; });
    });
  }

  /* ---------- 떠 있는 메뉴 ---------- */

  var navBound = false;
  var navRefs = { links: [], secs: [], trigger: 300 };

  function refreshNav() {
    var first = $('#top');
    navRefs.trigger = first ? first.offsetHeight * 0.55 : 300;
    navRefs.links = $$('#nav a');
    navRefs.secs = navRefs.links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  }

  function onNavScroll() {
    // 첫 포스터를 지나면 나타나고, 위로 되돌리면 다시 숨습니다.
    $('#nav').classList.toggle('show', window.scrollY > navRefs.trigger);
    var y = window.scrollY + 120, cur = 0;
    navRefs.secs.forEach(function (s, i) { if (s && s.offsetTop <= y) cur = i; });
    navRefs.links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }

  function initNav() {
    refreshNav();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    navRefs.links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        var sec = navRefs.secs[i];
        if (!sec) return;
        e.preventDefault();
        window.scrollTo({
          top: sec.getBoundingClientRect().top + window.scrollY - 52,
          behavior: reduce ? 'auto' : 'smooth',
        });
      });
    });
    if (!navBound) {
      navBound = true;
      window.addEventListener('scroll', onNavScroll, { passive: true });
      window.addEventListener('resize', function () { refreshNav(); onNavScroll(); }, { passive: true });
    }
    onNavScroll();
  }

  function initReveal(on) {
    var els = $$('.reveal');
    if (!on || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function initOverlays() {
    $$('.overlay').forEach(function (ov) {
      ov.addEventListener('click', function (e) { if (e.target === ov) closeOverlay(ov); });
    });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-close]');
      if (btn) closeOverlay($('#' + btn.dataset.close));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = $$('.overlay.open');
      if (open.length) closeOverlay(open[open.length - 1]);
    });
  }

  /* ---------- 관리자 라이브 미리보기 ---------- */

  function trustedAdminOrigin(origin) {
    if (origin === 'https://doremi.soyeondoyoon.cloud') return true;
    return /^https?:\/\/(localhost|127\.0\.0\.1|(?:192\.168|10\.\d{1,3})\.\d{1,3}\.\d{1,3})(?::\d+)?$/.test(origin);
  }

  window.addEventListener('message', function (e) {
    if (window.parent === window) return;            // 임베드 상태에서만 반영
    if (!trustedAdminOrigin(e.origin)) return;
    var d = e.data;
    if (!d) return;
    if (d.__sdThemePreview && d.theme && d.theme.fontScale != null) {
      var n = parseFloat(d.theme.fontScale);
      if (n >= 0.5 && n <= 2) document.documentElement.style.setProperty('--font-scale', n);
    } else if (d.__sdContentPreview && d.content) {
      renderAll(deepMerge(window.PARTY_DEFAULTS, d.content), true);
    }
  });

  /* ---------- 초기화 ---------- */

  function renderAll(cfg, isPreview) {
    window.PARTY_CONFIG = cfg;
    applyTheme(cfg);
    renderMeta(cfg);
    renderPosters(cfg);
    renderIntro(cfg);
    renderNav(cfg);
    renderNotes(cfg);
    renderStory(cfg);
    renderSchedule(cfg);
    renderLocation(cfg);
    renderQanda(cfg);
    renderRsvp(cfg);
    renderFooter(cfg);
    initRsvp(cfg);
    initNav();
    if (isPreview) $$('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  async function init() {
    var override = null;
    try {
      override = await window.Store.getConfigOverride('party');
    } catch (e) {
      // 백엔드를 못 읽어도 파일 기본값으로 페이지는 정상 렌더링됩니다.
      console.warn('[party] config override 를 불러오지 못했습니다 — 기본값으로 표시합니다.', e);
    }
    var cfg = deepMerge(window.PARTY_DEFAULTS, override);
    renderAll(cfg, false);
    initOverlays();
    initReveal(!(cfg.theme && cfg.theme.effects && cfg.theme.effects.reveal === false));

    if (window.parent !== window) {
      try { window.parent.postMessage({ __sdPreviewReady: 1 }, '*'); } catch (e) { /* sandboxed */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
