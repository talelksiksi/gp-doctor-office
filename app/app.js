/* ═══════════════════════════════════════════════════════════
   Mon Cabinet — par CICTNA RDC
   Une seule application, deux modes :
   · « local »  : lancée sur le PC du cabinet, les données vivent dans data/donnees.json
   · « démo »   : en ligne, patients fictifs, données gardées dans le navigateur
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Outils ── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = (iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => iso ? new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', opts) : '—';
const fmtLong = iso => fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const age = iso => { if (!iso) return ''; const b = new Date(iso + 'T12:00:00'), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const initials = p => ((p.prenom || ' ')[0] + (p.nom || ' ')[0]).toUpperCase();
const fullName = p => p ? `${p.prenom} ${p.nom}`.trim() : '';
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ══════════════ Stockage ══════════════ */
const Store = {
  mode: 'demo',
  data: null,
  async load() {
    try {
      const r = await fetch('api/db', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) { this.mode = 'local'; this.data = await r.json(); this._fill(); return; }
    } catch { /* pas de serveur local : mode démo */ }
    this.mode = 'demo';
    try { this.data = JSON.parse(localStorage.getItem('cm_demo')); } catch { this.data = null; }
    if (!this.data || this.data.meta?.version !== 3) this.data = DemoData.build();
    this._fill();
    this._persistDemo();
  },
  _fill() {
    for (const k of ['patients', 'antecedents', 'visites', 'mesures', 'ordonnances', 'rdv', 'medicaments', 'modeles', 'motifs', 'documents']) this.data[k] = this.data[k] || [];
    this.data.settings = { titre: 'Docteur', prenom: '', nom: '', specialite: 'Médecine générale', adresse: '', ville: '', tel: '', pin: '1234', taillePolice: 1,
      nomAr: '', titreAr: 'الحكيم', specialiteAr: 'طب عام', diplomesFr: '', diplomesAr: '', ordre: '', cnam: '', mf: '', telFixe: '', telMobile: '', email: '',
      adresseFooterFr: '', adresseFooterAr: '', lieuFr: '', lieuAr: '', enteteImprime: true, ...(this.data.settings || {}) };
  },
  _persistDemo() { try { localStorage.setItem('cm_demo', JSON.stringify(this.data)); } catch { } },
  async save(...collections) {
    if (this.mode === 'demo') { this._persistDemo(); return true; }
    try {
      const body = {}; collections.forEach(c => body[c] = this.data[c]);
      const r = await fetch('api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      return true;
    } catch {
      UI.alert('Enregistrement impossible', 'Le programme du cabinet ne répond plus. Vérifiez que la fenêtre noire « Mon Cabinet » est toujours ouverte, puis réessayez.');
      return false;
    }
  },
  nextId(c) { return this.data[c].reduce((m, x) => Math.max(m, x.id || 0), 0) + 1; },
  get s() { return this.data.settings; },
  patient(id) { return this.data.patients.find(p => p.id == id); },
  visitsOf(pid) { return this.data.visites.filter(v => v.patientId == pid).sort((a, b) => b.date.localeCompare(a.date)); },
  lastVisit(pid) { return this.visitsOf(pid)[0]; },
  rxOf(vid) { return this.data.ordonnances.find(o => o.visiteId == vid); },
};

/* ══════════════ Interface commune ══════════════ */
const UI = {
  toast(msg) {
    const t = $('#toast');
    t.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${esc(msg)}`;
    t.classList.remove('hidden');
    clearTimeout(this._t); this._t = setTimeout(() => t.classList.add('hidden'), 3200);
  },
  dialog(title, bodyHtml, actions) {
    $('#dialog-title').textContent = title;
    $('#dialog-body').innerHTML = bodyHtml;
    const box = $('#dialog-actions'); box.innerHTML = '';
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn btn-big ' + (a.cls || '');
      b.innerHTML = a.label;
      b.onclick = async () => { if (a.onClick && (await a.onClick()) === false) return; this.close(); };
      box.appendChild(b);
    });
    $('#dialog').classList.remove('hidden');
    setTimeout(() => ($('#dialog-body input, #dialog-body textarea, #dialog-body select') || box.lastChild).focus(), 50);
  },
  close() { $('#dialog').classList.add('hidden'); },
  confirm(title, text, okLabel, onOk) {
    this.dialog(title, `<p style="font-size:1.1rem">${text}</p>`, [
      { label: 'Non, annuler' },
      { label: okLabel, cls: 'btn-danger', onClick: onOk },
    ]);
  },
  alert(title, text) { this.dialog(title, `<p style="font-size:1.1rem">${esc(text)}</p>`, [{ label: 'Compris', cls: 'btn-primary' }]); },
  setScale(v) {
    v = Math.min(1.5, Math.max(0.85, Math.round(v * 100) / 100));
    document.documentElement.style.setProperty('--scale', v);
    try { localStorage.setItem('cm_scale', v); } catch { }
  },
  avatar(p, cls = 'avatar') { return `<div class="${cls} ${p?.sexe === 'F' ? 'f' : ''}">${p ? esc(initials(p)) : '<i class="fa-solid fa-user"></i>'}</div>`; },
  field(id, label, value = '', { type = 'text', full = false, placeholder = '', hint = '', list = '', attrs = '' } = {}) {
    const input = type === 'textarea'
      ? `<textarea id="${id}" placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>`
      : `<input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${list ? `list="${list}"` : ''} ${attrs}/>`;
    return `<div class="field ${full ? 'full' : ''}"><label for="${id}">${label}${hint ? ` <small>${hint}</small>` : ''}</label>${input}</div>`;
  },
};

/* ══════════════ Connexion par code ══════════════ */
const Auth = {
  pin: '',
  init() {
    const s = Store.s;
    $('#login-hello').textContent = `Bonjour ${s.titre || 'Docteur'}${s.nom ? ' ' + s.nom : ''}`;
    $('#login-demo').classList.toggle('hidden', Store.mode !== 'demo');
    $$('#keypad button').forEach(b => b.addEventListener('click', () => this.key(b.dataset.k)));
    document.addEventListener('keydown', e => {
      if ($('#login').classList.contains('hidden')) return;
      if (/^\d$/.test(e.key)) this.key(e.key);
      else if (e.key === 'Backspace') this.key('del');
      else if (e.key === 'Enter') this.key('ok');
    });
    let ok = false; try { ok = sessionStorage.getItem('cm_open') === '1'; } catch { }
    if (ok) this.open(); else this.render();
  },
  key(k) {
    $('#login-error').textContent = '';
    if (k === 'del') this.pin = this.pin.slice(0, -1);
    else if (k === 'ok') return this.check();
    else if (this.pin.length < 6) this.pin += k;
    this.render();
    if (this.pin.length === String(Store.s.pin).length) setTimeout(() => this.check(), 120);
  },
  render() { $$('#pin-dots span').forEach((d, i) => d.classList.toggle('on', i < this.pin.length)); },
  check() {
    if (this.pin === String(Store.s.pin)) { this.pin = ''; this.render(); this.open(); return; }
    this.pin = ''; this.render();
    $('#login-error').textContent = 'Code incorrect, réessayez';
    const d = $('#pin-dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
  },
  open() {
    try { sessionStorage.setItem('cm_open', '1'); } catch { }
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#demo-banner').classList.toggle('hidden', Store.mode !== 'demo');
    Router.go();
  },
  close() {
    try { sessionStorage.removeItem('cm_open'); } catch { }
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
    UI.close();
  },
};

/* ══════════════ Navigation ══════════════ */
const Router = {
  go() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'accueil').split('/');
    const [page, a, b] = parts;
    const navKey = ['patient', 'consultation', 'document'].includes(page) ? 'patients' : page;
    $$('.nav a').forEach(n => n.classList.toggle('active', n.dataset.nav === navKey));
    const main = $('#main');
    window.scrollTo(0, 0);
    const views = {
      accueil: () => Views.home(),
      patients: () => Views.patients(),
      patient: () => a === 'nouveau' ? Views.patientForm(null) : b === 'modifier' ? Views.patientForm(a) : Views.patient(a),
      consultation: () => a === 'nouvelle' ? Views.consultation(null, b) : Views.consultation(a),
      document: () => Views.document(a, b),
      agenda: () => Views.agenda(a || todayISO()),
      reglages: () => Views.settings(),
    };
    main.innerHTML = '';
    (views[page] || views.accueil)();
    main.focus({ preventScroll: true });
  },
};

/* ══════════════ Écrans ══════════════ */
const Views = {
  /* ── Accueil ── */
  home() {
    const s = Store.s, d = Store.data, today = todayISO();
    const h = new Date().getHours();
    const rdvs = d.rdv.filter(r => r.date === today).sort((x, y) => x.heure.localeCompare(y.heure));
    const visitsToday = d.visites.filter(v => v.date.startsWith(today));
    const waiting = rdvs.filter(r => r.present && !visitsToday.some(v => v.patientId && v.patientId == r.patientId)).length;
    $('#main').innerHTML = `
      <div class="hello">
        <h1>${h < 13 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'} ${esc(s.titre)} ${esc(s.nom)}</h1>
        <p>${fmtLong(today)}</p>
      </div>
      <div class="tiles">
        <a class="tile" href="#/patients"><i class="fa-solid fa-magnifying-glass"></i><strong>Chercher un patient</strong><span>Par nom ou téléphone</span></a>
        <a class="tile green" href="#/patient/nouveau"><i class="fa-solid fa-user-plus"></i><strong>Nouveau patient</strong><span>Créer un dossier</span></a>
        <a class="tile dawn" href="#/agenda"><i class="fa-solid fa-calendar-days"></i><strong>Agenda</strong><span>${rdvs.length} rendez-vous aujourd'hui</span></a>
      </div>
      <div class="stat-row">
        <div class="stat"><b>${visitsToday.length}</b><span>consultation${visitsToday.length > 1 ? 's' : ''} aujourd'hui</span></div>
        <div class="stat"><b>${waiting}</b><span>patient${waiting > 1 ? 's' : ''} en salle d'attente</span></div>
        <div class="stat"><b>${d.patients.length.toLocaleString('fr-FR')}</b><span>dossiers patients</span></div>
      </div>
      <div class="card">
        <div class="card-head"><h2><i class="fa-solid fa-clock"></i> Rendez-vous d'aujourd'hui</h2><a class="btn btn-sm" href="#/agenda"><i class="fa-solid fa-plus"></i> Ajouter</a></div>
        <div class="list">${rdvs.length ? rdvs.map(r => Views._rdvRow(r)).join('') : '<p class="empty">Aucun rendez-vous aujourd\'hui.</p>'}</div>
      </div>
      <div class="card">
        <h2><i class="fa-solid fa-clock-rotate-left"></i> ${d.visites.length ? 'Derniers patients vus' : 'Derniers dossiers'}</h2>
        <div class="list">${Views._recentPatients(5)}</div>
      </div>`;
    Views._bindRdvRows();
  },

  _recentPatients(n) {
    const seen = new Set(), out = [];
    for (const v of [...Store.data.visites].sort((a, b) => b.date.localeCompare(a.date))) {
      if (seen.has(v.patientId)) continue; seen.add(v.patientId);
      const p = Store.patient(v.patientId); if (!p) continue;
      out.push(Views._patientRow(p, `Vu le ${fmtDate(v.date)} · ${esc(v.motif || '')}`));
      if (out.length >= n) break;
    }
    // Pas encore assez de consultations : on complète avec les derniers dossiers créés
    if (out.length < n) [...Store.data.patients].sort((a, b) => b.id - a.id).forEach(p => {
      if (out.length >= n || seen.has(p.id)) return;
      seen.add(p.id); out.push(Views._patientRow(p));
    });
    return out.join('') || '<p class="empty">Aucun patient pour le moment.</p>';
  },

  _patientRow(p, sub) {
    return `<a class="row" href="#/patient/${p.id}">${UI.avatar(p)}<div class="grow"><div class="name">${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</div><div class="sub">${sub ?? `${age(p.naissance)} ans · ${esc(p.tel || 'pas de téléphone')}`}</div></div><i class="fa-solid fa-chevron-right muted"></i></a>`;
  },

  _rdvRow(r) {
    const p = r.patientId ? Store.patient(r.patientId) : null;
    const name = p ? `${esc(p.nom.toUpperCase())} ${esc(p.prenom)}` : esc(r.nom || 'Patient');
    const seen = p && Store.data.visites.some(v => v.patientId == p.id && v.date.startsWith(r.date));
    return `<div class="row ${seen ? 'done' : ''}" data-rdv="${r.id}">
      <div class="time">${esc(r.heure)}</div>
      <div class="grow"><div class="name">${name}</div><div class="sub">${esc(r.motif || '')}</div></div>
      ${seen ? '<span class="pill green"><i class="fa-solid fa-check"></i> Vu</span>'
        : r.present ? '<span class="pill dawn"><i class="fa-solid fa-couch"></i> En salle d\'attente</span>'
        : `<button class="btn btn-sm" data-arrive="${r.id}"><i class="fa-solid fa-door-open"></i> Arrivé</button>`}
    </div>`;
  },

  _bindRdvRows() {
    $$('[data-arrive]').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation();
      const r = Store.data.rdv.find(x => x.id == b.dataset.arrive); r.present = true;
      await Store.save('rdv'); UI.toast('Patient en salle d\'attente'); Router.go();
    }));
    $$('[data-rdv]').forEach(row => row.addEventListener('click', () => {
      const r = Store.data.rdv.find(x => x.id == row.dataset.rdv);
      if (r.patientId) location.hash = `#/patient/${r.patientId}`;
      else UI.dialog('Patient sans dossier', `<p style="font-size:1.1rem">${esc(r.nom)} n'a pas encore de dossier. Voulez-vous le créer maintenant ?</p>`, [
        { label: 'Plus tard' },
        { label: '<i class="fa-solid fa-user-plus"></i> Créer le dossier', cls: 'btn-primary', onClick: () => { Views._pendingRdv = r.id; location.hash = '#/patient/nouveau'; } },
      ]);
    }));
  },

  /* ── Liste des patients ── */
  patients() {
    $('#main').innerHTML = `
      <div class="page-head"><div><h1>Patients</h1><p>${Store.data.patients.length.toLocaleString('fr-FR')} dossiers</p></div>
        <a class="btn btn-green btn-big" href="#/patient/nouveau"><i class="fa-solid fa-user-plus"></i> Nouveau patient</a></div>
      <div class="search-big"><i class="fa-solid fa-magnifying-glass"></i><input id="q" type="search" placeholder="Tapez un nom, un prénom ou un téléphone…" autocomplete="off"/></div>
      <div id="results" class="list"></div>`;
    const q = $('#q'), res = $('#results');
    const run = () => {
      const t = norm(q.value.trim());
      if (!t) { res.innerHTML = `<h2 style="font-size:1.15rem;margin:.3rem 0 .4rem" class="muted">${Store.data.visites.length ? 'Derniers patients vus' : 'Derniers dossiers'}</h2>${Views._recentPatients(12)}`; return; }
      const words = t.split(/\s+/);
      const list = Store.data.patients.filter(p => {
        const hay = norm(`${p.nom} ${p.prenom} ${p.tel} ${p.tel2}`).replace(/\s+/g, ' ');
        const digits = (p.tel + ' ' + p.tel2).replace(/\D/g, '');
        return words.every(w => hay.includes(w) || (/\d/.test(w) && digits.includes(w.replace(/\D/g, ''))));
      }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).slice(0, 60);
      res.innerHTML = list.length ? list.map(p => Views._patientRow(p)).join('')
        : `<div class="card empty">Aucun patient trouvé pour « ${esc(q.value)} ».<br><br><a class="btn btn-green" href="#/patient/nouveau"><i class="fa-solid fa-user-plus"></i> Créer un nouveau dossier</a></div>`;
    };
    q.addEventListener('input', run);
    run(); q.focus();
  },

  /* ── Dossier patient ── */
  patient(id) {
    const p = Store.patient(id);
    if (!p) { $('#main').innerHTML = '<p class="empty">Ce dossier n\'existe pas.</p>'; return; }
    const d = Store.data;
    const antes = d.antecedents.filter(a => a.patientId == id);
    const allergies = antes.filter(a => a.type === 'Allergies');
    const visits = Store.visitsOf(id);
    const groups = ['Allergies', 'Médicaux', 'Chirurgicaux', 'Familiaux', 'Autres'];
    const nextRdv = d.rdv.filter(r => r.patientId == id && r.date >= todayISO()).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))[0];
    $('#main').innerHTML = `
      <a class="back" href="#/patients"><i class="fa-solid fa-arrow-left"></i> Retour à la liste</a>
      <div class="card">
        <div class="patient-head">
          ${UI.avatar(p)}
          <div style="flex:1;min-width:14rem">
            <h1>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</h1>
            <div class="facts">
              <span><i class="fa-solid fa-cake-candles"></i> ${age(p.naissance)} ans (${fmtDate(p.naissance)})</span>
              <span><i class="fa-solid fa-${p.sexe === 'F' ? 'venus' : 'mars'}"></i> ${p.sexe === 'F' ? 'Femme' : 'Homme'}</span>
              ${p.tel ? `<span><i class="fa-solid fa-phone"></i> ${esc(p.tel)}</span>` : ''}
              ${p.assurance ? `<span><i class="fa-solid fa-id-card"></i> ${esc(p.assurance)}</span>` : ''}
            </div>
          </div>
          <div class="btn-row">
            <a class="btn btn-primary btn-big" href="#/consultation/nouvelle/${p.id}"><i class="fa-solid fa-notes-medical"></i> Nouvelle consultation</a>
          </div>
        </div>
        <div class="btn-row" style="margin-top:1rem">
          <a class="btn" href="#/patient/${p.id}/modifier"><i class="fa-solid fa-pen"></i> Modifier la fiche</a>
          <button class="btn" id="btn-rdv"><i class="fa-solid fa-calendar-plus"></i> Donner un rendez-vous</button>
          <button class="btn" id="btn-cert"><i class="fa-solid fa-file-signature"></i> Documents et certificats</button>
          ${visits[0] && Store.rxOf(visits[0].id) ? `<button class="btn" id="btn-renew"><i class="fa-solid fa-rotate"></i> Renouveler la dernière ordonnance</button>` : ''}
        </div>
        ${nextRdv ? `<p style="margin-top:.9rem" class="muted"><i class="fa-solid fa-calendar-check"></i> Prochain rendez-vous : <b>${fmtLong(nextRdv.date)} à ${esc(nextRdv.heure)}</b></p>` : ''}
      </div>
      ${allergies.length ? `<div class="alert"><i class="fa-solid fa-triangle-exclamation"></i><div>ATTENTION — ${allergies.map(a => esc(a.texte)).join(' · ')}</div></div>` : ''}
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h2><i class="fa-solid fa-book-medical"></i> Antécédents</h2><button class="btn btn-sm" id="btn-ante"><i class="fa-solid fa-plus"></i> Ajouter</button></div>
          ${antes.length ? groups.filter(g => antes.some(a => a.type === g)).map(g => `
            <div class="ante-group"><h3>${g}</h3>${antes.filter(a => a.type === g).map(a => `
              <div class="ante-item"><div><b>${esc(a.texte)}</b>${a.traitement || a.periode ? `<small>${esc([a.traitement, a.periode].filter(Boolean).join(' · '))}</small>` : ''}</div>
              <button class="icon-del" data-del-ante="${a.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button></div>`).join('')}</div>`).join('')
            : '<p class="muted">Aucun antécédent noté.</p>'}
          ${p.remarques ? `<p style="margin-top:.6rem"><b>Remarques :</b> ${esc(p.remarques)}</p>` : ''}
        </div>
        <div class="card">
          <h2><i class="fa-solid fa-heart-pulse"></i> Dernières mesures</h2>
          ${Views._measures(id)}
        </div>
      </div>
      <div class="card">
        <h2><i class="fa-solid fa-clock-rotate-left"></i> Consultations (${visits.length})</h2>
        ${visits.length ? visits.map(v => Views._visitCard(v)).join('') : '<p class="muted">Aucune consultation. Cliquez sur « Nouvelle consultation » pour commencer.</p>'}
      </div>
      ${Views._docsList(p)}
      <div class="card">
        <h2><i class="fa-solid fa-address-card"></i> Coordonnées</h2>
        <div class="grid-2">
          <div><p><b>Adresse :</b> ${esc(p.adresse || '—')}</p><p><b>Téléphone 2 :</b> ${esc(p.tel2 || '—')}</p><p><b>Profession :</b> ${esc(p.profession || '—')}</p></div>
          <div><p><b>État civil :</b> ${esc(p.etatCivil || '—')}</p><p><b>N° assuré :</b> ${esc(p.nss || '—')}</p><p><b>CIN :</b> ${esc(p.cin || '—')}</p><p><b>Né(e) à :</b> ${esc(p.lieuNaissance || '—')}</p><p><b>Dossier créé le :</b> ${fmtDate(p.creeLe)}</p></div>
        </div>
        <div class="btn-row" style="margin-top:1rem"><button class="btn btn-danger" id="btn-del-patient"><i class="fa-solid fa-trash"></i> Supprimer ce dossier</button></div>
      </div>`;

    $('#btn-rdv').onclick = () => Views.rdvDialog({ patientId: p.id });
    $('#btn-cert').onclick = () => Docs.chooser(p);
    $$('[data-reprint]').forEach(b => b.onclick = () => Docs.reprint(b.dataset.reprint));
    $('#btn-ante').onclick = () => Views.anteDialog(p.id);
    if ($('#btn-renew')) $('#btn-renew').onclick = () => { Views._renewFrom = Store.rxOf(visits[0].id); location.hash = `#/consultation/nouvelle/${p.id}`; };
    $$('[data-del-ante]').forEach(b => b.onclick = () => UI.confirm('Supprimer l\'antécédent ?', 'Cet antécédent sera retiré du dossier.', 'Oui, supprimer', async () => {
      d.antecedents = d.antecedents.filter(a => a.id != b.dataset.delAnte); await Store.save('antecedents'); UI.toast('Antécédent supprimé'); Router.go();
    }));
    $$('[data-print-rx]').forEach(b => b.onclick = () => Docs.printPrescription(Store.data.visites.find(v => v.id == b.dataset.printRx)));
    $('#btn-del-patient').onclick = () => UI.confirm('Supprimer ce dossier ?', `Le dossier de <b>${esc(fullName(p))}</b> et toutes ses consultations seront effacés définitivement.`, 'Oui, supprimer', async () => {
      const vids = new Set(Store.visitsOf(p.id).map(v => v.id));
      d.patients = d.patients.filter(x => x.id != p.id);
      d.visites = d.visites.filter(v => v.patientId != p.id);
      d.ordonnances = d.ordonnances.filter(o => !vids.has(o.visiteId));
      d.mesures = d.mesures.filter(m => m.patientId != p.id);
      d.antecedents = d.antecedents.filter(a => a.patientId != p.id);
      d.rdv = d.rdv.filter(r => r.patientId != p.id);
      await Store.save('patients', 'visites', 'ordonnances', 'mesures', 'antecedents', 'rdv');
      UI.toast('Dossier supprimé'); location.hash = '#/patients';
    });
  },

  _docsList(p) {
    const docs = Store.data.documents.filter(x => x.patientId == p.id).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    if (!docs.length) return '';
    return `<div class="card"><h2><i class="fa-solid fa-file-signature"></i> Documents remis (${docs.length})</h2><div class="list">${docs.slice(0, 12).map(x => `
      <div class="row" style="cursor:default"><i class="fa-solid ${Docs.TYPES[x.type]?.icon || 'fa-file'} muted" style="font-size:1.3rem;width:2rem;text-align:center"></i>
        <div class="grow"><div class="name">${esc(Docs.TYPES[x.type]?.titre || x.type)}</div><div class="sub">${fmtDate(x.date)}</div></div>
        <button class="btn btn-sm" data-reprint="${x.id}"><i class="fa-solid fa-print"></i> Réimprimer</button></div>`).join('')}</div></div>`;
  },

  _measures(pid) {
    const types = [['TA', 'Tension', 'mmHg'], ['Pouls', 'Pouls', '/min'], ['Poids', 'Poids', 'kg'], ['Glycémie', 'Glycémie', 'g/l'], ['Température', 'Température', '°C'], ['Taille', 'Taille', 'cm']];
    const ms = Store.data.mesures.filter(m => m.patientId == pid).sort((a, b) => b.date.localeCompare(a.date));
    const cards = types.map(([t, label, unit]) => {
      const list = ms.filter(m => m.type === t); if (!list.length) return '';
      const [last, prev] = list;
      let trend = '';
      if (prev && t !== 'TA') { const dlt = parseFloat(last.valeur) - parseFloat(prev.valeur); if (Math.abs(dlt) > 0.001) trend = `<span class="trend">${dlt > 0 ? '▲' : '▼'} ${Math.abs(dlt).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>`; }
      return `<div class="measure"><span>${label}</span><b>${esc(last.valeur)}</b> <small style="display:inline">${unit}</small>${trend}<small>le ${fmtDate(last.date, { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>`;
    }).join('');
    return cards ? `<div class="measures">${cards}</div>` : '<p class="muted">Aucune mesure enregistrée.</p>';
  },

  _visitCard(v) {
    const rx = Store.rxOf(v.id);
    return `<div class="visit">
      <div class="visit-head">
        <div><span class="visit-date">${fmtLong(v.date)}</span> ${v.date.length > 10 ? `<span class="muted">à ${v.date.slice(11, 16)}</span>` : ''}</div>
        <div class="btn-row">
          ${rx && rx.lignes.length ? `<button class="btn btn-sm" data-print-rx="${v.id}"><i class="fa-solid fa-print"></i> Ordonnance</button>` : ''}
          <a class="btn btn-sm" href="#/consultation/${v.id}"><i class="fa-solid fa-pen"></i> Ouvrir</a>
        </div>
      </div>
      ${v.motif ? `<p><b>Motif :</b> ${esc(v.motif)}</p>` : ''}
      ${v.conclusions ? `<p><b>Conclusion :</b> ${esc(v.conclusions)}</p>` : ''}
      ${rx && rx.lignes.length ? `<div class="visit-meds">${esc(Docs.rxText(rx)).replace(/\n/g, '<br>')}</div>` : ''}
    </div>`;
  },

  anteDialog(pid) {
    UI.dialog('Ajouter un antécédent', `
      <div class="form">
        <div class="field full"><label>Type</label><div class="seg" id="ante-type">
          ${['Médicaux', 'Allergies', 'Chirurgicaux', 'Familiaux', 'Autres'].map((t, i) => `<label><input type="radio" name="at" value="${t}" ${i ? '' : 'checked'}/> ${t}</label>`).join('')}
        </div></div>
        ${UI.field('ante-texte', 'Antécédent', '', { full: true, placeholder: 'Ex : Hypertension artérielle, allergie à la pénicilline…' })}
        ${UI.field('ante-trait', 'Traitement', '', { placeholder: 'Facultatif' })}
        ${UI.field('ante-periode', 'Depuis quand', '', { placeholder: 'Ex : depuis 2015' })}
      </div>`, [
      { label: 'Annuler' },
      { label: '<i class="fa-solid fa-check"></i> Ajouter', cls: 'btn-primary', onClick: async () => {
        const texte = $('#ante-texte').value.trim();
        if (!texte) { $('#ante-texte').focus(); return false; }
        Store.data.antecedents.push({ id: Store.nextId('antecedents'), patientId: +pid, type: $('input[name=at]:checked').value, texte, traitement: $('#ante-trait').value.trim(), periode: $('#ante-periode').value.trim() });
        await Store.save('antecedents'); UI.toast('Antécédent ajouté'); Router.go();
      } },
    ]);
  },

  /* ── Fiche patient (création / modification) ── */
  patientForm(id) {
    const p = id ? Store.patient(id) : { nom: '', prenom: '', sexe: '', naissance: '', tel: '', tel2: '', adresse: '', assurance: 'CNAM', nss: '', cin: '', lieuNaissance: '', profession: '', etatCivil: '', remarques: '' };
    if (!p) { $('#main').innerHTML = '<p class="empty">Ce dossier n\'existe pas.</p>'; return; }
    const pending = !id && Views._pendingRdv ? Store.data.rdv.find(r => r.id === Views._pendingRdv) : null;
    if (pending) { const parts = pending.nom.replace(/^(M\.|Mme|Mlle)\s+/i, '').replace(/\s*\(.*\)$/, '').split(' '); p.prenom = parts.shift() || ''; p.nom = parts.join(' '); if (/^Mme|^Mlle/i.test(pending.nom)) p.sexe = 'F'; }
    $('#main').innerHTML = `
      <a class="back" href="${id ? `#/patient/${id}` : '#/patients'}"><i class="fa-solid fa-arrow-left"></i> Retour</a>
      <div class="page-head"><h1>${id ? 'Modifier la fiche' : 'Nouveau patient'}</h1></div>
      <div class="card"><div class="form">
        ${UI.field('f-nom', 'Nom *', p.nom, { attrs: 'autocapitalize="characters"' })}
        ${UI.field('f-prenom', 'Prénom *', p.prenom)}
        <div class="field"><label>Sexe *</label><div class="seg">
          <label><input type="radio" name="sexe" value="M" ${p.sexe === 'M' ? 'checked' : ''}/> Homme</label>
          <label><input type="radio" name="sexe" value="F" ${p.sexe === 'F' ? 'checked' : ''}/> Femme</label></div></div>
        ${UI.field('f-naissance', 'Date de naissance *', p.naissance, { type: 'date' })}
        ${UI.field('f-tel', 'Téléphone', p.tel, { type: 'tel', placeholder: '+216 …' })}
        ${UI.field('f-tel2', 'Autre téléphone', p.tel2, { type: 'tel' })}
        ${UI.field('f-adresse', 'Adresse', p.adresse, { full: true })}
        <div class="field"><label for="f-assurance">Couverture</label><select id="f-assurance">${['CNAM', 'Assurance privée', 'Sans', ''].map(o => `<option value="${o}" ${p.assurance === o ? 'selected' : ''}>${o || '— Non renseigné —'}</option>`).join('')}${p.assurance && !['CNAM', 'Assurance privée', 'Sans', ''].includes(p.assurance) ? `<option selected>${esc(p.assurance)}</option>` : ''}</select></div>
        ${UI.field('f-cin', 'N° carte d\'identité (CIN)', p.cin, { attrs: 'inputmode="numeric" maxlength="8"' })}
        ${UI.field('f-lieu', 'Lieu de naissance', p.lieuNaissance)}
        ${UI.field('f-nss', 'N° d\'assuré', p.nss)}
        ${UI.field('f-profession', 'Profession', p.profession)}
        <div class="field"><label for="f-etat">État civil</label><select id="f-etat">${['', 'Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'].map(o => `<option value="${o}" ${p.etatCivil === o ? 'selected' : ''}>${o || '— Non renseigné —'}</option>`).join('')}</select></div>
        ${UI.field('f-remarques', 'Remarques', p.remarques, { type: 'textarea', full: true })}
      </div></div>
      <div class="sticky-actions">
        <a class="btn btn-big" href="${id ? `#/patient/${id}` : '#/patients'}">Annuler</a>
        <button class="btn btn-primary btn-big" id="save"><i class="fa-solid fa-check"></i> Enregistrer</button>
      </div>`;
    $('#f-nom').focus();
    $('#save').onclick = async () => {
      const v = {
        nom: $('#f-nom').value.trim(), prenom: $('#f-prenom').value.trim(), sexe: $('input[name=sexe]:checked')?.value || '',
        naissance: $('#f-naissance').value, tel: $('#f-tel').value.trim(), tel2: $('#f-tel2').value.trim(), adresse: $('#f-adresse').value.trim(),
        assurance: $('#f-assurance').value, nss: $('#f-nss').value.trim(), cin: $('#f-cin').value.trim(), lieuNaissance: $('#f-lieu').value.trim(), profession: $('#f-profession').value.trim(), etatCivil: $('#f-etat').value, remarques: $('#f-remarques').value.trim(),
      };
      const missing = [!v.nom && 'le nom', !v.prenom && 'le prénom', !v.sexe && 'le sexe', !v.naissance && 'la date de naissance'].filter(Boolean);
      if (missing.length) { UI.alert('Il manque une information', `Merci d'indiquer ${missing.join(', ')}.`); return; }
      let pid = id;
      if (id) Object.assign(Store.patient(id), v);
      else {
        pid = Store.nextId('patients');
        Store.data.patients.push({ id: pid, ...v, creeLe: todayISO() });
        if (pending) { pending.patientId = pid; pending.nom = ''; Views._pendingRdv = null; }
      }
      if (await Store.save('patients', 'rdv')) { UI.toast(id ? 'Fiche enregistrée' : 'Dossier créé'); location.hash = `#/patient/${pid}`; }
    };
  },

  /* ── Consultation ── */
  consultation(vid, pidNew) {
    const d = Store.data, s = Store.s;
    const v = vid ? d.visites.find(x => x.id == vid) : { patientId: +pidNew, date: `${todayISO()}T${nowTime()}`, motif: '', interrogatoire: '', examen: '', conclusions: '', notes: '' };
    if (!v) { $('#main').innerHTML = '<p class="empty">Consultation introuvable.</p>'; return; }
    const p = Store.patient(v.patientId);
    if (!p) { $('#main').innerHTML = '<p class="empty">Patient introuvable.</p>'; return; }
    const rx = vid ? Store.rxOf(vid) : null;
    let rxInit = rx ? Docs.rxText(rx) : '';
    if (!vid && Views._renewFrom) { rxInit = Docs.rxText(Views._renewFrom); Views._renewFrom = null; if (!v.motif) v.motif = 'Renouvellement ordonnance'; }
    const ms = vid ? d.mesures.filter(m => m.visiteId == vid) : [];
    const mv = t => ms.find(m => m.type === t)?.valeur || '';
    const allergies = d.antecedents.filter(a => a.patientId == p.id && a.type === 'Allergies');
    const prevVisit = Store.visitsOf(p.id).find(x => x.id != vid);

    $('#main').innerHTML = `
      <a class="back" href="#/patient/${p.id}"><i class="fa-solid fa-arrow-left"></i> Retour au dossier</a>
      <div class="page-head"><div><h1>${vid ? 'Consultation' : 'Nouvelle consultation'}</h1><p>${esc(p.nom.toUpperCase())} ${esc(p.prenom)} · ${age(p.naissance)} ans</p></div></div>
      ${allergies.length ? `<div class="alert"><i class="fa-solid fa-triangle-exclamation"></i><div>ATTENTION — ${allergies.map(a => esc(a.texte)).join(' · ')}</div></div>` : ''}
      ${prevVisit ? `<p class="muted" style="margin:-.4rem 0 1rem"><i class="fa-solid fa-clock-rotate-left"></i> Dernière visite le ${fmtDate(prevVisit.date)} : ${esc(prevVisit.conclusions || prevVisit.motif || '')}</p>` : ''}
      <div class="card"><h2><i class="fa-solid fa-comment-medical"></i> Motif et examen</h2><div class="form">
        ${UI.field('c-date', 'Date', v.date.slice(0, 10), { type: 'date' })}
        ${UI.field('c-motif', 'Motif de la visite', v.motif, { list: 'dl-motifs', placeholder: 'Ex : Fièvre, contrôle tension…' })}
        ${UI.field('c-interro', 'Ce que dit le patient', v.interrogatoire, { type: 'textarea', full: true })}
        ${UI.field('c-examen', 'Examen clinique', v.examen, { type: 'textarea', full: true })}
      </div>
      <datalist id="dl-motifs">${d.motifs.map(m => `<option value="${esc(m)}">`).join('')}</datalist></div>
      <div class="card"><h2><i class="fa-solid fa-heart-pulse"></i> Mesures</h2><div class="vitals">
        ${UI.field('m-ta', 'Tension', mv('TA'), { placeholder: '130/80', hint: 'mmHg', attrs: 'inputmode="numeric"' })}
        ${UI.field('m-pouls', 'Pouls', mv('Pouls'), { placeholder: '72', hint: '/min', attrs: 'inputmode="numeric"' })}
        ${UI.field('m-poids', 'Poids', mv('Poids'), { placeholder: '70', hint: 'kg', attrs: 'inputmode="decimal"' })}
        ${UI.field('m-temp', 'Température', mv('Température'), { placeholder: '37,0', hint: '°C', attrs: 'inputmode="decimal"' })}
        ${UI.field('m-gly', 'Glycémie', mv('Glycémie'), { placeholder: '1,10', hint: 'g/l', attrs: 'inputmode="decimal"' })}
      </div></div>
      <div class="card"><h2><i class="fa-solid fa-stethoscope"></i> Conclusion</h2><div class="form">
        ${UI.field('c-concl', 'Diagnostic / conclusion', v.conclusions, { type: 'textarea', full: true })}
        ${UI.field('c-notes', 'Notes personnelles', v.notes, { type: 'textarea', full: true, hint: '(non imprimées)' })}
      </div></div>
      <div class="card">
        <div class="card-head"><h2><i class="fa-solid fa-prescription"></i> Ordonnance</h2>
          <div class="btn-row">
            ${prevVisit && Store.rxOf(prevVisit.id) ? '<button class="btn btn-sm" id="rx-prev"><i class="fa-solid fa-rotate"></i> Reprendre la précédente</button>' : ''}
          </div>
        </div>
        <div id="rx-editor"></div>
      </div>
      <div class="sticky-actions">
        ${vid ? '<button class="btn btn-danger btn-big" id="c-del"><i class="fa-solid fa-trash"></i> Supprimer</button>' : ''}
        <a class="btn btn-big" href="#/patient/${p.id}">Annuler</a>
        <button class="btn btn-big" id="c-save"><i class="fa-solid fa-check"></i> Enregistrer</button>
        <button class="btn btn-primary btn-big" id="c-save-print"><i class="fa-solid fa-print"></i> Enregistrer et imprimer</button>
      </div>`;

    // Ordonnance : texte libre, une ligne écrite = une ligne imprimée
    const rxEd = Docs.rxEditor($('#rx-editor'), rxInit);
    if ($('#rx-prev')) $('#rx-prev').onclick = () => { rxEd.append(Docs.rxText(Store.rxOf(prevVisit.id))); UI.toast('Ordonnance précédente reprise'); };

    const save = async print => {
      const date = $('#c-date').value || todayISO();
      const data = {
        date: `${date}T${(v.date.slice(11, 16) || nowTime())}`, motif: $('#c-motif').value.trim(), interrogatoire: $('#c-interro').value.trim(),
        examen: $('#c-examen').value.trim(), conclusions: $('#c-concl').value.trim(), notes: $('#c-notes').value.trim(),
      };
      let id = vid;
      if (vid) Object.assign(v, data);
      else { id = Store.nextId('visites'); d.visites.push({ id, patientId: p.id, ...data }); }
      // Mesures
      d.mesures = d.mesures.filter(m => m.visiteId != id);
      [['TA', '#m-ta'], ['Pouls', '#m-pouls'], ['Poids', '#m-poids'], ['Température', '#m-temp'], ['Glycémie', '#m-gly']].forEach(([type, sel]) => {
        const val = $(sel).value.trim().replace(',', '.'); if (!val) return;
        d.mesures.push({ id: Store.nextId('mesures'), patientId: p.id, visiteId: id, date, type, valeur: type === 'TA' ? $(sel).value.trim() : val });
      });
      // Ordonnance
      const rxNew = Docs.rxFromText(rxEd.get());
      const clean = rxNew.lignes;
      const existing = d.ordonnances.find(o => o.visiteId == id);
      if (clean.length) { if (existing) Object.assign(existing, rxNew, { date }); else d.ordonnances.push({ id: Store.nextId('ordonnances'), visiteId: id, patientId: p.id, date, ...rxNew }); }
      else if (existing) d.ordonnances = d.ordonnances.filter(o => o !== existing);
      if (data.motif && !d.motifs.some(m => norm(m) === norm(data.motif))) d.motifs.push(data.motif);
      if (!(await Store.save('visites', 'mesures', 'ordonnances', 'medicaments', 'motifs'))) return;
      UI.toast('Consultation enregistrée');
      const visit = d.visites.find(x => x.id == id);
      location.hash = `#/patient/${p.id}`;
      if (print) setTimeout(() => clean.length ? Docs.printPrescription(visit) : UI.alert('Rien à imprimer', 'L\'ordonnance est vide. La consultation est bien enregistrée.'), 300);
    };
    $('#c-save').onclick = () => save(false);
    $('#c-save-print').onclick = () => save(true);
    if ($('#c-del')) $('#c-del').onclick = () => UI.confirm('Supprimer cette consultation ?', 'La consultation, ses mesures et son ordonnance seront effacées.', 'Oui, supprimer', async () => {
      d.visites = d.visites.filter(x => x.id != vid); d.mesures = d.mesures.filter(m => m.visiteId != vid); d.ordonnances = d.ordonnances.filter(o => o.visiteId != vid);
      await Store.save('visites', 'mesures', 'ordonnances'); UI.toast('Consultation supprimée'); location.hash = `#/patient/${p.id}`;
    });
    if (!vid) $('#c-motif').focus();
  },

  /* ── Agenda ── */
  agenda(day) {
    const d = Store.data;
    const list = d.rdv.filter(r => r.date === day).sort((a, b) => a.heure.localeCompare(b.heure));
    const hours = []; for (let h = 8; h <= 18; h++) { hours.push(`${pad(h)}:00`); if (h < 18) hours.push(`${pad(h)}:30`); }
    const taken = new Set(list.map(r => r.heure));
    $('#main').innerHTML = `
      <div class="page-head"><h1>Agenda</h1><button class="btn btn-primary btn-big" id="add-rdv"><i class="fa-solid fa-plus"></i> Nouveau rendez-vous</button></div>
      <div class="day-nav">
        <a class="btn btn-big" href="#/agenda/${addDays(day, -1)}" title="Jour précédent"><i class="fa-solid fa-chevron-left"></i></a>
        <h2>${fmtLong(day)}</h2>
        ${day !== todayISO() ? `<a class="btn" href="#/agenda">Aujourd'hui</a>` : ''}
        <input type="date" class="btn" id="pick-day" value="${day}" aria-label="Choisir une date"/>
        <a class="btn btn-big" href="#/agenda/${addDays(day, 1)}" title="Jour suivant"><i class="fa-solid fa-chevron-right"></i></a>
      </div>
      <div class="card"><div class="list">
        ${list.map(r => Views._rdvRow(r).replace('</div>\n    ', `</div>`).replace(/<\/div>$/, `<button class="icon-del" data-del-rdv="${r.id}" title="Annuler le rendez-vous"><i class="fa-solid fa-trash"></i></button></div>`)).join('')}
        ${list.length ? '' : '<p class="empty">Aucun rendez-vous ce jour-là.</p>'}
      </div></div>
      <div class="card"><h2><i class="fa-solid fa-clock"></i> Heures libres</h2><div class="chips">
        ${hours.filter(h => !taken.has(h)).map(h => `<button class="chip" data-free="${h}">${h}</button>`).join('')}
      </div></div>`;
    $('#add-rdv').onclick = () => Views.rdvDialog({ date: day });
    $('#pick-day').onchange = e => { if (e.target.value) location.hash = `#/agenda/${e.target.value}`; };
    $$('[data-free]').forEach(b => b.onclick = () => Views.rdvDialog({ date: day, heure: b.dataset.free }));
    Views._bindRdvRows();
    $$('[data-del-rdv]').forEach(b => b.onclick = e => { e.stopPropagation(); UI.confirm('Annuler ce rendez-vous ?', 'Le rendez-vous sera retiré de l\'agenda.', 'Oui, annuler', async () => {
      d.rdv = d.rdv.filter(r => r.id != b.dataset.delRdv); await Store.save('rdv'); UI.toast('Rendez-vous annulé'); Router.go();
    }); });
  },

  rdvDialog({ patientId = null, date = todayISO(), heure = '09:00' } = {}) {
    const p = patientId ? Store.patient(patientId) : null;
    let chosen = p;
    UI.dialog('Nouveau rendez-vous', `
      <div class="form">
        <div class="field full"><label for="r-patient">Patient</label>
          <div class="ac"><input id="r-patient" value="${p ? esc(fullName(p)) : ''}" placeholder="Tapez le nom du patient…" autocomplete="off" ${p ? 'readonly' : ''}/></div>
          <small class="muted" id="r-hint">${p ? '' : 'Pas encore de dossier ? Écrivez simplement son nom.'}</small></div>
        ${UI.field('r-date', 'Date', date, { type: 'date' })}
        ${UI.field('r-heure', 'Heure', heure, { type: 'time', attrs: 'step="900"' })}
        ${UI.field('r-motif', 'Motif', '', { full: true, list: 'dl-motifs-r', placeholder: 'Facultatif' })}
      </div>
      <datalist id="dl-motifs-r">${Store.data.motifs.map(m => `<option value="${esc(m)}">`).join('')}</datalist>`, [
      { label: 'Annuler' },
      { label: '<i class="fa-solid fa-check"></i> Enregistrer', cls: 'btn-primary', onClick: async () => {
        const name = $('#r-patient').value.trim();
        if (!name) { $('#r-patient').focus(); return false; }
        if (chosen && fullName(chosen) !== name) chosen = null;
        const r = { id: Store.nextId('rdv'), patientId: chosen ? chosen.id : null, nom: chosen ? '' : name, date: $('#r-date').value || date, heure: $('#r-heure').value || heure, motif: $('#r-motif').value.trim(), present: false };
        Store.data.rdv.push(r); await Store.save('rdv');
        UI.toast(`Rendez-vous le ${fmtDate(r.date)} à ${r.heure}`); Router.go();
      } },
    ]);
    if (!p) {
      const inp = $('#r-patient');
      const pats = Store.data.patients.map(x => ({ ...x, nomAff: `${x.nom.toUpperCase()} ${x.prenom}`, info: `${age(x.naissance)} ans · ${x.tel || ''}` }));
      inp.oninput = () => { chosen = null; Autocomplete.show(inp, pats, x => { chosen = x; inp.value = fullName(x); $('#r-hint').textContent = 'Dossier trouvé ✔'; $('#r-heure').focus(); }, x => x.nomAff, x => x.info); };
      inp.onkeydown = e => Autocomplete.key(e);
      inp.onblur = () => setTimeout(() => Autocomplete.hide(), 180);
    }
  },

  /* ── Réglages ── */
  settings() {
    const s = Store.s;
    $('#main').innerHTML = `
      <div class="page-head"><h1>Réglages</h1></div>
      <div class="card"><h2><i class="fa-solid fa-user-doctor"></i> Le médecin <small class="muted" style="font-weight:400;font-size:.9rem">(en-tête des documents)</small></h2><div class="form">
        ${UI.field('s-titre', 'Titre', s.titre)}
        ${UI.field('s-spec', 'Spécialité', s.specialite)}
        ${UI.field('s-prenom', 'Prénom', s.prenom)}
        ${UI.field('s-nom', 'Nom', s.nom)}
        ${UI.field('s-adresse', 'Adresse du cabinet', s.adresse)}
        ${UI.field('s-ville', 'Ville', s.ville)}
        ${UI.field('s-tel', 'Téléphone', s.tel)}
      </div>
      <h3 style="margin:1.4rem 0 .8rem">En-tête et pied des documents imprimés</h3>
      <div class="form">
        ${UI.field('s-nomar', 'Nom en arabe', s.nomAr, { attrs: 'dir="rtl"' })}
        ${UI.field('s-titrear', 'Titre en arabe', s.titreAr, { attrs: 'dir="rtl"' })}
        ${UI.field('s-specar', 'Spécialité en arabe', s.specialiteAr, { attrs: 'dir="rtl"' })}
        ${UI.field('s-ordre', 'N° Ordre des médecins', s.ordre)}
        ${UI.field('s-dipfr', 'Diplômes (français)', s.diplomesFr, { type: 'textarea', full: true, hint: '(une ligne par diplôme)' })}
        ${UI.field('s-dipar', 'Diplômes (arabe)', s.diplomesAr, { type: 'textarea', full: true, attrs: 'dir="rtl"' })}
        ${UI.field('s-cnam', 'Code CNAM', s.cnam)}
        ${UI.field('s-mf', 'Matricule fiscal (MF)', s.mf)}
        ${UI.field('s-fixe', 'Téléphone fixe', s.telFixe)}
        ${UI.field('s-gsm', 'GSM', s.telMobile)}
        ${UI.field('s-email', 'E-mail', s.email)}
        ${UI.field('s-lieufr', 'Lieu (« Fait à … »)', s.lieuFr)}
        ${UI.field('s-adrfr', 'Adresse du pied de page (français)', s.adresseFooterFr)}
        ${UI.field('s-adrar', 'Adresse du pied de page (arabe)', s.adresseFooterAr, { attrs: 'dir="rtl"' })}
        ${UI.field('s-lieuar', 'Lieu en arabe (signature)', s.lieuAr, { attrs: 'dir="rtl"' })}
        <div class="field full"><label class="check"><input type="checkbox" id="s-entete" ${s.enteteImprime !== false ? 'checked' : ''}/> Imprimer l'en-tête et le pied de page (décocher si le papier est déjà imprimé)</label></div>
      </div><div class="btn-row" style="margin-top:1rem"><button class="btn btn-primary btn-big" id="s-save"><i class="fa-solid fa-check"></i> Enregistrer</button></div></div>
      <div class="card"><h2><i class="fa-solid fa-key"></i> Code d'accès</h2>
        <p class="muted" style="margin-bottom:.8rem">Le code demandé à l'ouverture (4 chiffres).</p>
        <div class="form">${UI.field('s-pin', 'Nouveau code', '', { type: 'password', attrs: 'inputmode="numeric" maxlength="6" autocomplete="new-password"' })}${UI.field('s-pin2', 'Retaper le nouveau code', '', { type: 'password', attrs: 'inputmode="numeric" maxlength="6" autocomplete="new-password"' })}</div>
        <div class="btn-row" style="margin-top:1rem"><button class="btn btn-big" id="s-pin-save"><i class="fa-solid fa-key"></i> Changer le code</button></div></div>
      <div class="card"><h2><i class="fa-solid fa-prescription"></i> Modèles d'ordonnance</h2>
        <div class="list">${Store.data.modeles.map(m => `<div class="row" style="cursor:default"><div class="grow"><div class="name">${esc(m.libelle)}</div><div class="sub">${m.lignes.map(l => esc(l[0])).join(' · ')}</div></div><button class="icon-del" data-del-model="${m.id}" title="Supprimer"><i class="fa-solid fa-trash"></i></button></div>`).join('') || '<p class="empty">Aucun modèle.</p>'}</div>
        <p class="muted" style="margin-top:.8rem">Astuce : pour créer un modèle, remplissez une ordonnance puis utilisez le bouton ci-dessous.</p>
        <div class="btn-row" style="margin-top:.6rem"><button class="btn" id="s-model-from-last"><i class="fa-solid fa-plus"></i> Créer un modèle à partir de la dernière ordonnance</button></div></div>
      <div class="card"><h2><i class="fa-solid fa-shield-halved"></i> Sauvegarde</h2>
        ${Store.mode === 'local'
          ? `<p>Une copie de toutes les données est faite automatiquement chaque jour dans le dossier <b>sauvegardes</b>.</p><div class="btn-row" style="margin-top:1rem"><button class="btn btn-big" id="s-backup"><i class="fa-solid fa-floppy-disk"></i> Faire une copie maintenant</button></div><p class="muted" id="s-backup-info" style="margin-top:.6rem"></p>`
          : `<p>Ceci est la version de démonstration. Les données sont gardées dans ce navigateur uniquement.</p><div class="btn-row" style="margin-top:1rem"><button class="btn btn-danger btn-big" id="s-reset"><i class="fa-solid fa-rotate-left"></i> Remettre la démo à zéro</button></div>`}
      </div>
      <p class="muted" style="text-align:center">Mon Cabinet · conçu et développé par <a href="https://cictnardc.net" target="_blank" rel="noopener">CICTNA RDC</a></p>`;
    $('#s-save').onclick = async () => {
      Object.assign(s, { titre: $('#s-titre').value.trim(), specialite: $('#s-spec').value.trim(), prenom: $('#s-prenom').value.trim(), nom: $('#s-nom').value.trim(), adresse: $('#s-adresse').value.trim(), ville: $('#s-ville').value.trim(), tel: $('#s-tel').value.trim(),
        nomAr: $('#s-nomar').value.trim(), titreAr: $('#s-titrear').value.trim(), specialiteAr: $('#s-specar').value.trim(), ordre: $('#s-ordre').value.trim(),
        diplomesFr: $('#s-dipfr').value.trim(), diplomesAr: $('#s-dipar').value.trim(), cnam: $('#s-cnam').value.trim(), mf: $('#s-mf').value.trim(),
        telFixe: $('#s-fixe').value.trim(), telMobile: $('#s-gsm').value.trim(), email: $('#s-email').value.trim(), lieuFr: $('#s-lieufr').value.trim(),
        adresseFooterFr: $('#s-adrfr').value.trim(), adresseFooterAr: $('#s-adrar').value.trim(), lieuAr: $('#s-lieuar').value.trim(), enteteImprime: $('#s-entete').checked });
      if (await Store.save('settings')) UI.toast('Réglages enregistrés');
    };
    $('#s-pin-save').onclick = async () => {
      const a = $('#s-pin').value, b = $('#s-pin2').value;
      if (!/^\d{4,6}$/.test(a)) return UI.alert('Code non valide', 'Le code doit contenir 4 à 6 chiffres.');
      if (a !== b) return UI.alert('Les codes sont différents', 'Retapez le même code dans les deux cases.');
      if (Store.mode === 'demo') return UI.alert('Version de démonstration', 'Dans la démo, le code reste 1234 pour que tout le monde puisse entrer.');
      s.pin = a; if (await Store.save('settings')) { UI.toast('Nouveau code enregistré'); $('#s-pin').value = $('#s-pin2').value = ''; }
    };
    $$('[data-del-model]').forEach(b => b.onclick = () => UI.confirm('Supprimer ce modèle ?', 'Le modèle d\'ordonnance sera supprimé.', 'Oui, supprimer', async () => {
      Store.data.modeles = Store.data.modeles.filter(m => m.id != b.dataset.delModel); await Store.save('modeles'); UI.toast('Modèle supprimé'); Router.go();
    }));
    $('#s-model-from-last').onclick = () => {
      const last = [...Store.data.ordonnances].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))[0];
      if (!last) return UI.alert('Aucune ordonnance', 'Faites d\'abord une ordonnance lors d\'une consultation.');
      UI.dialog('Nouveau modèle', `<p style="margin-bottom:.8rem">${last.lignes.map(l => esc(l.medicament)).join(' · ')}</p>${UI.field('mod-name', 'Nom du modèle', '', { placeholder: 'Ex : Angine, Renouvellement HTA…' })}`, [
        { label: 'Annuler' },
        { label: '<i class="fa-solid fa-check"></i> Créer', cls: 'btn-primary', onClick: async () => {
          const n = $('#mod-name').value.trim(); if (!n) { $('#mod-name').focus(); return false; }
          Store.data.modeles.push({ id: Store.nextId('modeles'), libelle: n, lignes: last.lignes.map(l => [l.medicament, l.posologie]) });
          await Store.save('modeles'); UI.toast('Modèle créé'); Router.go();
        } },
      ]);
    };
    if ($('#s-backup')) $('#s-backup').onclick = async () => {
      try { const r = await fetch('api/backup', { method: 'POST' }); const j = await r.json(); $('#s-backup-info').textContent = `Copie faite : ${j.fichier}`; UI.toast('Copie de sauvegarde faite'); }
      catch { UI.alert('Copie impossible', 'Le programme du cabinet ne répond pas.'); }
    };
    if ($('#s-reset')) $('#s-reset').onclick = () => UI.confirm('Remettre la démo à zéro ?', 'Toutes vos modifications seront effacées et les patients d\'exemple reviendront.', 'Oui, remettre à zéro', () => {
      Store.data = DemoData.build(); Store._fill(); Store._persistDemo(); UI.toast('Démo remise à zéro'); location.hash = '#/accueil'; Router.go();
    });
  },
};

/* ══════════════ Autocomplétion ══════════════ */
const Autocomplete = {
  el: null, items: [], idx: -1, pickFn: null,
  show(input, source, onPick, label = x => x.nom, sub = x => [x.classe, x.forme].filter(Boolean).join(' · ')) {
    this.hide();
    const t = norm(input.value.trim()); if (t.length < 2) return;
    const words = t.split(/\s+/);
    // Cherche dans le nom et la ligne d'aide (DCI, forme…) ; les noms qui commencent par la saisie d'abord
    const scored = [];
    for (const x of source) {
      const l = norm(label(x)), hay = l + ' ' + norm(sub(x));
      if (!words.every(w => hay.includes(w))) continue;
      scored.push([l.startsWith(t) ? 0 : l.includes(t) ? 1 : 2, l.length, x]);
    }
    this.items = scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 10).map(s => s[2]);
    if (!this.items.length) return;
    this.pickFn = onPick; this.idx = -1;
    this.el = document.createElement('div'); this.el.className = 'ac-list';
    this.el.innerHTML = this.items.map((x, i) => `<div data-i="${i}">${esc(label(x))}${sub(x) ? `<small>${esc(sub(x))}</small>` : ''}</div>`).join('');
    this.el.addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (!d) return; e.preventDefault(); const it = this.items[d.dataset.i]; this.hide(); onPick(it); });
    input.parentElement.appendChild(this.el);
  },
  key(e) {
    if (!this.el) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this.idx = (this.idx + (e.key === 'ArrowDown' ? 1 : -1) + this.items.length) % this.items.length; $$('[data-i]', this.el).forEach((d, i) => d.classList.toggle('on', i === this.idx)); }
    else if (e.key === 'Enter' && this.idx >= 0) { e.preventDefault(); const it = this.items[this.idx]; const fn = this.pickFn; this.hide(); fn(it); }
    else if (e.key === 'Escape') this.hide();
  },
  hide() { if (this.el) this.el.remove(); this.el = null; },
};

/* ══════════════ Démarrage ══════════════ */
(async () => {
  await Store.load();
  let scale = 0; try { scale = parseFloat(localStorage.getItem('cm_scale')) || 0; } catch { }
  UI.setScale(scale || Store.s.taillePolice || 1);
  document.title = Store.mode === 'demo' ? 'Mon Cabinet — démonstration' : 'Mon Cabinet';
  $('#text-plus').onclick = () => UI.setScale(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) + 0.1);
  $('#text-minus').onclick = () => UI.setScale(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) - 0.1);
  $('#btn-quit').onclick = () => Auth.close();
  $('#dialog').addEventListener('click', e => { if (e.target.id === 'dialog') UI.close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { Autocomplete.hide(); UI.close(); } });
  window.addEventListener('hashchange', () => { if (!$('#app').classList.contains('hidden')) { UI.close(); Router.go(); } });
  Auth.init();
})();
