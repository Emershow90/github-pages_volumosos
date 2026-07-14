import fs from 'fs';

let pathAuth = 'src/lib/firebaseAuth.ts';
let codeAuth = fs.readFileSync(pathAuth, 'utf8');

if (!codeAuth.includes('export const isStaticBuild')) {
  codeAuth = codeAuth.replace(
    'const firebaseConfig = {',
    'export const isStaticBuild = !metaEnv.VITE_FIREBASE_API_KEY;\nconst firebaseConfig = {'
  );
  fs.writeFileSync(pathAuth, codeAuth);
}

let pathSvc = 'src/lib/firebaseService.ts';
let codeSvc = fs.readFileSync(pathSvc, 'utf8');

if (!codeSvc.includes('isStaticBuild')) {
  codeSvc = codeSvc.replace(
    "import { db, auth } from './firebaseAuth';",
    "import { db, auth, isStaticBuild } from './firebaseAuth';"
  );
  codeSvc = codeSvc.replace(
    /export const isOnline = \(\): boolean => \{/,
    'export const isOnline = (): boolean => {\n  if (isStaticBuild) return false;'
  );
  fs.writeFileSync(pathSvc, codeSvc);
}
