with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('''              onSetColaboradores={(cols) => setColaboradores(cols            </ProtectedRoute>
          )}
              currentRole={currentRole}
            />
          )}''', '''              onSetColaboradores={(cols) => setColaboradores(cols)}
              currentRole={currentRole}
            />
            </ProtectedRoute>
          )}''')

with open('src/App.tsx', 'w') as f:
    f.write(content)
