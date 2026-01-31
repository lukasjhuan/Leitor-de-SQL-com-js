const CONFIG = {
    alunos: [1, 2, 3, 4, 5, 8],     // alunos_testes.sql
    usuarios: [0, 1, 2, 4, 8, 9, 10] // usuarios.sql
};

// Selecionando elementos
const fileAlunos = document.getElementById('file-alunos');
const outAlunos = document.getElementById('out-alunos');

const fileUsuarios = document.getElementById('file-usuarios');
const outUsuarios = document.getElementById('out-usuarios');

// --- EVENTOS ---
fileAlunos.addEventListener('change', (e) => {
    processarArquivo(e.target.files[0], outAlunos, CONFIG.alunos);
});

fileUsuarios.addEventListener('change', (e) => {
    processarArquivo(e.target.files[0], outUsuarios, CONFIG.usuarios);
});

// --- FUNÇÃO PRINCIPAL ---
function processarArquivo(arquivo, elementoSaida, indices) {
    if (!arquivo) return;

    const leitor = new FileReader();
    
    leitor.onload = function(e) {
        const conteudo = e.target.result;
        elementoSaida.textContent = "Processando..."; 

        setTimeout(() => {
            let dados = [];

            // 1. TENTA MODO SQL (INSERT INTO ...)
            if (conteudo.includes("INSERT INTO") || conteudo.includes("VALUES (")) {
                dados = extrairDadosSQL(conteudo, indices);
            } 
            // 2. SE FALHAR, TENTA MODO TABELA BRUTA 
            else {
                dados = extrairDadosBrutos(conteudo, indices);
            }
            
            if (dados.length === 0) {
                elementoSaida.textContent = "Nenhum dado encontrado. Verifique se o arquivo está vazio.";
            } else {
                elementoSaida.textContent = dados.join("\n");
            }
        }, 50);
    };

    leitor.onerror = () => alert("Erro ao ler arquivo");
    leitor.readAsText(arquivo, "ISO-8859-1"); 
}

function extrairDadosBrutos(texto, indices) {
    const linhas = texto.split('\n');
    const resultados = [];

    for (let linha of linhas) {
        if (!linha.trim()) continue; // Pula linhas vazias

        // Tenta dividir por TABULAÇÃO (\t) primeiro, que é o padrão de dumps SQL
        let colunas = linha.split('\t');

        // Se não funcionou com TAB, tenta dividir por espaços
        if (colunas.length < 2) {
            colunas = linha.split(/\s+/); 
        }

        // Pega as colunas pedidas
        const linhaFiltrada = indices.map(i => colunas[i] !== undefined ? colunas[i] : "-");
        resultados.push(linhaFiltrada.join(" | "));
    }
    return resultados;
}

// --- MODO 2: Extrai de comandos INSERT INTO (Arquivos SQL Clássicos) ---
function extrairDadosSQL(textoSQL, indices) {
    const resultados = [];
    const regexValues = /\((['0-9].*?)\)/g; // Busca conteúdo entre parênteses
    
    let match;
    while ((match = regexValues.exec(textoSQL)) !== null) {
        const colunas = splitSQLLine(match[1]);
        
        const linhaMontada = indices.map(i => {
            let valor = colunas[i];
            // Remove aspas simples se existirem
            if (valor && (valor.startsWith("'") && valor.endsWith("'"))) {
                valor = valor.slice(1, -1);
            }
            return valor !== undefined ? valor : "-";
        });

        resultados.push(linhaMontada.join(" | "));
    }
    return resultados;
}

// Função auxiliar para SQL (Lida com vírgulas dentro de textos)
function splitSQLLine(texto) {
    const tokens = [];
    let atual = '';
    let dentroAspas = false;
    
    for (let i = 0; i < texto.length; i++) {
        const char = texto[i];
        if (char === "'") { dentroAspas = !dentroAspas; atual += char; }
        else if (char === ',' && !dentroAspas) { tokens.push(atual.trim()); atual = ''; }
        else { atual += char; }
    }
    tokens.push(atual.trim());
    return tokens;
}
