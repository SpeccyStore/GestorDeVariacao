# Catálogo de Variações

Um sistema simples para gerenciar um catálogo de variações de desenhos/jogadores com suas respectivas capas.

## Requisitos

- Node.js (versão 14 ou superior)
- NPM (Node Package Manager)

## Instalação

1. Instale as dependências do projeto:
```bash
npm install
```

2. Inicie o servidor:
```bash
npm start
```

3. Abra o arquivo `index.html` em seu navegador

## Como usar

1. O catálogo será exibido na página principal
2. Para adicionar novos itens:
   - Clique no botão "Modo Admin"
   - Preencha o nome do desenho/jogador
   - Selecione as imagens das variações
   - Clique em "Adicionar Item"
3. Para visualizar as variações, passe o mouse sobre o item desejado
4. Para excluir um item, use o modo administrador e clique no botão "Excluir"

## Estrutura de arquivos

- `index.html`: Interface do usuário
- `styles.css`: Estilos da aplicação
- `script.js`: Lógica do frontend
- `server.js`: Servidor Node.js para gerenciamento de arquivos
- `images/`: Pasta onde as imagens são armazenadas
- `catalog-data.json`: Arquivo que armazena os dados do catálogo 