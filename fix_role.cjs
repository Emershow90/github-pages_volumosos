const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');
content = content.replace(/let roleLower = String\(result\.role\)\.trim\(\)\.toLowerCase\(\);\s*if \(roleLower === 'consulta'\) \{\s*result\.role = 'Consulta';\s*\} else \{\s*result\.role = roleLower;\s*\}/g, "const r = String(result.role).trim().toLowerCase();\n        result.role = (r === 'consulta') ? 'Consulta' : r;");
fs.writeFileSync('src/lib/supabaseService.ts', content);
