const express = require('express');
const app = express();
const port = 3000;

// 1. Serve os arquivos da raiz (index.html, script.js, style.css)
app.use(express.static('.'));

// 2. LIBERA O ACESSO À PASTA 'DADOS'
// Isso permite que o script.js acesse http://localhost:3000/dados/usuarios.sql
app.use('/dados', express.static('dados'));

// Rota específica para o JSON (garantia extra)
app.get('/modulos.json', (req, res) => {
    res.sendFile(__dirname + '/modulos.json');
});

app.listen(port, () => {
    console.log(`🚀 Sistema rodando! Acesse: http://localhost:${port}`);
    console.log(`📂 Lendo arquivos da pasta: ${__dirname}/dados`);
});