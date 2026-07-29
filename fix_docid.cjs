const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');

content = content.replace(
  /private static getDocId\(record: Record<string, unknown>, keyField: string = 'id'\): string \{\n\s*const idVal = record\[keyField\] \|\| record\.id \|\| record\.lista \|\| record\.chave;\n\s*return idVal \? String\(idVal\) : '';\n\s*\}/g,
  `private static getDocId(record: Record<string, unknown>, keyField: string = 'id'): string {
    if (keyField.includes(',')) {
      const keys = keyField.split(',').map(k => k.trim());
      const vals = keys.map(k => record[k] || '');
      return vals.join('_');
    }
    const idVal = record[keyField] || record.id || record.lista || record.chave;
    return idVal ? String(idVal) : '';
  }`
);

fs.writeFileSync('src/lib/supabaseService.ts', content);
