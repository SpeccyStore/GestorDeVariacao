// Verificar autenticação ao carregar a página
Auth.checkAuth();

// Adicionar botão de logout e informação do usuário no HTML
const userEmail = Auth.getLoggedUserEmail();
document.body.insertAdjacentHTML('afterbegin', `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; align-items: center; gap: 10px;">
        <span class="text-muted" style="font-size: 0.9em;">${userEmail}</span>
        <button onclick="Auth.logout()" class="btn btn-outline-danger">
            Sair
        </button>
    </div>
`);

// Gerenciamento de dados
let catalogData = {};
let isAdminMode = false;
let pendingVariations = [];
let searchTerm = ''; // Nova variável para armazenar o termo de busca

// Adicionar no início do arquivo, logo após as variáveis
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

// Elementos DOM
const catalogContainer = document.querySelector('.catalog-container');
const adminBtn = document.getElementById('adminBtn');
const adminModalElement = document.getElementById('adminModal');
const adminModal = new bootstrap.Modal(adminModalElement);
const addItemForm = document.getElementById('addItemForm');
const adminItemsList = document.getElementById('adminItemsList');
const itemSelect = document.getElementById('itemSelect');
const itemNameInput = document.getElementById('itemName');
const variationsContainer = document.getElementById('variationsContainer');
const addVariationBtn = document.getElementById('addVariationBtn');
const coverUpload = document.getElementById('coverUpload');
const variationNameInput = document.getElementById('variationName');
const alertModalElement = document.getElementById('alertModal');
const alertModal = new bootstrap.Modal(alertModalElement);
const alertModalBody = document.getElementById('alertModalBody');
const confirmDeleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));

let deleteItemCallback = null;

// Adicionar campo de busca antes do catálogo
catalogContainer.insertAdjacentHTML('beforebegin', `
    <div class="search-container mb-4">
        <input type="text" 
               id="searchInput" 
               class="form-control" 
               placeholder="Buscar por título..."
               style="max-width: 300px; margin: 0 auto;">
    </div>
`);

const searchInput = document.getElementById('searchInput');

// Adicionar evento de busca
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    updateCatalog();
});

// Função para mostrar alertas no modal
function showAlert(message) {
    alertModalBody.textContent = message;
    alertModal.show();
}

// Funções auxiliares
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/items`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        if (typeof data === 'object') {
            catalogData = data;
            updateCatalog();
            updateAdminList();
            updateItemSelect();
        } else {
            throw new Error('Formato de dados inválido');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showAlert(`Erro ao carregar dados: ${error.message}`);
    }
}

function updateItemSelect() {
    const currentValue = itemSelect.value;
    
    // Limpar opções existentes, mantendo apenas as padrão
    while (itemSelect.options.length > 2) {
        itemSelect.remove(2);
    }
    
    // Adicionar itens do catálogo
    Object.keys(catalogData).forEach(itemName => {
        const option = new Option(itemName, itemName);
        itemSelect.add(option);
    });
    
    // Restaurar valor selecionado se existir
    if (currentValue && [...itemSelect.options].some(opt => opt.value === currentValue)) {
        itemSelect.value = currentValue;
    } else {
        itemSelect.value = '';
    }
}

function printVariation(imagePath) {
    const printWindow = window.open(imagePath, '_blank');
    if (printWindow) {
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
        };
    }
}

function createVariationElement(variation, index, name) {
    const variationObj = typeof variation === 'object' ? variation : { path: variation, name: 'Sem nome' };
    
    if (!variationObj.path) {
        console.error('Variação inválida:', variation);
        return '';
    }

    const imagePath = variationObj.path;
    const variationName = variationObj.name || `Variação ${index + 1}`;
    
    return `
        <div class="variation">
            <img src="${API_URL}${imagePath}" 
                 alt="${variationName}" 
                 class="variation-image"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbsOjbyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=='">
            <div class="variation-number">${variationName}</div>
            <div class="variation-buttons">
                <button class="print-btn" onclick="printVariation('${API_URL}${imagePath}')">Imprimir</button>
                <button class="delete-variation-btn" onclick="deleteVariation('${name}', ${index})">Excluir</button>
            </div>
        </div>
    `;
}

function printItem(name) {
    const variations = catalogData[name];
    if (!variations || variations.length === 0) {
        showAlert('Não há variações para imprimir.');
        return;
    }

    variations.forEach(variation => {
        const imagePath = variation.path.startsWith('http') ? variation.path : `http://localhost:3000${variation.path}`;
        const printWindow = window.open(imagePath, '_blank');
        if (printWindow) {
            printWindow.onload = function() {
                printWindow.focus();
                printWindow.print();
            };
        }
    });
}

function createCatalogItem(name, variations) {
    const variationsArray = Array.isArray(variations) ? variations : [];
    
    if (variationsArray.length === 0) {
        console.warn('Item sem variações:', name);
    }

    return `
        <div class="catalog-item">
            <div class="item-header">
                <h3>${name}</h3>
                <div class="item-buttons">
                    <button class="edit-btn" onclick="editItem('${name}')">Editar</button>
                </div>
            </div>
            <div class="variations-container">
                ${variationsArray.map((variation, index) => createVariationElement(variation, index, name)).join('')}
            </div>
        </div>
    `;
}

function updateCatalog() {
    try {
        const filteredEntries = Object.entries(catalogData)
            .filter(([name]) => name.toLowerCase().includes(searchTerm));
        
        if (filteredEntries.length === 0 && searchTerm !== '') {
            catalogContainer.innerHTML = `
                <div class="text-center text-muted my-5">
                    <h4>Nenhum item encontrado para "${searchTerm}"</h4>
                </div>
            `;
        } else {
            catalogContainer.innerHTML = filteredEntries
                .map(([name, variations]) => createCatalogItem(name, variations))
                .join('');
        }
    } catch (error) {
        console.error('Erro ao atualizar catálogo:', error);
        showAlert('Erro ao atualizar a exibição do catálogo');
    }
}

function updateAdminList() {
    const adminItemsList = document.getElementById('adminItemsList');
    if (adminItemsList && Object.keys(catalogData).length > 0) {
        adminItemsList.innerHTML = Object.entries(catalogData)
            .map(([name, variations]) => `
                <div class="admin-item list-group-item d-flex justify-content-between align-items-center">
                    <span>${name} (${variations.length} variações)</span>
                    <div class="admin-item-buttons">
                        <button class="btn btn-sm btn-primary me-2" onclick="editItem('${name}')">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${name}')">Excluir Tudo</button>
                    </div>
                </div>
            `)
            .join('');
    } else if (adminItemsList) {
        adminItemsList.innerHTML = '<p class="text-muted">Nenhum item cadastrado</p>';
    }
}

function createVariationPreview(file, name, index) {
    const div = document.createElement('div');
    div.className = 'variation-preview-item';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        div.innerHTML = `
            <img src="${e.target.result}" alt="${name}">
            <div class="variation-preview-name">${name}</div>
            <button type="button" class="remove-variation-btn" onclick="removePendingVariation(${index})">Remover</button>
        `;
    };
    reader.readAsDataURL(file);
    
    return div;
}

function updateVariationsPreview() {
    // Verificar se já existe o container de novas variações
    let newVariationsContainer = variationsContainer.querySelector('.new-variations');
    if (!newVariationsContainer) {
        newVariationsContainer = document.createElement('div');
        newVariationsContainer.className = 'new-variations';
        variationsContainer.appendChild(newVariationsContainer);
    }
    
    // Atualizar apenas o container de novas variações
    newVariationsContainer.innerHTML = '';
    pendingVariations.forEach((variation, index) => {
        newVariationsContainer.appendChild(
            createVariationPreview(variation.file, variation.name, index)
        );
    });
}

function removePendingVariation(index) {
    pendingVariations.splice(index, 1);
    updateVariationsPreview();
}

function editItem(name) {
    itemSelect.value = name;
    itemNameInput.value = name;
    itemNameInput.style.display = 'none';
    
    // Mostrar o modal usando Bootstrap
    adminModal.show();
    
    // Limpar variações pendentes
    pendingVariations = [];
    
    // Criar container para novas variações com botão para mostrar existentes
    variationsContainer.innerHTML = `
        <div class="mb-4">
            <button type="button" class="btn btn-secondary" onclick="toggleExistingVariations('${name}')">
                Mostrar Variações Existentes
            </button>
        </div>
        <div id="existingVariationsContainer" style="display: none;"></div>
        <div class="new-variations">
            <h3 class="mb-3">Adicionar Novas Variações</h3>
        </div>
    `;
    
    updateVariationsPreview();
}

function toggleExistingVariations(name) {
    const container = document.getElementById('existingVariationsContainer');
    const variations = catalogData[name] || [];
    
    if (container.style.display === 'none') {
        container.innerHTML = `
            <h3 class="mb-3">Variações Existentes</h3>
            <div class="variations-grid">
                ${variations.map((variation, index) => `
                    <div class="variation-preview-item">
                        <img src="${API_URL}${variation.path}" 
                             alt="${variation.name}" 
                             class="img-fluid"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW0gbsOjbyBlbmNvbnRyYWRhPC90ZXh0Pjwvc3ZnPg=='">
                        <div class="variation-preview-name">${variation.name}</div>
                        <button type="button" class="btn btn-danger btn-sm remove-variation-btn" onclick="deleteVariation('${name}', ${index})">Excluir</button>
                    </div>
                `).join('')}
            </div>
            ${variations.length > 0 ? '<hr class="my-4">' : ''}
        `;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Funções principais
async function addItem(event) {
    event.preventDefault();
    try {
        const formData = new FormData(event.target);
        const itemName = formData.get('name');
        const images = formData.getAll('images');
        
        // Validação do lado do cliente
        if (!itemName) {
            showModal('Por favor, insira um nome para o item');
            return;
        }

        // Validar se há pelo menos uma imagem
        if (!images || images.length === 0 || !images[0].size) {
            showModal('Por favor, selecione pelo menos uma imagem');
            return;
        }

        // Log para debug
        console.log('Dados sendo enviados:', {
            name: itemName,
            variations: formData.getAll('variations[]'),
            images: images.map(img => img.name)
        });

        const response = await fetch('/add-item', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.error}`);
        }

        const result = await response.json();
        showModal('Item adicionado com sucesso!');
        event.target.reset();
        loadCatalog();
    } catch (error) {
        console.error('Erro detalhado:', error);
        showModal(`Erro ao adicionar item: ${error.message}`);
    }
}

// Corrigir a função showModal para evitar o erro de focus
function showModal(message) {
    const modal = document.getElementById('alertModal');
    const messageElement = modal.querySelector('.modal-body');
    messageElement.textContent = message;
    
    modal.style.display = 'block';
    modal.removeAttribute('inert');
    
    // Ajuste na lógica de focus
    const closeButton = modal.querySelector('.close');
    if (closeButton) {
        setTimeout(() => {
            closeButton.focus();
        }, 100);
    }
}

function closeModal() {
    const modal = document.getElementById('alertModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('inert', '');
    }
}

async function deleteItem(name) {
    if (!confirm(`Tem certeza que deseja excluir "${name}" e todas as suas variações?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/delete-item/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            catalogData = result.data;
            updateCatalog();
            updateAdminList();
            updateItemSelect();
            showAlert('Item excluído com sucesso!');
        } else {
            throw new Error(result.error || 'Erro ao excluir item');
        }
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showAlert(`Erro ao excluir item: ${error.message}`);
    }
}

function showDeleteConfirmation(message, callback) {
    const modal = document.getElementById('confirmDeleteModal');
    const modalBody = document.getElementById('confirmDeleteModalBody');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    modalBody.textContent = message;
    deleteItemCallback = callback;
    
    // Armazenar o elemento que tinha o foco antes de abrir o modal
    const previousActiveElement = document.activeElement;
    
    const confirmDeleteModal = new bootstrap.Modal(modal);
    confirmDeleteModal.show();
    
    // Focar no botão de confirmação quando o modal abrir
    modal.addEventListener('shown.bs.modal', function () {
        confirmBtn.focus();
    });
    
    // Restaurar o foco quando o modal fechar
    modal.addEventListener('hidden.bs.modal', function () {
        previousActiveElement.focus();
    });
}

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (deleteItemCallback) {
        deleteItemCallback();
        deleteItemCallback = null;
    }
    bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
});

function deleteVariation(name, index) {
    showDeleteConfirmation(`Tem certeza que deseja excluir esta variação?`, async () => {
        try {
            if (!catalogData[name] || !catalogData[name][index]) {
                throw new Error('Variação não encontrada');
            }

            const response = await fetch(`${API_URL}/delete-variation/${encodeURIComponent(name)}/${index}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                catalogData = result.data;
                updateCatalog();
                updateAdminList();
                updateItemSelect();
                showAlert('Variação excluída com sucesso!');
                
                // Se estiver no modal de edição, atualizar a visualização
                if (itemSelect.value === name) {
                    editItem(name);
                }
            } else {
                throw new Error(result.error || 'Erro ao excluir variação');
            }
        } catch (error) {
            console.error('Erro ao excluir variação:', error);
            showAlert(`Erro ao excluir variação: ${error.message}`);
        }
    });
}

function isVariationNumberDuplicate(name, variationNumber) {
    // Verifica nas variações existentes
    if (catalogData[name]) {
        const existingNumbers = catalogData[name]
            .map(v => parseInt(v.name.match(/\d+/)?.[0]))
            .filter(n => !isNaN(n));
        
        if (existingNumbers.includes(variationNumber)) {
            return true;
        }
    }
    
    // Verifica nas variações pendentes
    const pendingNumbers = pendingVariations
        .map(v => parseInt(v.name.match(/\d+/)?.[0]))
        .filter(n => !isNaN(n));
    
    return pendingNumbers.includes(variationNumber);
}

// Event Listeners
addVariationBtn.addEventListener('click', () => {
    const name = variationNameInput.value.trim();
    const file = coverUpload.files[0];
    
    if (!name || !file) {
        showAlert('Por favor, preencha o nome da variação e selecione uma imagem.');
        return;
    }

    // Extrai o número da variação
    const variationNumber = parseInt(name.match(/\d+/)?.[0]);
    
    if (isNaN(variationNumber)) {
        showAlert('O nome da variação deve conter um número (exemplo: Variação 1).');
        return;
    }

    const selectedItem = itemSelect.value === 'novo' ? itemNameInput.value.trim() : itemSelect.value;
    
    if (isVariationNumberDuplicate(selectedItem, variationNumber)) {
        showAlert(`A variação ${variationNumber} já existe para este item.`);
        return;
    }

    pendingVariations.push({ name, file });
    updateVariationsPreview();
    
    // Limpar campos
    variationNameInput.value = '';
    coverUpload.value = '';
});

itemSelect.addEventListener('change', function() {
    const selectedValue = this.value;
    if (selectedValue === 'new') {
        itemNameInput.style.display = 'block';
        itemNameInput.required = true;
        itemNameInput.value = '';
        itemNameInput.focus();
    } else {
        itemNameInput.style.display = 'none';
        itemNameInput.required = false;
        itemNameInput.value = selectedValue;
    }
});

adminBtn.addEventListener('click', () => {
    adminModal.show();
    updateCatalog();
});

// Gerenciamento do Modal de Administração
adminModalElement.addEventListener('show.bs.modal', function () {
    itemSelect.focus();
    updateItemSelect();
});

adminModalElement.addEventListener('shown.bs.modal', function () {
    itemSelect.focus();
});

adminModalElement.addEventListener('hidden.bs.modal', function () {
    document.getElementById('adminBtn').focus();
    resetForm();
});

// Função para resetar o formulário
function resetForm() {
    document.getElementById('addItemForm').reset();
    itemNameInput.style.display = 'none';
    itemNameInput.required = false;
    const variationsContainer = document.getElementById('variationsContainer');
    variationsContainer.innerHTML = '';
    pendingVariations = [];
}

addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let name;
    
    if (itemSelect.value === 'novo') {
        name = itemNameInput.value.trim();
        if (!name) {
            showAlert('Por favor, insira um nome para o novo item.');
            return;
        }
    } else {
        name = itemSelect.value;
        if (!name) {
            showAlert('Por favor, selecione um item ou crie um novo.');
            return;
        }
    }
    
    if (pendingVariations.length === 0) {
        showAlert('Por favor, adicione pelo menos uma variação antes de salvar.');
        return;
    }

    addItem(e);
    addItemForm.reset();
    itemNameInput.style.display = 'none';
    itemNameInput.required = false;
});

// Atualizar o CSS para as variações existentes
const style = document.createElement('style');
style.textContent = `
    .existing-variations {
        margin-bottom: 2rem;
    }
    
    .existing-variations h3 {
        margin-bottom: 1rem;
        color: #333;
    }
    
    .variations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    hr {
        margin: 2rem 0;
        border: none;
        border-top: 1px solid #ddd;
    }
`;
document.head.appendChild(style);

// Inicialização
loadData(); 