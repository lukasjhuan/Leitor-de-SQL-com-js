// puxando os elementos html 
const inputArquivo = document.getElementById('input-arquivo');
const areaTexto = document.getElementById('conteudo-sql');

// Função para quando selecionar o arquivo 
inputArquivo.addEventListener('change', function(evento) {
    const arquivo = evento.target.files[0];
    
    const leitor = new FileReader();

    // Evento disparado quando a leitura termina com sucesso
    leitor.onload = function(e) {
        const conteudo = e.target.result;
        areaTexto.textContent = conteudo;

        
    };

    //Evento disparado se der erro 
    leitor.onerror = function() {
        alert("Erro ao ler o arquivo!");
    };
    //Inicia a leitura do arquivo com texto 
    leitor.readAsText(arquivo, "ISO-8859-1");
});