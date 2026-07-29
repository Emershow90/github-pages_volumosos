const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!content.includes('ApresentacaoAtividadeTab')) {
  content = content.replace(
    /import \{ ProdutividadeTab \} from "\.\/components\/ProdutividadeTab";/,
    `import { ProdutividadeTab } from "./components/ProdutividadeTab";\nimport { ApresentacaoAtividadeTab } from "./components/ApresentacaoAtividadeTab";`
  );
}

// Add to nav
content = content.replace(
  /<div className="grid grid-cols-5 gap-1">/g,
  `<div className="grid grid-cols-6 gap-1">`
);

const navBtn = `            <button
              onClick={() => setActiveTab("apresentacao")}
              className={\`nav-btn py-1 px-1 text-[9px] \${activeTab === "apresentacao" ? "active" : ""}\`}
              title="Apresentação de Atividade"
            >
              <ClipboardList size={10} />
              <span className="truncate">Ativid.</span>
            </button>
`;

if (!content.includes('setActiveTab("apresentacao")')) {
  content = content.replace(
    /<button\s+onClick=\{\(\) => setActiveTab\("mix"\)\}/g,
    navBtn + `            <button\n              onClick={() => setActiveTab("mix")}`
  );
}

// Add render tab
const renderTab = `          {activeTab === "apresentacao" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao, UserRole.Consulta, UserRole.Guest]}
            >
              <ApresentacaoAtividadeTab
                setores={setores}
                activeSectorId={activeSectorId}
                onChangeSector={setActiveSectorId}
              />
            </ProtectedRoute>
          )}
`;
if (!content.includes('activeTab === "apresentacao" && (')) {
  content = content.replace(
    /\{activeTab === "mix" && \(/g,
    renderTab + `\n          {activeTab === "mix" && (`
  );
}

fs.writeFileSync('src/App.tsx', content);
