const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  "realtimeSync.startListeningAudit();",
  "realtimeSync.startListeningAudit();\n    realtimeSync.startListeningActivityEntries();"
);
fs.writeFileSync('src/App.tsx', content);
