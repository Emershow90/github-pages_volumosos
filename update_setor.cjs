const fs = require('fs');
const file = './src/types/Setor.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('tipoOperacao')) {
  code = code.replace(
    'situacao?: \'Ativo\' | \'Inativo\';',
    `situacao?: 'Ativo' | 'Inativo';\n  \n  // Configuração por tipo de operação/setor\n  tipoOperacao?: 'PADRAO' | 'CAIXAS' | 'VOLUMOSOS';\n  fonteAtividade?: 'monitor_setores_ativos' | 'atividade_h3';\n  fonteColis?: 'kpi_semana' | 'sistema';\n  exibirCaixas?: boolean;\n  exibirReposicaoCaixas?: boolean;`
  );
  fs.writeFileSync(file, code);
  console.log('Setor.ts updated');
} else {
  console.log('Setor.ts already has tipoOperacao');
}
