const fs = require('fs');

const path = 'src/services/realtimeSyncService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/if \((dbOps|dbAtivs|dbSetores|dbColab|dbEscalas|rows) && \1\.length > 0\) {/g, 'if ($1) {');
content = content.replace(/if \(fresh\.length > 0\) \{/g, 'if (fresh) {');
content = content.replace(/if \(fresh\.length > 0\) useSectorStore/g, 'if (fresh) useSectorStore');
content = content.replace(/if \(fresh\.length > 0\) useHistoryStore/g, 'if (fresh) useHistoryStore');

fs.writeFileSync(path, content);
