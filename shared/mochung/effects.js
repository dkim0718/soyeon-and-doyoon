/* =========================================================
 * 동적 효과 (JavaScript-rendered effects)
 *  - StarField : 메인 화면 하늘에 별이 반짝이는 캔버스 효과
 *  - initReveal : 스크롤 시 섹션이 서서히 나타나는 효과
 *  - initCountdown : 예식까지 실시간 카운트다운
 * ========================================================= */
window.MochungEffects = (function () {
  'use strict';

  /* ---------- StarField ---------- */

  function StarField(canvas, host) {
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, dpr = 1;
    let stars = [];
    let raf = null;
    let visible = true;

    function rand(min, max) { return min + Math.random() * (max - min); }

    function makeStars() {
      stars = [];
      const sparkleCount = Math.round(width / 34);   // 큰 십자 반짝이
      const dotCount = Math.round(width / 9);        // 작은 점 별
      for (let i = 0; i < sparkleCount; i++) {
        stars.push({
          kind: 'sparkle',
          x: Math.random(),
          y: Math.pow(Math.random(), 1.6) * 0.52,    // 하늘(위쪽)에 몰리게
          r: rand(4, 11),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.5, 1.1),
          rot: rand(-0.6, 0.6),
        });
      }
      for (let i = 0; i < dotCount; i++) {
        stars.push({
          kind: 'dot',
          x: Math.random(),
          y: Math.pow(Math.random(), 1.4) * 0.58,
          r: rand(0.6, 1.7),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.7, 1.6),
        });
      }
    }

    function resize() {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    }

    // 4갈래 십자 별 (원본 로티 모양처럼 오목한 곡선)
    function drawSparkle(x, y, r, rot, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      const k = r * 0.18; // 오목한 정도
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(k, -k, r, 0);
      ctx.quadraticCurveTo(k, k, 0, r);
      ctx.quadraticCurveTo(-k, k, -r, 0);
      ctx.quadraticCurveTo(-k, -k, 0, -r);
      ctx.closePath();
      ctx.fillStyle = '#fff8ea';
      ctx.shadowColor = 'rgba(255, 246, 224, 0.85)';
      ctx.shadowBlur = r * 0.9;
      ctx.fill();
      ctx.restore();
    }

    function drawDot(x, y, r, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fffdf6';
      ctx.fill();
      ctx.restore();
    }

    function frame(t) {
      raf = null;
      ctx.clearRect(0, 0, width, height);
      const time = t / 1000;
      for (const s of stars) {
        // 부드럽게 사라졌다 나타나는 반짝임 (0~1)
        const tw = 0.5 + 0.5 * Math.sin(time * s.speed * 2 + s.phase);
        const alpha = Math.pow(tw, 1.8);
        const x = s.x * width;
        const y = s.y * height;
        if (s.kind === 'sparkle') {
          if (alpha > 0.03) drawSparkle(x, y, s.r * (0.75 + 0.25 * tw), s.rot, alpha * 0.95);
        } else {
          drawDot(x, y, s.r, 0.25 + alpha * 0.7);
        }
      }
      schedule();
    }

    function schedule() {
      if (visible && !document.hidden && raf === null) {
        raf = requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else schedule();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) schedule(); else stop();
      }, { threshold: 0 }).observe(host);
    }
    schedule();

    return { stop: stop };
  }

  /* ---------- 스크롤 리빌 ---------- */

  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 카운트다운 ---------- */

  function initCountdown(target, els, lineEl, lineTemplate) {
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      const now = Date.now();
      let diff = target.getTime() - now;
      const past = diff < 0;
      if (past) diff = -diff;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor(diff / 3600000) % 24;
      const mins = Math.floor(diff / 60000) % 60;
      const secs = Math.floor(diff / 1000) % 60;
      els.days.textContent = days;
      els.hours.textContent = pad(hours);
      els.mins.textContent = pad(mins);
      els.secs.textContent = pad(secs);
      if (lineEl) {
        if (past) {
          lineEl.innerHTML = lineTemplate.replace('{dday}', '<b>' + days + '</b>일이 지났습니다');
        } else {
          lineEl.innerHTML = lineTemplate.replace('{dday}', '<b>' + days + '</b>일 남았습니다');
        }
      }
    }
    tick();
    return setInterval(tick, 1000);
  }

  return { StarField: StarField, initReveal: initReveal, initCountdown: initCountdown };
})();
