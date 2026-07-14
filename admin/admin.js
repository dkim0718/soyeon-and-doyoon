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
        '<p>등록된 관리자 이메일로 로그인 링크와 6자리 코드를 보내드립니다.</p>' +
        '<input type="email" id="gateEmail" placeholder="admin@example.com" ' +
        'autocomplete="email" style="letter-spacing:normal;text-align:left;">' +
        '<button class="btn btn-primary btn-block" id="gateGo">로그인 링크 보내기</button>' +
        '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #e5ddd6;">' +
        '<p style="font-size:12px;color:#8b7f7a;margin:0 0 6px;">링크가 열리지 않으면 메일에 적힌 6자리 코드를 입력하세요.</p>' +
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
          msg.textContent = '이메일을 보냈습니다. 링크를 누르거나 메일 속 6자리 코드를 입력해 주세요. ' +
            '(메일은 시간당 몇 통만 보낼 수 있으니 여러 번 누르지 마세요.)';
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
    gate: gate,
    logout: logout,
  };
})();
