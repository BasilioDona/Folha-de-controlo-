// --- NOVO BLOCO DE INICIALIZAÇÃO (Substitua o anterior) ---
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

function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    
    if(!email || !senha) { alert("Preencha todos os campos!"); return; }

    auth.signInWithEmailAndPassword(email, senha)
        .then(() => { alert("Login efetuado!"); })
        .catch(e => { alert("Erro: " + e.message); });
}
// ATUALIZE ESTA FUNÇÃO
auth.onAuthStateChanged(user => {
    const telaLogin = document.getElementById('tela-login');
    const editor = document.querySelector('.editor-container');
    const preview = document.querySelector('.preview-wrapper');
    const btnPdf = document.querySelector('.btn-acao');

    if (user) {
        // Se logado, remove o bloqueio e mostra o sistema
        telaLogin.style.setProperty('display', 'none', 'important');
        editor.style.setProperty('display', 'block', 'important');
        preview.style.setProperty('display', 'flex', 'important');
        if(btnPdf) btnPdf.style.setProperty('display', 'block', 'important');
        
        carregarHistoricoNuvem(); 
    } else {
        // Se não logado, garante que a tela de login apareça e o resto suma
        telaLogin.style.setProperty('display', 'flex', 'important');
        editor.style.setProperty('display', 'none', 'important');
        preview.style.setProperty('display', 'none', 'important');
        if(btnPdf) btnPdf.style.setProperty('display', 'none', 'important');
    }
});



  
    let registros = [];
    let fotos = [];
    let indiceAtivo = -1;

    // Converte a logo para base64 logo que carrega para evitar erros de CORS no PDF
    window.onload = function() {
        ajustarZoom();
        const img = document.getElementById('logo-print');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                img.src = dataURL;
            } catch(e) {
                console.log("CORS impediu conversão, usando link direto com flag.");
            }
        };
    };

    function ajustarZoom() {
        const wrapper = document.querySelector('.preview-wrapper');
        const area = document.getElementById('capture-area');
        let scale = wrapper.offsetWidth / 1122;
        if (scale > 1) scale = 1;
        area.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', ajustarZoom);

    function addFoto(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => { fotos.push(e.target.result); renderAnexos(); updateFotosPreview(); };
            reader.readAsDataURL(input.files[0]);
        }
    }

    function renderAnexos() {
        document.getElementById('lista-anexos').innerHTML = fotos.map((f, i) => `
            <div class="anexo-item"><span>Foto #${i+1}</span><button onclick="removerFoto(${i})" style="background:#ff4444; color:white; border:none; border-radius:4px;">Remover</button></div>
        `).join('');
    }

    function removerFoto(i) { fotos.splice(i, 1); renderAnexos(); updateFotosPreview(); }

    function updateFotosPreview() {
        document.getElementById('paginas-fotos').innerHTML = fotos.map((f, i) => `
            <div class="folha-foto"><div style="font-weight:bold; border-bottom:1px solid #000; width:100%; text-align:center; padding-bottom:5px;">ANEXO #${i+1}</div><img src="${f}" class="foto-preview"></div>
        `).join('');
    }

    function addLinha() {
        indiceAtivo = registros.length;
        registros.push({ data: '', cli: '', apv: '', desc: '', trans: '', val: '', ent: '', sai: '', especial: false });
        renderInputs();
        update();
    }

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
                        <input type="text" id="cli-${i}" placeholder="Cliente" value="${r.cli}" oninput="regUpdate(${i},'cli',this.value)">
                        <input type="text" id="apv-${i}" placeholder="APV" value="${r.apv}" oninput="regUpdate(${i},'apv',this.value)">
                    </div>
                    <div class="grid-inputs">
                        <textarea id="trans-${i}" placeholder="M. Transporte" oninput="regUpdate(${i},'trans',this.value)">${r.trans}</textarea>
                        <input type="text" id="val-${i}" placeholder="Validação" value="${r.val}" oninput="regUpdate(${i},'val',this.value)">
                        <input type="text" id="ent-${i}" placeholder="Entrada €" value="${r.ent}" ${r.especial ? 'disabled' : ''} oninput="regUpdate(${i},'ent',this.value)">
                    </div>
                    <textarea id="sai-${i}" placeholder="Saída (€ por linha)" oninput="regUpdate(${i},'sai',this.value)">${r.sai}</textarea>
                    <textarea id="desc-${i}" placeholder="Descrição" oninput="regUpdate(${i},'desc',this.value)">${r.desc}</textarea>
                    <button onclick="removerLinha(${i})" style="background:#ff4444; color:white; border:none; padding:8px; border-radius:4px;">Remover</button>
                </div>
            </div>
        `).join('');
    }

    function removerLinha(i) { registros.splice(i, 1); indiceAtivo = -1; renderInputs(); update(); }
    function toggleEdit(i) { indiceAtivo = (indiceAtivo === i ? -1 : i); renderInputs(); }
    
    function regUpdate(i, k, v) { 
        registros[i][k] = v; 
        if(registros[i].especial) {
            const totalSai = registros[i].sai.split('\n').reduce((acc, val) => acc + parsePtFloat(val), 0);
            registros[i].ent = totalSai.toFixed(2).replace('.',',');
        }
        update(); 
    }

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

    async function gerarPDF() {
        const area = document.getElementById('capture-area');
        const originalTransform = area.style.transform;
        area.style.transform = "none";
        const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
        
        try {
            const canvas1 = await html2canvas(document.getElementById('pag-principal'), { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            });
            pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
            
            const pagsFotos = document.querySelectorAll('.folha-foto');
            for(let i=0; i<pagsFotos.length; i++) {
                pdf.addPage('a4', 'portrait');
                const canvasF = await html2canvas(pagsFotos[i], { scale: 2, useCORS: true });
                pdf.addImage(canvasF.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
            }
            pdf.save('Relatorio_Controlo_Final.pdf');
        } catch (e) {
            alert("Erro ao gerar PDF. Tente novamente.");
        } finally {
            area.style.transform = originalTransform;
        }
    }
    
    let historicoFolhas = [];
let idFolhaAtual = Date.now();


// 3. SALVAR NA NUVEM
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
    } catch (e) {
        alert("Erro ao guardar na nuvem: " + e.message);
    }
}


// Carregar histórico do banco de dados
function carregarHistoricoNuvem() {
    db.collection("folhas")
      .where("uid", "==", auth.currentUser.uid)
      .orderBy("criadoEm", "desc")
      .onSnapshot(snapshot => {
        historicoFolhas = snapshot.docs.map(doc => doc.data());
        atualizarListaHistorico();
      });
}






function carregarDoHistorico(id) {
    const folha = historicoFolhas.find(f => f.id === id);
    if (folha) {
        document.getElementById('in-nome').value = folha.nome;
        document.getElementById('in-data-rel').value = folha.dataRel;
        document.getElementById('in-saldo-ini').value = folha.saldoIni;
        
        // Recupera os dados específicos desta folha
        registros = JSON.parse(JSON.stringify(folha.registros));
        fotos = [...folha.fotos]; 
        idFolhaAtual = folha.id;
        
        // Atualiza toda a visualização
        renderInputs();
        renderAnexos();      // Atualiza a lista de nomes/botões de remover
        updateFotosPreview(); // Atualiza as imagens nas "Folhas de Anexos"
        update();             // Atualiza a tabela A4
    }
}


function atualizarListaHistorico() {
    const lista = document.getElementById('lista-folhas-historico');
    if (historicoFolhas.length === 0) {
        lista.innerHTML = '<span style="color: #6c757d; font-size: 0.9em;">Nenhuma folha arquivada ainda.</span>';
        return;
    }

    lista.innerHTML = historicoFolhas.map(f => {
        // Verifica se esta é a folha que está carregada no momento
        const classeAtiva = (f.id === idFolhaAtual) ? 'ativa' : '';
        
        return `
            <button onclick="carregarDoHistorico(${f.id})" class="btn-folha-historico ${classeAtiva}">
                <span style="font-size: 18px; margin-bottom: 4px;">📄</span>
                <strong>${f.dataRel ? f.dataRel.split('-').reverse().join('/') : 'Sem Data'}</strong>
                <small style="font-size: 10px; opacity: 0.8;">ID: ${new Date(f.id).toLocaleTimeString()}</small>
            </button>
        `;
    }).join('');
}

function toggleCabecalho() {
    const secao = document.getElementById('secao-cabecalho');
    const seta = document.getElementById('seta-cabecalho');
    
    if (secao.style.display === "none") {
        secao.style.display = "block";
        seta.innerText = "▲";
    } else {
        secao.style.display = "none";
        seta.innerText = "▼";
    }
}

// Coloque esta função dentro do seu <script>
async function novaFolha() {
    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa estar logado para salvar!");
        return;
    }

    const dadosParaSalvar = {
        id: Date.now(), // Gera um ID único baseado no tempo
        nome: document.getElementById('in-nome').value,
        dataRel: document.getElementById('in-data-rel').value,
        saldoIni: document.getElementById('in-saldo-ini').value,
        pag: document.getElementById('in-pag').value,
        registros: registros,
        fotos: fotos // As imagens em Base64 serão salvas aqui
    };

    // Chama a função que já existe no seu código
    await salvarFolhaNaNuvem(dadosParaSalvar);
    
    // Define esta como a folha ativa
    idFolhaAtual = dadosParaSalvar.id;
    atualizarListaHistorico();
}

function fazerLogout() {
    if (confirm("Deseja realmente sair do sistema?")) {
        auth.signOut().then(() => {
            console.log("Usuário deslogado com sucesso.");
        }).catch((error) => {
            alert("Erro ao sair: " + error.message);
        });
    }
}

async function apagarFolhaAtual() {
    if (!folhaAtivaId) {
        alert("Selecione uma folha para apagar.");
        return;
    }

    const confirmacao = confirm("Tem certeza que deseja eliminar esta folha permanentemente? Esta ação não pode ser desfeita.");
    
    if (confirmacao) {
        try {
            // Se você guarda cada folha como um documento separado (Recomendado):
            await db.collection("folhas").doc(folhaAtivaId).delete();
            
            alert("Folha eliminada com sucesso!");
            location.reload(); // Recarrega para atualizar o histórico
        } catch (error) {
            console.error("Erro ao apagar:", error);
            alert("Erro ao eliminar a folha.");
        }
    }
}
