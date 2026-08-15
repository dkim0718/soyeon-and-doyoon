/* =========================================================
 * Gallery manager — a thumbnail grid with add / remove /
 * drag- and arrow-reorder, for the admin 사진 card.
 *
 * Self-contained (window.GalleryManager) with no backend
 * knowledge, so the same code can be unit-tested in isolation:
 *   - uploading is delegated to the caller (opts.upload)
 *   - persistence is the caller's job (opts.onChange gives it
 *     the updated ordered URL list after every edit)
 *
 * Usage:
 *   var mgr = GalleryManager.mount({
 *     grid: el, addInput: fileInput, msg: statusEl,
 *     upload: file => Promise<url>,
 *     onChange: list => { ... }        // list = ordered urls
 *   });
 *   mgr.setItems(currentUrls);          // (re)seed the grid
 * ========================================================= */
(function () {
  'use strict';

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) { for (var k in attrs) e.setAttribute(k, attrs[k]); }
    return e;
  }

  function mount(opts) {
    opts = opts || {};
    var grid = opts.grid;
    var upload = opts.upload || function () { return Promise.reject(new Error('업로드가 지원되지 않습니다.')); };
    var onChange = opts.onChange || function () {};
    var msg = opts.msg || null;
    var items = [];
    var dragFrom = -1;

    function emit() { onChange(items.slice()); }

    // Move the item at `from` to position `to` (array-splice semantics: the
    // dragged photo lands where the drop target was, shifting the rest).
    function move(from, to) {
      if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return;
      var it = items.splice(from, 1)[0];
      items.splice(to, 0, it);
      render(); emit();
    }
    function removeAt(i) {
      if (i < 0 || i >= items.length) return;
      items.splice(i, 1);
      render(); emit();
    }

    function render() {
      grid.innerHTML = '';
      if (!items.length) {
        var empty = el('p', 'gm-empty');
        empty.textContent = '갤러리에 사진이 없습니다. "사진 추가"로 올려보세요.';
        grid.appendChild(empty);
        return;
      }
      items.forEach(function (url, i) {
        var thumb = el('div', 'gthumb', { draggable: 'true', 'data-i': i });
        var img = el('img'); img.src = url; img.alt = ''; img.loading = 'lazy';
        thumb.appendChild(img);
        var idx = el('span', 'gthumb-idx'); idx.textContent = String(i + 1); thumb.appendChild(idx);
        var bar = el('div', 'gthumb-bar');
        var left = el('button', 'gthumb-btn gm-left', { type: 'button', title: '앞으로', 'aria-label': '앞으로 이동' });
        left.textContent = '◀';               // ◀
        var del = el('button', 'gthumb-btn gm-del', { type: 'button', title: '삭제', 'aria-label': '삭제' });
        del.textContent = '✕';                // ✕
        var right = el('button', 'gthumb-btn gm-right', { type: 'button', title: '뒤로', 'aria-label': '뒤로 이동' });
        right.textContent = '▶';              // ▶
        if (i === 0) left.disabled = true;
        if (i === items.length - 1) right.disabled = true;
        bar.appendChild(left); bar.appendChild(del); bar.appendChild(right);
        thumb.appendChild(bar);
        grid.appendChild(thumb);
      });
    }

    function clearDragMarks() {
      var marked = grid.querySelectorAll('.gm-dragging, .gm-over');
      for (var i = 0; i < marked.length; i++) marked[i].classList.remove('gm-dragging', 'gm-over');
    }

    // ----- button actions (event-delegated) -----
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button.gthumb-btn');
      if (!btn) return;
      var thumb = btn.closest('.gthumb');
      if (!thumb) return;
      var i = +thumb.getAttribute('data-i');
      if (btn.classList.contains('gm-left')) move(i, i - 1);
      else if (btn.classList.contains('gm-right')) move(i, i + 1);
      else if (btn.classList.contains('gm-del')) removeAt(i);
    });

    // ----- drag-to-reorder -----
    grid.addEventListener('dragstart', function (e) {
      var thumb = e.target.closest && e.target.closest('.gthumb');
      if (!thumb) return;
      dragFrom = +thumb.getAttribute('data-i');
      thumb.classList.add('gm-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (x) { /* IE guard */ }
      }
    });
    grid.addEventListener('dragover', function (e) {
      var thumb = e.target.closest && e.target.closest('.gthumb');
      if (!thumb) return;
      e.preventDefault();                          // allow drop
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      var over = grid.querySelectorAll('.gm-over');
      for (var i = 0; i < over.length; i++) over[i].classList.remove('gm-over');
      if (!thumb.classList.contains('gm-dragging')) thumb.classList.add('gm-over');
    });
    grid.addEventListener('drop', function (e) {
      e.preventDefault();
      var thumb = e.target.closest && e.target.closest('.gthumb');
      clearDragMarks();
      if (!thumb || dragFrom < 0) { dragFrom = -1; return; }
      move(dragFrom, +thumb.getAttribute('data-i'));
      dragFrom = -1;
    });
    grid.addEventListener('dragend', function () { clearDragMarks(); dragFrom = -1; });

    // ----- add (one or many) -----
    if (opts.addInput) {
      opts.addInput.addEventListener('change', function (e) {
        var files = Array.prototype.slice.call(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        var done = 0, failed = 0, lastErr = '';
        function setMsg(color, text) { if (msg) { msg.style.color = color; msg.textContent = text; } }
        setMsg('', '업로드 중… (0/' + files.length + ')');
        // Upload sequentially so the added order is stable and storage isn't hammered.
        files.reduce(function (p, file) {
          return p.then(function () {
            return upload(file).then(function (url) {
              items.push(url); done++;
              setMsg('', '업로드 중… (' + done + '/' + files.length + ')');
              render(); emit();
            }, function (err) {
              // Surface the real reason (e.g. "Bucket not found", RLS denial) —
              // silently counting failures hides the actual cause.
              failed++;
              lastErr = (err && err.message) ? err.message : String(err);
              if (window.console && console.error) console.error('[gallery] 업로드 실패:', file.name, err);
            });
          });
        }, Promise.resolve()).then(function () {
          if (failed) setMsg('#b55', done + '장 추가, ' + failed + '장 실패' + (lastErr ? ' — ' + lastErr : '') + '.');
          else setMsg('#3a7d5a', done + '장 추가됨 — "사진 저장"을 눌러 반영하세요.');
        });
      });
    }

    render();

    return {
      setItems: function (list) { items = Array.isArray(list) ? list.slice() : []; render(); },
      getItems: function () { return items.slice(); },
      // exposed for tests / programmatic control
      _move: move,
      _removeAt: removeAt
    };
  }

  window.GalleryManager = { mount: mount };
})();
