const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /{activeTab === "([a-zA-Z0-9_]+)" && (\([\s\S]*?}\s*\)|<[A-Za-z]+[^>]*\/>)}/g;

content = content.replace(regex, (match, tab, inner) => {
    let allowedRoles = "[]";
    if (["radar_lojas_live", "capacidade", "produtividade", "mix", "copil"].includes(tab)) {
        allowedRoles = "[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]";
    } else if (["dashboard", "executivo", "analytics"].includes(tab)) {
        allowedRoles = "[UserRole.Admin, UserRole.Coordenador, UserRole.Referente]";
    } else if (["equipa", "historico", "alerts", "audit", "relatorios", "config"].includes(tab)) {
        allowedRoles = "[UserRole.Admin]";
    } else {
        return match;
    }

    return `{activeTab === "${tab}" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={${allowedRoles}}
            >
              ${inner}
            </ProtectedRoute>
          )}`;
});

fs.writeFileSync('src/App.tsx', content);
