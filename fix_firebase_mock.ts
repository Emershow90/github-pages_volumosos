import fs from 'fs';

let pathAuth = 'src/lib/firebaseAuth.ts';
let codeAuth = fs.readFileSync(pathAuth, 'utf8');

// Replace googleSignIn
codeAuth = codeAuth.replace(
  'export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {',
  'export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {\n  if (isStaticBuild) {\n    const mockUser = { uid: "local-google", email: "google@local.com", displayName: "Usuário Google Local", getIdToken: async () => "local-token" } as any;\n    return { user: mockUser, accessToken: "mock-token" };\n  }'
);

fs.writeFileSync(pathAuth, codeAuth);
