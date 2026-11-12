/* Mon Cabinet — serveur local.
   Sert l'application et enregistre les données dans data/donnees.json.
   N'écoute que sur cet ordinateur (127.0.0.1) : rien n'est accessible depuis Internet. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.CABINET_PORT) || 8090;
const ROOT = __dirname;
const APP = path.join(ROOT, 'app');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'donnees.json');
const BACKUP_DIR = path.join(DATA_DIR, 'sauvegardes');
const KEEP_BACKUPS = 90;
const COLLECTIONS = ['patients', 'antecedents', 'visites', 'mesures', 'ordonnances', 'rdv', 'medicaments', 'modeles', 'motifs', 'settings'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

fs.mkdirSync(BACKUP_DIR, { recursive: true });

function emptyDb() {
  return { patients: [], antecedents: [], visites: [], mesures: [], ordonnances: [], rdv: [], medicaments: [], modeles: [], motifs: [],
    settings: { titre: 'Docteur', prenom: '', nom: '', specialite: 'Médecine générale', adresse: '', ville: '', tel: '', honoraires: 40, pin: '1234', taillePolice: 1 },
    meta: { version: 1, source: 'vide', creeLe: new Date().toISOString() } };
}

let db;
function load() {
  if (!fs.existsSync(DB_FILE)) { db = emptyDb(); write(); return; }
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function stamp(d = new Date()) { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function write() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);          // écriture atomique : jamais de fichier à moitié écrit
}
function backup(force) {
  const now = new Date();
  const name = force ? `donnees-${stamp(now)}-${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}.json` : `donnees-${stamp(now)}.json`;
  const target = path.join(BACKUP_DIR, name);
  if (!force && fs.existsSync(target)) return name;
  if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, target);
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('donnees-')).sort();
  files.slice(0, Math.max(0, files.length - KEEP_BACKUPS)).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  return name;
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 200 * 1024 * 1024) { reject(new Error('trop gros')); req.destroy(); } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

load();
backup(false);

const server = http.createServer(async (req, res) => {
  // Refuse toute requête qui ne vient pas de cet ordinateur
  const host = (req.headers.host || '').split(':')[0];
  if (!['127.0.0.1', 'localhost'].includes(host)) return send(res, 403, '{"erreur":"accès refusé"}');
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/db' && req.method === 'GET') return send(res, 200, JSON.stringify(db));
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      for (const k of Object.keys(body)) if (COLLECTIONS.includes(k)) db[k] = body[k];
      backup(false);
      write();
      return send(res, 200, '{"ok":true}');
    }
    if (url.pathname === '/api/backup' && req.method === 'POST') return send(res, 200, JSON.stringify({ ok: true, fichier: backup(true) }));

    // Fichiers de l'application
    let file = path.normalize(path.join(APP, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
    if (!file.startsWith(APP)) return send(res, 403, 'Interdit', 'text/plain');
    fs.readFile(file, (err, buf) => {
      if (err) return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
      send(res, 200, buf, TYPES[path.extname(file)] || 'application/octet-stream');
    });
  } catch (e) {
    console.error(e);
    send(res, 500, JSON.stringify({ erreur: String(e.message || e) }));
  }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log('Mon Cabinet est déjà ouvert. Ouverture de la page…');
    openBrowser(); setTimeout(() => process.exit(0), 1500);
  } else { console.error(e); }
});

function openBrowser() {
  const url = `http://127.0.0.1:${PORT}/`;
  if (process.platform === 'win32') exec(`start "" "${url}"`);
  else if (process.platform === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ==============================================');
  console.log('    MON CABINET est ouvert.');
  console.log(`    Adresse : http://127.0.0.1:${PORT}/`);
  console.log('    Laissez cette fenêtre ouverte pendant le travail.');
  console.log('    Pour arrêter : fermez cette fenêtre.');
  console.log('  ==============================================');
  console.log(`    ${db.patients.length} patients · ${db.visites.length} consultations`);
  console.log('');
  if (!process.env.CABINET_NO_BROWSER) openBrowser();
});
