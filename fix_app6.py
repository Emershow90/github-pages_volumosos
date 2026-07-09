import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'onSetColaboradores={\(cols\) => setColaboradores\(cols\s*</ProtectedRoute>\s*\)}\s*currentRole={currentRole}\s*/>\s*)}',
    r'onSetColaboradores={(cols) => setColaboradores(cols)}\n              currentRole={currentRole}\n            />\n            </ProtectedRoute>\n          )}',
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
