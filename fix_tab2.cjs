const fs = require('fs');
let content = fs.readFileSync('src/components/ApresentacaoAtividadeTab.tsx', 'utf8');

content = content.replace(
  /const currentUserId = \(currentUser as any\)\?\.id \|\| \(currentUser as any\)\?\.uid \|\| 'unknown';/,
  `const currentUserId = currentUser?.uid || '';`
);

fs.writeFileSync('src/components/ApresentacaoAtividadeTab.tsx', content);
