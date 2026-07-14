import fs from 'fs';

let pathAuth = 'src/lib/firebaseAuth.ts';
let codeAuth = fs.readFileSync(pathAuth, 'utf8');

const mockAuthCode = `
export const auth = isStaticBuild ? {
  currentUser: null,
  onAuthStateChanged: (cb: any) => {
    // emit null initially
    setTimeout(() => cb(auth.currentUser), 100);
    return () => {};
  },
  signOut: async () => {
    (auth as any).currentUser = null;
    window.location.reload();
  }
} as any : getAuth(app);
`;

codeAuth = codeAuth.replace('export const auth = getAuth(app);', mockAuthCode);

codeAuth = codeAuth.replace(
  'export const loginWithEmail = async (email: string, password: string): Promise<User> => {\n  if (!firebaseConfig.apiKey) {',
  'export const loginWithEmail = async (email: string, password: string): Promise<User> => {\n  if (isStaticBuild) {\n    (auth as any).currentUser = { uid: "local-user", email, displayName: "Usuário Local", getIdToken: async () => "local-token" };\n    return (auth as any).currentUser;'
);

codeAuth = codeAuth.replace(
  'const mockUser = { uid: "local-google", email: "google@local.com", displayName: "Usuário Google Local", getIdToken: async () => "local-token" } as any;',
  'const mockUser = { uid: "local-google", email: "google@local.com", displayName: "Usuário Google Local", getIdToken: async () => "local-token" } as any;\n    (auth as any).currentUser = mockUser;'
);

codeAuth = codeAuth.replace(
  'export const ensureUserProfile = async (user: User): Promise<Usuario> => {',
  'export const ensureUserProfile = async (user: User): Promise<Usuario> => {\n  if (isStaticBuild) return { email: user.email || "", nome: user.displayName || "Local", role: UserRole.Admin, setoresAutorizados: ["S87", "S88", "S89", "S90"], situacao: "Ativo", cargo: "ADMINISTRADOR", unidade: "CD Principal" };'
);

fs.writeFileSync(pathAuth, codeAuth);
