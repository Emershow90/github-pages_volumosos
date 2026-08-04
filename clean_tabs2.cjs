const fs = require('fs');
let file = fs.readFileSync('src/components/AdminAndSupportTabs.tsx', 'utf8');

const regex = /      \{\/\* GOOGLE SHEETS SYNCHRONIZATION INTEGRATION CARD \*\/\}[\s\S]*?      <\/div>\n\n      \{\/\* SEARCH AND FILTER BAR \*\/\}/m;
file = file.replace(regex, '      {/* SEARCH AND FILTER BAR */}');

fs.writeFileSync('src/components/AdminAndSupportTabs.tsx', file);
