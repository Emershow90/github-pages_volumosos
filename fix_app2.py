with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('''csv += `${g.toUpperCase(            </ProtectedRoute>
          )};${k.kpi};${k.comp};${k.real};${calcCopilNota(k)}\\n`;''', '''csv += `${g.toUpperCase()};${k.kpi};${k.comp};${k.real};${calcCopilNota(k)}\\n`;''')

with open('src/App.tsx', 'w') as f:
    f.write(content)
