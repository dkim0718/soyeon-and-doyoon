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
 *            text-transform, font-family — each value
 *            validated (font-family against a name allowlist,
 *            font-size numerically capped).
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

  // Fonts that may be set per selection (lower-cased). 'sd jeongche' is the site
  // font; the rest mirror the design-panel Google choices; serif/sans/cursive are
  // generic fallbacks. Anything not listed is dropped — this allowlist is what
  // stops an attacker smuggling tricks through a font-family value.
  var ALLOWED_FONTS = {
    'sd jeongche': 1,
    'nanum myeongjo': 1, 'noto serif kr': 1, 'gowun batang': 1, 'song myung': 1,
    'hahmlet': 1, 'black han sans': 1, 'do hyeon': 1, 'jua': 1, 'noto sans kr': 1,
    'gowun dodum': 1, 'nanum gothic': 1, 'ibm plex sans kr': 1, 'sunflower': 1,
    'nanum pen script': 1, 'gaegu': 1, 'gamja flower': 1,
    'playfair display': 1, 'cormorant garamond': 1, 'eb garamond': 1,
    'libre caslon text': 1, 'dm serif display': 1, 'marcellus': 1, 'lora': 1,
    'jost': 1, 'clicker script': 1,
    'serif': 1, 'sans-serif': 1, 'cursive': 1,
  };
  // font-family: each comma-separated name (quotes stripped) must be allowlisted.
  function validFontFamily(val) {
    var parts = val.split(',');
    if (!parts.length) return false;
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].trim().replace(/^["']|["']$/g, '').trim();
      if (!ALLOWED_FONTS[name]) return false;
    }
    return true;
  }

  // property -> validator for its value (a RegExp or a function; the value is
  // already lower-cased/trimmed when the validator runs)
  var STYLE_PROPS = {
    'font-size': /^\d*\.?\d+(em|rem|%|px)$/,
    'letter-spacing': /^-?\d*\.?\d+(em|px)$/,
    'font-weight': /^(400|700|normal|bold)$/,
    'text-transform': /^(uppercase|capitalize|none)$/,
    'font-family': validFontFamily,
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
      var raw = d.slice(idx + 1).trim();
      var val = raw.toLowerCase();
      var re = STYLE_PROPS[prop];
      if (!re) continue;
      var ok = (typeof re === 'function') ? re(val) : re.test(val);
      if (!ok) continue;
      if (prop === 'font-size' && !withinSizeCap(val)) continue;
      // font-family keeps its original case (css2 request URLs are case-sensitive);
      // every other property is canonicalised lower-case.
      out.push(prop + ':' + (prop === 'font-family' ? raw : val));
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
