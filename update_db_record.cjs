const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');
content = content.replace(
  /\} else if \(realTable === 'audit_logs'\) \{\n\s*if \('valorAnterior' in result\) \{ result\.valor_anterior = result\.valorAnterior; delete result\.valorAnterior; \}\n\s*if \('valorNovo' in result\) \{ result\.valor_novo = result\.valorNovo; delete result\.valorNovo; \}\n\s*\}/g,
  `} else if (realTable === 'audit_logs') {
      if ('valorAnterior' in result) { result.valor_anterior = result.valorAnterior; delete result.valorAnterior; }
      if ('valorNovo' in result) { result.valor_novo = result.valorNovo; delete result.valorNovo; }
    } else if (realTable === 'activity_entries') {
      if ('sectorId' in result) { result.sector_id = result.sectorId; delete result.sectorId; }
      if ('activityDate' in result) { result.activity_date = result.activityDate; delete result.activityDate; }
      if ('userId' in result) { result.user_id = result.userId; delete result.userId; }
      if ('l7Mochila' in result) { result.l7_mochila = result.l7Mochila; delete result.l7Mochila; }
      if ('adhocCategories' in result) { result.adhoc_categories = result.adhocCategories; delete result.adhocCategories; }
      if ('createdAt' in result) { result.created_at = result.createdAt; delete result.createdAt; }
      if ('updatedAt' in result) { result.updated_at = result.updatedAt; delete result.updatedAt; }
    }`
);

content = content.replace(
  /\} else if \(realTable === 'audit_logs'\) \{\n\s*if \('valor_anterior' in result && !\('valorAnterior' in result\)\) result\.valorAnterior = result\.valor_anterior;\n\s*if \('valor_novo' in result && !\('valorNovo' in result\)\) result\.valorNovo = result\.valor_novo;\n\s*\}/g,
  `} else if (realTable === 'audit_logs') {
      if ('valor_anterior' in result && !('valorAnterior' in result)) result.valorAnterior = result.valor_anterior;
      if ('valor_novo' in result && !('valorNovo' in result)) result.valorNovo = result.valor_novo;
    } else if (realTable === 'activity_entries') {
      if ('sector_id' in result && !('sectorId' in result)) result.sectorId = result.sector_id;
      if ('activity_date' in result && !('activityDate' in result)) result.activityDate = result.activity_date;
      if ('user_id' in result && !('userId' in result)) result.userId = result.user_id;
      if ('l7_mochila' in result && !('l7Mochila' in result)) result.l7Mochila = result.l7_mochila;
      if ('adhoc_categories' in result && !('adhocCategories' in result)) result.adhocCategories = result.adhoc_categories;
      if ('created_at' in result && !('createdAt' in result)) result.createdAt = result.created_at;
      if ('updated_at' in result && !('updatedAt' in result)) result.updatedAt = result.updated_at;
    }`
);

fs.writeFileSync('src/lib/supabaseService.ts', content);
