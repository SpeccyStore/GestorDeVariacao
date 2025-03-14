const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do CORS
app.use(cors());
app.use(express.json());

// Configuração do Multer para armazenamento local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'images');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB
    }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));

// Arquivo para armazenar os dados
const DATA_FILE = 'catalog-data.json';

// Carregar dados do arquivo
let catalogData = {};
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        catalogData = JSON.parse(data);
    }
} catch (error) {
    console.error('Erro ao carregar dados:', error);
}

// Função para salvar dados no arquivo
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(catalogData, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return false;
    }
}

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/items', (req, res) => {
    res.json(catalogData);
});

app.post('/add-item', upload.array('images'), async (req, res) => {
    try {
        const { name } = req.body;
        const files = req.files;

        console.log('Recebendo requisição para adicionar item:', {
            name,
            filesCount: files?.length,
            body: req.body
        });

        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nome do item é obrigatório' 
            });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nenhuma imagem enviada' 
            });
        }

        let variationNames = [];
        try {
            variationNames = JSON.parse(req.body.variationNames || '[]');
            console.log('Nomes das variações parseados:', variationNames);
        } catch (error) {
            console.error('Erro ao parsear nomes das variações:', error);
            return res.status(400).json({ 
                success: false, 
                error: 'Formato inválido para nomes das variações' 
            });
        }

        // Validar tipos de arquivo
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const invalidFile = files.find(file => !validTypes.includes(file.mimetype));
        if (invalidFile) {
            return res.status(400).json({ 
                success: false, 
                error: 'Tipo de arquivo inválido. Use apenas JPG, PNG ou GIF.' 
            });
        }

        // Criar as variações com os caminhos das imagens
        const variations = files.map((file, index) => ({
            path: `/images/${file.filename}`,
            name: variationNames[index] || `Variação ${index + 1}`
        }));

        if (catalogData[name]) {
            catalogData[name] = [...catalogData[name], ...variations];
        } else {
            catalogData[name] = variations;
        }

        // Salvar dados atualizados
        if (!saveData()) {
            throw new Error('Erro ao salvar dados no arquivo');
        }

        console.log('Item adicionado com sucesso:', name);
        res.json({ success: true, data: catalogData });
    } catch (error) {
        console.error('Erro detalhado ao adicionar item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao processar o upload: ' + (error.message || 'Erro desconhecido')
        });
    }
});

app.delete('/delete-item/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        if (catalogData[name]) {
            // Deletar imagens do diretório
            catalogData[name].forEach(variation => {
                const imagePath = path.join(__dirname, variation.path);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
            
            delete catalogData[name];

            // Salvar dados atualizados
            if (!saveData()) {
                throw new Error('Erro ao salvar dados no arquivo');
            }

            res.json({ success: true, data: catalogData });
        } else {
            res.status(404).json({ success: false, error: 'Item não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao excluir item: ' + error.message 
        });
    }
});

// Rota para deletar uma variação específica
app.delete('/delete-variation/:name/:index', async (req, res) => {
    try {
        const { name, index } = req.params;
        const variationIndex = parseInt(index);
        
        if (!catalogData[name]) {
            return res.status(404).json({ success: false, error: 'Item não encontrado' });
        }

        if (isNaN(variationIndex) || variationIndex < 0 || variationIndex >= catalogData[name].length) {
            return res.status(400).json({ success: false, error: 'Índice de variação inválido' });
        }

        // Remover o arquivo da imagem
        const variation = catalogData[name][variationIndex];
        const imagePath = path.join(__dirname, variation.path);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // Remover a variação do array
        catalogData[name].splice(variationIndex, 1);

        // Se não houver mais variações, remover o item
        if (catalogData[name].length === 0) {
            delete catalogData[name];
        }

        // Salvar as alterações
        if (!saveData()) {
            throw new Error('Erro ao salvar dados no arquivo');
        }

        res.json({ success: true, data: catalogData });
    } catch (error) {
        console.error('Erro ao excluir variação:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao excluir variação: ' + error.message 
        });
    }
});

// Tratamento de erros do Multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Arquivo muito grande. O tamanho máximo permitido é 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: 'Erro no upload do arquivo: ' + err.message
        });
    }
    next(err);
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
}); 