const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');

// Replace the fromDbRecord block for usuarios
content = content.replace(
  /\} else if \(realTable === 'usuarios'\) \{\n\s*if \('setoresautorizados' in result && !\('setoresAutorizados' in result\)\) result\.setoresAutorizados = result\.setoresautorizados;\n\s*if \('role' in result && typeof result\.role === 'string'\) \{\n\s*const r = String\(result\.role\)\.trim\(\)\.toLowerCase\(\);\n\s*if \(r === 'admin' \|\| r === 'admin'\) result\.role = 'Admin';\n\s*else if \(r === 'coordenador' \|\| r === 'supervisor'\) result\.role = 'Supervisor';\n\s*else if \(r === 'operador' \|\| r === 'referente' \|\| r === 'operacao' \|\| r === 'expedicao'\) result\.role = 'Operador';\n\s*else result\.role = 'Consulta';\n\s*\}\n\s*\}/g,
  `} else if (realTable === 'usuarios') {
      if ('setoresautorizados' in result && !('setoresAutorizados' in result)) result.setoresAutorizados = result.setoresautorizados;
      if ('role' in result && typeof result.role === 'string') {
        const r = String(result.role).trim().toLowerCase();
        if (r === 'admin') result.role = 'admin';
        else if (r === 'supervisor' || r === 'coordenador') result.role = 'coordenador';
        else if (r === 'operador') result.role = 'operador';
        else result.role = 'consulta';
      }
    }`
);

fs.writeFileSync('src/lib/supabaseService.ts', content);
