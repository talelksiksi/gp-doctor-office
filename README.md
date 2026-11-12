# Mon Cabinet

Logiciel de cabinet médical simple, en français, pensé pour une lecture confortable
(gros caractères, fort contraste, réglage de la taille du texte). Conçu par CICTNA RDC.

## Deux versions, un seul code

| | Démo en ligne (Vercel) | Version du cabinet (PC local) |
|---|---|---|
| Lancement | page web | double-clic sur **Ouvrir Mon Cabinet.bat** |
| Patients | fictifs, générés par `app/demo-data.js` | réels, dans `data/donnees.json` |
| Code d'accès | 1234 | choisi dans Réglages |
| Sauvegarde | navigateur uniquement | copie quotidienne dans `data/sauvegardes/` (90 jours) |

L'application détecte seule le mode : si le serveur local répond sur `/api/db`, elle utilise
les vraies données ; sinon elle passe en démonstration.

## Confidentialité

- Le dossier `data/` (base MedERP d'origine, données, sauvegardes) est exclu de git : il ne doit
  jamais être publié.
- Le serveur local n'écoute que sur `127.0.0.1` et refuse toute autre adresse.

## Fonctions

- Connexion par code à 4 chiffres sur un grand pavé numérique
- Accueil : rendez-vous du jour, salle d'attente, nombre de dossiers
- Recherche de patient par nom, prénom ou téléphone (sans accents)
- Dossier : antécédents par type, alerte allergies, dernières mesures avec évolution,
  historique des consultations avec ordonnances
- Consultation : motif, interrogatoire, examen, mesures (TA, pouls, poids, température,
  glycémie), conclusion, notes privées, ordonnance avec catalogue de médicaments,
  modèles, posologies rapides, reprise de l'ordonnance précédente
- Impression A5 : ordonnance, certificat de repos, d'aptitude, lettre à un confrère
- Agenda par jour avec heures libres, arrivée des patients
- Réglages : en-tête des ordonnances, code, modèles, sauvegarde
- Pas de gestion d'argent : petit cabinet, l'application se concentre sur les dossiers

## Reprise des données MedERP

`data/original/mederp.h2.db` (copie en lecture seule) est une base H2 (format PageStore,
H2 1.3/1.4). Étapes prévues :

1. Extraire le contenu avec l'outil de récupération H2 (`org.h2.tools.Recover`, ne demande pas
   le mot de passe) → script SQL.
2. `tools/import-mederp.js` convertit ce script en `data/donnees.json` :
   PATIENT, ANTECEDENT, VISITE, MESURE, ORDONNANCE/PRESCRIPTION, MEDICAMENT,
   MODEL_ORDONNANCE, RENDEZ_VOUS, REGLEMENT, MOTIF, USER (en-tête du médecin).
3. Vérification des nombres de lignes avant/après.
