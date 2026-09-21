const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');
content = content.replace(
  /usuarios: \['id', 'email', 'nome', 'role', 'setoresAutorizados', 'setoresautorizados', 'situacao', 'cargo', 'unidade', 'avatar_url', 'created_at', 'updated_at'\],/,
  "usuarios: ['id', 'email', 'nome', 'role', 'setoresAutorizados', 'setoresautorizados', 'situacao', 'cargo', 'unidade', 'avatar_url', 'aprovado_por', 'data_aprovacao', 'created_at', 'updated_at'],"
);
fs.writeFileSync('src/lib/supabaseService.ts', content);
