/* =========================================================
 * RichTextEditor — inline per-word styling for admin inputs
 * ---------------------------------------------------------
 * RichTextEditor.attach(inputEl) hides the input and mounts a
 * contenteditable editor + toolbar in its place. On every edit
 * it mirrors the SANITIZED HTML back into inputEl.value, so the
 * existing save handlers (which read .value) need no change.
 *
 * Toolbar: font-size slider, letter-spacing slider, bold,
 * UPPERCASE, Capitalize, clear-formatting. Each wraps the
 * current selection in a <span> with one controlled style
 * property (all on RichText's allowlist).
 *
 * Two contenteditable gotchas handled here:
 *   • range.surroundContents() throws when the selection crosses
 *     an element boundary → fall back to extractContents+insertNode.
 *   • grabbing a slider blurs the editor and drops the selection →
 *     we keep a savedRange and restore it before applying.
 * Korean IME is safe because we never rewrite the editor's own
 * DOM while typing — we only READ innerHTML on input.
 * Requires shared/richtext.js (window.RichText) to be loaded first.
 * ES5-only.
 * ========================================================= */
(function () {
  'use strict';

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // Per-selection font choices. value = CSS font-family (quoted), '' = inherit.
  // Every value must also be on RichText's ALLOWED_FONTS or sanitize() drops it.
  var FONT_OPTS = [
    ['', '글꼴 (기본)'],
    ["'SD Jeongche'", 'SD정체'],
    ["'Nanum Myeongjo'", '나눔명조'],
    ["'Noto Serif KR'", '노토명조'],
    ["'Gowun Batang'", '고운바탕'],
    ["'Song Myung'", '송명'],
    ["'Noto Sans KR'", '노토고딕'],
    ["'Nanum Gothic'", '나눔고딕'],
    ["'Black Han Sans'", '검은고딕'],
    ["'Do Hyeon'", '도현'],
    ["'EB Garamond'", 'EB Garamond'],
    ["'Playfair Display'", 'Playfair'],
    ["'Cormorant Garamond'", 'Cormorant'],
    ["'Marcellus'", 'Marcellus'],
    ["'Nanum Pen Script'", '나눔손글씨'],
    ["'Clicker Script'", 'Clicker Script'],
  ];
  function normFont(v) { return (v || '').replace(/["']/g, '').trim().toLowerCase(); }
  // Load a Google font into the ADMIN doc so the editor previews the choice.
  // SD정체 is domain-locked (won't load off soyeondoyoon.fun) and generics need
  // nothing; the live site loads its content fonts itself (app.js loadGoogleFonts).
  var loadedFonts = {};
  function loadEditorFont(cssVal) {
    var name = normFont(cssVal);
    if (!name || name === 'sd jeongche' || /^(serif|sans-serif|cursive)$/.test(name) || loadedFonts[name]) return;
    loadedFonts[name] = 1;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(cssVal.replace(/["']/g, '').trim()).replace(/%20/g, '+') + '&display=swap';
    document.head.appendChild(l);
  }

  function attach(input, opts) {
    opts = opts || {};
    if (!window.RichText) { throw new Error('RichTextEditor requires RichText (shared/richtext.js)'); }
    if (input.__rtAttached) return input.__rtAttached;

    var wrap = el('div', 'rt-field');
    var bar = el('div', 'rt-toolbar');
    bar.hidden = true;
    var editor = el('div', 'rt-editor');
    editor.setAttribute('contenteditable', 'true');
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.innerHTML = RichText.sanitize(input.value);
    var ph = input.getAttribute('placeholder');
    if (ph) editor.setAttribute('data-placeholder', ph);
    if (input.tagName === 'TEXTAREA') editor.className = 'rt-editor rt-multiline';

    /* ---- toolbar controls ---- */
    var font = document.createElement('select');
    font.className = 'rt-font';
    font.title = '글꼴';
    for (var fi = 0; fi < FONT_OPTS.length; fi++) {
      var fo = document.createElement('option');
      fo.value = FONT_OPTS[fi][0];
      fo.textContent = FONT_OPTS[fi][1];
      font.appendChild(fo);
    }
    var size = rangeInput('0.6', '2', '0.05', '1');
    var sizeCtl = ctl('크기', size);
    var ls = rangeInput('-0.05', '0.4', '0.01', '0');
    var lsCtl = ctl('자간', ls);
    var bBold = btn('굵게');
    var bUpper = btn('AA', '대문자로');
    var bCap = btn('Aa', '첫 글자 대문자');
    var bClear = btn('서식 지우기');

    bar.appendChild(font);
    bar.appendChild(sizeCtl);
    bar.appendChild(lsCtl);
    bar.appendChild(bBold);
    bar.appendChild(bUpper);
    bar.appendChild(bCap);
    bar.appendChild(bClear);

    wrap.appendChild(bar);
    wrap.appendChild(editor);
    input.parentNode.insertBefore(wrap, input);
    input.style.display = 'none';
    wrap.appendChild(input);           // keep the input as the value mirror

    /* ---- selection bookkeeping ---- */
    var savedRange = null;
    function inEditor(range) {
      return range && editor.contains(range.commonAncestorContainer);
    }
    function saveSel() {
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var r = sel.getRangeAt(0);
        if (inEditor(r)) savedRange = r.cloneRange();
      }
    }
    // Run fn against the live selection, restoring savedRange first if focus
    // has moved (e.g. onto a slider). No-op on a collapsed selection.
    function withSel(fn) {
      var sel = window.getSelection();
      var r = (sel && sel.rangeCount && inEditor(sel.getRangeAt(0))) ? sel.getRangeAt(0) : savedRange;
      if (!r || r.collapsed) return false;
      sel.removeAllRanges();
      sel.addRange(r);
      fn(sel.getRangeAt(0));
      saveSel();
      return true;
    }

    /* ---- styling primitives ---- */
    // If the selection exactly spans a single styling <span>, reuse it so
    // repeated tweaks update in place instead of nesting (em would compound).
    function enclosingSpan(range) {
      var node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode;
      if (node && node.tagName === 'SPAN' && node !== editor && editor.contains(node)) {
        if (range.toString() === node.textContent) return node;
      }
      return null;
    }
    function reselect(node) {
      var sel = window.getSelection();
      var r = document.createRange();
      r.selectNodeContents(node);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    function setProp(prop, value) {
      withSel(function (range) {
        var span = enclosingSpan(range);
        if (span) {
          if (value == null) span.style.removeProperty(prop);
          else span.style.setProperty(prop, value);
          reselect(span);
          return;
        }
        if (value == null) return;   // nothing to remove, nothing to wrap
        span = document.createElement('span');
        span.style.setProperty(prop, value);
        try {
          range.surroundContents(span);
        } catch (e) {
          var frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }
        reselect(span);
      });
      sync();
    }
    // Toggle a keyword property: read the enclosing span's current value and
    // flip it (used for bold / uppercase / capitalize).
    function toggleProp(prop, value, isOn) {
      var range = currentRange();
      var span = range ? enclosingSpan(range) : null;
      var on = span && isOn(span.style.getPropertyValue(prop));
      setProp(prop, on ? null : value);
    }
    function clearFormat() {
      withSel(function (range) {
        var text = range.toString();
        range.deleteContents();
        var tn = document.createTextNode(text);
        range.insertNode(tn);
        var sel = window.getSelection();
        var r = document.createRange();
        r.selectNodeContents(tn);
        sel.removeAllRanges();
        sel.addRange(r);
      });
      sync();
    }
    function currentRange() {
      var sel = window.getSelection();
      var r = (sel && sel.rangeCount && inEditor(sel.getRangeAt(0))) ? sel.getRangeAt(0) : savedRange;
      return r || null;
    }

    /* ---- mirror sanitized HTML into the input ---- */
    function sync() {
      input.value = RichText.sanitize(editor.innerHTML);
      try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* old browser */ }
    }

    /* ---- wire it up ---- */
    // Toolbar buttons fire on mousedown+preventDefault so the editor keeps its
    // selection (a click would blur it first).
    function onPress(node, fn) {
      node.addEventListener('mousedown', function (ev) { ev.preventDefault(); fn(); });
    }
    onPress(bBold, function () {
      toggleProp('font-weight', '700', function (v) { return v === '700' || v === 'bold'; });
    });
    onPress(bUpper, function () {
      toggleProp('text-transform', 'uppercase', function (v) { return v === 'uppercase'; });
    });
    onPress(bCap, function () {
      toggleProp('text-transform', 'capitalize', function (v) { return v === 'capitalize'; });
    });
    onPress(bClear, clearFormat);

    // Sliders keep the selection alive (mousedown preventDefault) and apply live.
    preserveSel(size);
    preserveSel(ls);
    size.addEventListener('input', function () { setProp('font-size', parseFloat(size.value) + 'em'); });
    ls.addEventListener('input', function () { setProp('letter-spacing', parseFloat(ls.value) + 'em'); });

    // Font dropdown: apply the chosen family (or clear for '(기본)'), and load it
    // into the admin doc so the editor previews it. Uses the saved selection.
    preserveSel(font);
    font.addEventListener('change', function () {
      var v = font.value;
      loadEditorFont(v);
      setProp('font-family', v || null);
    });

    editor.addEventListener('input', sync);
    editor.addEventListener('keyup', saveSel);
    editor.addEventListener('mouseup', saveSel);
    editor.addEventListener('focus', function () { bar.hidden = false; });
    editor.addEventListener('blur', function () {
      setTimeout(function () { if (!wrap.contains(document.activeElement)) bar.hidden = true; }, 150);
    });
    document.addEventListener('selectionchange', function () {
      if (document.activeElement !== editor) return;
      saveSel();
      var range = currentRange();
      var span = range ? enclosingSpan(range) : null;
      // reflect the selection's current font in the dropdown (blank = inherit)
      var nf = normFont(span ? span.style.getPropertyValue('font-family') : '');
      font.value = '';
      for (var oi = 0; oi < font.options.length; oi++) {
        if (normFont(font.options[oi].value) === nf) { font.value = font.options[oi].value; break; }
      }
      if (span) {
        var fs = span.style.getPropertyValue('font-size');
        if (/em$/.test(fs)) size.value = parseFloat(fs);
        var lsv = span.style.getPropertyValue('letter-spacing');
        if (/em$/.test(lsv)) ls.value = parseFloat(lsv);
      }
    });

    var api = { editor: editor, input: input, sync: sync };
    input.__rtAttached = api;
    return api;
  }

  /* ---- small builders ---- */
  function rangeInput(min, max, step, val) {
    var r = document.createElement('input');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
    r.className = 'rt-range';
    return r;
  }
  function ctl(label, control) {
    var l = el('label', 'rt-ctl');
    l.appendChild(document.createTextNode(label));
    l.appendChild(control);
    return l;
  }
  function btn(text, title) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rt-btn';
    b.textContent = text;
    if (title) b.title = title;
    return b;
  }
  function preserveSel(node) {
    // Keep the editor's selection when the control takes focus.
    node.addEventListener('mousedown', function () { /* selection stays; input event applies it */ });
  }

  window.RichTextEditor = { attach: attach };
})();
