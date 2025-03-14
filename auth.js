// Lista de usuários autorizados
const authorizedUsers = [
    {
        email: 'gabriels18.santos@gmail.com',
        password: '34225695gg'
    },
    {
        email: 'tendtudovariedadesita@gmail.com',
        password: '9609'
    },
    {
        email: 'natans18.oliveira@gmail.com',
        password: '123456'
    }
];

// Função para verificar autenticação
function checkAuth() {
    if (localStorage.getItem('isAuthenticated') !== 'true') {
        window.location.href = 'login.html';
    }
}

// Função para fazer login
function login(email, password) {
    const isAuthorized = authorizedUsers.some(user => 
        user.email === email && user.password === password
    );
    
    if (isAuthorized) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', email);
        return true;
    }
    return false;
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
}

// Função para obter o email do usuário logado
function getLoggedUserEmail() {
    return localStorage.getItem('userEmail');
}

// Função para verificar se está autenticado
function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

// Exportar funções para uso em outros arquivos
window.Auth = {
    checkAuth,
    login,
    logout,
    getLoggedUserEmail,
    isAuthenticated
}; 