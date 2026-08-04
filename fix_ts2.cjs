const fs = require('fs');

// src/App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/err\.message/g, '(err as Error).message');
app = app.replace(/e\.message/g, '(e as Error).message');
fs.writeFileSync('src/App.tsx', app);

// src/components/AdminAndSupportTabs.tsx
let aat = fs.readFileSync('src/components/AdminAndSupportTabs.tsx', 'utf8');
aat = aat.replace(/  useEffect\(\(\) => \{\n    const savedId = localStorage\.getItem\("google_sheets_scale_id"\);\n    setSpreadsheetId\(savedId \|\| DEFAULT_SPREADSHEET_ID\);\n  \}, \[\]\);\n/g, '');
fs.writeFileSync('src/components/AdminAndSupportTabs.tsx', aat);

// src/components/ConsoleOperacional.tsx
let co = fs.readFileSync('src/components/ConsoleOperacional.tsx', 'utf8');
co = co.replace(/\(cell as \{ v: string \| number \}\)\.v/g, '((cell as unknown) as { v: string | number }).v');
fs.writeFileSync('src/components/ConsoleOperacional.tsx', co);

// src/components/DashboardTab.tsx
let dt = fs.readFileSync('src/components/DashboardTab.tsx', 'utf8');
dt = dt.replace(/currentUser\.setor/g, '(currentUser?.setor as string)');
fs.writeFileSync('src/components/DashboardTab.tsx', dt);

// src/components/HealthDashboard.tsx
let hd = fs.readFileSync('src/components/HealthDashboard.tsx', 'utf8');
hd = hd.replace(/const listas: any\[\] = \[\]; \/\/  = await SupabaseService.fetchTable<Record<string, unknown>>\("lista_coleta"\);\n/g, '');
hd = hd.replace(/const status: any\[\] = \[\]; \/\/  = await SupabaseService.fetchTable<Record<string, unknown>>\("radar_lojas_status"\);\n/g, '');
hd = hd.replace(/        if \(listas && listas\.length > 0\) \{[\s\S]*?        \}/g, '');
fs.writeFileSync('src/components/HealthDashboard.tsx', hd);

// src/components/LoginScreen.tsx
let ls = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');
ls = ls.replace(/\(err as any\)\.msg/g, '((err as any)?.msg)');
ls = ls.replace(/\(err as Error\)\.message/g, '((err as Error)?.message)');
fs.writeFileSync('src/components/LoginScreen.tsx', ls);

// src/components/RadarLojasTab.tsx
let rlt = fs.readFileSync('src/components/RadarLojasTab.tsx', 'utf8');
rlt = rlt.replace(/err\.message/g, '(err as Error).message');
fs.writeFileSync('src/components/RadarLojasTab.tsx', rlt);

// src/lib/googleAuthService.ts
let gas = fs.readFileSync('src/lib/googleAuthService.ts', 'utf8');
gas = gas.replace(/err\.message/g, '(err as Error).message');
gas = gas.replace(/err\.name/g, '(err as Error).name');
fs.writeFileSync('src/lib/googleAuthService.ts', gas);

