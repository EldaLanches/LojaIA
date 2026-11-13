const chat = document.getElementById('chat');
const form = document.getElementById('form');
const pergunta = document.getElementById('pergunta');
const enviar = document.getElementById('enviar');
const nova = document.getElementById('nova');
const listaConversasEl = document.getElementById('lista-conversas');

// Recupera ou cria o ID da conversa atual
let conversa = localStorage.getItem('conversa');
if (!conversa) {
  conversa = crypto.randomUUID();
  localStorage.setItem('conversa', conversa);
}

// Recupera a lista de conversas salvas no navegador para exibir na barra lateral
let listaConversas = JSON.parse(localStorage.getItem('lista_conversas')) || [];

function salvarListaConversas() {
  localStorage.setItem('lista_conversas', JSON.stringify(listaConversas));
  renderizarSidebar();
}

// Garante que a conversa atual esteja na lista da barra lateral
function registrarConversaAtual(titulo = 'Nova conversa') {
  const existente = listaConversas.find(c => c.id === conversa);
  if (!existente) {
    listaConversas.unshift({ id: conversa, titulo: titulo });
    salvarListaConversas();
  } else if (existente.titulo === 'Nova conversa' && titulo !== 'Nova conversa') {
    existente.titulo = titulo;
    salvarListaConversas();
  }
}

// Desenha os itens na barra lateral esquerda
function renderizarSidebar() {
  listaConversasEl.innerHTML = '';
  for (const item of listaConversas) {
    const li = document.createElement('li');
    li.className = 'item-conversa' + (item.id === conversa ? ' ativa' : '');
    li.textContent = item.titulo;
    li.title = item.titulo;

    li.addEventListener('click', () => {
      if (item.id === conversa) return;
      conversa = item.id;
      localStorage.setItem('conversa', conversa);
      chat.innerHTML = '';
      renderizarSidebar();
      carregarHistorico();
    });

    listaConversasEl.appendChild(li);
  }
}

function mostrar(classe, texto) {
  const div = document.createElement('div');
  div.className = classe;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// Ao abrir a página ou trocar de conversa: busca o histórico no banco
async function carregarHistorico() {
  try {
    const resposta = await fetch('/historico/' + conversa);
    const mensagens = await resposta.json();
    if (!resposta.ok) throw new Error(mensagens.erro);
    
    for (const m of mensagens) {
      mostrar('msg ' + m.role, m.content);
    }

    // Se já tinha mensagens no banco, usa a primeira pergunta como título na barra lateral
    const primeiraPergunta = mensagens.find(m => m.role === 'user');
    if (primeiraPergunta) {
      registrarConversaAtual(primeiraPergunta.content);
    } else {
      registrarConversaAtual('Nova conversa');
    }
  } catch (erro) {
    mostrar('msg assistant', 'Erro ao carregar o histórico: ' + erro.message);
  }
}

// Inicialização
registrarConversaAtual();
carregarHistorico();

// Botão "+ Nova conversa"
nova.addEventListener('click', () => {
  conversa = crypto.randomUUID();
  localStorage.setItem('conversa', conversa);
  chat.textContent = '';
  registrarConversaAtual('Nova conversa');
  pergunta.focus();
});

// Envio de mensagem
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const texto = pergunta.value.trim();
  if (!texto) return;

  // Atualiza o título da conversa na barra lateral com a primeira mensagem enviada
  registrarConversaAtual(texto);

  mostrar('msg user', texto);
  pergunta.value = '';
  enviar.disabled = true;
  const balao = mostrar('msg assistant', 'Pensando...');

  try {
    const resposta = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversa: conversa, texto: texto })
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro);

    balao.textContent = dados.resposta;
    if (dados.ferramentas && dados.ferramentas.length > 0) {
      mostrar('ferramentas', 'Consultou: ' + dados.ferramentas.join(', '));
    }
  } catch (erro) {
    balao.textContent = 'Erro: ' + erro.message;
  }
  enviar.disabled = false;
  pergunta.focus();
});