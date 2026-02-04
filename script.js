// ======================================================================
// 📝 MINHAS ANOTAÇÕES DO PROJETO
// ======================================================================

// --- CONFIGURAÇÃO ---
// Aqui eu defino o "mapa" das colunas.
// O 'index' é a posição da coluna no arquivo SQL ou texto.
// O 'label' é o nome bonitinho que vai aparecer na tabela depois.
const CONFIG = {
    alunos: [
        { index: 1, label: "ID" },        // Coluna 1 do arquivo vira ID
        { index: 2, label: "CURSO" },     // Coluna 2 é o ID do curso
        { index: 3, label: "AULA" },      
        { index: 4, label: "NOTA" },
        { index: 5, label: "TENTATIVA" },
        { index: 6, label: "SITUAÇÃO" },
        { index: 7, label: "DIA" }        
    ],
    usuarios: [
        { index: 0, label: "ID" },
        { index: 1, label: "NOME" },
        { index: 2, label: "NASCIMENTO" },
        { index: 3, label: "E-MAIL" },      
        { index: 4, label: "TELEFONE" }, 
        { index: 8, label: "LOGIN" },     // Importante: é pelo LOGIN que a busca vai funcionar
        { index: 9, label: "SENHA" },
        { index: 10, label: "INÍCIO" }
    ]
};

// --- VARIÁVEIS GLOBAIS ---
// Aqui ficam os dados carregados na memória RAM do navegador pra não ter que ficar baixando toda hora.
let DB_MEMORIA = { alunos: [], usuarios: [] };
let MAPA_CURSOS = {}; // Objeto vazio pra guardar os nomes dos cursos vindo do JSON

// --- ELEMENTOS ---
// Pegando as referências do HTML pra poder manipular a tela.
const outAlunos = document.getElementById('out-alunos');
const outUsuarios = document.getElementById('out-usuarios');
const statusAlunos = document.getElementById('status-alunos');
const statusUsuarios = document.getElementById('status-usuarios');
const inputBusca = document.getElementById('input-busca');
const btnBuscar = document.getElementById('btn-buscar');
const divResultado = document.getElementById('resultado-busca');

// --- INICIALIZAÇÃO AUTOMÁTICA ---
// Assim que a página termina de carregar o HTML, eu chamo a função principal.
window.addEventListener('DOMContentLoaded', iniciarCarregamentoTotal);

async function iniciarCarregamentoTotal() {
    // O 'await' é porque o JS tem que esperar isso terminar antes de ir pra próxima linha.
    await carregarMapeamentoCursos(); // Primeiro carrega os nomes dos cursos (modulos.json)
    
    // Depois carrega os usuários
    await carregarArquivoDoServidor('dados/usuarios.sql', outUsuarios, statusUsuarios, CONFIG.usuarios, 'usuarios');
    
    // ATENÇÃO: Carrega as notas/aulas. Se o nome mudar na pasta, mudo aqui.
    // Usando 'alunos_testes.sql' como principal.
    await carregarArquivoDoServidor('dados/alunos_testes.sql', outAlunos, statusAlunos, CONFIG.alunos, 'alunos');
    
    // Só depois de tudo carregado é que libero a busca.
    verificarProntidao();
}

// --- CARREGAMENTO DO SERVIDOR ---
// Função genérica pra baixar qualquer arquivo (reutilizável pra não repetir código).
async function carregarArquivoDoServidor(url, elementoSaida, elementoStatus, configColunas, tipoDB) {
    try {
        // Avisa na tela que começou
        elementoStatus.textContent = "Baixando...";
        
        // Vai buscar o arquivo na pasta
        const response = await fetch(url);
        
        // SE DER ERRO (arquivo não existe):
        if (!response.ok) {
            // Tenta o "Plano B": se falhou o alunos_testes, tenta alunos_aulas
            if (url.includes('alunos_testes.sql')) {
                console.warn("alunos_testes.sql não encontrado, tentando alunos_aulas.sql...");
                // Chama a função de novo (recursividade) com o outro nome
                return carregarArquivoDoServidor('dados/alunos_aulas.sql', elementoSaida, elementoStatus, configColunas, tipoDB);
            }
            throw new Error(`Arquivo não encontrado: ${url}`);
        }

        // Transforma os bytes do arquivo em texto legível (lidando com acentos ISO-8859-1)
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder("iso-8859-1");
        const conteudo = decoder.decode(buffer);

        elementoStatus.textContent = "Processando...";
        // Pausinha pro navegador respirar e atualizar a tela
        await new Promise(r => setTimeout(r, 50));

        let dados = [];
        // LÓGICA DE INTELIGÊNCIA: Descobre se é SQL (INSERT) ou texto puro (Tab/Espaço)
        if (conteudo.includes("INSERT INTO") || conteudo.includes("VALUES (")) {
            dados = extrairDadosSQL(conteudo, configColunas);
        } else {
            dados = extrairDadosBrutos(conteudo, configColunas);
        }
        
        // Salva na memória global
        DB_MEMORIA[tipoDB] = dados;

        // Feedback visual pro usuário (verde = ok, vermelho = vazio)
        if (dados.length === 0) {
            elementoStatus.textContent = "Vazio.";
            elementoStatus.style.color = "red";
        } else {
            elementoStatus.innerHTML = `Sucesso! ${dados.length} registros.`;
            elementoStatus.style.color = "green";
            // Mostra só os primeiros 5 pra não travar a tela com muita coisa
            elementoSaida.innerHTML = gerarTabelaHTML(dados.slice(0,5), configColunas) + 
                                      "<p style='text-align:center; color:#888'>...amostra dos primeiros 5...</p>";
        }
    } catch (erro) {
        // Se der ruim em qualquer parte, cai aqui e avisa o erro
        console.error(erro);
        elementoStatus.textContent = `❌ Erro: ${erro.message}`;
        elementoStatus.style.color = "red";
    }
}

// Libera o campo de busca se os dois bancos (alunos e usuarios) tiverem dados.
function verificarProntidao() {
    if (DB_MEMORIA.usuarios.length > 0 && DB_MEMORIA.alunos.length > 0) {
        inputBusca.disabled = false;
        btnBuscar.disabled = false;
        inputBusca.placeholder = "Digite o login do usuário...";
        inputBusca.focus(); // Já deixa o cursor piscando lá
    }
}

// Carrega o JSON que traduz ID do curso (ex: 36) para Nome (ex: "Informática Básica")
async function carregarMapeamentoCursos() {
    try {
        const response = await fetch('modulos.json');
        if (!response.ok) throw new Error("Erro JSON");
        const listaCursos = await response.json();
        // Transforma a lista num objeto pra ficar fácil de consultar depois: MAPA_CURSOS[id]
        listaCursos.forEach(curso => {
            MAPA_CURSOS[curso.id] = { nome: curso.nome, total: curso.total };
        });
        console.log("✅ Cursos carregados.");
    } catch (erro) { console.error("Erro modulos.json:", erro); }
}

// --- PESQUISA ---
// Funciona tanto clicando no botão quanto apertando Enter
btnBuscar.addEventListener('click', realizarPesquisaUnificada);
inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') realizarPesquisaUnificada(); });

function realizarPesquisaUnificada() {
    const termo = inputBusca.value.trim();
    divResultado.innerHTML = ""; // Limpa pesquisa anterior
    if (!termo) return alert("Digite um login!");

    // Procura na lista de USUÁRIOS quem tem o login igual ao digitado
    // user[5] é a coluna de LOGIN configurada lá em cima
    const usuario = DB_MEMORIA.usuarios.find(user => 
        user[5].toLowerCase() === termo.toLowerCase()
    );

    if (!usuario) {
        divResultado.innerHTML = `<div style="text-align:center;color:red; padding:20px;">❌ Login "<strong>${termo}</strong>" não encontrado.</div>`;
        return;
    }

    // Se achou o usuário, pega o ID dele (index 0)
    const idUser = usuario[0]; 
    // Agora filtra na lista de ALUNOS tudo que tem esse ID
    const atividades = DB_MEMORIA.alunos.filter(aluno => aluno[0] === idUser);

    // Monta o cartão com os dados pessoais
    let html = `
        <h3 class="result-title">Dados do Aluno</h3>
        <div class="user-card-detail">
            <div class="detail-item"><strong>ID</strong> <span>${usuario[0]}</span></div>
            <div class="detail-item"><strong>Nome</strong> <span>${usuario[1]}</span></div>
            <div class="detail-item"><strong>Login</strong> <span>${usuario[5]}</span></div>
            <div class="detail-item"><strong>Email</strong> <span>${usuario[3]}</span></div>
            <div class="detail-item"><strong>Telefone</strong> <span>${usuario[4]}</span></div>
        </div>
    `;

    // Se o aluno fez alguma aula, gera os gráficos e tabelas
    if (atividades.length > 0) {
        html += `<h3 class="result-title">Análise de Performance</h3>`;
        html += gerarRelatorioPerformance(atividades); // Cálculos de média e previsão
        html += `<h3 class="result-title"> Histórico Detalhado (${atividades.length})</h3>`;
        html += gerarTabelaHTML(atividades, CONFIG.alunos); // Tabela completa
    } else {
        html += "<p style='padding:20px; text-align:center'><em>Nenhuma atividade registrada.</em></p>";
    }
    divResultado.innerHTML = html;
}

// --- PERFORMANCE (Cálculos matemáticos) ---
function gerarRelatorioPerformance(atividades) {
    // 1. Agrupa as atividades por curso (pra não misturar as notas)
    const cursosAgrupados = {};
    atividades.forEach(ativ => {
        const idCurso = ativ[1]; 
        if (!cursosAgrupados[idCurso]) cursosAgrupados[idCurso] = [];
        cursosAgrupados[idCurso].push(ativ);
    });

    let html = '<table class="performance-table"><thead><tr>';
    html += '<th>Curso</th><th>Média Notas</th><th>Ritmo (Dias/Aula)</th><th>Status / Previsão</th>';
    html += '</tr></thead><tbody>';

    Object.keys(cursosAgrupados).forEach(idCurso => {
        const registros = cursosAgrupados[idCurso];
        // Pega info do JSON (total de aulas do curso)
        const infoCurso = MAPA_CURSOS[idCurso] || { nome: "Curso Desconhecido", total: 0 };
        const totalAulasModulo = parseInt(infoCurso.total) || 0;

        // Ordena por data pra saber qual foi a primeira e a última aula
        registros.sort((a, b) => converterDataSegura(a[6]) - converterDataSegura(b[6]));

        const dataInicio = converterDataSegura(registros[0][6]);
        const dataFim = converterDataSegura(registros[registros.length - 1][6]);

        // Calcula quantos dias o aluno levou pra fazer o que já fez
        let diasGastos = 0;
        if (dataInicio && dataFim) {
            const diffTime = Math.abs(dataFim - dataInicio);
            diasGastos = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        }

        // Calcula média das notas e descobre qual a última aula feita
        let maiorAulaFeita = 0;
        let somaNotas = 0;
        let qtdNotas = 0;

        registros.forEach(r => {
            let numAula = parseInt(r[2]);
            if (!isNaN(numAula) && numAula > maiorAulaFeita) maiorAulaFeita = numAula;
            
            // Tratamento de vírgula para ponto (padrão JS)
            let rawNota = r[3] ? r[3].toString().replace(',', '.').trim() : "0";
            let nota = parseFloat(rawNota);
            if (!isNaN(nota)) { somaNotas += nota; qtdNotas++; }
        });

        const media = qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(2) : "0.00";

        // Ritmo: quantos dias ele demora pra fazer 1 aula
        let ritmo = 0;
        if (maiorAulaFeita > 0 && diasGastos > 0) ritmo = diasGastos / maiorAulaFeita;
        else if (diasGastos === 0 && maiorAulaFeita > 0) ritmo = 1; // Fez tudo no mesmo dia
        
        const ritmoArredondado = Math.ceil(ritmo);

        // Previsão do Futuro
        let textoPrevisao = "-";
        if (totalAulasModulo > 0) {
            const aulasRestantes = totalAulasModulo - maiorAulaFeita;
            
            if (aulasRestantes <= 0) {
                textoPrevisao = "<strong style='color:green'>CONCLUÍDO ✔</strong>";
            } else {
                // Matemática: Faltam X aulas * Y dias por aula = Z dias totais
                const diasParaAcabar = aulasRestantes * ritmoArredondado;
                const dataFutura = new Date();
                dataFutura.setDate(dataFutura.getDate() + diasParaAcabar);

                textoPrevisao = `
                    Restam <strong>${aulasRestantes} aulas</strong><br>
                    Previsão: <strong>${diasParaAcabar} dias</strong> <br>
                    <span style='font-size:0.8em; color:#666'>(~${dataFutura.toLocaleDateString('pt-BR')})</span>
                `;
            }
        } else {
            textoPrevisao = "<span style='color:red; font-size:0.8em'>Sem total</span>";
        }

        // Monta a linha da tabela de performance
        html += `<tr>
            <td>
                <strong>${idCurso}</strong> - ${infoCurso.nome}<br>
                <span style="font-size:0.8em; color:#555">Progresso: ${maiorAulaFeita}/${totalAulasModulo}</span>
            </td>
            <td>${media}</td>
            <td>
                <strong style="font-size:1.2em">${ritmoArredondado}</strong> dias/aula<br>
                <span style="font-size:0.7em; color:#888">Gastou ${diasGastos} dias em ${maiorAulaFeita} aulas</span>
            </td>
            <td>${textoPrevisao}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
}

// Converte datas brasileiras (DD/MM/AAAA) ou SQL para objeto Date do JS
function converterDataSegura(strData) {
    if (!strData || strData === "-") return new Date(); 
    if (strData.includes('/')) {
        const partes = strData.split(' ')[0].split('/'); 
        // JS conta mês de 0 a 11, por isso o -1
        if (partes.length === 3) return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    return new Date(strData);
}

// --- TABELA HTML ---
// Gera o HTML da tabela simples (aquela lista geral no final)
function gerarTabelaHTML(dados, configColunas) {
    let html = '<table><thead><tr>';
    configColunas.forEach(col => html += `<th>${col.label}</th>`);
    html += '</tr></thead><tbody>';
    
    // Procura onde está a coluna CURSO pra substituir ID pelo Nome
    const indexCurso = configColunas.findIndex(c => c.label === "CURSO");

    dados.forEach(linha => {
        html += '<tr>';
        const idCursoNaLinha = indexCurso !== -1 ? linha[indexCurso] : null;
        const infoCurso = idCursoNaLinha ? MAPA_CURSOS[idCursoNaLinha] : null;

        linha.forEach((celula, index) => {
            let conteudo = celula;
            const label = configColunas[index].label;

            // Se for coluna de Curso, mostra o Nome
            if (label === "CURSO" && infoCurso) conteudo = `<strong>${celula}</strong> - ${infoCurso.nome}`;
            // Se for coluna Aula, mostra "X / Total" e marca verificado se acabou
            else if (label === "AULA") {
                if (infoCurso && infoCurso.total) {
                    conteudo = `<strong>${celula}</strong> / ${infoCurso.total}`;
                    if (parseInt(celula) >= parseInt(infoCurso.total)) conteudo += " <span style='color:green'>✔</span>";
                }
            }
            html += `<td>${conteudo}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// --- PARSERS (Os tradutores de arquivo) ---

// Se o arquivo for texto simples (separado por TAB ou espaço)
function extrairDadosBrutos(texto, configColunas) {
    const linhas = texto.split('\n');
    const resultados = [];
    for (let linha of linhas) {
        if (!linha.trim()) continue; // Pula linha vazia
        let colunas = linha.split('\t');
        if (colunas.length < 2) colunas = linha.split(/\s+/); 
        // Mapeia as colunas certas baseado no CONFIG lá de cima
        resultados.push(configColunas.map(cfg => colunas[cfg.index] || "-"));
    }
    return resultados;
}

// Se o arquivo for SQL (INSERT INTO ... VALUES ...)
function extrairDadosSQL(textoSQL, configColunas) {
    const resultados = [];
    // Regex pra pegar tudo que está dentro dos parênteses dos VALUES
    const regexValues = /\((.*?)\)/g; 
    let match;
    while ((match = regexValues.exec(textoSQL)) !== null) {
        // Usa a função auxiliar pra quebrar a linha respeitando aspas
        const colunas = splitSQLLine(match[1]);
        resultados.push(configColunas.map(cfg => {
            let valor = colunas[cfg.index];
            // Remove as aspas simples 'valor' -> valor
            if (valor && (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1);
            return valor || "-";
        }));
    }
    return resultados;
}

// Função chata mas necessária: separar por vírgula mas IGNORAR vírgula dentro de texto
// Ex: 'João, o Grande', 25 -> vira -> ['João, o Grande', '25'] e não ['João', ' o Grande', '25']
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