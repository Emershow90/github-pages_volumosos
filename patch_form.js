const fs = require('fs');
let code = fs.readFileSync('src/components/OverrideOperacionalForm.tsx', 'utf8');

// replace the outer wrapper and remove header with X button
code = code.replace(
  /<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black\/80 backdrop-blur-sm">\s*<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-\[90vh\]">\s*\{\/\* Header \*\/\}[\s\S]*?\{\/\* Body \*\/\}[\s\S]*?<div className="p-6 overflow-y-auto custom-scrollbar">/,
  '<div className="bg-zinc-900/60 border border-white/5 rounded-xl w-full max-w-lg mx-auto shadow-2xl overflow-hidden flex flex-col">\n<div className="p-6">'
);

// wait, the file has 2 closing divs at the end for these wrappers
code = code.replace(/<\/div>\s*<\/div>\s*\);/g, '</div>\</div>\n  );');

fs.writeFileSync('src/components/OverrideOperacionalForm.tsx', code);
