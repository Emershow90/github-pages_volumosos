const fs = require('fs');
let content = fs.readFileSync('src/initialData.ts', 'utf8');
content = content.replace(/numero: 87,\s*resp:/g, 'numero: 87,\n    nome: "Setor 87",\n    meta: 100,\n    resp:');
content = content.replace(/numero: 88,\s*resp:/g, 'numero: 88,\n    nome: "Setor 88",\n    meta: 100,\n    resp:');
content = content.replace(/numero: 89,\s*resp:/g, 'numero: 89,\n    nome: "Setor 89",\n    meta: 100,\n    resp:');
content = content.replace(/numero: 90,\s*resp:/g, 'numero: 90,\n    nome: "Setor 90",\n    meta: 100,\n    resp:');
fs.writeFileSync('src/initialData.ts', content);
