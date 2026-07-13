/* =========================================================
 * RSVP widget — two flows, one module.
 *   mountWeddingRsvp(el, { store, config })
 *       open self-report (KR wedding website; the 모청 keeps its
 *       own native overlay form which also writes to the store).
 *   mountAfterpartyRsvp(el, { store, config })
 *       curated list: identify by ?code= link or name, see the
 *       +1 allotment, name companions, submit (upsert / editable).
 *
 * Uses window.t() for copy (locale from window.SITE.locale) and
 * the shared Store interface (see shared/store.localStorage.js).
 * ========================================================= */
(function () {
  'use strict';

  var t = function (k, v) { return window.t ? window.t(k, v) : k; };

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k in e) { try { e[k] = attrs[k]; } catch (x) { e.setAttribute(k, attrs[k]); } }
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.append(c); });
    return e;
  }
  function field(labelText, input) {
    return el('label', { class: 'rsvp-field' }, [el('span', { text: labelText }), input]);
  }
  function radioGroup(name, options, checkedVal) {
    var wrap = el('div', { class: 'rsvp-attend', role: 'radiogroup' });
    options.forEach(function (o) {
      var input = el('input', { type: 'radio', name: name, value: o.value });
      if (o.value === checkedVal) input.checked = true;
      wrap.append(el('label', {}, [input, document.createTextNode(' ' + o.label)]));
    });
    return wrap;
  }
  function statusLine() { return el('div', { class: 'rsvp-sent' }); }

  /* =======================================================
   * Wedding RSVP (open self-report)
   * ===================================================== */
  function mountWeddingRsvp(root, opts) {
    var store = opts.store, config = opts.config || window.SITE || {};
    var locale = config.locale || 'ko';
    root.innerHTML = '';

    var name = el('input', { type: 'text', name: 'name', required: true, maxlength: 40 });
    var side = radioGroup('side', [
      { value: 'groom', label: t('rsvp.sideGroom') },
      { value: 'bride', label: t('rsvp.sideBride') },
    ], 'groom');
    var attending = radioGroup('attending', [
      { value: 'yes', label: t('rsvp.attendingYes') },
      { value: 'no', label: t('rsvp.attendingNo') },
    ], 'yes');
    // KR website rule: +1 only for names on the list. The party
    // selector stays at 1 until the typed name matches a listed
    // guest, then opens up to their allotment. (The 모청 has its own
    // form and keeps a free count; this widget is the website's.)
    var listGated = locale === 'ko' && typeof store.lookupAfterpartyGuest === 'function';
    var maxParty = listGated ? 1 : 10;
    var party = el('select', { name: 'party' });
    var partyNote = el('p', { class: 'rsvp-hint muted' });
    var partyField = field(t('rsvp.partySize'), el('div', {}, [party, partyNote]));

    function rebuildParty() {
      var cur = parseInt(party.value || '1', 10) || 1;
      party.innerHTML = '';
      for (var i = 1; i <= maxParty; i++) party.append(el('option', { value: String(i), text: String(i) }));
      party.value = String(Math.min(Math.max(1, cur), maxParty));
      if (listGated) {
        partyNote.textContent = maxParty > 1 ? t('rsvp.plusOneOk', { n: maxParty }) : t('rsvp.plusOneInfo');
      } else {
        partyNote.style.display = 'none';
      }
    }
    rebuildParty();

    var lookupTimer = null;
    var lastLooked = null;
    function checkList() {
      if (!listGated) return;
      var v = name.value.trim();
      if (v === lastLooked) return;
      lastLooked = v;
      if (!v) { maxParty = 1; rebuildParty(); return; }
      Promise.resolve(store.lookupAfterpartyGuest({ name: v })).then(function (res) {
        if (name.value.trim() !== v) return; // stale response
        maxParty = (res && res.guest && res.guest.party_limit > 1) ? res.guest.party_limit : 1;
        rebuildParty();
      }).catch(function () { maxParty = 1; rebuildParty(); });
    }
    if (listGated) {
      name.addEventListener('input', function () {
        clearTimeout(lookupTimer);
        lookupTimer = setTimeout(checkList, 450);
      });
      name.addEventListener('blur', checkList);
    }

    var phone = el('input', { type: 'tel', name: 'phone', maxlength: 30 });
    var message = el('textarea', { name: 'message', rows: 3, maxlength: 500 });
    var status = statusLine();
    var submit = el('button', { class: 'btn', type: 'submit', text: t('rsvp.submit') });

    var form = el('form', { class: 'rsvp-form' }, [
      field(t('rsvp.name'), name),
      field(t('rsvp.side'), side),
      field(t('rsvp.attendQuestion'), attending),
      partyField,
      field(t('rsvp.phone'), phone),
      field(t('rsvp.messageLabel'), message),
      submit, status,
    ]);

    function isAttending() {
      var r = form.querySelector('input[name="attending"]:checked');
      return !r || r.value === 'yes';
    }
    function syncAttend() { partyField.style.display = isAttending() ? '' : 'none'; }
    attending.addEventListener('change', syncAttend);
    syncAttend();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!name.value.trim()) { status.textContent = t('rsvp.required'); return; }
      submit.disabled = true; status.textContent = t('rsvp.saving');
      var sideVal = (form.querySelector('input[name="side"]:checked') || {}).value || 'groom';
      Promise.resolve(store.submitWeddingRsvp({
        name: name.value,
        side: sideVal,
        attending: isAttending(),
        partyCount: isAttending() ? Math.min(parseInt(party.value, 10) || 1, maxParty) : 0,
        phone: phone.value,
        message: message.value,
        locale: locale,
      })).then(function () {
        root.innerHTML = '';
        root.append(el('p', { class: 'rsvp-sent on', text: t('rsvp.thanksWedding') }));
      }).catch(function (err) {
        submit.disabled = false;
        status.textContent = (err && err.message) || 'Error';
      });
    });

    root.append(form);
  }

  /* =======================================================
   * Afterparty RSVP (curated list + allotment)
   * ===================================================== */
  function mountAfterpartyRsvp(root, opts) {
    var store = opts.store, config = opts.config || window.SITE || {};
    var locale = config.locale || 'en';
    var codeFromUrl = null;
    try { codeFromUrl = new URLSearchParams(location.search).get('code'); } catch (e) { /* ignore */ }

    function clear() { root.innerHTML = ''; }

    /* --- step 1: identify --- */
    function showLookup(prefillName, errorMsg) {
      clear();
      var name = el('input', { type: 'text', maxlength: 80, value: prefillName || '',
        placeholder: '' });
      var status = statusLine();
      if (errorMsg) { status.textContent = errorMsg; status.classList.add('on'); }
      var go = el('button', { class: 'btn', type: 'submit', text: t('rsvp.lookupBtn') });
      var form = el('form', { class: 'rsvp-form' }, [
        el('p', { class: 'center', text: t('rsvp.lookupHint') }),
        field(t('rsvp.name'), name),
        go, status,
        el('p', { class: 'center muted rsvp-hint', text: t('rsvp.lookupByCode') }),
      ]);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!name.value.trim()) { status.textContent = t('rsvp.required'); status.classList.add('on'); return; }
        doLookup({ name: name.value });
      });
      root.append(el('div', { class: 'ap-step' }, [
        t('rsvp.lookupHeading') ? el('h3', { class: 'ap-heading', text: t('rsvp.lookupHeading') }) : null,
        form,
      ]));
      name.focus();
    }

    function doLookup(query) {
      clear();
      root.append(el('p', { class: 'center muted', text: '…' }));
      Promise.resolve(store.lookupAfterpartyGuest(query)).then(function (res) {
        if (!res) {
          // Open RSVP: an unknown NAME just proceeds as a new guest
          // with the standard +1 allotment (self-registers on submit).
          // An unknown personal code falls back to the name form.
          if (query.name && query.name.trim()) {
            showForm({ display_name: query.name.trim(), party_limit: 2, invite_code: null }, null, query);
          } else {
            showLookup('', t('rsvp.notFound'));
          }
          return;
        }
        if (res.ambiguous) { showLookup(query.name || '', t('rsvp.ambiguous')); return; }
        showForm(res.guest, res.rsvp, query);
      }).catch(function () {
        showLookup(query.name || '', t('rsvp.notFound'));
      });
    }

    /* --- step 2: the RSVP form --- */
    function showForm(guest, existing, identity) {
      clear();
      // The EN site is open: everyone may bring a +1, and listed
      // guests keep any larger allotment.
      var limit = Math.max(2, guest.party_limit || 1);

      var greeting = el('div', { class: 'ap-greeting' }, [
        el('h3', { text: t('rsvp.welcome', { name: guest.display_name }) }),
        el('p', { class: 'muted', text: t('rsvp.allotment', { n: limit }) }),
      ]);
      if (existing) greeting.append(el('p', { class: 'ap-note', text: t('rsvp.alreadyResponded') }));

      var attending = radioGroup('attending', [
        { value: 'yes', label: t('rsvp.attendingYes') },
        { value: 'no', label: t('rsvp.attendingNo') },
      ], existing && existing.attending === false ? 'no' : 'yes');

      // party stepper
      var count = existing && existing.party_count ? Math.min(limit, Math.max(1, existing.party_count)) : 1;
      var out = el('output', { text: String(count) });
      var minus = el('button', { type: 'button', class: 'ap-step-btn', text: '−' });
      var plus = el('button', { type: 'button', class: 'ap-step-btn', text: '+' });
      var stepper = el('div', { class: 'ap-stepper' }, [minus, out, plus]);
      var partyField = field(t('rsvp.partySize'), stepper);

      var companionWrap = el('div', { class: 'ap-companions' });
      var existingComp = (existing && existing.companions) || [];
      function renderCompanions() {
        companionWrap.innerHTML = '';
        for (var i = 0; i < count - 1; i++) {
          var c = el('input', { type: 'text', maxlength: 80,
            placeholder: t('rsvp.companionPlaceholder'), value: existingComp[i] || '' });
          c.className = 'ap-companion';
          companionWrap.append(c);
        }
        companionWrap.parentNode && (companionLabel.style.display = count > 1 ? '' : 'none');
      }
      var companionLabel = field(t('rsvp.companionsLabel'), companionWrap);

      minus.addEventListener('click', function () {
        count = Math.max(1, count - 1); out.textContent = String(count); renderCompanions();
      });
      plus.addEventListener('click', function () {
        if (count >= limit) { status.textContent = t('rsvp.overLimit', { n: limit }); status.classList.add('on'); return; }
        count = Math.min(limit, count + 1); out.textContent = String(count); status.classList.remove('on'); renderCompanions();
      });

      var email = el('input', { type: 'email', maxlength: 120, value: (existing && existing.contact_email) || '' });
      var message = el('textarea', { rows: 3, maxlength: 500, value: (existing && existing.message) || '' });
      var status = statusLine();
      var submit = el('button', { class: 'btn', type: 'submit',
        text: existing ? t('rsvp.edit') : t('rsvp.submit') });

      var attendBlock = el('div', {}, [partyField, companionLabel]);
      function syncAttend() {
        var yes = (form.querySelector('input[name="attending"]:checked') || {}).value !== 'no';
        attendBlock.style.display = yes ? '' : 'none';
      }

      var form = el('form', { class: 'rsvp-form' }, [
        greeting,
        field(t('rsvp.attendQuestion'), attending),
        attendBlock,
        field(t('rsvp.contactEmail'), email),
        field(t('rsvp.messageLabel'), message),
        submit, status,
      ]);
      attending.addEventListener('change', syncAttend);
      renderCompanions();
      syncAttend();

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var yes = (form.querySelector('input[name="attending"]:checked') || {}).value !== 'no';
        var companions = Array.prototype.map.call(
          companionWrap.querySelectorAll('.ap-companion'), function (c) { return c.value.trim(); }
        ).filter(Boolean);
        submit.disabled = true; status.classList.remove('on'); status.textContent = t('rsvp.saving');
        Promise.resolve(store.submitAfterpartyRsvp({
          code: guest.invite_code || (identity && identity.code) || codeFromUrl || undefined,
          name: guest.display_name,
          attending: yes,
          partyCount: yes ? count : 0,
          companions: companions,
          contactEmail: email.value,
          message: message.value,
          locale: locale,
        })).then(function (saved) {
          showThanks(guest, saved, identity);
        }).catch(function (err) {
          submit.disabled = false;
          status.classList.add('on');
          if (err && err.code === 'OVER_LIMIT') status.textContent = t('rsvp.overLimit', { n: limit });
          else if (err && err.code === 'GUEST_NOT_FOUND') status.textContent = t('rsvp.notFound');
          else status.textContent = (err && err.message) || 'Error';
        });
      });

      root.append(el('div', { class: 'ap-step' }, [form]));
    }

    /* --- step 3: confirmation --- */
    function showThanks(guest, saved, identity) {
      clear();
      var attending = saved ? saved.attending !== false : true;
      var msg = attending ? t('rsvp.thanksYes') : t('rsvp.thanksNo');
      var editBtn = el('button', { class: 'btn btn-ghost', type: 'button', text: t('rsvp.edit') });
      editBtn.addEventListener('click', function () {
        doLookup(guest.invite_code ? { code: guest.invite_code } : { name: guest.display_name });
      });
      root.append(el('div', { class: 'ap-step ap-thanks' }, [
        el('p', { class: 'rsvp-sent on', text: msg }),
        editBtn,
      ]));
    }

    /* --- boot: personal link auto-identifies --- */
    if (codeFromUrl) doLookup({ code: codeFromUrl });
    else showLookup('');
  }

  window.mountWeddingRsvp = mountWeddingRsvp;
  window.mountAfterpartyRsvp = mountAfterpartyRsvp;
})();
