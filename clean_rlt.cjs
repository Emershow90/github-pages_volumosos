const fs = require('fs');
let rlt = fs.readFileSync('src/components/RadarLojasTab.tsx', 'utf8');

rlt = rlt.replace(/<button\s*onClick=\{handleMigrateLegacyData\}\s*className="w-full bg-indigo-900\/30 hover:bg-indigo-900\/50 border border-indigo-500\/30 text-indigo-300 font-bold text-xs py-2 rounded-lg uppercase tracking-wider transition"\s*>\s*Sincronizar Dados Legados \(Bolsão D\+1\)\s*<\/button>/g, '<div className="text-zinc-600 text-xs italic">Migração desabilitada.</div>');

fs.writeFileSync('src/components/RadarLojasTab.tsx', rlt);
