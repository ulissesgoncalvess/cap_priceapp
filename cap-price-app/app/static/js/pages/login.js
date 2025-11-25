// app/static/js/pages/login.js

// Envolvemos todo o código em uma função 'init' que o main.js irá chamar.
export function init() {
    //console.log("login.js: Inicializado");
    
    // Removemos o 'DOMContentLoaded', pois o main.js já cuida disso.
    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const forgotPasswordLink = document.getElementById('forgot-password');
    const forgotSuccessMessage = document.getElementById('forgot-success');

    const handleLogin = (event) => {
        if (event) event.preventDefault();
        if (forgotSuccessMessage) forgotSuccessMessage.classList.add('hidden');

        const email = loginEmail.value;
        const password = loginPassword.value;

        if (email === 'teste@cap.com' && password === '1234') {
            loginError.classList.add('hidden');
            window.location.href = "/precificar"; // Rota do Flask
        } else {
            loginError.classList.remove('hidden');
            loginError.querySelector('span').innerHTML = 'Email ou senha inválidos. (Use <b>teste@cap.com</b> e <b>1234</b>)';
        }
    };
    
    const handleForgotPassword = (event) => {
        if (event) event.preventDefault();
        const email = loginEmail.value;

        if (!email || !email.includes('@')) {
            loginError.classList.remove('hidden');
            loginError.querySelector('span').textContent = 'Por favor, digite um e-mail válido para recuperar a senha.';
            forgotSuccessMessage.classList.add('hidden');
        } else {
            //console.log(`Simulando envio de recuperação para: ${email}`);
            loginError.classList.add('hidden');
            forgotSuccessMessage.classList.remove('hidden');
        }
    };

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}