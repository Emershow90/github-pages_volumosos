import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add currentStatus state
content = content.replace(
    'const [currentRole, setCurrentRole] = useState<UserRole>(() => (localStorage.getItem("current_role") as UserRole) || UserRole.Admin);',
    'const [currentRole, setCurrentRole] = useState<UserRole>(() => (localStorage.getItem("current_role") as UserRole) || UserRole.Admin);\n  const [currentStatus, setCurrentStatus] = useState<string>(() => localStorage.getItem("current_status") || "Pendente");'
)

# Update auth.onAuthStateChanged
content = content.replace(
    '''        const profile = await ensureUserProfile(user);
        if (profile) {
          setCurrentUser(profile.nome);
          setCurrentRole(profile.role);
        }''',
    '''        const profile = await ensureUserProfile(user);
        if (profile) {
          setCurrentUser(profile.nome);
          setCurrentRole(profile.role);
          setCurrentStatus(profile.situacao);
        }'''
)

# Update onAuthSuccess
content = content.replace(
    '''            setCurrentUser(profile.nome);
            setCurrentRole(profile.role);
          } else {
            const p = await getUserProfile(user.uid) || await ensureUserProfile(user);
            setCurrentUser(p.nome);
            setCurrentRole(p.role);
          }''',
    '''            setCurrentUser(profile.nome);
            setCurrentRole(profile.role);
            setCurrentStatus(profile.situacao);
          } else {
            const p = await getUserProfile(user.uid) || await ensureUserProfile(user);
            setCurrentUser(p.nome);
            setCurrentRole(p.role);
            setCurrentStatus(p.situacao);
          }'''
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
