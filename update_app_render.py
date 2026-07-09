import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Render Pending screen if currentStatus is 'Pendente'
# We find `if (!fbUser) {` and place it right after the LoginScreen condition
search_str = """  if (!fbUser) {
    return (
      <LoginScreen 
        onAuthSuccess={async (user, profile) => {
          setFbUser(user);
          if (profile) {
            setCurrentUser(profile.nome);
            setCurrentRole(profile.role);
            setCurrentStatus(profile.situacao);
          } else {
            const p = await getUserProfile(user.uid) || await ensureUserProfile(user);
            setCurrentUser(p.nome);
            setCurrentRole(p.role);
            setCurrentStatus(p.situacao);
          }
        }} 
      />
    );
  }"""

replace_str = search_str + """

  if (currentStatus === "Pendente") {
    return (
      <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-black/40 border border-amber-500/30 p-8 rounded-2xl text-center max-w-md backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <span className="text-amber-500 text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Acesso Pendente</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Seu cadastro foi realizado com sucesso e está aguardando aprovação de um Administrador.
            Você será notificado quando seu acesso for liberado.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-white/10"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }
"""

content = content.replace(search_str, replace_str)

# Save the currentStatus in localStorage useEffect
content = content.replace(
    'localStorage.setItem("current_role", currentRole);',
    'localStorage.setItem("current_role", currentRole);\n    localStorage.setItem("current_status", currentStatus);'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
