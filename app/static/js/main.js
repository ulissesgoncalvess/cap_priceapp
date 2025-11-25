// app/static/js/main.js

// Pega o nome da página do atributo 'data-page' que definimos no HTML
const page = document.body.dataset.page || "";

//console.log("main.js: Roteando para a página:", page);

// Define quais módulos carregar para cada página
const routes = {
  login: () => import('./pages/login.js').then(module => module.init?.()),
  precificar: () => import('./pages/precificar.js').then(module => module.init?.()),
};

// Verifica se a página atual tem uma rota definida e a executa
if (routes[page]) {
  routes[page]();
} else {
  console.log("main.js: Nenhuma rota JS definida para esta página.");
}