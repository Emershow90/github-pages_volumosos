with open('src/App.tsx', 'r') as f:
    content = f.read()

bad_str = """              onSetColaboradores={(cols) => setColaboradores(cols            </ProtectedRoute>
          )}
              currentRole={currentRole}
            />
          )}"""

good_str = """              onSetColaboradores={(cols) => setColaboradores(cols)}
              currentRole={currentRole}
            />
            </ProtectedRoute>
          )}"""

content = content.replace(bad_str, good_str)

with open('src/App.tsx', 'w') as f:
    f.write(content)
