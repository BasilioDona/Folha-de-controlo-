// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDW4U6YURHU7iGoaxIbcBw6B1EYNI11Jog",
  authDomain: "controlo-fa-24.firebaseapp.com",
  projectId: "controlo-fa-24",
  storageBucket: "controlo-fa-24.firebasestorage.app",
  messagingSenderId: "1044761248079",
  appId: "1:1044761248079:web:c2fb95f7be4bc6d3b4853a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- VARIÁVEIS GLOBAIS ---
let registros = [];
let fotos = []; // Este array é limpo e preenchido conforme a folha selecionada
let indiceAtivo = -1;
let historicoFolhas = [];
let idFolhaAtual = null;

// --- 1. CONTROLO DE ACESSO E INTERFACE ---
auth.onAuthStateChanged(user => {
    const telaLogin = document.getElementById('tela-login');
    const editor = document.querySelector('.editor-container');
    const preview = document.querySelector('.preview-wrapper');
    const btnPdf = document.querySelector('.btn-acao');
    const bemVindo = document.getElementById('bem-vindo'); // 🔥 NOVO

    if (user) {
        telaLogin.style.display = "none";
        editor.style.display = "block";
        preview.style.display = "flex";
        if (btnPdf) btnPdf.style.display = "block";

        // 🔥 NOVO: Nome do utilizador
        const nome = user.displayName || user.email.split("@")[0];
        if (bemVindo) {
            bemVindo.innerText = `Bem-vindo ${nome}`;
        }

        carregarHistoricoNuvem();

    } else {
        telaLogin.style.display = "flex";
        editor.style.display = "none";
        preview.style.display = "none";
        if (btnPdf) btnPdf.style.display = "none";

        if (bemVindo) bemVindo.innerText = "";
    }
});

function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    if (!email || !senha) return alert("Preencha os campos!");
    auth.signInWithEmailAndPassword(email, senha).catch(e => alert("Erro: " + e.message));
}

function fazerLogout() {
    if (confirm("Deseja sair do sistema?")) {
        auth.signOut().then(() => {
            idFolhaAtual = null;
            location.reload();
        });
    }
}

function toggleCabecalho() {
    const s = document.getElementById("secao-cabecalho");
    if (s) s.style.display = (s.style.display === "none") ? "block" : "none";
}

// --- 2. GESTÃO VISUAL (ZOOM PARA TELEMÓVEL) ---
function ajustarZoom() {
    const wrapper = document.querySelector('.preview-wrapper');
    const area = document.getElementById('capture-area');
    if(!wrapper || !area) return;
    let scale = wrapper.offsetWidth / 1150;
    if (scale > 1) scale = 1;
    area.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', ajustarZoom);

// --- 3. GESTÃO DE REGISTOS ---
function addLinha() {
    indiceAtivo = registros.length;
    registros.push({ data: '', cli: '', apv: '', desc: '', trans: '', val: '', ent: '', sai: '', especial: false });
    renderInputs();
    update();
}

function renderInputs() {
    const container = document.getElementById('lista-corpo');
    if (!container) return;

    container.innerHTML = registros.map((r, i) => `
        <div style="background:#f9f9f9; padding:15px; border:1px solid #ddd; border-radius:8px; margin-bottom:10px;">
            
            <!-- CABEÇALHO -->
            <div style="display:flex; justify-content:space-between; cursor:pointer; font-weight:bold;" onclick="toggleEdit(${i})">
                <span style="color:${r.especial ? '#e67e22' : '#000'};">
    Registo #${i+1} ${r.cli || ''}
    ${r.especial ? ' 🔶 (ESPECIAL)' : ''}
</span>
                <span> ${indiceAtivo === i ? '▲' : '▼'}</span>
            </div>

            <!-- CONTEÚDO -->
            <div style="display:${indiceAtivo === i ? 'grid' : 'none'}; gap:10px; margin-top:10px;">
                
                <!-- REGISTO ESPECIAL -->
<label style="
    display:block;
    text-align:center;
    font-weight:bold;
    color:${r.especial ? '#b35400' : '#666'};
    background:${r.especial ? '#ffe0b2' : '#f5f5f5'};
    border:${r.especial ? '2px solid #ff9800' : '1px solid #ddd'};
    padding:12px;
    border-radius:8px;
    box-shadow:${r.especial ? '0 0 8px rgba(255,152,0,0.4)' : 'none'};
    transition: all 0.3s ease;
">
    <input type="checkbox"
        style="transform: scale(1.3); margin-bottom:8px;"
        ${r.especial ? 'checked' : ''}
        onchange="regUpdate(${i},'especial',this.checked)">
        
    <div>
        Registo Especial (Saldo Neutro)
    </div>
</label>

                <!-- LINHA 1 -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                    <input type="date" value="${r.data}" oninput="regUpdate(${i},'data',this.value)">
                    <input type="text" placeholder="Cliente" value="${r.cli}" oninput="regUpdate(${i},'cli',this.value)">
                    <input type="text" placeholder="APV" value="${r.apv || ''}" oninput="regUpdate(${i},'apv',this.value)">
                </div>

                <!-- LINHA 2 -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                    <textarea placeholder="M. Transporte" oninput="regUpdate(${i},'trans',this.value)">${r.trans || ''}</textarea>
                    <input type="text" placeholder="Validação" value="${r.val || ''}" oninput="regUpdate(${i},'val',this.value)">
                    <input type="text" placeholder="Entrada €"
                        value="${r.ent}"
                        ${r.especial ? 'disabled' : ''}
                        oninput="regUpdate(${i},'ent',this.value)">
                </div>

                <!-- SAÍDAS -->
                <textarea placeholder="Saída (€ por linha)" 
                    oninput="regUpdate(${i},'sai',this.value)">${r.sai || ''}</textarea>

                <!-- DESCRIÇÃO -->
                <textarea placeholder="Descrição"
                    oninput="regUpdate(${i},'desc',this.value)">${r.desc || ''}</textarea>

                <!-- BOTÃO -->
                <button onclick="removerLinha(${i})"
                    style="background:#ff4444; color:white; border:none; padding:8px; border-radius:4px;">
                    Remover
                </button>

            </div>
        </div>
    `).join('');
}

function regUpdate(i, k, v) { 
    // 1. Atualiza o valor no array de memória
    registros[i][k] = v;

    // 2. Se for um registo especial, recalcula a entrada
    if (registros[i].especial) {
        const totalSai = (registros[i].sai || "")
            .split('\n')
            .reduce((acc, val) => acc + parsePtFloat(val), 0);

        registros[i].ent = totalSai.toFixed(2).replace('.', ',');
        
        // APENAS no modo especial redesenhamos os inputs para mostrar a nova Entrada
        renderInputs(); 
    }

    // 3. Atualiza a folha branca (preview) SEM reconstruir os campos de texto
    // Isso mantém o teclado aberto e o foco no campo atual
    update();
}


function toggleEdit(i) { indiceAtivo = (indiceAtivo === i ? -1 : i); renderInputs(); }
function removerLinha(i) { registros.splice(i, 1); renderInputs(); update(); }

// --- 4. GESTÃO DE FOTOS (COMPRESSÃO E VINCULAÇÃO) ---
function comprimirImagem(base64Str, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let width = img.width, height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
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
                // Adiciona a foto ao array da folha atual
                fotos.push(fotoComprimida); 
                renderAnexos(); 
                updateFotosPreview();
                input.value = ""; 
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function renderAnexos() {
    const lista = document.getElementById('lista-anexos');
    if (lista) {
        lista.innerHTML = fotos.map((f, i) => `
            <div style="display:flex; justify-content:space-between; background:#fff; padding:5px; margin-top:5px; border:1px solid #ddd;">
                <span>Foto #${i+1}</span>
                <button onclick="removerFoto(${i})" style="color:red; border:none; background:none; cursor:pointer;">Remover</button>
            </div>
        `).join('');
    }
}

function removerFoto(i) {
    if(confirm("Remover esta foto da folha?")) {
        fotos.splice(i, 1);
        renderAnexos();
        updateFotosPreview();
    }
}

function updateFotosPreview() {
    const container = document.getElementById('paginas-fotos');
    const nome = document.getElementById('in-nome').value || "Sem Nome";
    const data = document.getElementById('in-data-rel').value || "S/ Data";

    if (container) {
        container.innerHTML = fotos.map((f, i) => `
            <div class="html2pdf__page-break"></div>
            <div class="folha-foto">
                <div style="font-size:12px; margin-bottom:10px; width:100%; border-bottom:1px solid #eee;">
                    Anexo da Folha: ${nome} | Data: ${data}
                </div>
                <strong style="margin-bottom:10px;">FOTO ANEXO #${i+1}</strong>
                <img src="${f}">
            </div>
        `).join('');
        ajustarZoom();
    }
}



// --- 5. FIREBASE: GUARDAR E CARREGAR ---
// FUNCIONALIDADE 1: Apenas guardar as alterações na folha atual
async function guardarFolhaAtual() {
    const user = auth.currentUser;
    if (!user) return alert("Sessão expirada.");

    if (!idFolhaAtual) {
        // Se não tem ID, gera um novo (primeira vez que guarda)
        idFolhaAtual = Date.now().toString();
    }

    const dados = {
        id: idFolhaAtual,
        nome: document.getElementById('in-nome').value,
        dataRel: document.getElementById('in-data-rel').value,
        saldoIni: document.getElementById('in-saldo-ini').value,
        pag: document.getElementById('in-pag').value,
        registros: registros,
        fotos: fotos,
        uid: user.uid,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("folhas").doc(idFolhaAtual).set(dados);
        alert("Folha guardada com sucesso!");
    } catch (e) {
        alert("Erro ao guardar: " + e.message);
    }
}

// FUNCIONALIDADE 2: Criar nova folha herdando dados
async function prepararNovaFolha() {
    // Primeiro, pegamos os dados atuais para herança
    const nomeAnterior = document.getElementById('in-nome').value;
    const pagAnteriorRaw = document.getElementById('in-pag').value;
    const saldoFinalAnterior = document.getElementById('out-saldo-fim-val').innerText;

    // Lógica para incrementar página (ex: de "01/01" para "2")
    let novaPagina = "1";
    if(pagAnteriorRaw) {
        let numero = parseInt(pagAnteriorRaw.split('/')[0]);
        novaPagina = (numero + 1).toString().padStart(2, '0');
    }

    if(!confirm(`Criar nova folha? \nNome: ${nomeAnterior}\nPágina: ${novaPagina}\nSaldo Inicial: ${saldoFinalAnterior}`)) return;

    // Reset de variáveis de controle
    idFolhaAtual = null; 
    registros = [];
    fotos = [];

    // Preenchimento dos campos herdados
    document.getElementById('in-nome').value = nomeAnterior;
    document.getElementById('in-pag').value = novaPagina;
    document.getElementById('in-saldo-ini').value = saldoFinalAnterior;
    document.getElementById('in-data-rel').value = ""; // Geralmente nova folha tem nova data

    // Atualiza interface
    renderInputs();
    renderAnexos();
    updateFotosPreview();
    update();
    
    alert("Nova folha preparada! Lembre-se de 'Guardar' para salvar na nuvem.");
}


function carregarHistoricoNuvem() {
    db.collection("folhas").where("uid", "==", auth.currentUser.uid)
        .onSnapshot(snap => {
            historicoFolhas = snap.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
            atualizarListaHistorico();
        });
}

function carregarDoHistorico(id) {
    const f = historicoFolhas.find(folha => folha.firestoreId === id);
    if (!f) return;

    idFolhaAtual = f.firestoreId;
    
    // Preenche os campos de texto
    document.getElementById('in-nome').value = f.nome || "";
    document.getElementById('in-data-rel').value = f.dataRel || "";
    document.getElementById('in-saldo-ini').value = f.saldoIni || "0,00";
    document.getElementById('in-pag').value = f.pag || "01/01";
    
    // VINCULAÇÃO REAL: Carrega os registos e fotos desta folha específica
    registros = f.registros ? JSON.parse(JSON.stringify(f.registros)) : [];
    fotos = f.fotos ? [...f.fotos] : []; 
    
    // Atualiza a interface
    renderInputs(); 
    renderAnexos(); 
    updateFotosPreview(); 
    update();
    
    setTimeout(ajustarZoom, 300);
}

function atualizarListaHistorico() {
    const lista = document.getElementById('lista-folhas-historico');
    if (!lista) return;
    lista.innerHTML = historicoFolhas.map(f => `
        <button onclick="carregarDoHistorico('${f.firestoreId}')" class="btn-folha-historico ${f.firestoreId === idFolhaAtual ? 'ativa' : ''}">
            <strong>${f.dataRel ? f.dataRel.split('-').reverse().join('/') : 'S/ Data'}</strong>
            <small>${f.nome || 'S/ Nome'}</small>
        </button>
    `).join('');
}

async function apagarFolhaAtual() {
    if (!idFolhaAtual || !confirm("Deseja eliminar esta folha e todas as suas fotos permanentemente?")) return;
    try {
        await db.collection("folhas").doc(idFolhaAtual).delete();
        alert("Eliminado com sucesso!");
        idFolhaAtual = null;
        location.reload();
    } catch (e) { alert("Erro: " + e.message); }
}

// --- 6. CÁLCULOS E TABELA ---
function parsePtFloat(val) {
    if(!val) return 0;
    return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
}

function update() {
    // 1. Atualização dos cabeçalhos
    document.getElementById('out-nome').innerText = document.getElementById('in-nome').value;
    document.getElementById('out-pag').innerText = document.getElementById('in-pag').value;
    
    const dRel = document.getElementById('in-data-rel').value;
    document.getElementById('out-data-rel').innerText = dRel ? dRel.split('-').reverse().join('/') : '';

    const dIni = document.getElementById('in-data-ini').value;
    const outDataIni = document.getElementById('out-data-ini');
    if (outDataIni) {
        outDataIni.innerText = dIni ? dIni.split('-').reverse().join('/') : '';
    }

    // 2. Valores Iniciais
    const ini = parsePtFloat(document.getElementById('in-saldo-ini').value);  
    const f = { minimumFractionDigits: 2, maximumFractionDigits: 2 };  
  
    document.getElementById('out-saldo-ini-val').innerText = ini.toLocaleString('pt-PT', f);  
    document.getElementById('out-saldo-ini-col').innerText = ini.toLocaleString('pt-PT', f);  

    let saldoAcumulado = ini;  
    let html = '';  

    // 3. Processamento dos Registos
    registros.forEach(r => {  
        const ent = parsePtFloat(r.ent);
        const linhasDesc = (r.desc || "").split('\n');
        const linhasSai = (r.sai || "").split('\n');
        const linhasTrans = (r.trans || "").split('\n');
        
        // Verifica se a checkbox "Especial" foi ativada
        const eEspecial = r.especial === true;

        // Se NÃO for especial, soma a entrada ao saldo que afeta os outros
        if (!eEspecial) {
            saldoAcumulado += ent;
        }

        html += `<tr>  
            <td>${r.data ? r.data.split('-').reverse().join('/') : ''}</td>  
            <td>${r.cli || ''}</td>
            <td>${r.apv || ''}</td>  
            <td class="txt-left">`;
                linhasDesc.forEach(l => html += `<div style="height:1.5em; line-height:1.5em;">${l}</div>`);
        html += `</td>  
            <td class="txt-left">`;
                // Alinhamento linha por linha para o Meio de Transporte
                linhasTrans.forEach(t => html += `<div style="height:1.5em; line-height:1.5em;">${t}</div>`);
        html += `</td>
            <td>${r.val || ''}</td>  
            <td>${ent !== 0 ? ent.toLocaleString('pt-PT', f) : ''}</td>  
            <td style="text-align:right;">`;
                
                linhasSai.forEach(s => {
                    const v = parsePtFloat(s);
                    if(v > 0) html += `<div style="height:1.5em; line-height:1.5em;">${v.toLocaleString('pt-PT', f)}</div>`;
                });
        html += `</td>  
            <td style="text-align: right;">`;

        // LÓGICA DO SALDO NEUTRO
        if (eEspecial) {
            // No registo especial, a coluna Saldo fica vazia e não altera o saldoAcumulado
            html += ``; 
        } else {
            // No registo normal, calcula e atualiza o saldo para o próximo registo
            let tempSaldo = saldoAcumulado;
            let temSaida = false;
            
            linhasSai.forEach(s => {
                const v = parsePtFloat(s);
                if(v > 0) {
                    tempSaldo -= v;
                    html += `<div style="height:1.5em; line-height:1.5em;">${tempSaldo.toLocaleString('pt-PT', f)}</div>`;
                    temSaida = true;
                }
            });

            if (!temSaida) {
                html += `<div>${saldoAcumulado.toLocaleString('pt-PT', f)}</div>`;
            }
            
            // O saldo acumulado só é atualizado aqui para os registos normais
            saldoAcumulado = tempSaldo;
        }

        html += `</td></tr>`;  
    });  

    document.getElementById('tabela-corpo').innerHTML = html;  
    document.getElementById('out-saldo-fim-val').innerText = saldoAcumulado.toLocaleString('pt-PT', f);  
  
    ajustarZoom();
}


async function obterUltimoSaldoFinal() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const snapshot = await db.collection("folhas")
            .where("uid", "==", user.uid)
            .get();

        if (snapshot.empty) return null;

        const folhas = snapshot.docs.map(doc => doc.data());
        const ultima = folhas[folhas.length - 1];

        let saldo = parsePtFloat(ultima.saldoIni || 0);

        (ultima.registros || []).forEach(r => {
            const ent = parsePtFloat(r.ent);
            const sai = (r.sai || "")
                .split("\n")
                .reduce((acc, v) => acc + parsePtFloat(v), 0);

            saldo = saldo + ent - sai;
        });

        return saldo;

    } catch (e) {
        console.error("Erro ao obter saldo:", e);
        return null;
    }
}

// --- 7. GERAÇÃO DE PDF ---
async function gerarPDF() {
    const area = document.getElementById('capture-area');
    const originalTransform = area.style.transform;
    area.style.transform = "none";

    // 1. Nomenclatura: Controlo n=(página) data ,nome
    const tecnico = document.getElementById('in-nome').value.trim() || "Sem_Nome";
    const numPagRaw = document.getElementById('in-pag').value || "1";
    // Extrai apenas o número antes da barra se existir (ex: "01/01" vira "01")
    const numPag = numPagRaw.split('/')[0];
    const dataRel = document.getElementById('in-data-rel').value || "00-00-0000";
    
    const nomeArquivo = `Controlo n=${numPag} ${dataRel} ,${tecnico}.pdf`;

    const pdf = new jspdf.jsPDF('l', 'mm', 'a4');

    try {
        // Renderizar Página Principal
        const canvas1 = await html2canvas(document.getElementById('pag-principal'), { 
            scale: 1.5, // Reduzido de 2 para 1.5 para comprimir tamanho
            useCORS: true 
        });
        
        // JPEG em 0.7 (70% qualidade) oferece ótimo equilíbrio entre peso e leitura
        pdf.addImage(canvas1.toDataURL('image/jpeg', 0.7), 'JPEG', 0, 0, 297, 210);

        const pagsFotos = document.querySelectorAll('.folha-foto');
        for(let i = 0; i < pagsFotos.length; i++) {
            pdf.addPage('a4', 'portrait');
            const canvasF = await html2canvas(pagsFotos[i], { scale: 1.5 });
            pdf.addImage(canvasF.toDataURL('image/jpeg', 0.6), 'JPEG', 0, 0, 210, 297);
        }

        pdf.save(nomeArquivo);

    } catch (e) {
        console.error(e);
        alert("Erro ao gerar PDF.");
    } finally {
        area.style.transform = originalTransform;
    }
}






