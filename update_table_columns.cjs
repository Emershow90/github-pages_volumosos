const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');
content = content.replace(
  /override_operacional: \['chave', 'valor', 'created_at', 'updated_at'\]\n\};/,
  "override_operacional: ['chave', 'valor', 'created_at', 'updated_at'],\n  activity_entries: ['id', 'sector_id', 'activity_date', 'user_id', 'alimento', 'montanha', 'l7_mochila', 'elog', 'reapro', 'colis', 'adhoc_categories', 'created_at', 'updated_at']\n};"
);
fs.writeFileSync('src/lib/supabaseService.ts', content);
