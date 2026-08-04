const fs = require('fs');
let file = fs.readFileSync('src/components/AdminAndSupportTabs.tsx', 'utf8');

file = file.replace(/  const handleGoogleLogin = async \(\) => \{[\s\S]*?  const handleOpenAdd = \(\) => \{/m, '  const handleOpenAdd = () => {');
// also remove the form/UI bits
file = file.replace(/      \{\/\* GOOGLE SHEETS SYNCHRONIZATION INTEGRATION CARD \*\/\}[\s\S]*?      \{\/\* END GOOGLE SHEETS CARD \*\/\}/m, '');

fs.writeFileSync('src/components/AdminAndSupportTabs.tsx', file);
