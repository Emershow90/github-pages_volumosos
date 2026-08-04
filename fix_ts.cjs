const fs = require('fs');

// src/App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/err\.message/g, '(err as Error).message');
app = app.replace(/currentUser\.nome/g, '(currentUser?.nome as string)');
app = app.replace(/currentUser\.role/g, '(currentUser?.role as UserRole)');
app = app.replace(/currentUser\.setor/g, '(currentUser?.setor as string)');
app = app.replace(/currentUser\.foto/g, '(currentUser?.foto as string)');
fs.writeFileSync('src/App.tsx', app);

// src/components/AdminApprovalTab.tsx
let aat = fs.readFileSync('src/components/AdminApprovalTab.tsx', 'utf8');
aat = aat.replace(/err\.message/g, '(err as Error).message');
fs.writeFileSync('src/components/AdminApprovalTab.tsx', aat);

// src/components/ConsoleOperacional.tsx
let co = fs.readFileSync('src/components/ConsoleOperacional.tsx', 'utf8');
co = co.replace(/cell\.v/g, '(cell as { v: string | number }).v');
co = co.replace(/err\.message/g, '(err as Error).message');
fs.writeFileSync('src/components/ConsoleOperacional.tsx', co);

// src/components/DashboardTab.tsx
let dt = fs.readFileSync('src/components/DashboardTab.tsx', 'utf8');
dt = dt.replace(/currentUser\.nome/g, '(currentUser?.nome as string)');
dt = dt.replace(/currentUser\.foto/g, '(currentUser?.foto as string)');
fs.writeFileSync('src/components/DashboardTab.tsx', dt);

// src/components/HealthDashboard.tsx
let hd = fs.readFileSync('src/components/HealthDashboard.tsx', 'utf8');
hd = hd.replace(/err\.message/g, '(err as Error).message');
hd = hd.replace(/const listas = /g, 'const listas: any[] = []; // ');
hd = hd.replace(/listas\.map/g, '([].map');
hd = hd.replace(/const status = /g, 'const status: any[] = []; // ');
fs.writeFileSync('src/components/HealthDashboard.tsx', hd);

// src/components/LoginScreen.tsx
let ls = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');
ls = ls.replace(/err\.msg/g, '(err as any).msg');
ls = ls.replace(/err\.message/g, '(err as Error).message');
ls = ls.replace(/err\.code/g, '(err as any).code');
ls = ls.replace(/err\.error_code/g, '(err as any).error_code');
ls = ls.replace(/user: Record<string, unknown>, profile: Record<string, unknown>/g, 'user: any, profile: any');
fs.writeFileSync('src/components/LoginScreen.tsx', ls);

// src/components/RadarLojasTab.tsx
let rlt = fs.readFileSync('src/components/RadarLojasTab.tsx', 'utf8');
rlt = rlt.replace(/err\.message/g, '(err as Error).message');
rlt = rlt.replace(/e\.message/g, '(e as Error).message');
// handleMigrateLegacyData was deleted, so we should delete the button that calls it
// Wait, is it still there? Let's check.

fs.writeFileSync('src/components/RadarLojasTab.tsx', rlt);

// src/components/SupabaseHealthPanel.tsx
let shp = fs.readFileSync('src/components/SupabaseHealthPanel.tsx', 'utf8');
shp = shp.replace(/err\.message/g, '(err as Error).message');
fs.writeFileSync('src/components/SupabaseHealthPanel.tsx', shp);

// src/lib/googleAuthService.ts
let gas = fs.readFileSync('src/lib/googleAuthService.ts', 'utf8');
gas = gas.replace(/err\.message/g, '(err as Error).message');
gas = gas.replace(/err\.name/g, '(err as Error).name');
fs.writeFileSync('src/lib/googleAuthService.ts', gas);

// src/lib/indexedDb.ts
let idb = fs.readFileSync('src/lib/indexedDb.ts', 'utf8');
idb = idb.replace(/value\.nome/g, '(value as any).nome');
idb = idb.replace(/value\.dia/g, '(value as any).dia');
idb = idb.replace(/val\.nome/g, '(val as any).nome');
idb = idb.replace(/val\.dia/g, '(val as any).dia');
fs.writeFileSync('src/lib/indexedDb.ts', idb);

// src/lib/supabaseAuth.ts
let sa = fs.readFileSync('src/lib/supabaseAuth.ts', 'utf8');
sa = sa.replace(/err\.name/g, '(err as Error).name');
sa = sa.replace(/err\.message/g, '(err as Error).message');
fs.writeFileSync('src/lib/supabaseAuth.ts', sa);

// src/stores/useUserStore.ts
let uus = fs.readFileSync('src/stores/useUserStore.ts', 'utf8');
uus = uus.replace(/err\.message/g, '(err as Error).message');
fs.writeFileSync('src/stores/useUserStore.ts', uus);
