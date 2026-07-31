const fs = require('fs');
let content = fs.readFileSync('src/components/ApresentacaoAtividadeTab.tsx', 'utf8');

content = content.replace(
  /import { Setor } from '\.\.\/types';/,
  `import { Setor, UserRole } from '../types';`
);

content = content.replace(
  /const currentRole = currentUser\?\.role\?\.toLowerCase\(\) \|\| 'consulta';\s*const isReadOnly = currentRole === 'consulta' \|\| currentRole === 'guest';/,
  `const currentRole = currentUser?.role || UserRole.Consulta;
  const isReadOnly = currentRole === UserRole.Consulta || currentRole === UserRole.Guest;
  const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || 'unknown';`
);

content = content.replace(/currentUser\.uid/g, 'currentUserId');

fs.writeFileSync('src/components/ApresentacaoAtividadeTab.tsx', content);
