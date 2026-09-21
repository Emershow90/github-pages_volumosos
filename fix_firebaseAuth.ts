import fs from 'fs';

const path = 'src/lib/firebaseAuth.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const firebaseConfig = {',
  'export const isStaticBuild = !metaEnv.VITE_FIREBASE_API_KEY;\nconst firebaseConfig = {'
);

code = code.replace(
  /export const isOnline = \(\): boolean => \{/,
  'export const isOnline = (): boolean => {\n  if (isStaticBuild) return false;'
);

fs.writeFileSync(path, code);
