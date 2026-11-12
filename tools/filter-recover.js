// Retire du script de récupération H2 les instructions internes (stockage des LOB)
// qu'une version récente de H2 refuse de rejouer. Les données des patients ne sont pas touchées.
const fs = require('fs');
const [, , input, output] = process.argv;
const sql = fs.readFileSync(input, 'utf8');
const stmts = sql.split(/;\r?\n/);
let dropped = 0;
const kept = stmts.filter(s => {
  const bad = /INFORMATION_SCHEMA\.LOB|LOB_DATA|LOB_MAP|SYSTEM_COMBINE_BLOB|SYSTEM_COMBINE_CLOB|READ_BLOB|READ_CLOB/i.test(s);
  if (bad) dropped++;
  return !bad;
});
fs.writeFileSync(output, kept.join(';\n'));
console.log(`instructions : ${stmts.length}, retirées : ${dropped}`);
