const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');
content = content.replace(
  /if \('role' in result && typeof result\.role === 'string'\) \{\s*const r = String\(result\.role\)\.trim\(\)\.toLowerCase\(\);\s*result\.role = \(r === 'consulta'\) \? 'Consulta' : r;\s*\}/g,
  `if ('role' in result && typeof result.role === 'string') {
        const r = String(result.role).trim().toLowerCase();
        if (r === 'admin' || r === 'admin') result.role = 'Admin';
        else if (r === 'coordenador' || r === 'supervisor') result.role = 'Supervisor';
        else if (r === 'operador' || r === 'referente' || r === 'operacao' || r === 'expedicao') result.role = 'Operador';
        else result.role = 'Consulta';
      }`
);
fs.writeFileSync('src/lib/supabaseService.ts', content);
