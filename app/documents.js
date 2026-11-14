/* ═══════════════════════════════════════════════════════════
   Documents imprimés : ordonnance, certificats (FR et AR), lettres.
   Le médecin remplit des cases simples ; l'aperçu de la page se met à jour à côté.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const dmy = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
const dots = (v, n = 24) => v ? `<b class="fill">${esc(v)}</b>` : `<span class="dots">${'.'.repeat(n)}</span>`;
const nl2br = s => esc(s).replace(/\n/g, '<br>');

const Docs = {
  /* ── Texte d'une ordonnance (ancien format en lignes ou nouveau texte libre) ── */
  rxText(rx) {
    if (!rx) return '';
    if (typeof rx.texte === 'string') return rx.texte;
    return (rx.lignes || []).map(l => l.medicament + (l.posologie ? '\n' + l.posologie : '')).join('\n');
  },
  rxFromText(texte) {
    const lines = texte.split('\n').map(l => l.replace(/\s+$/, '')).filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim()));
    return { texte: lines.join('\n').trim(), lignes: lines.filter(l => l.trim()).map(l => ({ medicament: l.trim(), posologie: '' })) };
  },

  /* ── En-tête et pied de page, comme son papier à en-tête ── */
  letterhead(withCnam) {
    const s = Store.s;
    const dipFr = (s.diplomesFr || '').split('\n').filter(Boolean);
    const dipAr = (s.diplomesAr || '').split('\n').filter(Boolean);
    return `<header class="lh">
      <div class="lh-fr">
        <div class="lh-name">Dr.${esc((s.nom || '').toUpperCase())} ${esc((s.prenom || '').toUpperCase())}</div>
        <div class="lh-spec">${esc(s.specialite || '')}</div>
        ${dipFr.map(d => `<div class="lh-dip">${esc(d)}</div>`).join('')}
      </div>
      <div class="lh-mid">${withCnam && (s.cnam || s.mf) ? `<div class="lh-cnam">${s.cnam ? `CNAM<br>${esc(s.cnam)}` : ''}${s.mf ? `<br>MF : ${esc(s.mf)}` : ''}</div>` : ''}</div>
      <div class="lh-ar" dir="rtl" lang="ar">
        <div class="lh-name">${esc(s.titreAr || '')} ${esc(s.nomAr || '')}</div>
        <div class="lh-spec">${esc(s.specialiteAr || '')}</div>
        ${dipAr.map(d => `<div class="lh-dip">${esc(d)}</div>`).join('')}
      </div>
    </header>`;
  },
  footer() {
    const s = Store.s;
    return `<footer class="lf">
      <div class="lf-place"><span>${esc(s.adresseFooterFr || s.ville || '')}</span>${s.adresseFooterAr ? `<span class="lf-sep">-</span><span dir="rtl" lang="ar">${esc(s.adresseFooterAr)}</span>` : ''}</div>
      <div class="lf-tel">${s.telFixe ? `Tél : ${esc(s.telFixe)}` : ''}${s.telFixe && s.telMobile ? ' &nbsp;·&nbsp; ' : ''}${s.telMobile ? `GSM : ${esc(s.telMobile)}` : ''}</div>
      ${s.email ? `<div class="lf-mail">${esc(s.email)}</div>` : ''}
    </footer>`;
  },
  sheet(size, body, { cnam = false, lang = 'fr' } = {}) {
    const head = Store.s.enteteImprime !== false;
    return `<div class="sheet sheet-${size.toLowerCase()} ${head ? '' : 'no-head'}" lang="${lang}">
      ${head ? this.letterhead(cnam) : '<div class="lh-space"></div>'}
      <div class="sheet-body" ${lang === 'ar' ? 'dir="rtl"' : ''}>${body}</div>
      ${head ? this.footer() : ''}
    </div>`;
  },
  print(size, html) {
    let st = document.getElementById('page-size');
    if (!st) { st = document.createElement('style'); st.id = 'page-size'; document.head.appendChild(st); }
    st.textContent = `@page { size: ${size}; margin: 0; }`;
    $('#print-area').innerHTML = html;
    setTimeout(() => window.print(), 150);
  },

  /* ── Ordonnance d'une consultation ── */
  rxBody(p, date, texte) {
    const s = Store.s;
    return `<div class="rx-date">Le : <b class="fill">${dmy(date)}</b></div>
      <div class="rx-patient">${p.sexe === 'F' ? 'Mme' : 'Mr'} <b>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</b>${p.naissance ? ` &nbsp;·&nbsp; ${age(p.naissance)} ans` : ''}</div>
      <div class="rx-title">ORDONNANCE</div>
      <div class="rx-text">${texte.split('\n').map(l => l.trim() ? `<div class="${/^\s|^[-–•\d½¼]/.test(l) ? 'rx-sub' : 'rx-main'}">${esc(l.trim())}</div>` : '<div class="rx-gap"></div>').join('')}</div>`;
  },
  printPrescription(v) {
    const p = Store.patient(v.patientId), rx = Store.rxOf(v.id);
    if (!rx) return;
    this.print('A5', this.sheet('A5', this.rxBody(p, v.date, this.rxText(rx)), { cnam: true }));
  },

  /* ── Éditeur d'ordonnance : une grande zone de texte, une ligne = une ligne imprimée ── */
  rxEditor(container, initial, onChange) {
    const d = Store.data;
    container.innerHTML = `
      <div class="rx-tools">
        <div class="ac rx-search"><i class="fa-solid fa-magnifying-glass"></i><input id="rx-find" placeholder="Chercher un médicament à ajouter…" autocomplete="off"/></div>
        <select id="rx-model" class="btn btn-sm"><option value="">Charger un modèle…</option>${d.modeles.map(m => `<option value="${m.id}">${esc(m.libelle)}</option>`).join('')}</select>
      </div>
      <textarea id="rx-text" class="rx-textarea" placeholder="Écrivez l'ordonnance ici.&#10;Appuyez sur Entrée pour aller à la ligne.&#10;&#10;Exemple :&#10;AMOXIL 1 g&#10;1 comprimé matin et soir pendant 7 jours">${esc(initial)}</textarea>
      <p class="muted" style="font-size:.95rem;margin-top:.5rem">Ajouts rapides (à l'endroit du curseur) :</p>
      <div class="chips" id="rx-chips">${['1 comprimé le matin', '1 comprimé matin et soir', '1 comprimé 3 fois par jour', 'avant le repas', 'au milieu du repas', 'si douleur', 'pendant 5 jours', 'pendant 7 jours', 'pendant 1 mois', 'pendant 3 mois', 'QSP 1 mois', 'QSP 3 mois'].map(c => `<button type="button" class="chip">${c}</button>`).join('')}</div>`;
    const ta = $('#rx-text', container);
    const insert = (txt, newLine) => {
      const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a, before = ta.value.slice(0, a), after = ta.value.slice(b);
      let ins = txt;
      if (newLine) { if (before && !before.endsWith('\n')) ins = '\n' + ins; ins += '\n'; }
      else if (before && !/[\s\n]$/.test(before)) ins = ' ' + ins;
      ta.value = before + ins + after;
      const pos = (before + ins).length; ta.focus(); ta.setSelectionRange(pos, pos);
      onChange && onChange(ta.value);
    };
    ta.addEventListener('input', () => onChange && onChange(ta.value));
    $$('#rx-chips .chip', container).forEach(c => { c.onmousedown = e => e.preventDefault(); c.onclick = () => insert(c.textContent, false); });
    const find = $('#rx-find', container);
    find.oninput = () => Autocomplete.show(find, d.medicaments, m => {
      const txt = m.forme && !norm(m.nom).includes(norm(m.forme)) ? `${m.nom} — ${m.forme.toLowerCase()}` : m.nom;
      find.value = ''; insert(txt, true);
    });
    find.onkeydown = e => Autocomplete.key(e);
    find.onblur = () => setTimeout(() => Autocomplete.hide(), 180);
    $('#rx-model', container).onchange = e => {
      const m = d.modeles.find(x => x.id == e.target.value); if (!m) return;
      insert(m.lignes.map(([a, b]) => a + (b ? '\n' + b : '')).join('\n'), true);
      e.target.value = ''; UI.toast(`Modèle « ${m.libelle} » ajouté`);
    };
    return { get: () => ta.value, set: v => { ta.value = v; onChange && onChange(v); }, append: v => insert(v, true) };
  },

  /* ── Catalogue des documents ── */
  TYPES: {
    ordonnance: { titre: 'Ordonnance', sous: 'Médicaments, français', icon: 'fa-prescription', size: 'A5', lang: 'fr' },
    repos: { titre: 'Certificat de repos', sous: 'Repos ou prolongation, français', icon: 'fa-bed', size: 'A5', lang: 'fr' },
    prenuptial: { titre: 'Certificat prénuptial', sous: 'Arabe ou français', icon: 'fa-ring', size: 'A4', lang: 'ar' },
    aptitude: { titre: 'Certificat d\'aptitude', sous: 'Travail · arabe ou français', icon: 'fa-briefcase', size: 'A4', lang: 'ar' },
    conduite: { titre: 'Permis de conduire', sous: 'Obtention ou renouvellement · arabe ou français', icon: 'fa-car', size: 'A4', lang: 'ar' },
    lettre: { titre: 'Lettre à un confrère', sous: 'Orientation, français', icon: 'fa-envelope-open-text', size: 'A5', lang: 'fr' },
    libre: { titre: 'Texte libre', sous: 'Attestation, certificat…', icon: 'fa-file-pen', size: 'A5', lang: 'fr' },
  },

  chooser(p) {
    UI.dialog('Quel document ?', `<div class="doc-choice">${Object.entries(this.TYPES).map(([k, t]) => `
      <a class="doc-tile" href="#/document/${k}/${p.id}"><i class="fa-solid ${t.icon}"></i><b>${t.titre}</b><span>${esc(t.sous)}</span></a>`).join('')}</div>`, [{ label: 'Fermer' }]);
  },
};

/* ══════════════ Formulaires de chaque document ══════════════ */
const DocForms = {
  /* Chaque type : fields(p, v) → HTML des cases ; read() → valeurs ; body(p, v) → contenu de la page */
  ordonnance: {
    init: () => ({ date: todayISO(), texte: '' }),
    fields: () => `${UI.field('d-date', 'Date', '', { type: 'date' })}<div class="field full"><label>Ordonnance</label><div id="d-rx"></div></div>`,
    mount(v, refresh) { $('#d-date').value = v.date; this.ed = Docs.rxEditor($('#d-rx'), v.texte, refresh); },
    read() { return { date: $('#d-date').value || todayISO(), texte: this.ed.get() }; },
    body: (p, v) => Docs.rxBody(p, v.date, v.texte),
    cnam: true,
  },

  repos: {
    init: (p) => ({ nom: civil(p), type: 'repos', jours: 3, debut: todayISO(), date: todayISO() }),
    fields: (p, v) => `
      ${UI.field('d-nom', 'Patient', v.nom, { full: true })}
      <div class="field full"><label>Type</label><div class="seg">
        <label><input type="radio" name="d-type" value="repos" ${v.type === 'repos' ? 'checked' : ''}/> Un repos</label>
        <label><input type="radio" name="d-type" value="prolongation" ${v.type === 'prolongation' ? 'checked' : ''}/> Une prolongation de repos</label></div></div>
      ${UI.field('d-jours', 'Nombre de jours', v.jours, { type: 'number', attrs: 'min="1" max="365" inputmode="numeric"' })}
      ${UI.field('d-debut', 'À compter du', v.debut, { type: 'date' })}
      <div class="field full"><p class="muted" id="d-fin"></p></div>
      ${UI.field('d-date', 'Fait le', v.date, { type: 'date' })}`,
    read() {
      const v = { nom: $('#d-nom').value.trim(), type: $('input[name=d-type]:checked').value, jours: parseInt($('#d-jours').value) || 0, debut: $('#d-debut').value, date: $('#d-date').value || todayISO() };
      $('#d-fin').textContent = v.jours && v.debut ? `Soit jusqu'au ${fmtLong(addDays(v.debut, v.jours - 1))} inclus.` : '';
      return v;
    },
    body: (p, v) => {
      const s = Store.s, dr = `${titleCaseName(s.nom)} ${titleCaseName(s.prenom)}`;
      const n = v.jours ? `${v.jours} (${nombreEnLettres(v.jours)})` : '';
      return `<div class="cert-title">Certificat Medical</div>
        <div class="cert-text">
          <p>Je Soussigné, Docteur <span class="hand">${esc(dr)}</span>, ${esc(s.specialite || 'Médecine Générale')},</p>
          <p>Certifie avoir Examiner ce Jour Mr/Mme/Mlle : ${dots(v.nom, 40)}</p>
          <p>et declare que Son état de santé Nécessite</p>
          <p>* ${v.type === 'prolongation' ? 'Une prolongation de Repos de' : 'Un Repos de'} ${dots(n, 20)} Jours .</p>
          <p>Et ce à Compter du ${dots(v.debut ? fmtDate(v.debut) : '', 30)} Sauf Complications Ulterieures .</p>
        </div>
        <div class="cert-sign">Fait à ${esc(s.lieuFr || 'Hessi Amor')} , le ${dots(dmy(v.date), 20)}</div>`;
    },
  },

  prenuptial: {
    init: (p) => ({ langue: 'ar', nom: fullName(p), naissance: p.naissance || '', lieu: p.lieuNaissance || '', adresse: p.adresse || '', cin: p.cin || '', cinLieu: '', cinDate: '',
      exams: [true, true, true, false], autres: '', decl: [true, p.sexe === 'F', true, true, true], date: todayISO() }),
    EXAMS: ['فصيلة الدم', 'التهاب الكبد الفيروسي صنف "ب" وصنف "ج"', 'صورة بالأشعّة السينيّة للصدر', 'فحوص أخرى'],
    DECL: [
      'أعلمت المعني(ة) بالأمر بنتائج الفحوص السريريّة والتكميليّة وبالأعمال التي من شأنها الوقاية أو الحدّ من أخطارها عليه(ها) وعلى قرينه(ها) وأبنائه(ها).',
      'لفت نظر الزوجة المفترضة إلى إمكانيّة الإصابة بالحميراء خلال فترة الحمل وأعلمتها بوجود تلقيح لذلك.',
      'أكّدت على عوامل الخطر المهيّئة لبعض الأمراض (مرض السكّري، ضغط الدم... إلخ).',
      'نصحت المعني(ة) بالأمر بإجراء تلقيح ضدّ التهاب الكبد من صنف "ب".',
      'قدّمت نصائح تتعلّق بالعوامل الوراثيّة بما في ذلك تلك المرتبطة بالقرابة بين الزوجين المفترضين ونصائح تتعلّق بطرق تنظيم الولادات، وأكّدت على ضرورة مراقبة الحمل.',
    ],
    fields(p, v) {
      return `${langChoice(v)}${UI.field('d-nom', 'Nom du patient', v.nom, { full: true })}
        ${UI.field('d-naiss', 'Date de naissance', v.naissance, { type: 'date' })}
        ${UI.field('d-lieu', 'Lieu de naissance', v.lieu)}
        ${UI.field('d-adresse', 'Adresse', v.adresse, { full: true })}
        ${UI.field('d-cin', 'N° carte d\'identité (CIN)', v.cin, { attrs: 'inputmode="numeric" maxlength="8"' })}
        ${UI.field('d-cinlieu', 'CIN délivrée à', v.cinLieu)}
        ${UI.field('d-cindate', 'CIN délivrée le', v.cinDate, { type: 'date' })}
        <div class="field full"><label>Examens complémentaires vus</label><div class="checks-col" dir="rtl">${this.EXAMS.map((e, i) => `<label class="check"><input type="checkbox" class="d-exam" ${v.exams[i] ? 'checked' : ''}/> <span lang="ar">${e}</span></label>`).join('')}</div></div>
        ${UI.field('d-autres', 'Autres examens (si coché)', v.autres, { full: true })}
        <div class="field full"><label>Déclarations</label><div class="checks-col" dir="rtl">${this.DECL.map((e, i) => `<label class="check"><input type="checkbox" class="d-decl" ${v.decl[i] ? 'checked' : ''}/> <span lang="ar">${e}</span></label>`).join('')}</div></div>
        ${UI.field('d-date', 'Date', v.date, { type: 'date' })}`;
    },
    read() {
      return { langue: readLang(), nom: $('#d-nom').value.trim(), naissance: $('#d-naiss').value, lieu: $('#d-lieu').value.trim(), adresse: $('#d-adresse').value.trim(),
        cin: $('#d-cin').value.trim(), cinLieu: $('#d-cinlieu').value.trim(), cinDate: $('#d-cindate').value,
        exams: $$('.d-exam').map(c => c.checked), autres: $('#d-autres').value.trim(), decl: $$('.d-decl').map(c => c.checked), date: $('#d-date').value || todayISO() };
    },
    body(p, v) {
      if (v.langue === 'fr') return FR.prenuptial(p, v, this);
      const s = Store.s;
      const box = on => `<span class="box ${on ? 'on' : ''}">${on ? '✓' : ''}</span>`;
      return `<div class="ar-title">شهادة طبّية سابقة للزواج</div>
        <div class="ar-text">
          <p>إنّي الممضي أسفله الدكتور ${esc(s.nomAr || '')}، دكتور في الطبّ العام، رقم التسجيل بمجلس عمادة الأطبّاء عدد ${esc(s.ordre || '')}، عنوانه ${esc(s.adresseFooterAr || '')}</p>
          <p>أشهد بأنّي قمت لغاية الزواج بفحص السيّد(ة): ${dots(v.nom, 35)}</p>
          <p>المولود(ة) في: ${dots(dmy(v.naissance), 18)} بـ ${dots(v.lieu, 18)}</p>
          <p>القاطن(ة) بـ: ${dots(v.adresse, 40)}</p>
          <p>بطاقة التعريف الوطنيّة عدد: ${dots(v.cin, 16)} مسلّمة بـ ${dots(v.cinLieu, 14)} في ${dots(dmy(v.cinDate), 14)}</p>
          <p>حرّرت هذه الشهادة بعد إجراء استجواب مدقّق وفحص سريري كامل وبعد اطّلاعي على نتائج الفحوص التكميليّة التالية:</p>
          <div class="ar-list">${this.EXAMS.map((e, i) => `<div>${box(v.exams[i])}<span>${e}${i === 3 && v.exams[3] && v.autres ? ` : ${esc(v.autres)}` : ''}</span></div>`).join('')}</div>
          <p>وأصرّح علاوة على ذلك بأنّي:</p>
          <div class="ar-list">${this.DECL.map((e, i) => `<div>${box(v.decl[i])}<span>${e}</span></div>`).join('')}</div>
          <p>وبحكم هذا، سلّمت هذه الشهادة مباشرة للمعني(ة) بالأمر للاستظهار بها لدى من له النظر.</p>
        </div>
        <div class="ar-sign"><span>الدكتور ${esc(s.nomAr || '')}</span><span>حرّر بـ ${esc(s.lieuAr || '')} في ${dmy(v.date)}</span></div>
        <p class="ar-note">ملاحظة: يعاقب بالسجن لمدّة تتراوح بين سنة وثلاث سنوات كلّ شخص يعلم أنّه مصاب بمرض سار ويسعى عمدا، من خلال سلوكه، إلى نقله إلى أشخاص آخرين (القانون عدد 71 لسنة 1992 المؤرّخ في 27 جويلية 1992 المتعلّق بالأمراض السارية: الفصلين 11 و18).</p>`;
    },
  },

  aptitude: {
    init: (p) => ({ langue: 'ar', nom: fullName(p), date: todayISO() }),
    fields: (p, v) => `${langChoice(v)}${UI.field('d-nom', 'Nom du patient', v.nom, { full: true })}${UI.field('d-date', 'Date', v.date, { type: 'date' })}`,
    read: () => ({ langue: readLang(), nom: $('#d-nom').value.trim(), date: $('#d-date').value || todayISO() }),
    body(p, v) {
      if (v.langue === 'fr') return FR.aptitude(p, v);
      const s = Store.s;
      return `<div class="ar-title big">شهادة طبية</div>
        <div class="ar-text big">
          <p>يشهد الدكتور ${esc(s.nomAr || '')}</p>
          <p>بعد فحص السيد(ة)/الآنسة: ${dots(v.nom, 35)}</p>
          <p>بأنه(ها) خال(ية) من:</p>
          <div class="ar-dash">
            <div>- كل العاهات الظاهرة والباطنة،</div>
            <div>- الشلل،</div>
            <div>- الأمراض الصدرية والسرطان، أو شفي(ت) منها نهائيًا،</div>
            <div>- (ت)يتمتع بجميع مداركه(ها) العقلية،</div>
            <div>- قادر(ة) على القيام بعمله(ها) حسب الظروف المطلوبة بكامل تراب الجمهورية التونسية.</div>
          </div>
        </div>
        <div class="ar-sign big"><span>الدكتور ${esc(s.nomAr || '')}</span><span>${esc(s.lieuAr || '')} في ${dmy(v.date)}</span></div>`;
    },
  },

  conduite: {
    init: (p) => ({ langue: 'ar', nom: fullName(p), naissance: p.naissance || '', lieu: p.lieuNaissance || '', cin: p.cin || '', cinLieu: '', cinDate: '',
      decision: 'apte', g1: true, g2: false, pub: { groupe: '', sousPar: '', par: '', section: '', annexe: '' }, specExamen: '', specCommission: '', date: todayISO() }),
    fields(p, v) {
      const r = (k, label) => `<label><input type="radio" name="d-dec" value="${k}" ${v.decision === k ? 'checked' : ''}/> ${label}</label>`;
      return `${langChoice(v)}${UI.field('d-nom', 'Nom du patient', v.nom, { full: true })}
        ${UI.field('d-naiss', 'Date de naissance', v.naissance, { type: 'date' })}
        ${UI.field('d-lieu', 'Lieu de naissance', v.lieu)}
        ${UI.field('d-cin', 'N° carte d\'identité (CIN)', v.cin, { attrs: 'inputmode="numeric" maxlength="8"' })}
        ${UI.field('d-cinlieu', 'CIN délivrée à', v.cinLieu)}
        ${UI.field('d-cindate', 'CIN délivrée le', v.cinDate, { type: 'date' })}
        <div class="field full"><label>Décision</label><div class="seg seg-col">
          ${r('apte', 'Apte à conduire')}${r('public', 'Apte à la conduite publique')}${r('examen', 'Examen complémentaire chez un spécialiste')}${r('commission', 'Passage devant la commission')}${r('inapte', 'Inapte à conduire')}
        </div></div>
        <div class="field full dec-apte"><label>Groupes</label>
          <label class="check"><input type="checkbox" id="d-g1" ${v.g1 ? 'checked' : ''}/> Groupe 1 (A1, A, B, H)</label>
          <label class="check"><input type="checkbox" id="d-g2" ${v.g2 ? 'checked' : ''}/> Groupe 2 (C, C+E, D, D1, D+E)</label></div>
        <div class="field full dec-public"><label>Conduite publique : références</label><div class="form form-tight">
          ${UI.field('d-pg', 'Groupe', v.pub.groupe)}${UI.field('d-psp', 'Sous-paragraphe', v.pub.sousPar)}${UI.field('d-pp', 'Paragraphe', v.pub.par)}${UI.field('d-ps', 'Section', v.pub.section)}${UI.field('d-pa', 'Annexe', v.pub.annexe)}
        </div></div>
        ${UI.field('d-spec1', 'Spécialité (examen complémentaire)', v.specExamen, { full: true })}
        ${UI.field('d-spec2', 'Spécialité (commission)', v.specCommission, { full: true })}
        ${UI.field('d-date', 'Date', v.date, { type: 'date' })}`;
    },
    read() {
      const dec = $('input[name=d-dec]:checked').value;
      $$('.dec-apte').forEach(e => e.classList.toggle('hidden', dec !== 'apte'));
      $$('.dec-public').forEach(e => e.classList.toggle('hidden', dec !== 'public'));
      $('#d-spec1').closest('.field').classList.toggle('hidden', dec !== 'examen');
      $('#d-spec2').closest('.field').classList.toggle('hidden', dec !== 'commission');
      return { langue: readLang(), nom: $('#d-nom').value.trim(), naissance: $('#d-naiss').value, lieu: $('#d-lieu').value.trim(), cin: $('#d-cin').value.trim(), cinLieu: $('#d-cinlieu').value.trim(), cinDate: $('#d-cindate').value,
        decision: dec, g1: $('#d-g1').checked, g2: $('#d-g2').checked,
        pub: { groupe: $('#d-pg').value.trim(), sousPar: $('#d-psp').value.trim(), par: $('#d-pp').value.trim(), section: $('#d-ps').value.trim(), annexe: $('#d-pa').value.trim() },
        specExamen: $('#d-spec1').value.trim(), specCommission: $('#d-spec2').value.trim(), date: $('#d-date').value || todayISO() };
    },
    body(p, v) {
      if (v.langue === 'fr') return FR.conduite(p, v);
      const s = Store.s, d = v.decision;
      const box = (on, big) => `<span class="box ${big ? 'big' : ''} ${on ? 'on' : ''}">${on ? '✓' : ''}</span>`;
      return `<div class="ar-title">شهادة طبّية للحصول على رخصة سياقة أو لتجديدها</div>
        <div class="ar-text">
          <p>إنّي الممضي أسفله الدكتور ${esc(s.nomAr || '')} الطبيب المسجّل في الجدول الوطني لعمادة الأطباء تحت عدد ${esc(s.ordre || '')}</p>
          <p>أشهد أنّي فحصت السيّد(ة) ${dots(v.nom, 30)} المولود(ة) في ${dots(dmy(v.naissance), 16)} ب ${dots(v.lieu, 16)}</p>
          <p>صاحب(ة) بطاقة التعريف الوطنيّة عدد ${dots(v.cin, 14)} المسلّمة ب ${dots(v.cinLieu, 14)} في ${dots(dmy(v.cinDate), 12)}</p>
          <p>وبعد اطّلاعي على نتائج الفحوص والتحاليل التكميليّة (عند الاقتضاء) وكذلك تصريح المترشّح(ة) بحالته(ها) الصحيّة وطبقاً لمقتضيات الملحق عدد 1 للقرار المشترك من وزيري النقل والصحة العمومية المؤرخ في 16 أوت 2002، أصرح أن المعني بالأمر:</p>
          <div class="ar-list">
            <div>${box(d === 'apte', true)}<span>مؤهّل(ة) من أجل السياقة العربات من:</span></div>
            <div class="indent">${box(d === 'apte' && v.g1)}<span>المجموعة الأولى (الأصناف "أ1" و"أ" و"ب" و"ح")</span></div>
            <div class="indent">${box(d === 'apte' && v.g2)}<span>المجموعة الثانية (الأصناف "ج" و "ج+ه" و "د" و "د 1" و "د+ه")</span></div>
            <div>${box(d === 'public', true)}<span>مؤهّل(ة) للسياقة العموميّة من المجموعة ${dots(d === 'public' ? v.pub.groupe : '', 10)} وفقاً لمقتضيات الفقرة الفرعية ${dots(d === 'public' ? v.pub.sousPar : '', 10)} من الفقرة ${dots(d === 'public' ? v.pub.par : '', 8)} بالقسم عدد ${dots(d === 'public' ? v.pub.section : '', 8)} من الملحق عدد ${dots(d === 'public' ? v.pub.annexe : '', 8)} للقرار المذكور أعلاه</span></div>
            <div>${box(d === 'examen', true)}<span>مطالب(ة) بإجراء فحص إضافي من قبل مختص في ${dots(d === 'examen' ? v.specExamen : '', 24)}</span></div>
            <div>${box(d === 'commission', true)}<span>مطالب(ة) بالمثول أمام اللجنة المختصة مع تقديم شهادة طبية مسلمة من مختص في ${dots(d === 'commission' ? v.specCommission : '', 20)}</span></div>
            <div>${box(d === 'inapte', true)}<span>غير مؤهّل(ة) لسياقة العربات</span></div>
          </div>
        </div>
        <div class="ar-sign"><span>الدكتور ${esc(s.nomAr || '')}</span><span>التاريخ: ${dmy(v.date)}</span></div>`;
    },
  },

  lettre: {
    init: (p) => ({ objet: '', texte: `Cher confrère,\n\nJe vous adresse ${p.sexe === 'F' ? 'Mme' : 'Mr'} ${p.prenom} ${p.nom.toUpperCase()}, ${age(p.naissance)} ans, pour \n\n\nJe vous remercie de bien vouloir le/la prendre en charge.\nConfraternellement.`, date: todayISO() }),
    fields: (p, v) => `${UI.field('d-objet', 'Objet', v.objet, { full: true, placeholder: 'Ex : avis cardiologique' })}${UI.field('d-texte', 'Lettre', v.texte, { type: 'textarea', full: true, attrs: 'style="min-height:16rem"' })}${UI.field('d-date', 'Date', v.date, { type: 'date' })}`,
    read: () => ({ objet: $('#d-objet').value.trim(), texte: $('#d-texte').value, date: $('#d-date').value || todayISO() }),
    body: (p, v) => `<div class="rx-date">${esc(Store.s.lieuFr || '')}, le <b class="fill">${dmy(v.date)}</b></div>
      ${v.objet ? `<p class="letter-obj"><b>Objet :</b> ${esc(v.objet)}</p>` : ''}
      <div class="letter-text">${nl2br(v.texte)}</div>
      <div class="cert-sign">Dr ${esc(titleCaseName(Store.s.nom))} ${esc(titleCaseName(Store.s.prenom))}</div>`,
  },

  libre: {
    init: () => ({ titre: 'Certificat Medical', texte: '', date: todayISO() }),
    fields: (p, v) => `${UI.field('d-titre', 'Titre', v.titre, { full: true })}${UI.field('d-texte', 'Texte', v.texte, { type: 'textarea', full: true, attrs: 'style="min-height:16rem"' })}${UI.field('d-date', 'Date', v.date, { type: 'date' })}`,
    read: () => ({ titre: $('#d-titre').value.trim(), texte: $('#d-texte').value, date: $('#d-date').value || todayISO() }),
    body: (p, v) => `<div class="cert-title">${esc(v.titre)}</div><div class="letter-text">${nl2br(v.texte)}</div>
      <div class="cert-sign">Fait à ${esc(Store.s.lieuFr || '')} , le ${dots(dmy(v.date), 20)}</div>`,
  },
};

function langChoice(v) {
  return `<div class="field full"><label>Langue du document</label><div class="seg">
    <label><input type="radio" name="d-langue" value="ar" ${v.langue !== 'fr' ? 'checked' : ''}/> <span lang="ar" style="font-family:'Amiri',serif;font-size:1.15rem">العربية</span></label>
    <label><input type="radio" name="d-langue" value="fr" ${v.langue === 'fr' ? 'checked' : ''}/> Français</label></div></div>`;
}
function readLang() { return document.querySelector('input[name=d-langue]:checked')?.value || 'ar'; }
const frBox = (on, big) => `<span class="box ${big ? 'big' : ''} ${on ? 'on' : ''}">${on ? '✓' : ''}</span>`;
const drFr = () => `Docteur ${titleCaseName(Store.s.prenom)} ${titleCaseName(Store.s.nom)}`;
const signFr = (date, big) => `<div class="fr-sign ${big ? 'big' : ''}"><span>${esc(drFr())}</span><span>Fait à ${esc(Store.s.lieuFr || '')}, le ${dmy(date)}</span></div>`;

const FR = {
  prenuptial(p, v) {
    const s = Store.s;
    const EXAMS = ['Groupe sanguin', 'Hépatites virales B et C', 'Radiographie du thorax', 'Autres examens'];
    const DECL = [
      "informé l'intéressé(e) des résultats des examens cliniques et complémentaires et des mesures permettant de prévenir ou de limiter leurs risques pour lui-même (elle-même), son conjoint et ses enfants ;",
      "attiré l'attention de la future épouse sur le risque de rubéole au cours de la grossesse et l'avoir informée de l'existence d'un vaccin ;",
      "insisté sur les facteurs de risque prédisposant à certaines maladies (diabète, hypertension artérielle, etc.) ;",
      "conseillé à l'intéressé(e) la vaccination contre l'hépatite B ;",
      "donné des conseils sur les facteurs héréditaires, y compris ceux liés à la consanguinité entre les futurs époux, ainsi que sur les méthodes de planification familiale, et insisté sur la nécessité du suivi de la grossesse.",
    ];
    return `<div class="fr-title">Certificat Médical Prénuptial</div>
      <div class="fr-text compact">
        <p>Je soussigné, ${esc(drFr())}, docteur en médecine générale, inscrit au Conseil de l'Ordre des Médecins sous le n° ${esc(s.ordre || '')}, domicilié à ${esc(s.adresseFooterFr || '')},</p>
        <p>certifie avoir examiné, en vue du mariage, Mr/Mme : ${dots(v.nom, 35)}</p>
        <p>né(e) le ${dots(dmy(v.naissance), 16)} à ${dots(v.lieu, 18)}</p>
        <p>demeurant à ${dots(v.adresse, 40)}</p>
        <p>titulaire de la CIN n° ${dots(v.cin, 14)} délivrée à ${dots(v.cinLieu, 14)} le ${dots(dmy(v.cinDate), 12)}</p>
        <p>Le présent certificat a été établi après un interrogatoire minutieux, un examen clinique complet et la prise de connaissance des résultats des examens complémentaires suivants :</p>
        <div class="fr-list">${EXAMS.map((e, i) => `<div>${frBox(v.exams[i])}<span>${e}${i === 3 && v.exams[3] && v.autres ? ` : ${esc(v.autres)}` : ''}</span></div>`).join('')}</div>
        <p>Je déclare en outre avoir :</p>
        <div class="fr-list">${DECL.map((e, i) => `<div>${frBox(v.decl[i])}<span>${e}</span></div>`).join('')}</div>
        <p>En foi de quoi, le présent certificat a été remis directement à l'intéressé(e) pour servir et valoir ce que de droit.</p>
      </div>
      ${signFr(v.date)}
      <p class="ar-note fr-note">Note : est puni d'un emprisonnement d'un à trois ans quiconque, se sachant atteint d'une maladie transmissible, cherche délibérément, par son comportement, à la transmettre à autrui (loi n° 92-71 du 27 juillet 1992 relative aux maladies transmissibles, articles 11 et 18).</p>`;
  },

  aptitude(p, v) {
    return `<div class="fr-title big">Certificat Médical</div>
      <div class="fr-text big">
        <p>Le ${esc(drFr())} certifie,</p>
        <p>après avoir examiné Mr/Mme/Mlle : ${dots(v.nom, 35)}</p>
        <p>que l'intéressé(e) est indemne de :</p>
        <div class="fr-dash">
          <div>- toute infirmité apparente ou cachée,</div>
          <div>- paralysie,</div>
          <div>- affections pulmonaires et cancéreuses, ou en est définitivement guéri(e),</div>
          <div>- jouit de toutes ses facultés mentales,</div>
          <div>- est apte à exercer ses fonctions dans les conditions requises sur l'ensemble du territoire de la République tunisienne.</div>
        </div>
      </div>
      ${signFr(v.date, true)}`;
  },

  conduite(p, v) {
    const s = Store.s, d = v.decision, pub = k => d === 'public' ? v.pub[k] : '';
    return `<div class="fr-title">Certificat médical pour l'obtention ou le renouvellement du permis de conduire</div>
      <div class="fr-text">
        <p>Je soussigné, ${esc(drFr())}, médecin inscrit au tableau national de l'Ordre des Médecins sous le n° ${esc(s.ordre || '')},</p>
        <p>certifie avoir examiné Mr/Mme ${dots(v.nom, 30)} né(e) le ${dots(dmy(v.naissance), 14)} à ${dots(v.lieu, 16)}</p>
        <p>titulaire de la CIN n° ${dots(v.cin, 14)} délivrée à ${dots(v.cinLieu, 14)} le ${dots(dmy(v.cinDate), 12)}</p>
        <p>et après avoir pris connaissance des résultats des examens et analyses complémentaires (le cas échéant) ainsi que de la déclaration du (de la) candidat(e) sur son état de santé, et conformément aux dispositions de l'annexe n° 1 de l'arrêté conjoint des ministres du Transport et de la Santé publique du 16 août 2002, déclare que l'intéressé(e) est :</p>
        <div class="fr-list">
          <div>${frBox(d === 'apte', true)}<span>apte à la conduite des véhicules du :</span></div>
          <div class="indent">${frBox(d === 'apte' && v.g1)}<span>Groupe 1 (catégories A1, A, B et H)</span></div>
          <div class="indent">${frBox(d === 'apte' && v.g2)}<span>Groupe 2 (catégories C, C+E, D, D1 et D+E)</span></div>
          <div>${frBox(d === 'public', true)}<span>apte à la conduite publique du groupe ${dots(pub('groupe'), 8)} conformément aux dispositions du sous-paragraphe ${dots(pub('sousPar'), 8)} du paragraphe ${dots(pub('par'), 6)} de la section n° ${dots(pub('section'), 6)} de l'annexe n° ${dots(pub('annexe'), 6)} de l'arrêté susvisé</span></div>
          <div>${frBox(d === 'examen', true)}<span>tenu(e) de subir un examen complémentaire par un spécialiste en ${dots(d === 'examen' ? v.specExamen : '', 24)}</span></div>
          <div>${frBox(d === 'commission', true)}<span>tenu(e) de se présenter devant la commission compétente, muni(e) d'un certificat médical délivré par un spécialiste en ${dots(d === 'commission' ? v.specCommission : '', 20)}</span></div>
          <div>${frBox(d === 'inapte', true)}<span>inapte à la conduite des véhicules</span></div>
        </div>
      </div>
      ${signFr(v.date)}`;
  },
};

function civil(p) { return `${p.prenom} ${p.nom.toUpperCase()}`; }
function titleCaseName(s) { return String(s || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()); }
function nombreEnLettres(n) {
  const u = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
  if (n <= 20) return u[n];
  if (n === 21) return 'vingt et un';
  if (n < 30) return 'vingt-' + u[n - 20];
  if (n === 30) return 'trente';
  if (n === 31) return 'trente et un';
  if (n < 40) return 'trente-' + u[n - 30];
  if (n === 45) return 'quarante-cinq';
  if (n === 60) return 'soixante';
  if (n === 90) return 'quatre-vingt-dix';
  return String(n);
}

/* ══════════════ Écran « document » : cases à gauche, aperçu de la page à droite ══════════════ */
Views.document = function (type, pid) {
  const t = Docs.TYPES[type], F = DocForms[type], p = Store.patient(pid);
  if (!t || !F || !p) { $('#main').innerHTML = '<p class="empty">Document introuvable.</p>'; return; }
  const v = F.init(p);
  $('#main').innerHTML = `
    <a class="back" href="#/patient/${p.id}"><i class="fa-solid fa-arrow-left"></i> Retour au dossier</a>
    <div class="page-head"><div><h1>${t.titre}</h1><p>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</p></div>
      <button class="btn btn-primary btn-big" id="doc-print"><i class="fa-solid fa-print"></i> Imprimer</button></div>
    <div class="doc-layout">
      <div class="card"><div class="form" id="doc-form">${F.fields(p, v)}</div></div>
      <div class="doc-preview-wrap"><p class="muted doc-preview-label"><i class="fa-regular fa-eye"></i> Aperçu (${t.size})</p><div class="doc-preview" id="doc-preview"></div></div>
    </div>`;
  const prev = $('#doc-preview');
  const render = () => {
    const val = F.read();
    prev.innerHTML = Docs.sheet(t.size, F.body(p, val), { cnam: !!F.cnam, lang: val.langue || t.lang });
    const sh = prev.firstElementChild;
    const scale = Math.min(1.4, prev.clientWidth / sh.offsetWidth);
    sh.style.transform = `scale(${scale})`;
    prev.style.height = (sh.offsetHeight * scale) + 'px';
    return val;
  };
  if (F.mount) F.mount(v, () => render());
  $('#doc-form').addEventListener('input', render);
  $('#doc-form').addEventListener('change', render);
  addEventListener('resize', render, { once: true });
  render();
  $('#doc-print').onclick = async () => {
    const val = render();
    const d = Store.data;
    // Ce qu'on apprend sur le patient est gardé dans sa fiche pour la prochaine fois
    if (val.cin && val.cin !== p.cin) p.cin = val.cin;
    if (val.lieu && val.lieu !== p.lieuNaissance) p.lieuNaissance = val.lieu;
    if (type === 'ordonnance') {
      const rx = Docs.rxFromText(val.texte);
      if (!rx.lignes.length) return UI.alert('Ordonnance vide', 'Écrivez au moins un médicament.');
      const id = Store.nextId('visites');
      d.visites.push({ id, patientId: p.id, date: `${val.date}T${nowTime()}`, motif: 'Ordonnance', interrogatoire: '', examen: '', conclusions: '', notes: '' });
      d.ordonnances.push({ id: Store.nextId('ordonnances'), visiteId: id, patientId: p.id, date: val.date, ...rx });
    }
    d.documents.push({ id: Store.nextId('documents'), patientId: p.id, type, date: val.date || todayISO(), valeurs: val });
    await Store.save('patients', 'documents', 'visites', 'ordonnances');
    Docs.print(t.size, Docs.sheet(t.size, F.body(p, val), { cnam: !!F.cnam, lang: val.langue || t.lang }));
  };
};

/* Réimpression d'un document déjà remis */
Docs.reprint = function (docId) {
  const doc = Store.data.documents.find(x => x.id == docId); if (!doc) return;
  const t = Docs.TYPES[doc.type], F = DocForms[doc.type], p = Store.patient(doc.patientId);
  if (!t || !F || !p) return;
  Docs.print(t.size, Docs.sheet(t.size, F.body(p, doc.valeurs), { cnam: !!F.cnam, lang: doc.valeurs.langue || t.lang }));
};
