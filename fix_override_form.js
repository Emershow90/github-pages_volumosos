const fs = require('fs');
let content = fs.readFileSync('src/components/OverrideOperacionalForm.tsx', 'utf8');

// 1. Add currentUser
content = content.replace(
  'onClose?: () => void;\n}',
  'onClose?: () => void;\n  currentUser: string;\n}'
);

content = content.replace(
  '  onClose,\n}) => {',
  '  onClose,\n  currentUser,\n}) => {'
);

// 2. Remove false suggestions states
content = content.replace(/  const \[suggestedPromessa, setSuggestedPromessa\] = useState<string>\(''\);\n/g, '');
content = content.replace(/  const \[suggestedBsi, setSuggestedBsi\] = useState<string>\(''\);\n/g, '');
content = content.replace(/  const \[suggestedErros, setSuggestedErros\] = useState<string>\(''\);\n/g, '');

content = content.replace(/  const \[isPromessaSuggested, setIsPromessaSuggested\] = useState\(false\);\n/g, '');
content = content.replace(/  const \[isBsiSuggested, setIsBsiSuggested\] = useState\(false\);\n/g, '');
content = content.replace(/  const \[isErrosSuggested, setIsErrosSuggested\] = useState\(false\);\n/g, '');

content = content.replace(/    setSuggestedPromessa\(''\);\n/g, '');
content = content.replace(/    setSuggestedBsi\(''\);\n/g, '');
content = content.replace(/    setSuggestedErros\(''\);\n/g, '');
content = content.replace(/    setIsPromessaSuggested\(false\);\n/g, '');
content = content.replace(/    setIsBsiSuggested\(false\);\n/g, '');
content = content.replace(/    setIsErrosSuggested\(false\);\n/g, '');

// 3. Remove from useEffect (publicMetrics)
content = content.replace(/      const promStr = pub\.promessa !== null && pub\.promessa !== undefined \? pub\.promessa\.toString\(\) : '95';\n/g, '');
content = content.replace(/      const bsiStr = pub\.bsi !== null && pub\.bsi !== undefined \? pub\.bsi\.toString\(\) : '0';\n/g, '');
content = content.replace(/      const errStr = pub\.errosPicking !== null && pub\.errosPicking !== undefined \? pub\.errosPicking\.toString\(\) : '0';\n/g, '');

// The object spread updating formData
content = content.replace(/        promessa: promStr,\n/g, '');
content = content.replace(/        bsi: bsiStr,\n/g, '');
content = content.replace(/        errosPicking: errStr,\n/g, '');

// The if (field === 'promessa') ...
content = content.replace(/    if \(field === 'promessa' && isPromessaSuggested && value !== suggestedPromessa\) \{\n      setIsPromessaSuggested\(false\);\n    \}\n/g, '');
content = content.replace(/    if \(field === 'bsi' && isBsiSuggested && value !== suggestedBsi\) \{\n      setIsBsiSuggested\(false\);\n    \}\n/g, '');
content = content.replace(/    if \(field === 'errosPicking' && isErrosSuggested && value !== suggestedErros\) \{\n      setIsErrosSuggested\(false\);\n    \}\n/g, '');

// 4. Update the summary check
content = content.replace(
  /                      \(field === 'promessa' && isPromessaSuggested\) \|\|\n                      \(field === 'bsi' && isBsiSuggested\) \|\|\n                      \(field === 'errosPicking' && isErrosSuggested\);/g,
  ';'
);

// 5. Update FieldInput badges for those three
content = content.replace(/                       badge=\{isPromessaSuggested \? "Sugerido pela Planilha" : undefined\}\n/g, '');
content = content.replace(/                       badge=\{isBsiSuggested \? "Sugerido pela Planilha" : undefined\}\n/g, '');
content = content.replace(/                       badge=\{isErrosSuggested \? "Sugerido pela Planilha" : undefined\}\n/g, '');

// 6. Update user in audit
content = content.replace(/usuario: 'operador@sistema\.local',/g, 'usuario: currentUser,');

fs.writeFileSync('src/components/OverrideOperacionalForm.tsx', content);
