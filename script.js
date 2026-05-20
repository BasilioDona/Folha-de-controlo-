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
    if (!wrapper) return;

    const folhasA4 = document.querySelectorAll('.folha-a4');
    
    folhasA4.forEach(area => {
        let scale = wrapper.offsetWidth / 1150; // Base de cálculo para os 297mm
        if (scale > 1) scale = 1;
        
        // Aplica o zoom apenas na tabela para caber no telemóvel
        area.style.transform = `scale(${scale})`;
        area.style.transformOrigin = "top center";
        
        // CORRECÇÃO DO VÁCUO: Ajusta a margem inferior dinamicamente 
        // para compensar o espaço que o 'scale' deixa vazio abaixo da tabela
        let alturaRealEncolhida = 794 * scale; 
        let espacoVazio = 794 - alturaRealEncolhida;
        area.style.marginBottom = `-${espacoVazio - 15}px`;
    });

    // Garante que a área global e as fotos nunca herdem distorções ou escalas
    const areaCaptura = document.getElementById('capture-area');
    if (areaCaptura) areaCaptura.style.transform = "none";
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
            <div class="folha-foto" style="width: 100% !important; max-width: 210mm !important; height: auto !important; padding: 15px !important; margin: 0 auto 15px auto !important; box-sizing: border-box !important; background: #ffffff !important; display: block !important;">
                <div style="font-size:12px; margin-bottom:10px; width:100%; border-bottom:1px solid #eee; color: #555;">
                    Anexo da Folha: ${nome} | Data: ${data}
                </div>
                <div style="font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 14px; color: #000;">FOTO ANEXO #${i+1}</div>
                <img src="${f}" style="display: block !important; width: 100% !important; max-width: 100% !important; height: auto !important; object-fit: contain !important; margin: 0 auto !important; border: 1px solid #ddd !important;">
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
// FUNCIONALIDADE 2: Criar nova folha herdando dados
async function prepararNovaFolha() {
    // Primeiro, pegamos os dados atuais para herança
    const nomeAnterior = document.getElementById('in-nome').value;
    const pagAnteriorRaw = document.getElementById('in-pag').value;
    
    // Proteção contra elemento inexistente
    const campoSaldoFim = document.getElementById('out-saldo-fim-val');
    const saldoFinalAnterior = campoSaldoFim ? campoSaldoFim.innerText : "0,00";

    // Lógica para incrementar página (ex: de "01/01" para "02")
    let novaPagina = "01";
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
    document.getElementById('in-data-rel').value = ""; // Nova folha pede nova data

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

    lista.innerHTML = historicoFolhas.map(f => {
        const isActive = f.firestoreId === idFolhaAtual;
        
        return `
            <button onclick="carregarDoHistorico('${f.firestoreId}')" 
                class="btn-folha-historico ${isActive ? 'ativa' : ''}" 
                style="position: relative;">
                
                ${isActive ? '<i class="fa-solid fa-circle-check" style="position: absolute; top: -8px; right: -8px; color: #28a745; background: white; border-radius: 50%; font-size: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10;"></i>' : ''}
                
                <strong>${f.dataRel ? f.dataRel.split('-').reverse().join('/') : 'S/ Data'}</strong>
                <small>${f.nome || 'S/ Nome'}</small>
                
                ${isActive ? '<span style="font-size: 9px; margin-top: 5px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">A EDITAR</span>' : ''}
            </button>
        `;
    }).join('');
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
    const areaCaptura = document.getElementById('capture-area');
    if (!areaCaptura) return;

    // 1. Coleta de dados básicos do cabeçalho
    const nome = document.getElementById('in-nome').value || "";
    const numPagRaw = document.getElementById('in-pag').value || "01";
    // Se o usuário digitou algo com barra (ex: "13/01"), pegamos só o número principal
    const paginaPrincipal = numPagRaw.split('/')[0];

    const dRel = document.getElementById('in-data-rel').value;
    const dataRelFormatada = dRel ? dRel.split('-').reverse().join('/') : '';

    const dIni = document.getElementById('in-data-ini').value;
    const dataIniFormatada = dIni ? dIni.split('-').reverse().join('/') : '';

    const ini = parsePtFloat(document.getElementById('in-saldo-ini').value);  
    const f = { minimumFractionDigits: 2, maximumFractionDigits: 2 };  

    // 2. Agrupar os registos em "páginas digitais" baseando-se no limite de espaço
    let paginasDeRegistos = [];
    let paginaAtual = [];
    let linhasContadas = 0;
    const LIMITE_LINHAS_POR_A4 = 23; // Ajuste este número se quiser mais ou menos linhas por folha

    registros.forEach((r) => {
        // Calcula o peso visual do registo com base nas quebras de linha da descrição ou saídas
        const quebrasDesc = (r.desc || "").split('\n').length;
        const quebrasSai = (r.sai || "").split('\n').length;
        const pesoRegisto = Math.max(quebrasDesc, quebrasSai, 1);

        // Se o registo atual estourar o limite da página, fecha a página atual e abre uma nova
        if (linhasContadas + pesoRegisto > LIMITE_LINHAS_POR_A4 && paginaAtual.length > 0) {
            paginasDeRegistos.push(paginaAtual);
            paginaAtual = [];
            linhasContadas = 0;
        }

        paginaAtual.push(r);
        linhasContadas += pesoRegisto;
    });

    // Adiciona a última página que ficou pendente
    if (paginaAtual.length > 0 || paginasDeRegistos.length === 0) {
        paginasDeRegistos.push(paginaAtual);
    }

    const totalPaginasGeradas = paginasDeRegistos.length;
    let htmlGeral = '';
    let saldoAcumulado = ini;

    // 3. Renderizar cada página A4 dinamicamente
    paginasDeRegistos.forEach((registrosDaPagina, indexPag) => {
        const numeroSubPagina = `${paginaPrincipal}/${String(indexPag + 1).padStart(2, '0')}`;
        
        let tabelaLinhasHtml = '';

        // Se for a PRIMEIRA página, exibe a linha do Saldo Inicial
        if (indexPag === 0) {
            tabelaLinhasHtml += `
                <tr class="row-saldo">
                    <td><span>${dataIniFormatada}</span></td><td colspan="2"></td>
                    <td class="txt-left">Saldo Inicial: <span>${ini.toLocaleString('pt-PT', f)}</span></td>
                    <td colspan="4"></td><td><span>${ini.toLocaleString('pt-PT', f)}</span></td>
                </tr>`;
        }

        // Processa os registos específicos desta página
        registrosDaPagina.forEach(r => {
            const ent = parsePtFloat(r.ent);
            const linhasDesc = (r.desc || "").split('\n');
            const linhasSai = (r.sai || "").split('\n');
            const linhasTrans = (r.trans || "").split('\n');
            const eEspecial = r.especial === true;

            if (!eEspecial) {
                saldoAcumulado += ent;
            }

            tabelaLinhasHtml += `<tr>  
                <td>${r.data ? r.data.split('-').reverse().join('/') : ''}</td>  
                <td>${r.cli || ''}</td>
                <td>${r.apv || ''}</td>  
                <td class="txt-left">`;
                    linhasDesc.forEach(l => tabelaLinhasHtml += `<div style="height:1.5em; line-height:1.5em;">${l}</div>`);
            tabelaLinhasHtml += `</td>  
                <td class="txt-left">`;
                    linhasTrans.forEach(t => tabelaLinhasHtml += `<div style="height:1.5em; line-height:1.5em;">${t}</div>`);
            tabelaLinhasHtml += `</td>
                <td>${r.val || ''}</td>  
                <td>${ent !== 0 ? ent.toLocaleString('pt-PT', f) : ''}</td>  
                <td style="text-align:right;">`;
                    
                    linhasSai.forEach(s => {
                        const v = parsePtFloat(s);
                        if(v > 0) tabelaLinhasHtml += `<div style="height:1.5em; line-height:1.5em;">${v.toLocaleString('pt-PT', f)}</div>`;
                    });
            tabelaLinhasHtml += `</td>  
                <td style="text-align: right;">`;

            if (eEspecial) {
                tabelaLinhasHtml += ``; 
            } else {
                let tempSaldo = saldoAcumulado;
                let temSaida = false;
                
                linhasSai.forEach(s => {
                    const v = parsePtFloat(s);
                    if(v > 0) {
                        tempSaldo -= v;
                        tabelaLinhasHtml += `<div style="height:1.5em; line-height:1.5em;">${tempSaldo.toLocaleString('pt-PT', f)}</div>`;
                        temSaida = true;
                    }
                });

                if (!temSaida) {
                    tabelaLinhasHtml += `<div>${saldoAcumulado.toLocaleString('pt-PT', f)}</div>`;
                }
                
                saldoAcumulado = tempSaldo;
            }

            tabelaLinhasHtml += `</td></tr>`;
        });

        // Se for a ÚLTIMA página, exibe a linha do Saldo Final
        let linhaSaldoFinalHtml = '';
        if (indexPag === totalPaginasGeradas - 1) {
            linhaSaldoFinalHtml = `
                <tr class="row-saldo">
                    <td colspan="3"></td><td class="txt-left">Saldo Final</td>
                    <td colspan="4"></td><td style="text-align: right; font-weight: bold;">${saldoAcumulado.toLocaleString('pt-PT', f)}</td>
                </tr>`;
        }

        // Constrói o bloco completo da folha A4 isolada
        htmlGeral += `
            <div class="folha-a4" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
                    <div style="width: 140px;">
                        <img src="data:image/png;base64,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" alt="" width="120" height="100" />
                    </div>
                    <div style="text-decoration: underline; font-size: 13px;">CONTROLO DE DINHEIROS</div>
                    <div style="font-size: 11px;">Pág. <span>${numeroSubPagina}</span></div>
                </div>

                <div style="text-align: center; margin-top: 15px; font-size: 11px;">
                    Nome: <span style="border-bottom:1px solid #000; display:inline-block; width:350px; font-weight:bold;">${nome}</span>
                    Data: <span style="border-bottom:1px solid #000; display:inline-block; width:120px; font-weight:bold;">${dataRelFormatada}</span>
                </div>
                
                <table class="tabela-f-af">
                    <thead>
                        <tr>
                            <th style="width:9%">Data</th><th style="width:11%">Cliente</th><th style="width:7%">APV</th>
                            <th style="width:23%">Descrição</th><th style="width:11%; background:yellow;">Meio de Transporte</th>
                            <th style="width:9%; background:yellow;">Validação</th><th style="width:8%">Entrada</th>
                            <th style="width:13%">Saída</th><th style="width:9%">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tabelaLinhasHtml}
                        ${linhaSaldoFinalHtml}
                    </tbody>
                </table>
                
                <div class="footer-documento">
                    F.AF.24_R03 – Qualquer impressão/cópia deste documento é considerada não controlada, devendo ser confirmada a sua actualização no servidor
                </div>
            </div>`;
    });

    // Injeta todas as páginas geradas na área de captura de uma vez só
    areaCaptura.innerHTML = htmlGeral;
    
    const campoSaldoOculto = document.getElementById('out-saldo-fim-val');
    if (campoSaldoOculto) {
        campoSaldoOculto.innerText = saldoAcumulado.toLocaleString('pt-PT', f);
    }
    
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

    const tecnico = document.getElementById('in-nome').value.trim() || "Sem_Nome";
    const numPagRaw = document.getElementById('in-pag').value || "1";
    const numPag = numPagRaw.split('/')[0];
    const dataRel = document.getElementById('in-data-rel').value || "00-00-0000";
    
    const nomeArquivo = `Controlo n=${numPag} ${dataRel} ,${tecnico}.pdf`;

    // Ativamos 'compress: true' para ativar a compressão interna nativa do jsPDF
    const pdf = new jspdf.jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    try {
        // CONFIGURAÇÃO DE CLONAGEM FIEL
        const html2canvasOptions = {
            scale: 3,                   // Mantemos a escala alta para garantir nitidez máxima dos textos miúdos
            useCORS: true, 
            backgroundColor: '#ffffff', 
            logging: false,
            letterRendering: false,     
            windowWidth: 1350,          
            
            onclone: function(clonedDoc) {
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    /* Remove sombras ou efeitos que criem a barra cinzenta lateral */
                    .folha-a4 {
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                        width: 100% !important;
                    }
                    
                    /* ALTERAÇÃO DE FONTE E TAMANHO: 
                       Força uma tipografia limpa, altamente legível e define o tamanho base 
                       para que os dados da tabela fiquem perfeitamente nítidos no documento */
                    .folha-a4, .folha-a4 td, .folha-a4 th {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
                        font-size: 11px !important; /* Ajuste aqui o tamanho se quiser maior/menor */
                        line-height: 1.2 !important;
                    }

                    /* Mantém os títulos das colunas ligeiramente destacados */
                    .folha-a4 th {
                        font-size: 11px !important;
                        font-weight: bold !important;
                    }

                    /* Garante estabilidade posicional e impede sobreposição de caracteres */
                    #capture-area, .folha-a4, .folha-a4 * { 
                        letter-spacing: 0.1px !important; 
                        word-spacing: normal !important;
                        text-rendering: geometricPrecision !important;
                        font-variant-ligatures: none !important;
                    }
                `;
                clonedDoc.body.appendChild(style);
            }
        };

        // 1. Capturar as folhas de dados (A4 Paisagem)
        const folhasA4 = area.querySelectorAll('.folha-a4');
        for (let i = 0; i < folhasA4.length; i++) {
            if (i > 0) {
                pdf.addPage('a4', 'landscape');
            }
            
            const canvasFolha = await html2canvas(folhasA4[i], html2canvasOptions);
            
            // Alterado para 'image/jpeg' com qualidade máxima (1.0). 
            // Em conjunto com o 'compress: true' do jsPDF, isto gera um ficheiro extremamente leve sem criar borrões.
            const imgData = canvasFolha.toDataURL('image/jpeg', 1.0); 
            
            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
        }

        // 2. Capturar as páginas das fotos em anexo (A4 Retrato)
        const pagsFotos = document.querySelectorAll('.folha-foto');
        for (let i = 0; i < pagsFotos.length; i++) {
            pdf.addPage('a4', 'portrait');
            
            const canvasF = await html2canvas(pagsFotos[i], {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 950
            });
            
            // As fotos utilizam compressão balanceada (0.75) para não inflar o tamanho do PDF
            const imgDataFoto = canvasF.toDataURL('image/jpeg', 0.75);
            pdf.addImage(imgDataFoto, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }

        pdf.save(nomeArquivo);

    } catch (e) {
        console.error(e);
        alert("Erro ao gerar PDF.");
    } finally {
        area.style.transform = originalTransform;
    }
}



















