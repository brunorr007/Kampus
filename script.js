// Kampus Core Script
// Mobile-First, Data-Driven

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Inicializa Ícones
    if (typeof feather !== 'undefined') feather.replace();

    // 2. Determina a página atual e roda lógica específica
    const path = window.location.pathname;
    const page = path.split("/").pop();

    setActiveNav(page);

    if (page === 'index.html' || page === '') {
        carregarFeed();
    } else if (page === 'estudos.html') {
        carregarEstudos();
    } else if (page === 'market.html') {
        carregarFirestore('market', 'market-feed');
    } else if (page === 'eventos.html') {
        carregarFirestore('eventos', 'eventos-feed');
    } else if (page === 'ru.html') {
        carregarRU();
    }

    // 3. Auth Listener Global
    auth.onAuthStateChanged(user => {
        if (!user && page !== 'login.html') {
            console.log("Visitante - Funcionalidades limitadas");
        }
    });
}

// === SEGURANÇA ===
function checkAuth(actionName) {
    const user = firebase.auth().currentUser;
    if (!user) {
        if (confirm(`Você precisa estar logado para ${actionName}.\nDeseja fazer login agora?`)) {
            window.location.href = 'forum.html';
        }
        return false;
    }
    return true;
}

function handlePostAction(type) {
    if (!checkAuth(`criar um novo ${type}`)) return;
    alert(`Funcionalidade de Novo ${type} em breve!`);
}

function setActiveNav(page) {
    // Remove active de todos
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Adiciona active baseado na página
    let selector = '';
    if (page === 'index.html' || page === '') selector = 'a[href="index.html"]';
    else if (page.includes('estudos')) selector = 'a[href="estudos.html"]';
    else if (page.includes('market')) selector = 'a[href="market.html"]';
    else if (page.includes('eventos')) selector = 'a[href="eventos.html"]';
    else if (page.includes('forum')) selector = 'a[href="forum.html"]';
    else if (page.includes('ru')) selector = 'a[href="index.html"]';

    if (selector) {
        const activeEl = document.querySelector(selector);
        if (activeEl) activeEl.classList.add('active');
    }
}

// === AUTOMAÇÃO RU (UFC CRAWLER V2 - DATA LINK) ===
async function carregarRU() {
    // Usamos proxy para evitar CORS bloqueio
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const baseUrl = 'https://www.ufc.br/restaurante/cardapio/1-restaurante-universitario-de-fortaleza';

    // Helper UI Update
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    try {
        console.log("Iniciando busca RU...");

        // PASSO 1: Pegar lista de datas
        const responseMain = await fetch(proxyUrl + encodeURIComponent(baseUrl));
        const dataMain = await responseMain.json();
        if (!dataMain.contents) throw new Error('Falha Proxy Main');

        const parser = new DOMParser();
        const docMain = parser.parseFromString(dataMain.contents, 'text/html');

        // Encontra o primeiro link que parece ser uma data de cardápio (ex: .../2026-02-11)
        // Seleciona todos os links da area de conteudo
        const contentArea = docMain.getElementById('content-core') || docMain.body;
        const links = Array.from(contentArea.querySelectorAll('a'));

        // Filtra links que tem data no formato YYYY-MM-DD ou similar na URL
        const dayLinkEl = links.find(a => a.href && a.href.match(/\d{4}-\d{2}-\d{2}/));

        let targetDayUrl = dayLinkEl ? dayLinkEl.getAttribute('href') : null;

        if (!targetDayUrl) {
            // Se falhar em achar data, tenta pegar o primeiro link dentro da tabela de lista se houver
            throw new Error('Link do dia não encontrado');
        }

        console.log("Dia encontrado:", targetDayUrl);

        // Corrige URL relativa
        if (!targetDayUrl.startsWith('http')) {
            targetDayUrl = 'https://www.ufc.br' + (targetDayUrl.startsWith('/') ? '' : '/') + targetDayUrl;
        }

        // PASSO 2: Pegar o cardápio do dia específico
        const responseDay = await fetch(proxyUrl + encodeURIComponent(targetDayUrl));
        const dataDay = await responseDay.json();
        if (!dataDay.contents) throw new Error('Falha Proxy Dia');

        const doc = parser.parseFromString(dataDay.contents, 'text/html');

        // Helper de extração
        const findData = (term) => {
            const tds = Array.from(doc.querySelectorAll('td'));
            const found = tds.find(td => td.textContent.toLowerCase().includes(term.toLowerCase()));
            if (found && found.nextElementSibling) {
                return found.nextElementSibling.textContent.trim();
            }
            return '---';
        };

        // Extrai dados
        set('almoco-principal', findData('Prato Principal'));
        set('almoco-veg', findData('Vegetariano'));
        set('almoco-salada', findData('Salada'));
        set('almoco-guarnicao', findData('Guarnição'));
        set('almoco-sobremesa', findData('Sobremesa'));

        // Jantar (Tenta achar na segunda tabela ou pelos mesmos termos se for unificado)
        const tables = doc.querySelectorAll('table');
        if (tables.length > 1) {
            const jantarTable = tables[1];
            const findDataJantar = (term) => {
                const tds = Array.from(jantarTable.querySelectorAll('td'));
                const found = tds.find(td => td.textContent.toLowerCase().includes(term.toLowerCase()));
                return (found && found.nextElementSibling) ? found.nextElementSibling.textContent.trim() : '---';
            };

            set('jantar-principal', findDataJantar('Prato Principal'));
            set('jantar-veg', findDataJantar('Vegetariano'));
            set('jantar-guarnicao', findDataJantar('Guarnição'));
        } else {
            set('jantar-principal', 'Consulte App da UFC');
        }

        // Sucesso
        document.getElementById('ru-loading-almoco')?.classList.add('hidden');
        document.getElementById('ru-lista-almoco')?.classList.remove('hidden');
        document.getElementById('ru-loading-jantar')?.classList.add('hidden');
        document.getElementById('ru-lista-jantar')?.classList.remove('hidden');

    } catch (e) {
        console.error('Erro RU:', e);
        const loading = document.getElementById('ru-loading-almoco');
        if (loading) {
            loading.innerHTML = `
                <p class="text-red-400 text-sm mb-2">Não consegui ler o cardápio.</p>
                <a href="https://www.ufc.br/restaurante/cardapio/1-restaurante-universitario-de-fortaleza" target="_blank" class="px-3 py-2 bg-orange-500 text-white rounded text-xs font-bold">
                    ABRIR SITE OFICIAL
                </a>
            `;
        }
    }
}

// === LÓGICA DE DADOS ===

// 1. Estudos (Via dados.json)
async function carregarEstudos() {
    const lista = document.getElementById('lista-estudos');
    if (!lista) return;

    lista.innerHTML = '<div class="empty-state"><i data-feather="loader" class="animate-spin"></i><p>Carregando materiais...</p></div>';
    feather.replace();

    try {
        const response = await fetch('dados.json');
        if (!response.ok) throw new Error('Arquivo JSON não encontrado');

        const dados = await response.json();

        if (dados.length === 0) {
            lista.innerHTML = '<div class="empty-state"><i data-feather="book-open"></i><p>Nenhum material encontrado.</p></div>';
            feather.replace();
            return;
        }

        // Salva globalmente para filtro
        window.todosEstudos = dados;

        // Popula filtro de matérias
        const materias = [...new Set(dados.map(item => item.materia))].sort();
        const selectMateria = document.getElementById('filtro-materia');
        if (selectMateria) {
            materias.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                selectMateria.appendChild(opt);
            });
        }

        renderizarEstudos(dados);

    } catch (error) {
        console.error("Erro ao carregar estudos:", error);
        lista.innerHTML = `
            <div class="empty-state">
                <i data-feather="alert-triangle" class="text-yellow-500"></i>
                <p>Não foi possível carregar os materiais.</p>
                <p class="text-xs mt-2 text-gray-500">Certifique-se de rodar o script Python para gerar 'dados.json'.</p>
            </div>
        `;
        feather.replace();
    }
}

// Renderização Separada
function renderizarEstudos(listaItens) {
    const container = document.getElementById('lista-estudos');
    container.innerHTML = '';

    if (listaItens.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum resultado filtrado.</p></div>';
        return;
    }

    listaItens.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card animate-fade-in';
        // ... (resto do card igual)
        const titulo = item.materia || 'Matéria desconhecida';
        const subtitulo = `${item.professor} • ${item.tipo} (${item.ano})`;
        const link = item.arquivo;

        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <i data-feather="file-text"></i>
                    </div>
                    <div>
                        <h3 class="text-white font-bold capitalize">${titulo}</h3>
                        <p class="text-sm text-gray-400 capitalize">${subtitulo}</p>
                    </div>
                </div>
                <a href="${link}" target="_blank" class="btn-icon bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500 hover:text-white transition-all">
                    <i data-feather="download"></i>
                </a>
            </div>
        `;
        container.appendChild(card);
    });
    feather.replace();
}

// Filtro Dinâmico
window.filtrarEstudos = function () {
    const termo = document.getElementById('busca-estudos').value.toLowerCase();
    const materia = document.getElementById('filtro-materia').value;
    const tipo = document.getElementById('filtro-tipo').value;

    const filtrados = window.todosEstudos.filter(item => {
        const matchTermo = (item.materia || '').toLowerCase().includes(termo) ||
            (item.professor || '').toLowerCase().includes(termo);
        const matchMateria = materia ? item.materia === materia : true;
        const matchTipo = tipo ? (item.tipo || '').toLowerCase().includes(tipo.toLowerCase()) : true;

        return matchTermo && matchMateria && matchTipo;
    });

    renderizarEstudos(filtrados);
};

// 2. Firestore (Market / Eventos)
function carregarFirestore(collectionName, elementId) {
    const feed = document.getElementById(elementId);
    if (!feed) return;

    feed.innerHTML = '<div class="empty-state"><i data-feather="loader" class="animate-spin"></i><p>Sincronizando...</p></div>';
    feather.replace();

    db.collection(collectionName).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            feed.innerHTML = `
                <div class="empty-state">
                    <i data-feather="inbox"></i>
                    <p>Nenhum item por aqui ainda.</p>
                </div>
            `;
            feather.replace();
            return;
        }

        feed.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'card';

            if (collectionName === 'market') {
                const preco = data.preco ? `R$ ${data.preco}` : 'Grátis';
                const img = data.foto || 'https://via.placeholder.com/300x200?text=Sem+Foto';

                card.innerHTML = `
                    <div class="h-40 rounded-xl mb-4 bg-cover bg-center" style="background-image: url('${img}')"></div>
                    <div class="flex justify-between items-start">
                        <div>
                            <h3>${data.titulo}</h3>
                            <p class="text-purple-400 font-bold">${preco}</p>
                        </div>
                        <a href="https://wa.me/?text=Tenho interesse em ${data.titulo}" target="_blank" class="btn-icon bg-green-500/10 text-green-400">
                            <i data-feather="message-circle"></i>
                        </a>
                    </div>
                `;
            } else if (collectionName === 'eventos') {
                card.innerHTML = `
                    <div class="flex gap-4">
                        <div class="bg-purple-900/30 p-3 rounded-lg text-center h-fit min-w-[60px]">
                            <span class="block text-purple-400 font-bold text-xl">${data.dia || '??'}</span>
                            <span class="block text-xs uppercase text-gray-400">${data.mes || 'MÊS'}</span>
                        </div>
                        <div class="flex-1">
                            <h3>${data.titulo}</h3>
                            <p class="mb-2"><i data-feather="map-pin" class="w-3 h-3 inline"></i> ${data.local || 'Local a confirmar'}</p>
                            <button class="w-full bg-purple-600 text-white text-sm py-2 rounded-lg font-bold">Eu Vou</button>
                        </div>
                    </div>
                `;
            }

            feed.appendChild(card);
        });
        feather.replace();
    });
}

// 3. Fakes Feed (Index)
function carregarFeed() {
    const feed = document.getElementById('feed-container');
    if (feed) {
        feed.innerHTML = `
            <div class="card bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20">
                <h3 class="text-lg mb-2 text-white">Bem-vindo ao Kampus 🚀</h3>
                <p class="text-gray-300">Seu universo acadêmico em um só lugar.</p>
            </div>
            
            <h3 class="hero-subtitle mb-4 mt-8">DESTAQUES</h3>
        `;
    }
}

// === Lógica de Eventos (Modal) ===
window.abrirModalEvento = function () {
    if (!checkAuth('criar um rolê')) return;
    document.getElementById('modal-novo-evento').classList.remove('hidden');
};

window.fecharModalEvento = function () {
    document.getElementById('modal-novo-evento').classList.add('hidden');
};

window.salvarEvento = function (e) {
    e.preventDefault();

    const user = firebase.auth().currentUser;
    if (!user) return;

    const titulo = document.getElementById('evt-titulo').value;
    const data = document.getElementById('evt-data').value; // YYYY-MM-DD
    const hora = document.getElementById('evt-hora').value;
    const local = document.getElementById('evt-local').value;
    const foto = document.getElementById('evt-foto').value;
    const desc = document.getElementById('evt-desc').value;

    // Formatar Data para Dia/Mês
    const dateObj = new Date(data + 'T00:00:00');
    const dia = dateObj.getDate();
    const mes = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

    db.collection('eventos').add({
        titulo: titulo,
        local: local,
        dataIso: data,
        hora: hora,
        dia: dia,
        mes: mes,
        foto: foto,
        descricao: desc,
        authorId: user.uid,
        authorName: user.displayName || 'Anônimo',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Rolê criado com sucesso! 🎉');
        fecharModalEvento();
        document.getElementById('form-evento').reset();
    }).catch(err => {
        console.error("Erro ao salvar evento:", err);
        alert('Erro ao criar rolê. Tente novamente.');
    });
};

// === Lógica de Market (Modal) ===
window.abrirModalProduto = function () {
    if (!checkAuth('vender um produto')) return;
    document.getElementById('modal-novo-produto').classList.remove('hidden');
};

window.fecharModalProduto = function () {
    document.getElementById('modal-novo-produto').classList.add('hidden');
};

window.salvarProduto = function (e) {
    e.preventDefault();

    const user = firebase.auth().currentUser;
    if (!user) return;

    const titulo = document.getElementById('prod-titulo').value;
    const preco = document.getElementById('prod-preco').value;
    const foto = document.getElementById('prod-foto').value;
    const zap = document.getElementById('prod-zap').value;

    db.collection('market').add({
        titulo: titulo,
        preco: preco,
        foto: foto,
        whatsapp: zap,
        authorId: user.uid,
        authorName: user.displayName || 'Vendedor',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Produto anunciado com sucesso! 💰');
        fecharModalProduto();
        document.getElementById('form-produto').reset();
    }).catch(err => {
        console.error("Erro ao salvar produto:", err);
        alert('Erro ao anunciar. Tente novamente.');
    });
};

// Compressão (Mock)
async function compressImage(file) {
    return file;
}
