/**
 * SCRIPT DO FÓRUM - Kampus.
 * 
 * Funcionalidades:
 * - Autenticação Google com Firebase
 * - Verificação/Criação de Username
 * - CRUD de Posts em tempo real (Firestore)
 * - Sistema de Votos (Up/Down)
 * - Comentários aninhados
 * - Interface dinâmica SPA
 */

// Estado global da aplicação
let currentUser = null;
let userData = null;
let postsUnsubscribe = null;
const commentListeners = {}; // Armazena listeners de comentários para limpeza

// Referências DOM
const elements = {
    // Auth
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('btnLogout'),
    loginCard: document.getElementById('loginCard'),
    profileCard: document.getElementById('profileCard'),
    userPhoto: document.getElementById('userPhoto'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),

    // Modal Username
    usernameModal: document.getElementById('usernameModal'),
    usernameForm: document.getElementById('usernameForm'),
    usernameInput: document.getElementById('usernameInput'),
    usernameError: document.getElementById('usernameError'),

    // Posts
    createPostArea: document.getElementById('createPostArea'),
    postForm: document.getElementById('postForm'),
    postTitle: document.getElementById('postTitle'),
    postContent: document.getElementById('postContent'),
    charCount: document.getElementById('charCount'),
    postsFeed: document.getElementById('postsFeed'),
    emptyState: document.getElementById('emptyState'),

    // Estatísticas
    statPosts: document.getElementById('statPosts'),
    statUsers: document.getElementById('statUsers')
};

/**
 * INICIALIZAÇÃO
 */
// Verifica se há usuário logado ao carregar
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupEventListeners();
    loadStats();
});

/**
 * AUTENTICAÇÃO E CONTROLE DE USUÁRIO
 */

// Observador de estado de autenticação
function initializeAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Se já processou via redirect, ignora para não duplicar
            if (!currentUser) {
                currentUser = user;
                await checkUserProfile(user);
            }
        } else {
            // Usuário deslogado
            currentUser = null;
            userData = null;
            updateUIForLoggedOut();
        }
    });
}

// Verifica se usuário já tem perfil no Firestore
async function checkUserProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists) {
            // Usuário existente
            userData = userDoc.data();
            updateUIForLoggedIn();
            loadPosts(); // Carrega posts em tempo real
        } else {
            // Novo usuário - mostra modal para criar username
            showUsernameModal();
        }
    } catch (error) {
        console.error("Erro ao verificar perfil:", error);
        showToast("Erro ao carregar perfil. Tente novamente.");
    }
}

// Mostra modal de criação de username
function showUsernameModal() {
    elements.usernameModal.classList.remove('hidden');
    elements.usernameModal.classList.add('flex');
    elements.usernameInput.focus();
}

// Esconde modal de username
function hideUsernameModal() {
    elements.usernameModal.classList.add('hidden');
    elements.usernameModal.classList.remove('flex');
}

// Cria novo perfil de usuário com username
async function createUserProfile(username) {
    try {
        // Verifica se username já existe (query na coleção)
        const usernameQuery = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (!usernameQuery.empty) {
            elements.usernameError.classList.remove('hidden');
            elements.usernameInput.classList.add('border-red-500');
            return false;
        }

        // Cria documento do usuário
        await db.collection('users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            email: currentUser.email,
            username: username,
            photoURL: currentUser.photoURL,
            displayName: currentUser.displayName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        userData = {
            uid: currentUser.uid,
            email: currentUser.email,
            username: username,
            photoURL: currentUser.photoURL
        };

        hideUsernameModal();
        updateUIForLoggedIn();
        loadPosts();
        showToast("Bem-vindo ao fórum, @" + username + "!");
        return true;

    } catch (error) {
        console.error("Erro ao criar perfil:", error);
        showToast("Erro ao criar perfil. Tente novamente.");
        return false;
    }
}

// Login com Google - Usando Popup (Melhor para desenvolvimento e UX)
async function signInWithGoogle() {
    try {
        elements.btnLogin.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i> Autenticando...';
        feather.replace();

        // Usa popup em vez de redirect (melhor feedback visual e compatibilidade local)
        const result = await auth.signInWithPopup(googleProvider);

        // O onAuthStateChanged vai lidar com o resto, mas podemos dar feedback imediato
        if (result.user) {
            showToast("Login realizado com sucesso!");
        }

    } catch (error) {
        console.error("Erro ao iniciar login:", error);

        // Mensagens de erro mais amigáveis
        let errorMsg = "Erro ao fazer login. Tente novamente.";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMsg = "Login cancelado pelo usuário.";
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg = "Erro de conexão. Verifique sua internet.";
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMsg = "Domínio não autorizado no Firebase Console.";
        }

        showToast(errorMsg);

        elements.btnLogin.innerHTML = '<i data-feather="chrome" class="w-4 h-4 inline mr-2"></i> Entrar com Google';
        feather.replace();
    }
}

// Logout
async function signOut() {
    try {
        await auth.signOut();
        showToast("Você saiu da conta.");
    } catch (error) {
        console.error("Erro no logout:", error);
    }
}

/**
 * ATUALIZAÇÃO DE UI
 */

function updateUIForLoggedIn() {
    // Esconde login, mostra perfil
    elements.loginCard.classList.add('hidden');
    elements.profileCard.classList.remove('hidden');
    elements.createPostArea.classList.remove('hidden');

    // Preenche dados do usuário
    elements.userPhoto.src = userData.photoURL || 'https://via.placeholder.com/80';
    elements.userName.textContent = '@' + userData.username;
    elements.userEmail.textContent = userData.email;

    // Atualiza ícones
    feather.replace();
}

function updateUIForLoggedOut() {
    // Mostra login, esconde perfil e área de criar post
    elements.loginCard.classList.remove('hidden');
    elements.profileCard.classList.add('hidden');
    elements.createPostArea.classList.add('hidden');

    // Limpa feed (vai recarregar quando logar)
    if (postsUnsubscribe) {
        postsUnsubscribe();
        postsUnsubscribe = null;
    }

    elements.postsFeed.innerHTML = `
        <div class="prova-card text-center py-8">
            <i data-feather="lock" class="w-12 h-12 mx-auto text-gray-600 mb-3"></i>
            <p class="text-gray-400">Faça login para ver as discussões</p>
        </div>
    `;
    feather.replace();

    // Reseta botão de login se necessário
    elements.btnLogin.innerHTML = '<i data-feather="chrome" class="w-4 h-4 inline mr-2"></i> Entrar com Google';
    feather.replace();
}

/**
 * SISTEMA DE POSTS
 */

// Carrega posts em tempo real
let allPosts = []; // Armazena todos os posts para busca local

function loadPosts() {
    // Limpa listener anterior se existir
    if (postsUnsubscribe) {
        postsUnsubscribe();
    }

    // Query ordenada por data (mais recente primeiro)
    postsUnsubscribe = db.collection('posts')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                allPosts = [];
                renderPosts([]);
                return;
            }

            // Salva posts na variável global
            allPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Aplica filtro atual se houver busca, senão renderiza tudo
            const searchTerm = document.getElementById('searchPosts')?.value.toLowerCase().trim() || '';
            filterPosts(searchTerm);

            // Atualiza estatísticas
            elements.statPosts.textContent = snapshot.size;
        }, (error) => {
            console.error("Erro ao carregar posts:", error);
            elements.postsFeed.innerHTML = `
                <div class="prova-card text-center py-8 border-red-500/30">
                    <i data-feather="alert-circle" class="w-12 h-12 mx-auto text-red-400 mb-3"></i>
                    <p class="text-red-400">Erro ao carregar posts. Recarregue a página.</p>
                </div>
            `;
            feather.replace();
        });
}

// Filtra e renderiza posts
function filterPosts(term) {
    const filtered = term
        ? allPosts.filter(post =>
            (post.title && post.title.toLowerCase().includes(term)) ||
            (post.content && post.content.toLowerCase().includes(term))
        )
        : allPosts;

    renderPosts(filtered);
}

// Renderiza a lista de posts na tela
function renderPosts(posts) {
    if (posts.length === 0) {
        elements.postsFeed.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        // Se tem termo de busca, ajusta mensagem
        const searchTerm = document.getElementById('searchPosts')?.value;
        if (searchTerm) {
            elements.emptyState.querySelector('h3').textContent = 'Nenhum resultado encontrado';
            elements.emptyState.querySelector('p').textContent = `Não encontramos nada para "${searchTerm}"`;
        } else {
            elements.emptyState.querySelector('h3').textContent = 'Nenhuma discussão ainda';
            elements.emptyState.querySelector('p').textContent = 'Seja o primeiro a criar um post!';
        }
    } else {
        elements.emptyState.classList.add('hidden');
        elements.postsFeed.innerHTML = posts.map(post => createPostHTML(post.id, post)).join('');
        feather.replace();
    }
}

// Cria HTML de um post (estilo Reddit)
function createPostHTML(postId, post) {
    const isAuthor = currentUser && post.authorId === currentUser.uid;
    const date = post.createdAt ? formatDate(post.createdAt.toDate()) : 'Agora';
    const voteCount = (post.upvotes || 0) - (post.downvotes || 0);
    const userVote = getUserVote(post);

    return `
        <article class="prova-card p-0 overflow-hidden" id="post-${postId}">
            <div class="flex">
                <!-- Lateral de Votos (Estilo Reddit) -->
                <div class="bg-black/30 p-4 flex flex-col items-center justify-start min-w-[60px] border-r border-[#00f5d4]/10">
                    <button onclick="votePost('${postId}', 'up')" 
                            class="action-btn text-gray-400 hover:text-[#00f5d4] transition-colors ${userVote === 'up' ? 'text-[#00f5d4]' : ''}">
                        <i data-feather="arrow-up" class="w-6 h-6"></i>
                    </button>
                    <span class="font-bold text-lg my-1 ${voteCount > 0 ? 'text-[#00f5d4]' : voteCount < 0 ? 'text-red-400' : 'text-gray-400'}">
                        ${voteCount}
                    </span>
                    <button onclick="votePost('${postId}', 'down')" 
                            class="action-btn text-gray-400 hover:text-red-400 transition-colors ${userVote === 'down' ? 'text-red-400' : ''}">
                        <i data-feather="arrow-down" class="w-6 h-6"></i>
                    </button>
                </div>
                
                <!-- Conteúdo Principal -->
                <div class="flex-1 p-4">
                    <div class="flex items-center gap-2 mb-2 text-sm text-gray-400">
                        <img src="${post.authorPhoto || 'https://via.placeholder.com/20'}" class="w-5 h-5 rounded-full">
                        <span class="font-medium text-[#00f5d4]">@${post.authorUsername}</span>
                        <span>•</span>
                        <span>${date}</span>
                        ${isAuthor ? `<span class="ml-auto text-xs bg-[#00f5d4]/20 text-[#00f5d4] px-2 py-1 rounded">Você</span>` : ''}
                    </div>
                    
                    <h3 class="text-xl font-bold text-white mb-2 font-['Space_Grotesk']">${escapeHtml(post.title)}</h3>
                    <p class="text-gray-300 whitespace-pre-wrap mb-4">${escapeHtml(post.content)}</p>
                    
                    <!-- Ações -->
                    <div class="flex items-center gap-4 pt-2 border-t border-[#00f5d4]/10">
                        <button onclick="toggleComments('${postId}')" class="action-btn flex items-center gap-2 text-gray-400 hover:text-[#00f5d4] transition-colors text-sm">
                            <i data-feather="message-circle" class="w-4 h-4"></i>
                            <span id="comment-count-${postId}">${post.commentsCount || 0} comentários</span>
                        </button>
                        
                        ${isAuthor ? `
                            <button onclick="deletePost('${postId}')" class="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm ml-auto">
                                <i data-feather="trash-2" class="w-4 h-4"></i>
                                <span>Excluir</span>
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- Seção de Comentários (Colapsável) -->
                    <div id="comments-${postId}" class="hidden mt-4 pt-4 border-t border-[#00f5d4]/10">
                        <!-- Lista de comentários -->
                        <div id="comments-list-${postId}" class="space-y-3 mb-4 max-h-96 overflow-y-auto">
                            <p class="text-gray-500 text-sm text-center py-4">Carregando comentários...</p>
                        </div>
                        
                        <!-- Input de comentário (só logado) -->
                        ${currentUser ? `
                            <form onsubmit="addComment(event, '${postId}')" class="flex gap-2">
                                <input type="text" 
                                       placeholder="Escreva um comentário..." 
                                       class="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-[#00f5d4]/30 focus:border-[#00f5d4] text-white text-sm"
                                       required
                                       maxlength="500">
                                <button type="submit" class="btn-neon py-2 px-4 text-sm">
                                    <i data-feather="send" class="w-4 h-4"></i>
                                </button>
                            </form>
                        ` : `
                            <p class="text-gray-500 text-sm text-center">Faça login para comentar</p>
                        `}
                    </div>
                </div>
            </div>
        </article>
    `;
}

// Verifica voto do usuário atual no post
function getUserVote(post) {
    if (!currentUser || !post.votes) return null;
    return post.votes[currentUser.uid] || null;
}

// Cria novo post
async function createPost(title, content) {
    if (!currentUser || !userData) {
        showToast("Você precisa estar logado para postar.");
        return;
    }

    try {
        const postData = {
            title: title,
            content: content,
            authorId: currentUser.uid,
            authorUsername: userData.username,
            authorPhoto: userData.photoURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            upvotes: 0,
            downvotes: 0,
            commentsCount: 0,
            votes: {} // Map de userId -> 'up' ou 'down'
        };

        await db.collection('posts').add(postData);

        // Limpa formulário
        elements.postTitle.value = '';
        elements.postContent.value = '';
        elements.charCount.textContent = '0/1000';

        showToast("Post publicado com sucesso!");

    } catch (error) {
        console.error("Erro ao criar post:", error);
        showToast("Erro ao publicar. Tente novamente.");
    }
}

// Vota em um post
async function votePost(postId, voteType) {
    if (!currentUser) {
        showToast("Faça login para votar.");
        return;
    }

    const postRef = db.collection('posts').doc(postId);

    try {
        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) return;

            const post = postDoc.data();
            const currentVote = post.votes && post.votes[currentUser.uid];
            let upvotes = post.upvotes || 0;
            let downvotes = post.downvotes || 0;
            const newVotes = { ...(post.votes || {}) };

            // Se já votou igual, remove o voto (toggle)
            if (currentVote === voteType) {
                delete newVotes[currentUser.uid];
                if (voteType === 'up') upvotes--;
                else downvotes--;
            } else {
                // Se trocou de voto, decrementa o anterior
                if (currentVote === 'up') upvotes--;
                if (currentVote === 'down') downvotes--;

                // Adiciona novo voto
                newVotes[currentUser.uid] = voteType;
                if (voteType === 'up') upvotes++;
                else downvotes++;
            }

            transaction.update(postRef, {
                upvotes: upvotes,
                downvotes: downvotes,
                votes: newVotes
            });
        });
    } catch (error) {
        console.error("Erro ao votar:", error);
        showToast("Erro ao registrar voto.");
    }
}

// Exclui post (apenas autor)
async function deletePost(postId) {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    try {
        // Primeiro exclui todos os comentários
        const commentsSnapshot = await db.collection('comments')
            .where('postId', '==', postId)
            .get();

        const batch = db.batch();
        commentsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Depois exclui o post
        await db.collection('posts').doc(postId).delete();
        showToast("Post excluído com sucesso.");

    } catch (error) {
        console.error("Erro ao excluir:", error);
        showToast("Erro ao excluir post.");
    }
}

/**
 * SISTEMA DE COMENTÁRIOS
 */

// Toggle visibilidade dos comentários
async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;

    const isHidden = commentsSection.classList.contains('hidden');

    if (isHidden) {
        commentsSection.classList.remove('hidden');
        loadComments(postId);
    } else {
        commentsSection.classList.add('hidden');
        // Limpa listener ao fechar para economizar recursos
        if (commentListeners[postId]) {
            commentListeners[postId]();
            delete commentListeners[postId];
        }
    }
}

// Carrega comentários de um post
function loadComments(postId) {
    const commentsList = document.getElementById(`comments-list-${postId}`);
    if (!commentsList) return;

    // Se já existe listener, remove antes de criar novo
    if (commentListeners[postId]) {
        commentListeners[postId]();
    }

    commentsList.innerHTML = '<div class="text-center py-4"><i data-feather="loader" class="w-6 h-6 animate-spin mx-auto text-[#00f5d4]"></i></div>';
    feather.replace();

    commentListeners[postId] = db.collection('comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'asc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                commentsList.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>';
                return;
            }

            commentsList.innerHTML = snapshot.docs.map(doc => createCommentHTML(doc.data())).join('');
            feather.replace();
        }, (error) => {
            console.error("Erro ao carregar comentários:", error);

            // Verifica se é erro de falta de índice
            if (error.code === 'failed-precondition') {
                const message = error.message;
                const linkMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                if (linkMatch) {
                    console.warn("⚠️ ÍNDICE NECESSÁRIO! Clique no link abaixo para criar:");
                    console.log(linkMatch[0]);
                    alert("Para ver os comentários, é necessário criar um índice no Firebase. Verifique o Console do Desenvolvedor (F12) e clique no link fornecido pelo Google.");
                }
            }

            commentsList.innerHTML = '<p class="text-red-400 text-sm text-center py-4">Erro ao carregar comentários. Verifique o console.</p>';
        });
}

// Cria HTML de um comentário
function createCommentHTML(comment) {
    const date = comment.createdAt ? formatDate(comment.createdAt.toDate()) : 'Agora';
    const isAuthor = currentUser && comment.authorId === currentUser.uid;

    return `
        <div class="bg-black/30 rounded-lg p-3 ${isAuthor ? 'border-l-2 border-[#00f5d4]' : ''}">
            <div class="flex items-center gap-2 mb-1 text-xs text-gray-400">
                <span class="font-medium text-[#00bbf9]">@${comment.authorUsername}</span>
                <span>•</span>
                <span>${date}</span>
            </div>
            <p class="text-gray-300 text-sm">${escapeHtml(comment.content)}</p>
        </div>
    `;
}

// Adiciona comentário
async function addComment(event, postId) {
    event.preventDefault();
    if (!currentUser || !userData) return;

    const input = event.target.querySelector('input');
    const content = input.value.trim();
    if (!content) return;

    try {
        // Adiciona comentário
        await db.collection('comments').add({
            postId: postId,
            authorId: currentUser.uid,
            authorUsername: userData.username,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Incrementa contador no post
        const postRef = db.collection('posts').doc(postId);
        await postRef.update({
            commentsCount: firebase.firestore.FieldValue.increment(1)
        });

        input.value = '';

        // Atualiza contador na UI
        const countElement = document.getElementById(`comment-count-${postId}`);
        if (countElement) {
            const current = parseInt(countElement.textContent) || 0;
            countElement.textContent = `${current + 1} comentários`;
        }

    } catch (error) {
        console.error("Erro ao comentar:", error);
        showToast("Erro ao publicar comentário.");
    }
}

/**
 * ESTATÍSTICAS
 */
async function loadStats() {
    try {
        // Conta usuários
        const usersSnapshot = await db.collection('users').get();
        elements.statUsers.textContent = usersSnapshot.size;

        // Posts são atualizados em tempo real no loadPosts()
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
    }
}

/**
 * EVENT LISTENERS
 */
function setupEventListeners() {
    // Login/Logout
    elements.btnLogin?.addEventListener('click', signInWithGoogle);
    elements.btnLogout?.addEventListener('click', signOut);

    // Modal Username
    elements.usernameForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = elements.usernameInput.value.trim();
        if (username) {
            await createUserProfile(username);
        }
    });

    // Validação em tempo real do username
    elements.usernameInput?.addEventListener('input', (e) => {
        elements.usernameError.classList.add('hidden');
        e.target.classList.remove('border-red-500');
        // Remove caracteres inválidos
        e.target.value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    });

    // Form de Post
    elements.postForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = elements.postTitle.value.trim();
        const content = elements.postContent.value.trim();
        if (title && content) {
            createPost(title, content);
        }
    });

    // Contador de caracteres
    elements.postContent?.addEventListener('input', (e) => {
        const count = e.target.value.length;
        elements.charCount.textContent = `${count}/1000`;
        if (count > 900) {
            elements.charCount.classList.add('text-yellow-400');
        } else {
            elements.charCount.classList.remove('text-yellow-400');
        }
    });

    // Barra de Pesquisa
    document.getElementById('searchPosts')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        filterPosts(term);
    });
}

/**
 * UTILITÁRIOS
 */

// Formata data relativa (ex: "2 horas atrás")
function formatDate(date) {
    const now = new Date();
    const diff = (now - date) / 1000; // segundos

    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} dias atrás`;

    return date.toLocaleDateString('pt-BR');
}

// Escapa HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toast notification simples
function showToast(message) {
    // Cria elemento toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-[#00f5d4] text-black px-6 py-3 rounded-lg shadow-lg z-50 animate__animated animate__fadeInUp font-medium';
    toast.textContent = message;

    document.body.appendChild(toast);

    // Remove após 3 segundos
    setTimeout(() => {
        toast.classList.remove('animate__fadeInUp');
        toast.classList.add('animate__fadeOutDown');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Expor funções globais para onclick handlers
window.votePost = votePost;
window.toggleComments = toggleComments;
window.deletePost = deletePost;
window.addComment = addComment;