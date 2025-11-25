// app/static/js/pages/precificar.js

import { fetchSimulacao, formatCurrency, formatPercent } from '../services/simulationService.js';

// --- LISTA DE CIDADES POR ESTADO ---
// REMOVIDO! Não precisamos mais do objeto 'cidadesPorUF'
// A lista de cidades será buscada da API do IBGE.

export function init() {
    // --- Seletores de Elementos ---
    const simulacaoForm = document.getElementById('simulacao-form');
    const btnSimular = document.getElementById('btn-simular');
    const destinoUfSelect = document.getElementById('destino_uf');
    
    // MODIFICADO: Trocamos o <select> por <input>
    const destinoCidadeInput = document.getElementById('destino_cidade'); 
    // MODIFICADO: Novo seletor para o <datalist>
    const cidadesDatalist = document.getElementById('cidades-list'); 

    const resultadoSection = document.getElementById('resultado-section');
    const loadingSection = document.getElementById('loading-section');
    const btnVoltar = document.getElementById('btn-voltar');
    const tabsHeader = document.getElementById('tabs-header');
    const tabButtons = document.querySelectorAll('#tabs-header .tab-button');
    const btnDownloadLaudoCol3 = document.getElementById('btn-download-laudo-col3');
    const btnEmailLaudoCol3 = document.getElementById('btn-email-laudo-col3');
    const emailParaEnvio = document.getElementById('email-para-envio');
    const envioEmailContainer = document.getElementById('envio-email-container');
    const graficoDescricao = document.getElementById('grafico-descricao');
    const graficosTabContainer = document.getElementById('graficos-tab-container');
    const graficoTabPreco = document.getElementById('grafico-tab-preco');
    const graficoTabFrete = document.getElementById('grafico-tab-frete');
    const graficoTabMargem = document.getElementById('grafico-tab-margem');
    const graficoContentPreco = document.getElementById('grafico-content-preco');
    const graficoContentFrete = document.getElementById('grafico-content-frete');
    const graficoContentMargem = document.getElementById('grafico-content-margem');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const aiTyping = document.getElementById('ai-typing');
    const btnLogout = document.getElementById('btn-logout');

    // ... Armazenamento ...
    let currentSimulationResults = [];
    let graficoPreco = null;
    let graficoFrete = null;
    let graficoMargem = null;
    const chatSessionId = 'cap_price_web_' + Date.now();

    // --- Lógica de Cidades (MODIFICADO PARA API IBGE e Datalist) ---
    if (destinoUfSelect && destinoCidadeInput && cidadesDatalist) {
        
        destinoUfSelect.addEventListener('change', async (e) => {
            const uf = e.target.value;
            
            // 1. Limpa e desabilita o input de cidade
            destinoCidadeInput.value = ''; // Limpa o valor digitado
            cidadesDatalist.innerHTML = ''; // Limpa as opções do datalist
            destinoUfSelect.classList.remove('border-red-500');
            destinoCidadeInput.classList.remove('border-red-500');

            if (!uf) {
                destinoCidadeInput.disabled = true;
                destinoCidadeInput.placeholder = 'Selecione a UF primeiro';
                return;
            }

            // 2. Habilita e mostra "Carregando..."
            destinoCidadeInput.disabled = true; // Mantém desabilitado durante o fetch
            destinoCidadeInput.placeholder = 'Carregando cidades...';

            try {
                // 3. Buscar cidades da API do IBGE
                // Usamos a API oficial de localidades do IBGE
                const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                
                if (!response.ok) {
                    throw new Error('Não foi possível carregar as cidades.');
                }
                
                const cidades = await response.json();

                // 4. Popular o <datalist> com as cidades
                cidades.forEach(cidade => {
                    const option = document.createElement('option');
                    option.value = cidade.nome; // O datalist usa o 'value' para o autocomplete
                    cidadesDatalist.appendChild(option);
                });

                // 5. Habilitar o input
                destinoCidadeInput.disabled = false;
                destinoCidadeInput.placeholder = 'Digite ou selecione a cidade';

            } catch (error) {
                console.error('Erro ao buscar cidades:', error);
                destinoCidadeInput.disabled = true;
                destinoCidadeInput.placeholder = 'Erro ao carregar cidades';
                destinoCidadeInput.classList.add('border-red-500');
            }
        });

        // Listener no input de cidade para limpar o erro
        destinoCidadeInput.addEventListener('input', () => { // Usamos 'input' para pegar digitação
            destinoCidadeInput.classList.remove('border-red-500');
        });
    }

    // --- Gerenciadores de Estado da UI ---
    function showLoading() {
        if (!simulacaoForm) return;
        simulacaoForm.classList.add('hidden');
        resultadoSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        if(btnDownloadLaudoCol3) btnDownloadLaudoCol3.disabled = true;
        if(btnEmailLaudoCol3) btnEmailLaudoCol3.disabled = true;
        if(envioEmailContainer) envioEmailContainer.classList.add('hidden');
        if(graficoDescricao) graficoDescricao.classList.add('hidden');
        if(graficosTabContainer) graficosTabContainer.classList.add('hidden');
        destruirGraficos();
    }

    function showResults(responsesArray) {
        if (!simulacaoForm || !responsesArray || responsesArray.length === 0) return;
        currentSimulationResults = responsesArray;

        destruirGraficos();

        if (responsesArray.length > 1) {
            if(tabsHeader) tabsHeader.parentElement.classList.remove('hidden');
            tabButtons.forEach((btn, index) => {
                if (index === 0) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            if(graficoDescricao) graficoDescricao.classList.remove('hidden');
            if(graficosTabContainer) graficosTabContainer.classList.remove('hidden');

            desenharGraficoPreco(responsesArray);
            desenharGraficoFrete(responsesArray);
            desenharGraficoMargem(responsesArray);

            if(graficoTabPreco) graficoTabPreco.classList.add('active');
            if(graficoTabFrete) graficoTabFrete.classList.remove('active');
            if(graficoTabMargem) graficoTabMargem.classList.remove('active');
            
            if(graficoContentPreco) graficoContentPreco.classList.remove('hidden');
            if(graficoContentFrete) graficoContentFrete.classList.add('hidden');
            if(graficoContentMargem) graficoContentMargem.classList.add('hidden');

        } else {
            if(tabsHeader) tabsHeader.parentElement.classList.add('hidden');
            if(graficoDescricao) graficoDescricao.classList.add('hidden');
            if(graficosTabContainer) graficosTabContainer.classList.add('hidden');
        }

        displayResultadosCombinados(responsesArray[0]);

        simulacaoForm.classList.add('hidden');
        loadingSection.classList.add('hidden');
        resultadoSection.classList.remove('hidden');

        if(btnDownloadLaudoCol3) btnDownloadLaudoCol3.disabled = false;
        if(btnEmailLaudoCol3) btnEmailLaudoCol3.disabled = false;
        if(envioEmailContainer) envioEmailContainer.classList.remove('hidden');
    }

    function showProfile() {
        if (!simulacaoForm) return;
        resultadoSection.classList.add('hidden');
        loadingSection.classList.add('hidden');
        simulacaoForm.classList.remove('hidden');
        simulacaoForm.reset();
        
        // MODIFICADO: Reset do campo de cidade (agora é input)
        if(destinoCidadeInput) {
            destinoCidadeInput.disabled = true;
            destinoCidadeInput.placeholder = 'Selecione a UF primeiro';
            destinoCidadeInput.value = '';
        }
        // MODIFICADO: Limpa o datalist também
        if(cidadesDatalist) {
            cidadesDatalist.innerHTML = '';
        }

        currentSimulationResults = [];
        if (tabsHeader) tabsHeader.parentElement.classList.add('hidden');

        if (btnDownloadLaudoCol3) btnDownloadLaudoCol3.disabled = true;
        if (btnEmailLaudoCol3) btnEmailLaudoCol3.disabled = true;
        if (envioEmailContainer) envioEmailContainer.classList.add('hidden');
        if (graficoDescricao) graficoDescricao.classList.add('hidden');
        if (graficosTabContainer) graficosTabContainer.classList.add('hidden');
        if (emailParaEnvio) emailParaEnvio.value = '';
        destruirGraficos();
    }

    // --- Lógica de Display (Resultados) ---
    function displayResultadosCombinados(data) {
        if (!data) return;
        // Verifica se elementos existem antes de tentar setar texto
        const setId = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        
        setId('laudo-simulacao-id', `#S${Math.floor(1000 + Math.random() * 9000)}`);
        setId('laudo-origem', data.origem);
        setId('laudo-destino', data.destino);
        setId('laudo-qtd', data.quantidade); // Ajuste se necessário
        setId('laudo-preco-net', formatCurrency(data.precoNet));
        setId('laudo-frete', formatCurrency(data.frete));
        setId('laudo-impostos', formatCurrency(data.impostos));
        setId('laudo-difal', formatCurrency(data.difal)); // Ajuste se seu JSON não tiver DIFAL
        setId('laudo-cmv', formatCurrency(data.cmv));     // Ajuste se necessário
        setId('laudo-margem', formatPercent(data.margem)); // Ajuste se necessário
        setId('laudo-preco-final', formatCurrency(data.precoFinal));
    }

    // --- Lógica do Gráfico (Chart.js) ---
    function destruirGraficos() {
        if (graficoPreco) { graficoPreco.destroy(); graficoPreco = null; }
        if (graficoFrete) { graficoFrete.destroy(); graficoFrete = null; }
        if (graficoMargem) { graficoMargem.destroy(); graficoMargem = null; }
    }

    function desenharGraficoPreco(data) {
        const canvas = document.getElementById('grafico-preco');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const labels = data.map((d, i) => `Opção ${i + 1}`);
        const precosFinais = data.map(d => d.precoFinal ? d.precoFinal.toFixed(2) : 0);
        graficoPreco = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Preço Final (R$)', data: precosFinais, backgroundColor: 'rgba(13, 148, 136, 0.6)', borderColor: 'rgba(13, 148, 136, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatCurrency(context.parsed.y), title: (context) => `Opção ${context[0].dataIndex + 1} (${data[context[0].dataIndex].origem})` } } }, scales: { y: { ticks: { callback: (value) => formatCurrency(value), maxTicksLimit: 4 } } } } });
    }

    function desenharGraficoFrete(data) {
        const canvas = document.getElementById('grafico-frete');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const labels = data.map((d, i) => `Opção ${i + 1}`);
        const fretes = data.map(d => d.frete ? d.frete.toFixed(2) : 0);
        graficoFrete = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Frete (R$)', data: fretes, backgroundColor: 'rgba(59, 130, 246, 0.6)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatCurrency(context.parsed.y), title: (context) => `Opção ${context[0].dataIndex + 1} (${data[context[0].dataIndex].origem})` } } }, scales: { y: { ticks: { callback: (value) => formatCurrency(value), maxTicksLimit: 4 } } } } });
    }

    function desenharGraficoMargem(data) {
        const canvas = document.getElementById('grafico-margem');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const labels = data.map((d, i) => `Opção ${i + 1}`);
        const margens = data.map(d => d.margem ? d.margem.toFixed(2) : 0);
        graficoMargem = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Margem (%)', data: margens, backgroundColor: 'rgba(245, 158, 11, 0.6)', borderColor: 'rgba(245, 158, 11, 1)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatPercent(context.parsed.y), title: (context) => `Opção ${context[0].dataIndex + 1} (${data[context[0].dataIndex].origem})` } } }, scales: { y: { ticks: { callback: (value) => formatPercent(value), maxTicksLimit: 4 } } } } });
    }

    // --- Validação ---
    function clearErrors() {
        if (destinoUfSelect) destinoUfSelect.classList.remove('border-red-500');
        // MODIFICADO: Validação do input
        if (destinoCidadeInput) destinoCidadeInput.classList.remove('border-red-500');
        if (emailParaEnvio) emailParaEnvio.classList.remove('border-red-500');
    }

    // **** O LISTENER PRINCIPAL! ****
    if (btnSimular) {
        btnSimular.addEventListener('click', async () => {
            console.log("CLIQUE: Botão Simular pressionado.");
            clearErrors();
            
            // Validação UF
            if (!destinoUfSelect || !destinoUfSelect.value) {
                if(destinoUfSelect) destinoUfSelect.classList.add('border-red-500');
                alert('Por favor, selecione a UF de Destino.');
                return;
            }

            // Validação Cidade (NOVO)
            if (!destinoCidadeInput || !destinoCidadeInput.value) {
                if(destinoCidadeInput) destinoCidadeInput.classList.add('border-red-500');
                alert('Por favor, digite ou selecione a Cidade de Destino.');
                return;
            }

            showLoading();
            const formData = new FormData(simulacaoForm);

            try {
                const mockResponses = await fetchSimulacao(formData);
                showResults(mockResponses);
            } catch (error) {
                console.error("Erro ao buscar simulação:", error);
                showProfile(); // Volta para o form em caso de erro
                alert("Erro na simulação: " + error.message);
            }
        });
    }

    // ... (Listeners de Tabs, Voltar, Download, Chat, Logout) ...
    if (btnVoltar) { btnVoltar.addEventListener('click', showProfile); }
    
    if(tabButtons) {
        tabButtons.forEach(button => { 
            button.addEventListener('click', () => { 
                tabButtons.forEach(btn => btn.classList.remove('active')); 
                button.classList.add('active'); 
                const tabIndex = parseInt(button.id.split('-')[1]) - 1; 
                if (currentSimulationResults[tabIndex]) { 
                    displayResultadosCombinados(currentSimulationResults[tabIndex]); 
                } 
            }); 
        });
    }

    if (graficoTabPreco) { graficoTabPreco.addEventListener('click', () => { graficoTabPreco.classList.add('active'); graficoTabFrete.classList.remove('active'); graficoTabMargem.classList.remove('active'); graficoContentPreco.classList.remove('hidden'); graficoContentFrete.classList.add('hidden'); graficoContentMargem.classList.add('hidden'); }); }
    if (graficoTabFrete) { graficoTabFrete.addEventListener('click', () => { graficoTabPreco.classList.remove('active'); graficoTabFrete.classList.add('active'); graficoTabMargem.classList.remove('active'); graficoContentPreco.classList.add('hidden'); graficoContentFrete.classList.remove('hidden'); graficoContentMargem.classList.add('hidden'); }); }
    if (graficoTabMargem) { graficoTabMargem.addEventListener('click', () => { graficoTabPreco.classList.remove('active'); graficoTabFrete.classList.remove('active'); graficoTabMargem.classList.add('active'); graficoContentPreco.classList.add('hidden'); graficoContentFrete.classList.add('hidden'); graficoContentMargem.classList.remove('hidden'); }); }
    
    if (btnDownloadLaudoCol3) { btnDownloadLaudoCol3.addEventListener('click', () => { if (currentSimulationResults.length === 0) return; console.log('Baixando Laudo...'); }); }
    if (btnEmailLaudoCol3) { btnEmailLaudoCol3.addEventListener('click', () => { console.log("Enviando email..."); }); }
    
    const handleChatSend = async () => { 
        if (!chatInput || !chatWindow || !aiTyping) return;
        const text = chatInput.value;
        if (text.trim() === '') return;

        const userBubble = document.createElement('div');
        userBubble.className = 'flex justify-end';
        userBubble.innerHTML = `<div class="bg-teal-600 text-white p-2 px-3 rounded-lg max-w-xs"><p class="text-sm">${text}</p></div>`;
        chatWindow.appendChild(userBubble);
        chatInput.value = '';
        chatWindow.scrollTop = chatWindow.scrollHeight;

        aiTyping.classList.remove('hidden');
        chatSend.disabled = true; 

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, session_id: chatSessionId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.reply || "Erro na resposta da API");
            
            const aiMessage = data.reply; 
            const aiBubble = document.createElement('div');
            aiBubble.className = 'flex justify-start';
            aiBubble.innerHTML = `<div class="bg-gray-200 text-gray-800 p-2 px-3 rounded-lg max-w-xs"><p class="text-sm">${aiMessage}</p></div>`;
            chatWindow.appendChild(aiBubble);

        } catch (error) {
            console.error("Erro chat:", error);
            const errorBubble = document.createElement('div');
            errorBubble.className = 'flex justify-start';
            errorBubble.innerHTML = `<div class="bg-red-100 text-red-700 p-2 px-3 rounded-lg max-w-xs"><p class="text-sm">Erro: ${error.message}</p></div>`;
            chatWindow.appendChild(errorBubble);
        } finally {
            aiTyping.classList.add('hidden');
            chatSend.disabled = false;
            chatWindow.scrollTop = chatWindow.scrollHeight;
            chatInput.focus();
        }
    };

    if (chatSend) { chatSend.addEventListener('click', handleChatSend); }
    if (chatInput) { chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChatSend(); }); }
    if (btnLogout) { btnLogout.addEventListener('click', (e) => { e.preventDefault(); console.log("CLIQUE: Logout"); window.location.href = "/"; }); }
    if (emailParaEnvio) { emailParaEnvio.addEventListener('input', (e) => e.target.classList.remove('border-red-500')); }
    showProfile();
}