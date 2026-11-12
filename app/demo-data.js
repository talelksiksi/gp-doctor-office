/* Données de démonstration — entièrement inventées. Aucune donnée réelle. */
const DemoData = (() => {
  let seed = 7;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

  const MEDICAMENTS = [
    ['Paracétamol 1 g', 'Antalgique', 'comprimé'], ['Paracétamol 500 mg', 'Antalgique', 'comprimé'],
    ['Ibuprofène 400 mg', 'Anti-inflammatoire', 'comprimé'], ['Diclofénac 50 mg', 'Anti-inflammatoire', 'comprimé'],
    ['Amoxicilline 1 g', 'Antibiotique', 'comprimé'], ['Amoxicilline + acide clavulanique 1 g', 'Antibiotique', 'sachet'],
    ['Azithromycine 500 mg', 'Antibiotique', 'comprimé'], ['Ciprofloxacine 500 mg', 'Antibiotique', 'comprimé'],
    ['Céfixime 200 mg', 'Antibiotique', 'comprimé'], ['Métronidazole 500 mg', 'Antibiotique', 'comprimé'],
    ['Amlodipine 5 mg', 'Antihypertenseur', 'comprimé'], ['Amlodipine 10 mg', 'Antihypertenseur', 'comprimé'],
    ['Énalapril 20 mg', 'Antihypertenseur', 'comprimé'], ['Losartan 50 mg', 'Antihypertenseur', 'comprimé'],
    ['Hydrochlorothiazide 25 mg', 'Diurétique', 'comprimé'], ['Bisoprolol 5 mg', 'Bêtabloquant', 'comprimé'],
    ['Metformine 850 mg', 'Antidiabétique', 'comprimé'], ['Metformine 1000 mg', 'Antidiabétique', 'comprimé'],
    ['Glimépiride 2 mg', 'Antidiabétique', 'comprimé'], ['Gliclazide 60 mg LM', 'Antidiabétique', 'comprimé'],
    ['Atorvastatine 20 mg', 'Hypolipémiant', 'comprimé'], ['Rosuvastatine 10 mg', 'Hypolipémiant', 'comprimé'],
    ['Acide acétylsalicylique 100 mg', 'Antiagrégant', 'sachet'], ['Oméprazole 20 mg', 'IPP', 'gélule'],
    ['Ésoméprazole 40 mg', 'IPP', 'comprimé'], ['Dompéridone 10 mg', 'Antiémétique', 'comprimé'],
    ['Phloroglucinol 80 mg', 'Antispasmodique', 'comprimé'], ['Racécadotril 100 mg', 'Antidiarrhéique', 'gélule'],
    ['Solution de réhydratation orale', 'Réhydratation', 'sachet'], ['Lopéramide 2 mg', 'Antidiarrhéique', 'gélule'],
    ['Lévothyroxine 50 µg', 'Hormone thyroïdienne', 'comprimé'], ['Salbutamol 100 µg', 'Bronchodilatateur', 'aérosol'],
    ['Budésonide 200 µg', 'Corticoïde inhalé', 'aérosol'], ['Prednisolone 20 mg', 'Corticoïde', 'comprimé'],
    ['Desloratadine 5 mg', 'Antihistaminique', 'comprimé'], ['Cétirizine 10 mg', 'Antihistaminique', 'comprimé'],
    ['Sirop antitussif', 'Antitussif', 'sirop'], ['Ambroxol 30 mg', 'Mucolytique', 'comprimé'],
    ['Sérum physiologique', 'Lavage nasal', 'unidose'], ['Vitamine D3 200 000 UI', 'Vitamine', 'ampoule buvable'],
    ['Fer + acide folique', 'Antianémique', 'comprimé'], ['Magnésium + vitamine B6', 'Complément', 'comprimé'],
    ['Allopurinol 100 mg', 'Antigoutteux', 'comprimé'], ['Colchicine 1 mg', 'Antigoutteux', 'comprimé'],
    ['Tramadol 50 mg', 'Antalgique', 'gélule'], ['Thiocolchicoside 4 mg', 'Myorelaxant', 'comprimé'],
    ['Insuline glargine 100 UI/ml', 'Insuline', 'stylo'], ['Bétaméthasone crème', 'Dermocorticoïde', 'crème'],
    ['Acide fusidique crème', 'Antibiotique local', 'crème'], ['Miconazole gel buccal', 'Antifongique', 'gel'],
  ].map(([nom, classe, forme], i) => ({ id: i + 1, nom, classe, forme }));

  const MODELES = [
    { id: 1, libelle: 'Hypertension — renouvellement', lignes: [['Amlodipine 5 mg', '1 comprimé le matin — 3 mois'], ['Énalapril 20 mg', '1 comprimé le matin — 3 mois']] },
    { id: 2, libelle: 'Diabète type 2 — renouvellement', lignes: [['Metformine 850 mg', '1 comprimé matin et soir au milieu du repas — 3 mois'], ['Glimépiride 2 mg', '1 comprimé le matin — 3 mois'], ['Atorvastatine 20 mg', '1 comprimé le soir — 3 mois']] },
    { id: 3, libelle: 'Angine bactérienne', lignes: [['Amoxicilline 1 g', '1 comprimé matin et soir pendant 6 jours'], ['Paracétamol 1 g', '1 comprimé si fièvre ou douleur, maximum 3 par jour']] },
    { id: 4, libelle: 'État grippal', lignes: [['Paracétamol 1 g', '1 comprimé 3 fois par jour pendant 5 jours'], ['Sérum physiologique', 'Lavage nasal 3 fois par jour'], ['Sirop antitussif', '1 cuillère à soupe 3 fois par jour']] },
    { id: 5, libelle: 'Gastro-entérite', lignes: [['Solution de réhydratation orale', '1 sachet dans 200 ml d\'eau après chaque selle liquide'], ['Racécadotril 100 mg', '1 gélule 3 fois par jour pendant 3 jours'], ['Dompéridone 10 mg', '1 comprimé avant les repas si nausées']] },
    { id: 6, libelle: 'Lombalgie aiguë', lignes: [['Diclofénac 50 mg', '1 comprimé matin et soir après le repas pendant 5 jours'], ['Thiocolchicoside 4 mg', '1 comprimé matin et soir pendant 5 jours'], ['Oméprazole 20 mg', '1 gélule le matin pendant 5 jours']] },
  ];

  const MOTIFS = ['Contrôle tension', 'Renouvellement ordonnance', 'Fièvre', 'Toux', 'Mal de gorge', 'Douleurs abdominales', 'Diarrhée', 'Maux de tête', 'Douleurs lombaires', 'Fatigue', 'Contrôle diabète', 'Certificat médical', 'Vertiges', 'Douleurs articulaires', 'Résultats d\'analyses'];

  const PRENOMS_H = ['Mohamed', 'Ahmed', 'Ali', 'Hédi', 'Moncef', 'Habib', 'Slah', 'Lotfi', 'Kamel', 'Mourad', 'Nabil', 'Fethi', 'Youssef', 'Sami', 'Walid', 'Anis', 'Bechir', 'Ridha'];
  const PRENOMS_F = ['Fatma', 'Aïcha', 'Zohra', 'Mabrouka', 'Najet', 'Saïda', 'Monia', 'Samia', 'Latifa', 'Hayet', 'Rim', 'Ines', 'Amel', 'Sonia', 'Nadia', 'Olfa', 'Leila', 'Khadija'];
  const NOMS = ['Ben Salem', 'Trabelsi', 'Gharbi', 'Hammami', 'Jebali', 'Mansouri', 'Ayari', 'Chaabane', 'Zouari', 'Mejri', 'Dridi', 'Brahmi', 'Haddad', 'Khelil', 'Amri', 'Ben Youssef', 'Saidi', 'Nasri', 'Guesmi', 'Ferchichi', 'Ben Hassen', 'Abidi', 'Hamdi', 'Sassi', 'Belhadj', 'Toumi'];
  const VILLES = ['Médenine', 'Zarzis', 'Djerba Houmt Souk', 'Ben Gardane', 'Tataouine', 'Gabès', 'Médenine', 'Médenine'];
  const RUES = ['Rue de la Liberté', 'Avenue Habib Bourguiba', 'Rue Ibn Khaldoun', 'Cité El Amel', 'Rue de Palestine', 'Cité Ennour', 'Rue Farhat Hached', 'Rue de Tunis'];
  const PROFESSIONS = ['Retraité', 'Enseignant', 'Commerçant', 'Agriculteur', 'Fonctionnaire', 'Femme au foyer', 'Étudiant', 'Chauffeur', 'Infirmier', 'Artisan', 'Pêcheur', 'Technicien'];
  const ASSURANCES = ['CNAM', 'CNAM', 'CNAM', 'Assurance privée', 'Sans'];

  // Profils de santé : chaque patient en reçoit un, qui guide ses consultations
  const PROFILS = [
    { nom: 'hta', ante: [['Médicaux', 'Hypertension artérielle', 'Amlodipine 5 mg + Énalapril 20 mg', 'depuis 2016']], modele: 1, motif: 'Contrôle tension' },
    { nom: 'diab', ante: [['Médicaux', 'Diabète de type 2', 'Metformine + Glimépiride', 'depuis 2014'], ['Médicaux', 'Dyslipidémie', 'Atorvastatine', 'depuis 2018']], modele: 2, motif: 'Contrôle diabète' },
    { nom: 'both', ante: [['Médicaux', 'Hypertension artérielle', 'Amlodipine', 'depuis 2012'], ['Médicaux', 'Diabète de type 2', 'Metformine', 'depuis 2015'], ['Chirurgicaux', 'Cholécystectomie', '', '2010']], modele: 2, motif: 'Renouvellement ordonnance' },
    { nom: 'aigu', ante: [], modele: null, motif: null },
    { nom: 'aigu', ante: [['Allergies', 'Allergie à la pénicilline', '', '']], modele: null, motif: null },
    { nom: 'asthme', ante: [['Médicaux', 'Asthme', 'Salbutamol à la demande', 'depuis l\'enfance'], ['Allergies', 'Allergie aux acariens', '', '']], modele: null, motif: 'Toux' },
    { nom: 'aigu', ante: [['Familiaux', 'Père diabétique', '', '']], modele: null, motif: null },
  ];
  const AIGUS = [
    { motif: 'Mal de gorge', interro: 'Odynophagie depuis 2 jours, fièvre à 38,5.', examen: 'Amygdales érythémateuses avec dépôts blanchâtres. Adénopathies sous-maxillaires.', concl: 'Angine bactérienne', modele: 3 },
    { motif: 'Fièvre', interro: 'Fièvre, courbatures et rhinorrhée depuis 3 jours.', examen: 'Gorge légèrement inflammatoire. Auscultation pulmonaire normale.', concl: 'État grippal', modele: 4 },
    { motif: 'Diarrhée', interro: 'Diarrhée liquide et nausées depuis la veille, pas de sang.', examen: 'Abdomen souple, sensible en péri-ombilical. Pas de déshydratation.', concl: 'Gastro-entérite aiguë', modele: 5 },
    { motif: 'Douleurs lombaires', interro: 'Lombalgie après effort de port de charge.', examen: 'Contracture paravertébrale. Pas de signe neurologique.', concl: 'Lombalgie aiguë commune', modele: 6 },
    { motif: 'Maux de tête', interro: 'Céphalées en fin de journée, fatigue.', examen: 'Examen neurologique normal. TA normale.', concl: 'Céphalées de tension', lignes: [['Paracétamol 1 g', '1 comprimé si douleur, maximum 3 par jour']] },
  ];

  function build() {
    seed = 7;
    const patients = [], antecedents = [], visites = [], mesures = [], ordonnances = [], rdv = [];
    let aId = 1, vId = 1, mId = 1, oId = 1;
    const N = 34;
    for (let i = 1; i <= N; i++) {
      const sexe = rnd() < 0.52 ? 'F' : 'M';
      const prenom = pick(sexe === 'F' ? PRENOMS_F : PRENOMS_H);
      const nom = pick(NOMS);
      const age = 18 + Math.floor(rnd() * 66);
      const naissance = `${new Date().getFullYear() - age}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`;
      const profil = age > 50 ? pick(PROFILS.slice(0, 3).concat(PROFILS.slice(3))) : pick(PROFILS.slice(3));
      patients.push({
        id: i, nom, prenom, sexe, naissance,
        tel: `+216 ${pick(['98', '22', '55', '97', '50'])} ${100 + Math.floor(rnd() * 899)} ${100 + Math.floor(rnd() * 899)}`,
        tel2: '', adresse: `${1 + Math.floor(rnd() * 90)} ${pick(RUES)}, ${pick(VILLES)}`,
        assurance: pick(ASSURANCES), nss: '', profession: age > 62 ? 'Retraité' : pick(PROFESSIONS),
        etatCivil: age > 28 ? pick(['Marié(e)', 'Marié(e)', 'Célibataire', 'Veuf(ve)']) : 'Célibataire',
        remarques: rnd() < 0.15 ? 'Préfère être appelé en fin de matinée.' : '',
        creeLe: iso(daysAgo(200 + Math.floor(rnd() * 1500))),
      });
      profil.ante.forEach(([type, texte, traitement, periode]) => antecedents.push({ id: aId++, patientId: i, type, texte, traitement, periode }));

      // Consultations : régulières pour les chroniques, ponctuelles sinon
      const chronique = profil.modele !== null;
      const nbVisites = chronique ? 3 + Math.floor(rnd() * 4) : 1 + Math.floor(rnd() * 3);
      let jour = 20 + Math.floor(rnd() * 700);
      const poidsBase = 58 + Math.floor(rnd() * 35);
      for (let v = 0; v < nbVisites; v++) {
        const date = daysAgo(jour);
        const heure = `${pad(8 + Math.floor(rnd() * 9))}:${pick(['00', '15', '30', '45'])}`;
        let motif, interro, examen, concl, lignes;
        if (chronique && (v % 3 !== 2 || rnd() < .5)) {
          motif = profil.motif;
          interro = pick(['Pas de plainte particulière. Bonne observance du traitement.', 'Se sent bien. Quelques vertiges le matin.', 'Observance moyenne, oublis fréquents du traitement du soir.', 'Patient en bon état général.']);
          examen = 'Auscultation cardio-pulmonaire normale. Pas d\'œdème des membres inférieurs.';
          concl = profil.nom === 'diab' || profil.nom === 'both' ? 'Diabète de type 2 équilibré. Renouvellement du traitement.' : 'HTA contrôlée. Renouvellement du traitement.';
          lignes = MODELES.find(m => m.id === profil.modele).lignes;
        } else {
          const a = pick(AIGUS);
          motif = a.motif; interro = a.interro; examen = a.examen; concl = a.concl;
          lignes = a.lignes || MODELES.find(m => m.id === a.modele).lignes;
        }
        const vis = { id: vId, patientId: i, date: `${iso(date)}T${heure}`, motif, interrogatoire: interro, examen, conclusions: concl, notes: '', honoraires: 40, paye: jour > 3 || rnd() < .7 };
        visites.push(vis);
        const tas = chronique ? 125 + Math.floor(rnd() * 35) : 110 + Math.floor(rnd() * 25);
        mesures.push({ id: mId++, patientId: i, visiteId: vId, date: iso(date), type: 'TA', valeur: `${tas}/${70 + Math.floor(rnd() * 25)}` });
        mesures.push({ id: mId++, patientId: i, visiteId: vId, date: iso(date), type: 'Poids', valeur: String(poidsBase + Math.round((rnd() - .5) * 4)) });
        mesures.push({ id: mId++, patientId: i, visiteId: vId, date: iso(date), type: 'Pouls', valeur: String(64 + Math.floor(rnd() * 26)) });
        if (profil.nom === 'diab' || profil.nom === 'both') mesures.push({ id: mId++, patientId: i, visiteId: vId, date: iso(date), type: 'Glycémie', valeur: (1 + rnd() * .9).toFixed(2) });
        if (['Fièvre', 'Mal de gorge'].includes(motif)) mesures.push({ id: mId++, patientId: i, visiteId: vId, date: iso(date), type: 'Température', valeur: (38 + rnd() * 1.4).toFixed(1) });
        ordonnances.push({ id: oId++, visiteId: vId, patientId: i, date: iso(date), lignes: lignes.map(([medicament, posologie]) => ({ medicament, posologie })) });
        vId++;
        jour = Math.max(0, jour - (chronique ? 70 + Math.floor(rnd() * 40) : 120 + Math.floor(rnd() * 200)));
        if (jour <= 1) break;
      }
    }
    // Rendez-vous : aujourd'hui, demain et après-demain
    const rdvJour = (offset, heures) => heures.forEach(h => {
      const p = patients[Math.floor(rnd() * patients.length)];
      const d = new Date(); d.setDate(d.getDate() + offset);
      rdv.push({ id: rdv.length + 1, patientId: p.id, nom: '', date: iso(d), heure: h, motif: pick(MOTIFS), present: offset === 0 && h < '10:00' });
    });
    rdvJour(0, ['08:30', '09:00', '09:30', '10:30', '11:00', '15:00', '16:30']);
    rdvJour(1, ['08:30', '09:15', '10:00', '11:30', '15:30']);
    rdvJour(2, ['09:00', '10:00', '16:00']);
    rdv.push({ id: rdv.length + 1, patientId: null, nom: 'Mme Souad Ben Ali (nouvelle patiente)', date: iso(new Date()), heure: '17:00', motif: 'Première consultation', present: false });

    return {
      patients, antecedents, visites, mesures, ordonnances, rdv,
      medicaments: MEDICAMENTS, modeles: MODELES, motifs: MOTIFS,
      settings: {
        titre: 'Docteur', prenom: 'Hédi', nom: 'Mansour', specialite: 'Médecine générale',
        adresse: '12 Avenue Habib Bourguiba', ville: '4100 Médenine', tel: '+216 75 640 000',
        honoraires: 40, pin: '1234', taillePolice: 1,
      },
      meta: { version: 1, source: 'demo' },
    };
  }
  return { build };
})();
