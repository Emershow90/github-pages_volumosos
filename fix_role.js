const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');
content = content.replace(/let roleLower = String\(result\.role\)\.trim\(\)\.toLowerCase\(\);\n\s*if \(roleLower === 'consulta'\) \{\n\s*result\.role = 'Consulta';\n\s*\} else \{\n\s*result\.role = roleLower;\n\s*\}/g, "const r = String(result.role).trim().toLowerCase();\n        result.role = (r === 'consulta') ? 'Consulta' : r;");
fs.writeFileSync('src/lib/supabaseService.ts', content);
