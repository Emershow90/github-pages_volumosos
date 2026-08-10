import re

with open("src/components/AdminAndSupportTabs.tsx", "r") as f:
    code = f.read()

gestao_block = """
            {/* Setor Manager list */}
            <div className="glass-card p-6 border-l-2 border-sky-500/50 mt-6">
              <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-6">Gestão de Setores</h3>
              <form onSubmit={handleCreateSetor} className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6">
                <p className="text-xs font-bold text-white uppercase mb-3">+ Criar Novo Setor</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1">Setor ID (Num)</label>
                    <input
                      type="text"
                      placeholder="Ex: 91"
                      value={newSid}
                      onChange={(e) => setNewSid(e.target.value)}
                      className="inp py-1.5 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1">Líder Responsável</label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={newSResp}
                      onChange={(e) => setNewSResp(e.target.value)}
                      className="inp py-1.5 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[0.55rem] text-zinc-500 uppercase block mb-1">URL da Foto</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/lider.jpg"
                      value={newSFoto}
                      onChange={(e) => setNewSFoto(e.target.value)}
                      className="inp py-1.5 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateSetor}
                  className="mt-4 bg-sky-600 hover:bg-sky-500 text-white py-2 px-4 rounded-lg text-xs font-bold uppercase transition"
                >
                  Criar Novo Setor
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {setores.map((s, idx) => (
                  <div key={s.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-white">S{s.id}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase truncate max-w-[180px]">{s.resp}</p>
                    </div>
                    {setores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remover setor ${s.id}?`)) {
                            onRemoveSetor(idx);
                          }
                        }}
                        className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors"
                        title="Remover setor"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
"""

# Find where to insert it. The geral block ends right before {/* CATEGORY: IMPORTAÇÃO */}
code = code.replace("{/* CATEGORY: IMPORTAÇÃO */}", gestao_block + "\n        {/* CATEGORY: IMPORTAÇÃO */}")

with open("src/components/AdminAndSupportTabs.tsx", "w") as f:
    f.write(code)

