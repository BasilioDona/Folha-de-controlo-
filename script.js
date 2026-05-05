// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDW4U6YURHU7iGoaxIbcBw6B1EYNI11Jog",
  authDomain: "controlo-fa-24.firebaseapp.com",
  projectId: "controlo-fa-24",
  storageBucket: "controlo-fa-24.firebasestorage.app",
  messagingSenderId: "1044761248079",
  appId: "1:1044761248079:web:c2fb95f7be4bc6d3b4853a"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

// --- VARIÁVEIS GLOBAIS ---
let registros = [];
let fotos = [];
let indiceAtivo = -1;
let historicoFolhas = [];
let idFolhaAtual = null; 

// --- CONTROLO DE ACESSO ---
auth.onAuthStateChanged(user => {
    const telaLogin = document.getElementById('tela-login');
    const editor = document.querySelector('.editor-container');
    const preview = document.querySelector('.preview-wrapper');
    const btnPdf = document.querySelector('.btn-acao');

    if (user) {
        telaLogin.style.setProperty('display', 'none', 'important');
        editor.style.setProperty('display', 'block', 'important');
        preview.style.setProperty('display', 'flex', 'important');
        if(btnPdf) btnPdf.style.setProperty('display', 'block', 'important');
        carregarHistoricoNuvem(); 
    } else {
        telaLogin.style.setProperty('display', 'flex', 'important');
        editor.style.setProperty('display', 'none', 'important');
        preview.style.setProperty('display', 'none', 'important');
        if(btnPdf) btnPdf.style.setProperty('display', 'none', 'important');
    }
});

function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    if(!email || !senha) { alert("Preencha todos os campos!"); return; }
    auth.signInWithEmailAndPassword(email, senha).catch(e => alert("Erro: " + e.message));
}

function fazerLogout() {
    if (confirm("Deseja realmente sair do sistema?")) {
        auth.signOut();
    }
}

// --- COMPRESSÃO DE IMAGENS (CORREÇÃO PARA O ERRO DE 1MB) ---
function comprimirImagem(base64Str, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7)); 
    };
}

function addFoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            comprimirImagem(e.target.result, (fotoComprimida) => {
                fotos.push(fotoComprimida); 
                renderAnexos(); 
                updateFotosPreview();
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removerFoto(i) { fotos.splice(i, 1); renderAnexos(); updateFotosPreview(); }

function renderAnexos() {
    document.getElementById('lista-anexos').innerHTML = fotos.map((f, i) => `
        <div class="anexo-item"><span>Foto #${i+1}</span><button onclick="removerFoto(${i})" style="background:#ff4444; color:white; border:none; border-radius:4px; padding:2px 8px;">Remover</button></div>
    `).join('');
}

function updateFotosPreview() {
    document.getElementById('paginas-fotos').innerHTML = fotos.map((f, i) => `
        <div class="folha-foto"><div style="font-weight:bold; border-bottom:1px solid #000; width:100%; text-align:center; padding-bottom:5px;">ANEXO #${i+1}</div><img src="${f}" class="foto-preview"></div>
    `).join('');
}

// --- GESTÃO DE REGISTOS ---
function addLinha() {
    indiceAtivo = registros.length;
    registros.push({ data: '', cli: '', apv: '', desc: '', trans: '', val: '', ent: '', sai: '', especial: false });
    renderInputs();
    update();
}

function regUpdate(i, k, v) { 
    registros[i][k] = v; 
    if(registros[i].especial) {
        const totalSai = registros[i].sai.split('\n').reduce((acc, val) => acc + parsePtFloat(val), 0);
        registros[i].ent = totalSai.toFixed(2).replace('.',',');
    }
    update(); 
}

function removerLinha(i) { registros.splice(i, 1); indiceAtivo = -1; renderInputs(); update(); }
function toggleEdit(i) { indiceAtivo = (indiceAtivo === i ? -1 : i); renderInputs(); }

function renderInputs() {
    const container = document.getElementById('lista-corpo');
    container.innerHTML = registros.map((r, i) => `
        <div style="background:#f9f9f9; padding:15px; border:1px solid #ddd; border-radius:8px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; cursor:pointer; font-weight:bold;" onclick="toggleEdit(${i})">
                <span>Registo #${i+1} ${r.cli}</span> <span>${indiceAtivo === i ? '▲' : '▼'}</span>
            </div>
            <div style="display:${indiceAtivo === i ? 'grid' : 'none'}; gap:10px; margin-top:10px;">
                <div class="special-toggle">
                    <input type="checkbox" ${r.especial ? 'checked' : ''} onchange="regUpdate(${i},'especial',this.checked)"> Registo Especial (Saldo Neutro)
                </div>
                <div class="grid-inputs">
                    <input type="date" value="${r.data}" oninput="regUpdate(${i},'data',this.value)">
                    <input type="text" placeholder="Cliente" value="${r.cli}" oninput="regUpdate(${i},'cli',this.value)">
                    <input type="text" placeholder="APV" value="${r.apv}" oninput="regUpdate(${i},'apv',this.value)">
                </div>
                <div class="grid-inputs">
                    <textarea placeholder="M. Transporte" oninput="regUpdate(${i},'trans',this.value)">${r.trans}</textarea>
                    <input type="text" placeholder="Validação" value="${r.val}" oninput="regUpdate(${i},'val',this.value)">
                    <input type="text" placeholder="Entrada €" value="${r.ent}" ${r.especial ? 'disabled' : ''} oninput="regUpdate(${i},'ent',this.value)">
                </div>
                <textarea placeholder="Saída (€ por linha)" oninput="regUpdate(${i},'sai',this.value)">${r.sai}</textarea>
                <textarea placeholder="Descrição" oninput="regUpdate(${i},'desc',this.value)">${r.desc}</textarea>
                <button onclick="removerLinha(${i})" style="background:#ff4444; color:white; border:none; padding:8px; border-radius:4px;">Remover</button>
            </div>
        </div>
    `).join('');
}

// --- CÁLCULOS E VISUALIZAÇÃO ---
function parsePtFloat(val) {
    if(!val) return 0;
    return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
}

function update() {
    document.getElementById('out-nome').innerText = document.getElementById('in-nome').value;
    document.getElementById('out-pag').innerText = document.getElementById('in-pag').value;
    const dRel = document.getElementById('in-data-rel').value;
    document.getElementById('out-data-rel').innerText = dRel ? dRel.split('-').reverse().join('/') : '';
    const dIni = document.getElementById('in-data-ini').value;
    document.getElementById('out-data-ini').innerText = dIni ? dIni.split('-').reverse().join('/') : '';
    
    const ini = parsePtFloat(document.getElementById('in-saldo-ini').value);
    const f = { minimumFractionDigits: 2 };
    
    document.getElementById('out-saldo-ini-val').innerText = ini.toLocaleString('pt-PT', f);
    document.getElementById('out-saldo-ini-col').innerText = ini.toLocaleString('pt-PT', f);

    let atual = ini;
    let html = '';
    registros.forEach(r => {
        const ent = parsePtFloat(r.ent);
        const totalSai = r.sai.split('\n').reduce((acc, val) => acc + parsePtFloat(val), 0);
        atual = atual + ent - totalSai;
        html += `<tr>
            <td>${r.data ? r.data.split('-').reverse().join('/') : ''}</td>
            <td>${r.cli}</td><td>${r.apv}</td>
            <td style="text-align:left; white-space:pre-wrap;">${r.desc}</td>
            <td style="white-space:pre-wrap;">${r.trans}</td><td>${r.val}</td>
            <td>${ent !== 0 ? ent.toLocaleString('pt-PT', f) : ''}</td>
            <td style="white-space:pre-wrap;">${r.sai}</td>
            <td>${atual.toLocaleString('pt-PT', f)}</td>
        </tr>`;
    });
    document.getElementById('tabela-corpo').innerHTML = html;
    document.getElementById('out-saldo-fim-val').innerText = atual.toLocaleString('pt-PT', f);
}

// --- FUNÇÕES DE NUVEM (FIRESTORE) - CORRIGIDAS ---
async function salvarFolhaNaNuvem(dados) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await db.collection("folhas").doc(dados.id.toString()).set({
            ...dados,
            uid: user.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Folha guardada com sucesso!");
        carregarHistoricoNuvem(); // Atualiza a lista lateral imediatamente
    } catch (e) {
        alert("Erro ao guardar na nuvem: " + e.message);
    }
}

async function novaFolha() {
    const user = auth.currentUser;
    if (!user) { alert("Precisas de estar logado!"); return; }

    const dadosParaSalvar = {
        id: Date.now(),
        nome: document.getElementById('in-nome').value,
        dataRel: document.getElementById('in-data-rel').value,
        saldoIni: document.getElementById('in-saldo-ini').value,
        pag: document.getElementById('in-pag').value,
        registros: registros,
        fotos: fotos
    };

    await salvarFolhaNaNuvem(dadosParaSalvar);
    
    // Limpeza após salvar para permitir nova folha
    idFolhaAtual = null; 
    registros = [];
    fotos = [];
    document.getElementById('in-nome').value = "";
    document.getElementById('in-data-rel').value = "";
    document.getElementById('in-saldo-ini').value = "0,00";
    document.getElementById('in-pag').value = "01/01";
    
    renderInputs();
    renderAnexos();
    updateFotosPreview();
    update();
}

function carregarHistoricoNuvem() {
 db.collection("folhas")
  .where("uid", "==", auth.currentUser.uid)
  .onSnapshot(snapshot => {
    historicoFolhas = snapshot.docs.map(doc => doc.data());
    atualizarListaHistorico();
  });
}

function carregarDoHistorico(id) {
    const folha = historicoFolhas.find(f => f.id === id);
    if (folha) {
        idFolhaAtual = folha.id;
        document.getElementById('in-nome').value = folha.nome || "";
        document.getElementById('in-data-rel').value = folha.dataRel || "";
        document.getElementById('in-saldo-ini').value = folha.saldoIni || "";
        document.getElementById('in-pag').value = folha.pag || "01/01";
        registros = JSON.parse(JSON.stringify(folha.registros));
        fotos = [...folha.fotos];
        renderInputs();
        renderAnexos();
        updateFotosPreview();
        update();
    }
}

function atualizarListaHistorico() {
    const lista = document.getElementById('lista-folhas-historico');
    if (historicoFolhas.length === 0) {
        lista.innerHTML = '<span>Nenhuma folha arquivada.</span>';
        return;
    }
    lista.innerHTML = historicoFolhas.map(f => `
        <button onclick="carregarDoHistorico(${f.id})" class="btn-folha-historico ${f.id === idFolhaAtual ? 'ativa' : ''}">
            <strong>${f.dataRel ? f.dataRel.split('-').reverse().join('/') : 'S/ Data'}</strong>
            <small>${f.nome || 'S/ Nome'}</small>
        </button>
    `).join('');
}

async function apagarFolhaAtual() {
    if (!idFolhaAtual) { alert("Selecione uma folha primeiro."); return; }
    if (confirm("Eliminar esta folha permanentemente?")) {
        try {
            await db.collection("folhas").doc(idFolhaAtual.toString()).delete();
            alert("Eliminado com sucesso!");
            idFolhaAtual = null; // Limpa o ID ativo
            location.reload();
        } catch (e) { alert("Erro ao apagar: " + e.message); }
    }
}

// --- UTILITÁRIOS ---
function toggleCabecalho() {
    const secao = document.getElementById('secao-cabecalho');
    const seta = document.getElementById('seta-cabecalho');
    secao.style.display = (secao.style.display === "none") ? "block" : "none";
    seta.innerText = (secao.style.display === "none") ? "▼" : "▲";
}

function ajustarZoom() {
    const wrapper = document.querySelector('.preview-wrapper');
    const area = document.getElementById('capture-area');
    if(!wrapper || !area) return;
    let scale = wrapper.offsetWidth / 1150;
    if (scale > 1) scale = 1;
    area.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', ajustarZoom);
window.onload = ajustarZoom;

async function gerarPDF() {
    const area = document.getElementById('capture-area');
    const originalTransform = area.style.transform;
    area.style.transform = "none";
    const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
    try {
        const canvas1 = await html2canvas(document.getElementById('pag-principal'), { scale: 2 });
        pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
        const pagsFotos = document.querySelectorAll('.folha-foto');
        for(let i=0; i<pagsFotos.length; i++) {
            pdf.addPage('a4', 'portrait');
            const canvasF = await html2canvas(pagsFotos[i], { scale: 2 });
            pdf.addImage(canvasF.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
        }
        pdf.save('Relatorio_Controlo.pdf');
    } catch (e) { alert("Erro ao gerar PDF."); } finally { area.style.transform = originalTransform; }
}
