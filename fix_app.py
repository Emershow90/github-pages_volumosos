import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# First let's clean up the malformed one
content = content.replace('''          {activeTab === "radar_lojas_live" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
            >
              (
            <RadarLojasTab
              currentRole={currentRole}
              onSaveRadar={setRadar}
            />
          )}''', '''          {activeTab === "radar_lojas_live" && (
            <ProtectedRoute 
              userRole={currentRole} 
              allowedRoles={[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]}
            >
              <RadarLojasTab
                currentRole={currentRole}
                onSaveRadar={setRadar}
              />
            </ProtectedRoute>
          )}''')

# Now for the rest
def wrap_tab(match):
    tab = match.group(1)
    inner = match.group(2)
    if tab == "radar_lojas_live":
        return match.group(0) # already done

    allowedRoles = "[]"
    if tab in ["capacidade", "produtividade", "mix", "copil"]:
        allowedRoles = "[UserRole.Admin, UserRole.Coordenador, UserRole.Operador, UserRole.Operacao, UserRole.Expedicao]"
    elif tab in ["dashboard", "executivo", "analytics"]:
        allowedRoles = "[UserRole.Admin, UserRole.Coordenador, UserRole.Referente]"
    elif tab in ["equipa", "historico", "alerts", "audit", "relatorios", "config"]:
        allowedRoles = "[UserRole.Admin]"
    else:
        return match.group(0)
    
    # if it's already wrapped, skip
    if "<ProtectedRoute" in inner:
        return match.group(0)

    # remove leading `(` and trailing `)` if present
    inner = inner.strip()
    if inner.startswith('('):
        inner = inner[1:]
    if inner.endswith(')'):
        inner = inner[:-1]
    inner = inner.strip()

    return f'''          {{activeTab === "{tab}" && (
            <ProtectedRoute 
              userRole={{currentRole}} 
              allowedRoles={{{allowedRoles}}}
            >
              {inner}
            </ProtectedRoute>
          )}}'''

content = re.sub(r'{\s*activeTab\s*===\s*"([a-zA-Z0-9_]+)"\s*&&\s*(\([\s\S]*?\)\s*|<[A-Za-z]+[^>]*\/>)\s*}', wrap_tab, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
