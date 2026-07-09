with open('src/App.tsx', 'r') as f:
    content = f.read()

bad_str = """                return (
                  <div key={i} className={`whitespace-pre-wrap ${colorClass}`}>
                    {log}
                  </div>
                );
              })
            </ProtectedRoute>
          )}
            </div>
            <form onSubmit={handleTerminalSubmit} className="flex gap-2">"""

good_str = """                return (
                  <div key={i} className={`whitespace-pre-wrap ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleTerminalSubmit} className="flex gap-2">"""

content = content.replace(bad_str, good_str)

with open('src/App.tsx', 'w') as f:
    f.write(content)
