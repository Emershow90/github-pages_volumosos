with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('''          )};${k.kpi};${k.comp};${k.real};${calcCopilNota(k)}\\n`;''', '''          csv += `${g.toUpperCase()};${k.kpi};${k.comp};${k.real};${calcCopilNota(k)}\\n`;''')

content = content.replace('''              onBulkImportKPIs={handleBulkImportKPIs}
            />
          )}''', '''              onBulkImportKPIs={handleBulkImportKPIs}
            />
            </ProtectedRoute>
          )}''')

with open('src/App.tsx', 'w') as f:
    f.write(content)
