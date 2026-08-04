const fs = require('fs');
let file = fs.readFileSync('src/components/AdminAndSupportTabs.tsx', 'utf8');

const regex = /      \{\/\* GOOGLE SHEETS SYNCHRONIZATION INTEGRATION CARD \*\/\}[\s\S]*?      \{\/\* FILTER & SEARCH BAR \*\/\}/m;
file = file.replace(regex, '      {/* FILTER & SEARCH BAR */}');

fs.writeFileSync('src/components/AdminAndSupportTabs.tsx', file);
