/* =========================================================
 * 청첩장 메인 스크립트
 * config.js(기본값) + localStorage(관리자 수정본)을 합쳐
 * 페이지 전체를 렌더링하고 상호작용을 담당합니다.
 * ========================================================= */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- config 병합 ---------- */

  function deepMerge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) {
      // null/undefined override → 기본값 사용 (override 미저장 시 getConfigOverride()가 null 반환)
      return over == null ? base : over;
    }
    const out = Array.isArray(base) ? [] : Object.assign({}, base);
    for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
    return out;
  }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  /* ---------- 공용 UI 헬퍼 ---------- */

  let openCount = 0;
  function lockScroll(lock) {
    openCount = Math.max(0, openCount + (lock ? 1 : -1));
    document.body.style.overflow = openCount > 0 ? 'hidden' : '';
  }
  function openOverlay(el) {
    if (!el.classList.contains('open')) { el.classList.add('open'); lockScroll(true); }
  }
  function closeOverlay(el) {
    if (el.classList.contains('open')) { el.classList.remove('open'); lockScroll(false); }
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function copyText(text, okMsg) {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) { /* fallthrough */ }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
    }
    toast(ok ? okMsg : '복사에 실패했습니다. 길게 눌러 복사해 주세요.');
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  /* ---------- 렌더링 ---------- */

  function renderBindings(cfg) {
    $$('[data-bind]').forEach((el) => {
      const v = getPath(cfg, el.dataset.bind);
      if (v !== undefined && v !== null) el.textContent = v;
    });
    document.title = cfg.meta.title;
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', cfg.meta.description);
  }

  function applyTheme(cfg) {
    document.documentElement.dataset.fontPreset = cfg.theme.fontPreset || 'classic';
    document.documentElement.style.setProperty('--font-scale', cfg.theme.fontScale || 1);
  }

  function personLine(parent) {
    if (!parent || !parent.name) return '';
    return (parent.deceased ? '<span class="deceased">故</span>' : '') + parent.name;
  }

  function renderFamily(cfg) {
    const wrap = $('#familyLines');
    const rows = [
      { p: cfg.couple.groom, label: '신랑' },
      { p: cfg.couple.bride, label: '신부' },
    ].map(({ p }) => {
      const parents = [personLine(p.father), personLine(p.mother)].filter(Boolean).join(' · ');
      return '<p class="family-line"><span class="parents">' + parents + '</span>' +
        '<span class="rel">의 ' + p.role + '</span><b>' + p.firstName + '</b></p>';
    });
    wrap.innerHTML = rows.join('');
  }

  function renderContacts(cfg) {
    const g = cfg.couple.groom, b = cfg.couple.bride;
    function row(who, name, phone) {
      if (!phone) return '';
      const tel = phone.replace(/[^0-9+]/g, '');
      return '<div class="contact-row"><span class="who">' + who + ' <b>' + name + '</b></span>' +
        '<span class="links"><a href="tel:' + tel + '" aria-label="전화">📞</a>' +
        '<a href="sms:' + tel + '" aria-label="문자">✉️</a></span></div>';
    }
    $('#contactsBody').innerHTML =
      '<div class="contact-group"><h4>신랑 측</h4>' +
      row('신랑', g.fullName, g.phone) +
      row('아버지', (g.father.deceased ? '故 ' : '') + g.father.name, g.father.phone) +
      row('어머니', (g.mother.deceased ? '故 ' : '') + g.mother.name, g.mother.phone) +
      '</div>' +
      '<div class="contact-group"><h4>신부 측</h4>' +
      row('신부', b.fullName, b.phone) +
      row('아버지', (b.father.deceased ? '故 ' : '') + b.father.name, b.father.phone) +
      row('어머니', (b.mother.deceased ? '故 ' : '') + b.mother.name, b.mother.phone) +
      '</div>';
  }

  function renderCalendar(cfg) {
    const date = new Date(cfg.wedding.dateISO);
    const y = date.getFullYear(), m = date.getMonth(), day = date.getDate();
    const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    $('#calMonth').innerHTML = MONTHS[m] + '<small>' + y + '</small>';

    const first = new Date(y, m, 1).getDay();
    const last = new Date(y, m + 1, 0).getDate();
    let html = '<tr>' + ['일', '월', '화', '수', '목', '금', '토']
      .map((d, i) => '<th' + (i === 0 ? ' class="sun"' : '') + '>' + d + '</th>').join('') + '</tr><tr>';
    for (let i = 0; i < first; i++) html += '<td></td>';
    for (let d = 1; d <= last; d++) {
      const dow = (first + d - 1) % 7;
      if (d > 1 && dow === 0) html += '</tr><tr>';
      const cls = [dow === 0 ? 'sun' : '', d === day ? 'wday' : ''].filter(Boolean).join(' ');
      html += '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + d + '</td>';
    }
    html += '</tr>';
    $('#calTable').innerHTML = html;

    MochungEffects.initCountdown(
      date,
      { days: $('#ddDays'), hours: $('#ddHours'), mins: $('#ddMins'), secs: $('#ddSecs') },
      $('#ddayLine'),
      cfg.couple.groom.firstName + ' ♥ ' + cfg.couple.bride.firstName + '의 결혼식이 {dday}'
    );
  }

  /* ---------- 갤러리 ---------- */

  let lbIndex = 0;
  let photos = [];

  function renderGallery(cfg) {
    photos = cfg.gallery.photos || [];
    const track = $('#galTrack');
    track.innerHTML = photos.map((src, i) =>
      '<figure class="gal-slide"><img src="' + src + '" loading="lazy" alt="갤러리 사진 ' + (i + 1) +
      '" data-idx="' + i + '"></figure>').join('');
    const counter = $('#galCounter');
    function updateCounter() {
      const mid = track.scrollLeft + track.clientWidth / 2;
      const slides = $$('.gal-slide', track);
      let idx = 0;
      slides.forEach((s, i) => { if (s.offsetLeft + s.offsetWidth / 2 - mid < s.offsetWidth / 2) idx = i; });
      counter.textContent = (idx + 1) + ' / ' + photos.length;
    }
    updateCounter();
    track.addEventListener('scroll', () => requestAnimationFrame(updateCounter), { passive: true });
    track.addEventListener('click', (e) => {
      const img = e.target.closest('img[data-idx]');
      if (img) openLightbox(parseInt(img.dataset.idx, 10));
    });

    $('#galGrid').innerHTML = photos.map((src, i) =>
      '<button type="button" data-idx="' + i + '"><img src="' + src + '" loading="lazy" alt="갤러리 사진 ' + (i + 1) + '"></button>').join('');
    $('#galGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-idx]');
      if (btn) openLightbox(parseInt(btn.dataset.idx, 10));
    });
    $('#btnGalleryAll').addEventListener('click', () => openOverlay($('#galleryAllOverlay')));
  }

  function showLb() {
    $('#lbImg').src = photos[lbIndex];
    $('#lbCounter').textContent = (lbIndex + 1) + ' / ' + photos.length;
    // 인접 이미지 미리 로드
    [lbIndex - 1, lbIndex + 1].forEach((i) => {
      if (photos[i]) { const im = new Image(); im.src = photos[i]; }
    });
  }
  function openLightbox(i) {
    lbIndex = i;
    showLb();
    const lb = $('#lightbox');
    if (!lb.classList.contains('open')) { lb.classList.add('open'); lockScroll(true); }
  }
  function closeLightbox() {
    const lb = $('#lightbox');
    if (lb.classList.contains('open')) { lb.classList.remove('open'); lockScroll(false); }
  }
  function lbMove(delta) {
    lbIndex = (lbIndex + delta + photos.length) % photos.length;
    showLb();
  }

  function initLightbox() {
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', () => lbMove(-1));
    $('#lbNext').addEventListener('click', () => lbMove(1));
    let sx = 0, sy = 0;
    const lb = $('#lightbox');
    lb.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) lbMove(dx > 0 ? -1 : 1);
      else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) closeLightbox();
    }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lbMove(-1);
      if (e.key === 'ArrowRight') lbMove(1);
    });
  }

  /* ---------- 오시는 길 ---------- */

  function renderLocation(cfg) {
    const w = cfg.wedding;
    const q = encodeURIComponent(w.venueName);
    const tel = $('#venueTel');
    if (w.venueTel) {
      tel.innerHTML = 'Tel. <a href="tel:' + w.venueTel.replace(/[^0-9]/g, '') + '">' + w.venueTel + '</a>';
    }
    $('#mapNaver').href = 'https://map.naver.com/p/search/' + q;
    $('#mapKakao').href = 'https://map.kakao.com/link/search/' + q;
    $('#mapTmap').href = 'https://surl.tmap.co.kr/?searchName=' + q;
    $('#mapCanvas').href = 'https://map.kakao.com/link/map/' + q + ',' + w.lat + ',' + w.lng;
    $('#btnCopyAddr').addEventListener('click', () => copyText(w.address, '주소가 복사되었습니다.'));
  }

  /* ---------- 화환 ---------- */

  function renderFlower(cfg) {
    const sec = $('#flower');
    if (cfg.flower.enabled && cfg.flower.url) {
      sec.hidden = false;
      $('#btnFlower').href = cfg.flower.url;
    } else {
      sec.hidden = true;
    }
  }

  /* ---------- 마음 전하실 곳 ---------- */

  function renderAccounts(cfg) {
    function fill(groupEl, list) {
      const body = $('.acc-body', groupEl);
      const items = (list || []).filter((a) => a.number);
      if (!items.length) {
        body.innerHTML = '<p class="acc-empty">등록된 계좌가 없습니다.</p>';
        return;
      }
      body.innerHTML = items.map((a, i) =>
        '<div class="acc-item">' +
        '<p class="who">' + a.label + ' ' + a.holder + '</p>' +
        '<p class="num">' + a.bank + ' <b>' + a.number + '</b></p>' +
        '<div class="acc-btns">' +
        '<button type="button" class="btn btn-sm btn-copy" data-copy="' + i + '">계좌번호 복사</button>' +
        (a.kakaopayUrl ? '<a class="btn btn-sm btn-kpay" target="_blank" rel="noopener" href="' + a.kakaopayUrl + '">카카오페이</a>' : '') +
        (a.cardPayUrl ? '<a class="btn btn-sm btn-card" target="_blank" rel="noopener" href="' + a.cardPayUrl + '">카드결제</a>' : '') +
        '</div></div>').join('');
      body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-copy]');
        if (!btn) return;
        const a = items[parseInt(btn.dataset.copy, 10)];
        copyText(a.bank + ' ' + a.number, '계좌번호가 복사되었습니다.');
      });
    }
    fill($('#accGroom'), cfg.accounts.groom);
    fill($('#accBride'), cfg.accounts.bride);
    $$('.acc-head').forEach((head) => {
      head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    });
  }

  /* ---------- RSVP ---------- */

  const POPUP_KEY = 'mochung.popup.hideUntil';

  function initRsvp(cfg) {
    if (!cfg.rsvp.enabled) {
      $('#rsvp').hidden = true;
      return;
    }
    const overlay = $('#rsvpOverlay');
    const state = { side: 'groom', count: 1, meal: '', bus: '' };

    $('#btnRsvp').addEventListener('click', () => openOverlay(overlay));

    // 신랑/신부 측 선택
    $('#rsvpSide').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-side]');
      if (!btn) return;
      state.side = btn.dataset.side;
      $$('#rsvpSide button').forEach((b) => b.classList.toggle('on', b === btn));
    });

    // 인원 스테퍼
    $('#rsvpMinus').addEventListener('click', () => {
      state.count = Math.max(1, state.count - 1);
      $('#rsvpCount').textContent = state.count;
    });
    $('#rsvpPlus').addEventListener('click', () => {
      state.count = Math.min(20, state.count + 1);
      $('#rsvpCount').textContent = state.count;
    });

    // 세그먼트 버튼 (식사/버스)
    function segHandler(wrapId, key) {
      $('#' + wrapId).addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-v]');
        if (!btn) return;
        state[key] = btn.dataset.v;
        $$('#' + wrapId + ' button').forEach((b) => b.classList.toggle('on', b === btn));
      });
    }
    segHandler('rsvpMeal', 'meal');
    segHandler('rsvpBus', 'bus');

    $('#rsvpCompanionField').hidden = !cfg.rsvp.askCompanion;
    $('#rsvpMealField').hidden = !cfg.rsvp.askMeal;
    $('#rsvpBusField').hidden = !cfg.rsvp.askBus;

    $('#consentToggle').addEventListener('click', () => $('#consentBox').classList.toggle('open'));

    $('#rsvpForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#rsvpName').value.trim();
      const phone = $('#rsvpPhone').value.trim();
      if (!name) { toast('성함을 입력해 주세요.'); return; }
      if (!phone) { toast('연락처를 입력해 주세요.'); return; }
      if (!$('#rsvpConsent').checked) { toast('개인정보 수집·이용에 동의해 주세요.'); return; }
      await MochungStore.addRsvp({
        side: state.side,
        name: name,
        phone: phone,
        count: state.count,
        companion: cfg.rsvp.askCompanion ? $('#rsvpCompanion').value : '',
        meal: cfg.rsvp.askMeal ? state.meal : '',
        bus: cfg.rsvp.askBus ? state.bus : '',
      });
      closeOverlay(overlay);
      toast('참석의사가 전달되었습니다. 감사합니다!');
      $('#rsvpForm').reset();
      state.count = 1;
      $('#rsvpCount').textContent = '1';
    });

    // 입장 팝업
    const popup = $('#popupOverlay');
    $('#popupCouple').textContent = '신랑 ' + cfg.couple.groom.fullName + ' & 신부 ' + cfg.couple.bride.fullName;
    $('#popupDate').textContent = cfg.wedding.dateText;
    $('#popupVenue').textContent = cfg.wedding.venueName;
    $('#popupGo').addEventListener('click', () => { closeOverlay(popup); openOverlay(overlay); });
    $('#popupToday').addEventListener('click', () => {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      try { localStorage.setItem(POPUP_KEY, String(end.getTime())); } catch (e) { /* ignore */ }
      closeOverlay(popup);
    });
    $('#popupClose').addEventListener('click', () => closeOverlay(popup));

    if (cfg.rsvp.popupOnLoad) {
      let hideUntil = 0;
      try { hideUntil = parseInt(localStorage.getItem(POPUP_KEY) || '0', 10); } catch (e) { /* ignore */ }
      if (Date.now() > hideUntil) setTimeout(() => openOverlay(popup), 900);
    }
  }

  /* ---------- 방명록 ---------- */

  const GB_PAGE = 5;
  let gbShown = GB_PAGE;
  let pendingDeleteId = null;

  async function refreshGuestbook() {
    const list = await MochungStore.listGuestbook();
    const wrap = $('#gbList');
    if (!list.length) {
      wrap.innerHTML = '<p class="gb-empty">첫 번째 축하 메시지를 남겨주세요 💐</p>';
      $('#gbMore').hidden = true;
      return;
    }
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    wrap.innerHTML = list.slice(0, gbShown).map((en) =>
      '<div class="gb-item">' +
      '<div class="head"><span class="name">' + esc(en.name) + '</span>' +
      '<span class="date">' + fmtDate(en.createdAt) + '</span></div>' +
      '<p class="msg">' + esc(en.message) + '</p>' +
      '<button type="button" class="del" data-id="' + en.id + '">삭제</button>' +
      '</div>').join('');
    $('#gbMore').hidden = list.length <= gbShown;
  }

  function initGuestbook() {
    $('#gbMsg').addEventListener('input', () => {
      $('#gbCount').textContent = $('#gbMsg').value.length;
    });
    $('#gbForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#gbName').value.trim();
      const pw = $('#gbPw').value;
      const msg = $('#gbMsg').value.trim();
      if (!name || !pw || !msg) { toast('이름, 비밀번호, 메시지를 모두 입력해 주세요.'); return; }
      await MochungStore.addGuestbook({ name: name, message: msg, password: pw });
      $('#gbForm').reset();
      $('#gbCount').textContent = '0';
      gbShown = GB_PAGE;
      await refreshGuestbook();
      toast('축하 메시지가 등록되었습니다!');
    });
    $('#gbMore').addEventListener('click', async () => {
      gbShown += GB_PAGE;
      await refreshGuestbook();
    });
    $('#gbList').addEventListener('click', (e) => {
      const btn = e.target.closest('.del');
      if (!btn) return;
      pendingDeleteId = btn.dataset.id;
      $('#pwInput').value = '';
      openOverlay($('#pwOverlay'));
    });
    $('#pwConfirm').addEventListener('click', async () => {
      try {
        await MochungStore.deleteGuestbook(pendingDeleteId, { password: $('#pwInput').value });
        closeOverlay($('#pwOverlay'));
        await refreshGuestbook();
        toast('메시지가 삭제되었습니다.');
      } catch (err) {
        toast(err.message);
      }
    });
    refreshGuestbook();
  }

  /* ---------- 공유 ---------- */

  function shareUrl(cfg) {
    return cfg.share.url || location.href.split('#')[0];
  }

  function initShare(cfg) {
    $('#btnCopyLink').addEventListener('click', () =>
      copyText(shareUrl(cfg), '청첩장 주소가 복사되었습니다.'));

    $('#btnIcs').addEventListener('click', () => downloadIcs(cfg));

    $('#btnKakao').addEventListener('click', async () => {
      const url = shareUrl(cfg);
      if (cfg.share.kakaoJsKey) {
        try {
          await loadKakaoSdk();
          if (!window.Kakao.isInitialized()) window.Kakao.init(cfg.share.kakaoJsKey);
          window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: cfg.share.title,
              description: cfg.share.description,
              imageUrl: new URL(cfg.share.imageUrl, location.href).href,
              link: { mobileWebUrl: url, webUrl: url },
            },
            buttons: [{ title: '청첩장 보기', link: { mobileWebUrl: url, webUrl: url } }],
          });
          return;
        } catch (e) {
          console.warn('카카오 공유 실패, 기본 공유로 대체합니다.', e);
        }
      }
      // 카카오 키가 없거나 실패 시: 기기 기본 공유 → 링크 복사
      if (navigator.share) {
        try {
          await navigator.share({ title: cfg.share.title, text: cfg.share.description, url: url });
          return;
        } catch (e) { if (e.name === 'AbortError') return; }
      }
      copyText(url, '카카오 공유는 설정 후 사용 가능합니다. 주소를 복사했어요!');
    });
  }

  let kakaoSdkPromise = null;
  function loadKakaoSdk() {
    if (window.Kakao) return Promise.resolve();
    if (!kakaoSdkPromise) {
      kakaoSdkPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Kakao SDK 로드 실패'));
        document.head.appendChild(s);
      });
    }
    return kakaoSdkPromise;
  }

  function downloadIcs(cfg) {
    const start = new Date(cfg.wedding.dateISO);
    const end = new Date(start.getTime() + 2 * 3600000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//mochung//wedding//KO',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@mochung',
      'DTSTAMP:' + fmt(new Date()),
      'DTSTART:' + fmt(start),
      'DTEND:' + fmt(end),
      'SUMMARY:' + cfg.couple.groom.firstName + ' ♥ ' + cfg.couple.bride.firstName + ' 결혼식',
      'LOCATION:' + cfg.wedding.venueName + ' (' + cfg.wedding.address + ')',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wedding.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------- 오버레이 공통 ---------- */

  function initOverlays() {
    $$('.overlay').forEach((ov) => {
      ov.addEventListener('click', (e) => { if (e.target === ov) closeOverlay(ov); });
    });
    $$('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeOverlay($('#' + btn.dataset.close)));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = $$('.overlay.open');
      if (open.length) closeOverlay(open[open.length - 1]);
    });
  }

  /* ---------- 초기화 ---------- */

  async function init() {
    const override = await MochungStore.getConfigOverride();
    const cfg = deepMerge(window.MOCHUNG_DEFAULTS, override);
    window.MOCHUNG_CONFIG = cfg; // 디버깅/관리자용

    applyTheme(cfg);
    renderBindings(cfg);
    renderFamily(cfg);
    renderContacts(cfg);
    renderCalendar(cfg);
    renderGallery(cfg);
    renderLocation(cfg);
    renderFlower(cfg);
    renderAccounts(cfg);
    initRsvp(cfg);
    initGuestbook();
    initShare(cfg);
    initOverlays();
    initLightbox();

    $('#btnContacts').addEventListener('click', () => openOverlay($('#contactsOverlay')));

    if (cfg.theme.effects.reveal) MochungEffects.initReveal();
    else $$('.reveal').forEach((el) => el.classList.add('is-visible'));

    if (cfg.theme.effects.stars) {
      MochungEffects.StarField($('#starCanvas'), $('#hero'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
