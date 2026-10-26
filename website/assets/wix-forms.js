// Wix Forms on a static page: reads the form the owner manages in the dashboard, renders its
// fields, validates and submits as an anonymous visitor. A port of the Wix headless kit's forms
// REST layer (shared/rest/client.ts, forms/rest/*.ts) and its cores (forms-core.ts,
// submissions-core.ts), cut down to the field kinds these forms use. Fields are never named in
// code: whatever the owner adds, renames or requires in the dashboard shows up here.
(function () {
  var CLIENT_ID = '1d4f4f81-2bc7-4bb6-8904-0c543d435a73';
  var API = 'https://www.wixapis.com';
  var KEY = 'wix-visitor-' + CLIENT_ID;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- the visitor token (client.ts): mint once, persist, refresh ----
  var memory = null;
  var load = function () { if (memory) return memory; try { memory = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} return memory; };
  var save = function (t) { memory = t; try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {} };
  var mint = function (body) {
    body.clientId = CLIENT_ID;
    return fetch(API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('Wix auth failed (' + r.status + ').'); return r.json(); })
      .then(function (d) { return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + d.expires_in * 1000 }; });
  };
  var token = function () {
    var t = load();
    if (t && t.expiresAt - 60000 > Date.now()) return Promise.resolve(t.accessToken);
    var p = t && t.refreshToken ? mint({ grantType: 'refresh_token', refreshToken: t.refreshToken }).catch(function () { return mint({ grantType: 'anonymous' }); }) : mint({ grantType: 'anonymous' });
    return p.then(function (f) { save(f); return f.accessToken; });
  };
  var wixRequest = function (path, method, body) {
    return token().then(function (tk) {
      return fetch(API + path, { method: method, headers: { Authorization: tk, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) { var e = new Error(j.message || 'Request failed (' + res.status + ').'); e.status = res.status; e.details = j.details || {}; throw e; }
        return j;
      });
    });
  };

  window.bbWix = wixRequest; // shared with the Journal

  // ---- the schema, flattened (forms-core.ts) ----
  var INPUT_BLOCK = { STRING: 'stringOptions', NUMBER: 'numberOptions', BOOLEAN: 'booleanOptions', ARRAY: 'arrayOptions' };
  var COMPONENT_BLOCK = { TEXT_INPUT: 'textInputOptions', PHONE_INPUT: 'phoneInputOptions', NUMBER_INPUT: 'numberInputOptions', CHECKBOX: 'checkboxOptions', CHECKBOX_GROUP: 'checkboxGroupOptions', RADIO_GROUP: 'radioGroupOptions', DROPDOWN: 'dropdownOptions', TAGS: 'tagsOptions', DATE_PICKER: 'datePickerOptions' };
  var CONTROL = { TEXT_INPUT: 'text', PHONE_INPUT: 'phone', NUMBER_INPUT: 'number', CHECKBOX: 'checkbox', CHECKBOX_GROUP: 'checkboxGroup', RADIO_GROUP: 'radio', DROPDOWN: 'select', TAGS: 'tags', DATE_PICKER: 'date' };
  var rid = function (raw) { return raw && (raw._id || raw.id) || ''; };
  var plainText = function (label) {
    if (typeof label === 'string') return label;
    var nodes = label && label.nodes; if (!Array.isArray(nodes)) return '';
    var BLOCK = /^(PARAGRAPH|HEADING|LIST_ITEM|BLOCKQUOTE|CODE_BLOCK)$/;
    var walk = function (list) { return list.map(function (n) { return ((n && n.textData && n.textData.text) || '') + (Array.isArray(n && n.nodes) ? walk(n.nodes) : '') + (BLOCK.test((n && n.type) || '') ? '\n' : ''); }).join(''); };
    return walk(nodes).replace(/\n{3,}/g, '\n\n').trim();
  };
  var toField = function (raw) {
    var input = raw.inputOptions || {}, inputType = input.inputType || '';
    var block = input[INPUT_BLOCK[inputType] || ''] || {}, componentType = block.componentType || '';
    var comp = block[COMPONENT_BLOCK[componentType] || ''] || {}, rules = block.validation || {}, identifier = raw.identifier || '';
    var control = CONTROL[componentType] || 'unknown';
    if (control === 'text') { if (identifier === 'TEXT_AREA') control = 'textarea'; else if (rules.format === 'EMAIL') control = 'email'; else if (rules.format === 'URL') control = 'url'; else if (rules.format === 'PHONE') control = 'phone'; }
    var options = Array.isArray(comp.options) ? comp.options : [];
    return {
      target: input.target || '', label: plainText(comp.label) || input.target, control: control, required: !!input.required,
      hidden: raw.hidden === true, placeholder: comp.placeholder || '', description: comp.description ? plainText(comp.description) : '',
      choices: options.map(function (o) { return { value: String(o.value), label: String(o.label || o.value) }; }),
      inputType: inputType, identifier: identifier, validation: { minLength: rules.minLength, maxLength: rules.maxLength }
    };
  };
  var toForm = function (raw) {
    var steps = (raw.steps || []).filter(function (s) { return !s.hidden; }), placed = {}, i = 0;
    steps.forEach(function (s) { var items = ((s.layout && (s.layout.large || s.layout.small) || {}).items || []).slice().sort(function (a, b) { return a.row - b.row || a.column - b.column; }); items.forEach(function (it) { placed[it.fieldId] = i++; }); });
    var fields = (raw.formFields || []).filter(function (f) { return f.fieldType === 'INPUT'; })
      .map(function (f) { return { f: f, o: placed[rid(f)] === undefined ? Infinity : placed[rid(f)] }; })
      .sort(function (a, b) { return a.o - b.o; }).map(function (x) { return toField(x.f); }).filter(function (f) { return !f.hidden; });
    var submit = (raw.formFields || []).find(function (f) { return f.identifier === 'SUBMIT_BUTTON'; });
    var nav = submit && submit.displayOptions && submit.displayOptions.pageNavigationOptions || {};
    var s = raw.submitSettings || {}, success = { action: s.submitSuccessAction || 'NO_ACTION' };
    if (success.action === 'THANK_YOU_MESSAGE') success.message = plainText(s.thankYouMessageOptions && s.thankYouMessageOptions.richContent);
    if (success.action === 'REDIRECT' && s.redirectOptions && s.redirectOptions.redirectUrl) success.url = 'https://' + String(s.redirectOptions.redirectUrl).replace(/^https?:\/\//, '');
    var lim = raw.limitationRule || {}, deadline = lim.dateTimeDeadline ? new Date(lim.dateTimeDeadline) : null;
    var enabled = raw.enabled != null ? raw.enabled !== false : !(raw.properties && raw.properties.disabled);
    return { id: rid(raw), fields: fields, submitText: nav.submitText || '', success: success, closed: !enabled || (deadline && deadline <= new Date()), disabledMessage: plainText(raw.disabledFormMessage) };
  };

  // ---- validation and the submit (submissions-core.ts) ----
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]*[a-zA-Z][^\s@]*$/;
  var requiredMessage = function (f) {
    switch (f.identifier) { case 'CONTACTS_FIRST_NAME': return 'Enter a first name.'; case 'CONTACTS_LAST_NAME': return 'Enter a last name.'; case 'CONTACTS_COMPANY': return 'Enter a company name.'; }
    switch (f.control) { case 'email': return 'Enter an email address like example@mysite.com.'; case 'phone': return 'Enter a phone number.'; case 'select': case 'radio': case 'checkboxGroup': case 'tags': return 'Choose an option.'; case 'checkbox': return 'Check the box to continue.'; default: return 'Enter an answer.'; }
  };
  var valueOf = function (form, f) {
    if (f.control === 'checkboxGroup' || f.control === 'tags') return $$('.chip[aria-pressed="true"]', form.querySelector('[data-target="' + f.target + '"]')).map(function (c) { return c.getAttribute('data-value'); });
    if (f.control === 'select' || f.control === 'radio') { var on = form.querySelector('[data-target="' + f.target + '"] .chip[aria-pressed="true"]'); return on ? on.getAttribute('data-value') : ''; }
    if (f.control === 'checkbox') { var cb = form.querySelector('[name="' + f.target + '"]'); return !!(cb && cb.checked); }
    var el = form.querySelector('[name="' + f.target + '"]'); return el ? el.value.trim() : '';
  };
  var check = function (f, v) {
    var empty = v === '' || v === false || (Array.isArray(v) && !v.length);
    if (empty) return f.required ? requiredMessage(f) : '';
    if (f.control === 'email' && !EMAIL.test(v)) return 'Enter an email address like example@mysite.com.';
    if (f.validation.minLength && String(v).length < f.validation.minLength) return 'Enter at least ' + f.validation.minLength + ' characters.';
    if (f.validation.maxLength && String(v).length > f.validation.maxLength) return 'Enter less than ' + f.validation.maxLength + ' characters.';
    return '';
  };
  var toValues = function (form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var v = valueOf(form, f);
      if (Array.isArray(v)) { if (v.length) out[f.target] = v; return; }
      if (f.control === 'checkbox') { if (v === true) out[f.target] = true; return; }
      if (v === '') return;
      out[f.target] = f.control === 'number' ? Number(v) : f.control === 'phone' ? String(v).replace(/[^0-9+]/g, '') : v;
    });
    return out;
  };
  var OK = { CONFIRMED: 1, PENDING: 1, PAYMENT_WAITING: 1 };
  var serverErrors = function (err) {
    var out = {}, v = ((err.details || {}).validationError || {}).fieldViolations || [];
    v.forEach(function (x) { ((x.data && x.data.errors) || [x]).forEach(function (e) { if (e.errorPath) out[e.errorPath.split('/')[0]] = e.useCustomErrorMessage && e.errorMessage ? e.errorMessage : e.errorType === 'REQUIRED_VALUE_ERROR' ? 'This is required.' : 'Please check this answer.'; }); });
    return out;
  };

  // ---- rendering ----
  var mark = function (f) { return f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''; };
  var fieldHtml = function (f, i) {
    var id = 'wf-' + f.target, err = '<p class="err" id="err-' + f.target + '" aria-live="polite"></p>', help = f.description ? '<p class="help">' + esc(f.description) + '</p>' : '';
    if (f.control === 'select' || f.control === 'radio' || f.control === 'checkboxGroup' || f.control === 'tags') {
      var multi = f.control === 'checkboxGroup' || f.control === 'tags';
      return '<fieldset class="field" data-target="' + f.target + '"><legend>' + esc(f.label) + mark(f) + '</legend>' + help + '<div class="chips"' + (multi ? ' data-multi' : '') + ' role="' + (multi ? 'group' : 'radiogroup') + '">' +
        f.choices.map(function (c) { return '<button type="button" class="chip" aria-pressed="false" data-value="' + esc(c.value) + '">' + esc(c.label) + '</button>'; }).join('') + '</div>' + err + '</fieldset>';
    }
    if (f.control === 'checkbox') return '<div class="field check"><label><input type="checkbox" name="' + f.target + '" aria-describedby="err-' + f.target + '"> ' + esc(f.label) + mark(f) + '</label>' + err + '</div>';
    var type = { email: 'email', phone: 'tel', url: 'url', number: 'number', date: 'date' }[f.control] || 'text';
    var auto = { CONTACTS_FIRST_NAME: 'given-name', CONTACTS_LAST_NAME: 'family-name', CONTACTS_EMAIL: 'email', CONTACTS_PHONE: 'tel', CONTACTS_COMPANY: 'organization' }[f.identifier] || 'off';
    var ctl = f.control === 'textarea'
      ? '<textarea id="' + id + '" name="' + f.target + '" rows="3" aria-describedby="err-' + f.target + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '></textarea>'
      : '<input id="' + id + '" name="' + f.target + '" type="' + type + '" autocomplete="' + auto + '" aria-describedby="err-' + f.target + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>';
    return '<div class="field"><label for="' + id + '">' + esc(f.label) + mark(f) + '</label>' + ctl + help + err + '</div>';
  };
  var showError = function (form, target, msg) {
    var p = form.querySelector('#err-' + CSS.escape(target)); if (p) p.textContent = msg || '';
    var el = form.querySelector('[name="' + target + '"]'); if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  var thankYou = function (form, success) {
    var box = document.createElement('div'); box.className = 'thanks'; box.setAttribute('role', 'status'); box.tabIndex = -1;
    var msg = success.message || 'Thank you. Your message is on its way to Banke.';
    box.innerHTML = '<span class="kick">Sent</span>' + msg.split(/\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    form.replaceWith(box); box.focus();
  };

  $$('form[data-form-id]').forEach(function (form) {
    var slot = form.querySelector('.wf-fields'), btn = form.querySelector('[type="submit"]'), note = form.querySelector('.note'), def = null;
    wixRequest('/form-schema-service/v4/forms/' + encodeURIComponent(form.getAttribute('data-form-id')), 'GET').then(function (res) {
      if (!res.form) throw new Error('not found');
      def = toForm(res.form);
      if (def.closed) { form.innerHTML = '<p class="lede">' + esc(def.disabledMessage || 'This form is no longer accepting responses.') + '</p>'; return; }
      slot.innerHTML = def.fields.map(fieldHtml).join('');
      if (def.submitText && btn) btn.firstChild.nodeValue = def.submitText + ' ';
      if (btn) btn.disabled = false;
      $$('.chips', slot).forEach(function (g) {
        var multi = g.hasAttribute('data-multi');
        $$('.chip', g).forEach(function (c) { c.addEventListener('click', function () {
          if (multi) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
          else $$('.chip', g).forEach(function (o) { o.setAttribute('aria-pressed', o === c ? (c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true') : 'false'); });
          var f = def.fields.find(function (x) { return x.target === g.parentNode.getAttribute('data-target'); }); if (f && form.dataset.tried) showError(form, f.target, check(f, valueOf(form, f)));
        }); });
      });
      def.fields.forEach(function (f) {
        var el = form.querySelector('[name="' + f.target + '"]'); if (!el) return;
        // Errors appear on blur and clear while typing, so a click right after leaving a field never lands on shifted layout.
        el.addEventListener('blur', function () { if (el.value || form.dataset.tried) { var m = check(f, valueOf(form, f)); if (m) showError(form, f.target, m); } });
        el.addEventListener('input', function () { if (!check(f, valueOf(form, f))) showError(form, f.target, ''); });
      });
    }).catch(function () {
      slot.innerHTML = '<p class="lede">The form didn’t load. Please write to <a href="mailto:bankebalogun@gmail.com">bankebalogun@gmail.com</a> instead.</p>';
      if (btn) btn.hidden = true;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!def) return;
      form.dataset.tried = '1';
      var first = null;
      def.fields.forEach(function (f) { var m = check(f, valueOf(form, f)); showError(form, f.target, m); if (m && !first) first = f; });
      if (first) { var el = form.querySelector('[name="' + first.target + '"], [data-target="' + first.target + '"] .chip'); if (el) el.focus(); if (note) note.textContent = ''; return; }
      btn.disabled = true; if (note) note.textContent = 'Sending…';
      wixRequest('/form-submission-service/v4/submissions', 'POST', { submission: { formId: def.id, submissions: toValues(form, def.fields) } }).then(function (res) {
        var sub = res.submission || res;
        if (!(sub && (sub.id || sub._id)) || !OK[sub.status]) throw new Error('not created');
        if (def.success.url) { location.assign(def.success.url); return; }
        thankYou(form, def.success);
      }).catch(function (err) {
        btn.disabled = false;
        var errs = serverErrors(err), keys = Object.keys(errs);
        keys.forEach(function (k) { showError(form, k, errs[k]); });
        var code = ((err.details || {}).applicationError || {}).code;
        if (note) note.textContent = keys.length ? 'Please check the highlighted answers.' : code === 'INVALID_CAPTCHA' ? 'The spam check did not pass. Please try again.' : 'Something went wrong sending your message. Please try again, or write to bankebalogun@gmail.com.';
      });
    });
  });
})();
