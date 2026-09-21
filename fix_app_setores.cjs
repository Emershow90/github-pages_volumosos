const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  /numero: s\.numero \?\? \(parseInt\(s\.id\.replace\(\/\\D\/g, ''\)\) \|\| 0\),/g,
  `numero: s.numero ?? (parseInt(s.id.replace(/\\D/g, '')) || 0),
          nome: s.nome || ("Setor " + (s.numero || s.id)),
          meta: s.meta ?? 100,`
);
fs.writeFileSync('src/App.tsx', content);
