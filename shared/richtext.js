/* =========================================================
 * RichText — a tiny, dependency-free HTML sanitizer
 * ---------------------------------------------------------
 * Powers the admin inline editor (richtext-editor.js) and is
 * ALSO safe to load on the public pages to repair markup at
 * render time. It is the security boundary: admin-typed markup
 * is stored in config_overrides (world-readable via the anon
 * key), so every value must pass through sanitize() before it
 * ever reaches innerHTML.
 *
 * Allowlist — nothing else survives:
 *   tags   : span, b, strong, em, i, br
 *   attr   : style (only), only on those tags
 *   style  : font-size, letter-spacing, font-weight,
 *            text-transform — each value regex-validated,
 *            font-size numerically capped.
 * Everything else (script, img, a, event handlers, href, src,
 * class, id, comments, unknown props) is dropped; an unknown
 * element's text children are kept.
 *
 * Parsing uses DOMParser (an inert document — scripts do not
 * run and resources are not fetched), never a live element, so
 * an <img onerror> payload can never fire while we inspect it.
 * ES5-only so it runs unchanged in the admin and on the sites.
 * ========================================================= */
(function () {
  'use strict';

  var ALLOWED_TAGS = { SPAN: 1, B: 1, STRONG: 1, EM: 1, I: 1, BR: 1 };

  // Elements whose ENTIRE subtree is discarded (their text is code/metadata,
  // not content). Other non-allowlisted elements keep their text children.
  var DROP_SUBTREE = {
    SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, TITLE: 1, HEAD: 1,
    IFRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1,
  };

  // property -> validator for its value (already lower-cased/trimmed)
  var STYLE_PROPS = {
    'font-size': /^\d*\.?\d+(em|rem|%|px)$/,
    'letter-spacing': /^-?\d*\.?\d+(em|px)$/,
    'font-weight': /^(400|700|normal|bold)$/,
    'text-transform': /^(uppercase|capitalize|none)$/,
  };

  // Reject a whole style value outright if it smells dangerous. The property
  // regexes already exclude these, but this is a cheap belt-and-braces guard.
  var STYLE_BLOCK = /url\(|expression|javascript:|[\\]|\/\*|<|>/i;

  function withinSizeCap(val) {
    var m = /^(\d*\.?\d+)(em|rem|%|px)$/.exec(val);
    if (!m) return false;
    var n = parseFloat(m[1]);
    var unit = m[2];
    if (unit === 'em' || unit === 'rem') return n <= 4;   // 4em hard cap
    if (unit === '%') return n <= 400;
    if (unit === 'px') return n <= 200;
    return false;
  }

  function cleanStyle(styleText) {
    if (!styleText || STYLE_BLOCK.test(styleText)) return '';
    var out = [];
    var decls = styleText.split(';');
    for (var i = 0; i < decls.length; i++) {
      var d = decls[i];
      var idx = d.indexOf(':');
      if (idx < 0) continue;
      var prop = d.slice(0, idx).trim().toLowerCase();
      var val = d.slice(idx + 1).trim().toLowerCase();
      var re = STYLE_PROPS[prop];
      if (!re || !re.test(val)) continue;
      if (prop === 'font-size' && !withinSizeCap(val)) continue;
      out.push(prop + ':' + val);
    }
    return out.join(';');
  }

  function escapeText(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function walk(node, out) {
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c.nodeType === 3) {                     // text
        out.push(escapeText(c.nodeValue));
      } else if (c.nodeType === 1) {              // element
        var tag = c.tagName;
        if (DROP_SUBTREE[tag]) {
          continue;                                // drop element AND its text
        }
        if (ALLOWED_TAGS[tag]) {
          if (tag === 'BR') { out.push('<br>'); continue; }
          var lower = tag.toLowerCase();
          var style = cleanStyle(c.getAttribute('style'));
          // A span carries meaning only through its style; a style-less one
          // (a cleared toggle, an over-cap value) is noise — unwrap it. The
          // semantic tags (b/strong/em/i) are kept even without attributes.
          if (tag === 'SPAN' && !style) { walk(c, out); continue; }
          out.push('<' + lower + (style ? ' style="' + style + '"' : '') + '>');
          walk(c, out);
          out.push('</' + lower + '>');
        } else {
          walk(c, out);                            // drop tag, keep its text
        }
      }
      // comments (8) and everything else are dropped
    }
  }

  // Parse into an inert document and return our wrapper node. Wrapping in a
  // uniquely-id'd div and reading it back means any markup that "breaks out"
  // (e.g. a stray </div><script>) lands OUTSIDE the wrapper and is ignored.
  function parseInert(html) {
    var doc = new DOMParser().parseFromString(
      '<div id="__rt_root">' + html + '</div>', 'text/html');
    return doc.getElementById('__rt_root');
  }

  function sanitize(html) {
    if (html == null) return '';
    var root = parseInert(String(html));
    if (!root) return '';
    var out = [];
    walk(root, out);
    return out.join('');
  }

  function toPlain(html) {
    if (html == null) return '';
    var root = parseInert(String(html));
    return root ? (root.textContent || '') : '';
  }

  window.RichText = { sanitize: sanitize, toPlain: toPlain };
})();
