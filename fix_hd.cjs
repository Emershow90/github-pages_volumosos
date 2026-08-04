const fs = require('fs');
let hd = fs.readFileSync('src/components/HealthDashboard.tsx', 'utf8');

hd = hd.replace(/      if \(!rows \|\| rows\.length === 0\) \{;          \}\);\n        \}\n      \}/g, '');
fs.writeFileSync('src/components/HealthDashboard.tsx', hd);
