/* Import MedERP → Mon Cabinet
   Lit les fichiers CSV exportés de l'ancienne base H2 (data/work/csv) et écrit data/donnees.json.
   Usage : node tools/import-mederp.js <dossier csv> <fichier json de sortie>
   Ne modifie jamais la base d'origine. */
'use strict';
const fs = require('fs');
const path = require('path');
const [, , csvDir, outFile] = process.argv;
if (!csvDir || !outFile) { console.error('Usage : node import-mederp.js <dossier csv> <sortie.json>'); process.exit(1); }

/* Lecteur CSV (format H2 : séparateur virgule, guillemets doublés, retours à la ligne dans les champs) */
function readCsv(name) {
  const file = path.join(csvDir, name + '.csv');
  if (!fs.existsSync(file)) return [];
  let s = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter(r => r.length > 1 || r[0]).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const clean = v => (v == null || v === 'null') ? '' : String(v).replace(/\s+$/g, '').replace(/^\s+/g, '');
const day = ts => clean(ts).slice(0, 10);
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const titleCase = s => clean(s).toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

const T = {
  patients: readCsv('PATIENT'), antecedents: readCsv('ANTECEDENT'), typesAnte: readCsv('TYPE_ANTECEDENT'),
  medicaments: readCsv('MEDICAMENT'), modeles: readCsv('MODEL_ORDONNANCE'), lignesModeles: readCsv('MODEL_PRESCRIPTION'),
  motifs: readCsv('MOTIF'), mesures: readCsv('MESURE'), typesMesure: readCsv('TYPE_MESURE'), rdv: readCsv('RENDEZ_VOUS'),
  cas: readCsv('CAS'), visites: readCsv('VISITE'), ordonnances: readCsv('ORDONNANCE'), prescriptions: readCsv('PRESCRIPTION'),
};

const ETAT = { C: 'Célibataire', M: 'Marié(e)', D: 'Divorcé(e)', V: 'Veuf(ve)' };
const patients = T.patients.map(p => ({
  id: +p.ID,
  nom: clean(p.NOM).toUpperCase(),
  prenom: titleCase(p.PRENOM),
  sexe: clean(p.SEXE).toUpperCase() === 'F' ? 'F' : 'M',
  naissance: day(p.DATE_NAISSANCE),
  tel: clean(p.TEL), tel2: clean(p.TEL2), adresse: clean(p.ADRESSE), email: clean(p.EMAIL),
  assurance: clean(p.ASSURANCE), nss: clean(p.NSS), profession: clean(p.FONCTION),
  etatCivil: ETAT[clean(p.ETAT_CIVIL).toUpperCase()] || clean(p.ETAT_CIVIL),
  remarques: clean(p.REMARQUES), creeLe: '', source: 'MedERP',
})).sort((a, b) => a.id - b.id);
const pids = new Set(patients.map(p => p.id));

const typeAnte = Object.fromEntries(T.typesAnte.map(t => [t.ID, clean(t.LIBELLE)]));
const mapType = l => { const n = l.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return n.startsWith('allerg') ? 'Allergies' : n.startsWith('chir') ? 'Chirurgicaux' : n.startsWith('fam') ? 'Familiaux' : n.startsWith('med') ? 'Médicaux' : 'Autres'; };
const antecedents = T.antecedents.filter(a => pids.has(+a.PATIENT_ID) && clean(a.ANTECEDENT)).map(a => {
  const texte = clean(a.ANTECEDENT);
  let type = mapType(typeAnte[a.TYPE_ANTECEDENT_ID] || '');
  if (/allerg/i.test(texte)) type = 'Allergies';         // les allergies saisies comme « médical » sont mises en évidence
  return { id: +a.ID, patientId: +a.PATIENT_ID, type, texte, traitement: clean(a.TRAITEMENT), periode: clean(a.PERIODE) };
});
// Épisodes (CAS) : conservés comme antécédents « Autres »
let nextAnte = antecedents.reduce((m, a) => Math.max(m, a.id), 0) + 1;
T.cas.filter(c => pids.has(+c.PATIENT_ID) && (clean(c.LIBELLE) || clean(c.DESCRIPTION))).forEach(c => antecedents.push({
  id: nextAnte++, patientId: +c.PATIENT_ID, type: 'Autres', texte: clean(c.LIBELLE) || clean(c.DESCRIPTION),
  traitement: clean(c.HISTOIRE_MALADIE), periode: day(c.DEPUIS) ? 'depuis ' + day(c.DEPUIS).split('-').reverse().join('/') : '',
}));

const medicaments = T.medicaments.map(m => ({ id: +m.ID, nom: clean(m.NOM), classe: clean(m.DCI), forme: clean(m.FORME_DOSAGE), famille: clean(m.CLASSE) }))
  .filter(m => m.nom).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

const modeles = T.modeles.map(m => ({
  id: +m.ID, libelle: clean(m.LIBELLE),
  lignes: T.lignesModeles.filter(l => l.MODEL_ORDONNANCE_ID === m.ID).sort((a, b) => +a.ID - +b.ID).map(l => [clean(l.PRESCRIPTION), clean(l.PRISE)]),
}));
const motifs = [...new Set(T.motifs.map(m => clean(m.LIBELLE)).filter(Boolean))];

// Mesures : PAS + PAD regroupées en tension « 130/80 »
const typeMes = Object.fromEntries(T.typesMesure.map(t => [t.ID, clean(t.LIBELLE).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()]));
const mesures = []; let mid = 1; const ta = {};
T.mesures.filter(m => pids.has(+m.PATIENT_ID)).forEach(m => {
  const t = typeMes[m.TYPE_MESURE_ID] || '', d = day(m.DATE_PRISE), v = num(m.VALEUR);
  if (t === 'pas' || t === 'pad') { const k = m.PATIENT_ID + '|' + d; ta[k] = ta[k] || { patientId: +m.PATIENT_ID, date: d }; ta[k][t] = v; return; }
  const type = t.startsWith('poid') ? 'Poids' : t.startsWith('taille') ? 'Taille' : t.startsWith('pouls') ? 'Pouls' : t.startsWith('temp') ? 'Température' : t.startsWith('glyc') ? 'Glycémie' : t.startsWith('chol') ? 'Cholestérol' : null;
  if (type) mesures.push({ id: mid++, patientId: +m.PATIENT_ID, visiteId: null, date: d, type, valeur: String(v) });
});
Object.values(ta).forEach(x => mesures.push({ id: mid++, patientId: x.patientId, visiteId: null, date: x.date, type: 'TA', valeur: `${x.pas ?? '?'}/${x.pad ?? '?'}` }));

// Consultations et ordonnances (vides dans cette base, mais gérées au cas où)
const visites = T.visites.map(v => {
  const cas = T.cas.find(c => c.ID === v.CAS_ID);
  return { id: +v.ID, patientId: cas ? +cas.PATIENT_ID : null, date: clean(v.DATE_VISITE).slice(0, 16).replace(' ', 'T'), motif: clean(v.MOTIF),
    interrogatoire: clean(v.INTEROGATOIRE), examen: clean(v.EXAMEN_CLINIQUE), conclusions: clean(v.CONCLUSIONS), notes: clean(v.NOTES) };
}).filter(v => pids.has(v.patientId));
const ordonnances = T.ordonnances.map(o => {
  const v = visites.find(x => x.id === +o.VISITE_ID);
  return v && { id: +o.ID, visiteId: v.id, patientId: v.patientId, date: day(o.DATE_EDITION) || v.date.slice(0, 10),
    lignes: T.prescriptions.filter(p => p.ORDONNANCE_ID === o.ID).map(p => ({ medicament: clean(p.PRESCRIPTION), posologie: clean(p.PRISE) })) };
}).filter(Boolean);

const rdv = T.rdv.filter(r => pids.has(+r.PATIENT_ID)).map(r => ({
  id: +r.ID, patientId: +r.PATIENT_ID, nom: '', date: day(r.DATE_RENDEZ_VOUS), heure: clean(r.DATE_RENDEZ_VOUS).slice(11, 16) || '09:00',
  motif: clean(r.MOTIF), present: clean(r.PRESENT) === 'TRUE',
}));

const db = {
  patients, antecedents, visites, mesures, ordonnances, rdv, medicaments, modeles, motifs,
  settings: {
    titre: 'Docteur', prenom: 'Ali', nom: 'Ksiksi', specialite: 'Médecine générale',
    adresse: 'P1, KM 491', ville: '4131 Hassi Amor — Médenine', tel: '22 101 213',
    pin: '1234', taillePolice: 1.15,
  },
  meta: { version: 1, source: 'MedERP', importeLe: new Date().toISOString() },
};

// Si un fichier existe déjà avec des données saisies, on ne l'écrase pas sans copie
if (fs.existsSync(outFile)) {
  const old = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  if ((old.visites || []).length || old.meta?.source === 'MedERP') fs.copyFileSync(outFile, outFile.replace(/\.json$/, `-avant-import-${Date.now()}.json`));
}
fs.writeFileSync(outFile, JSON.stringify(db));

console.log('Import terminé :');
for (const k of ['patients', 'antecedents', 'medicaments', 'modeles', 'motifs', 'mesures', 'rdv', 'visites', 'ordonnances'])
  console.log(`  ${k.padEnd(13)} ${String(db[k].length).padStart(6)}   (source : ${({ patients: T.patients, antecedents: T.antecedents, medicaments: T.medicaments, modeles: T.modeles, motifs: T.motifs, mesures: T.mesures, rdv: T.rdv, visites: T.visites, ordonnances: T.ordonnances })[k].length})`);
console.log(`  allergies repérées : ${antecedents.filter(a => a.type === 'Allergies').length}`);
console.log(`  patients sans date de naissance : ${patients.filter(p => !p.naissance).length}`);
