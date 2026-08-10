const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The useEffect for setores
code = code.replace(/  useEffect\(\(\) => \{\n    if \(authLoading \|\| !fbUser\) return;\n    if \(setores && setores\.length > 0\) \{\n      FirebaseService\.upsert\("setores", setores\)\.catch\(\(err\) => \{\n        console\.error\("Failed to push sectors to DB:", err\);\n      \}\);\n    \}\n  \}, \[setores, fbUser, authLoading\]\);\n/, '');

// The useEffect for referentesSemana
code = code.replace(/  useEffect\(\(\) => \{\n    if \(authLoading \|\| !fbUser\) return;\n    if \(referentesSemana && referentesSemana\.length > 0\) \{\n      FirebaseService\.upsert\("escalas_referentes", referentesSemana, "dia"\)\.catch\(\(err\) => \{\n        console\.error\("Failed to push schedule to DB:", err\);\n      \}\);\n    \}\n  \}, \[referentesSemana, fbUser, authLoading\]\);\n/, '');

fs.writeFileSync('src/App.tsx', code);
