// CONFIGURAÇÕES INICIAIS
const META_MINUTOS = 440; // 07:20
let DIA_FECHAMENTO = parseInt(localStorage.getItem('dia_fechamento') || '25');

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o campo de fechamento na tela
    const inputF = document.getElementById('inputFechamento');
    if(inputF) {
        inputF.value = DIA_FECHAMENTO;
        document.getElementById('btnSalvarConfig').onclick = () => {
            const novoDia = parseInt(inputF.value);
            if (novoDia >= 1 && novoDia <= 31) {
                DIA_FECHAMENTO = novoDia;
                localStorage.setItem('dia_fechamento', novoDia);
                alert(`Ciclo atualizado! Fechamento todo dia ${novoDia}.`);
                renderizar();
            }
        };
    }

    renderizar();
    setInterval(atualizarCronometro, 1000);
    document.getElementById('btnPDF').onclick = gerarPDF;
    
    // Configuração do Modal de Ocorrência
    const modalOc = document.getElementById('modalOcorrencia');
    document.getElementById('btnOcorrencia').onclick = () => modalOc.style.display = 'flex';
    document.getElementById('btnFecharOcorrencia').onclick = () => modalOc.style.display = 'none';
    document.getElementById('btnSalvarOcorrencia').onclick = salvarOcorrencia;
});

// FUNÇÕES DE BANCO DE DADOS (LocalStorage)
function getDB() { 
    return JSON.parse(localStorage.getItem('brutus_final_v6') || '[]'); 
}

function setDB(dados) { 
    localStorage.setItem('brutus_final_v6', JSON.stringify(dados)); 
}

// FORMATADORES
function formatarDuraçãoPausa(minutosTotal) {
    if (minutosTotal < 1) return "0m";
    if (minutosTotal < 60) return `${minutosTotal}m`;
    const h = Math.floor(minutosTotal / 60);
    const m = minutosTotal % 60;
    return `${h}h${String(m).padStart(2, '0')}m`;
}

function formatarHhMm(minutosTotal, comSinal = false) {
    const isNegativo = minutosTotal < 0;
    const minAbs = Math.abs(minutosTotal);
    const h = Math.floor(minAbs / 60);
    const m = minAbs % 60;
    let sinal = comSinal ? (isNegativo ? "-" : "+") : (isNegativo ? "-" : "");
    return `${sinal}${h > 0 ? h + 'h' : ''}${String(m).padStart(2, '0')}m`;
}

// LÓGICA DE CICLO MENSAL
function pertenceAoCicloAtual(dataStr) {
    const hoje = new Date();
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    const dataReg = new Date(ano, mes - 1, dia);
    
    let inicio, fim;
    if (hoje.getDate() > DIA_FECHAMENTO) {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), DIA_FECHAMENTO + 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, DIA_FECHAMENTO);
    } else {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, DIA_FECHAMENTO + 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), DIA_FECHAMENTO);
    }
    return dataReg >= inicio && dataReg <= fim;
}

// AÇÃO DE BATER PONTO
document.getElementById('btnGravar').onclick = () => {
    const agora = new Date();
    const db = getDB();
    db.push({
        id: Date.now(),
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        ts: agora.getTime()
    });
    setDB(db);
    renderizar();
};

// ATUALIZAR DASHBOARD (TEMPO REAL)
function atualizarCronometro() {
    const db = getDB();
    const hoje = new Date().toLocaleDateString('pt-BR');
    const registrosHoje = db.filter(r => r.data === hoje);
    let ms = 0, ativo = false;

    for (let i = 0; i < registrosHoje.length; i += 2) {
        const entrada = registrosHoje[i].ts;
        const saida = registrosHoje[i+1] ? registrosHoje[i+1].ts : Date.now();
        ms += (saida - entrada);
        if (!registrosHoje[i+1]) ativo = true;
    }

    const seg = Math.floor(ms / 1000);
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
    
    document.getElementById('tempoTrabalhadoReal').innerText = 
        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    
    document.getElementById('statusAtual').innerText = ativo ? "TRABALHANDO..." : "PAUSADO";
    
    const totalMin = Math.floor(seg / 60);
    const saldo = META_MINUTOS - totalMin;
    document.getElementById('saldoLabel').innerText = 
        saldo > 0 ? `Faltam ${formatarHhMm(saldo)}` : `Extra: ${formatarHhMm(Math.abs(saldo))}`;
}

// RENDERIZAR O HISTÓRICO NA TELA
function renderizar() {
    const db = getDB();
    const container = document.getElementById('historicoDias');
    if (!container) return;
    
    container.innerHTML = '';
    let saldoCicloTotal = 0;
    
    // Agrupa por data
    const grupos = db.reduce((acc, r) => {
        (acc[r.data] = acc[r.data] || []).push(r);
        return acc;
    }, {});

    // Ordena as datas (mais recentes primeiro)
    const datasOrdenadas = Object.keys(grupos).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    datasOrdenadas.forEach(data => {
        const registros = grupos[data];
        let minTrabalhadosNoDia = 0;
        
        const bloco = document.createElement('div');
        bloco.className = 'day-block';
        let htmlCard = `<div class="day-header">${data}</div>`;

        registros.forEach((reg, i) => {
            // Se for um retorno de pausa (índice 2, 4, 6...) calcula intervalo de pausa
            if (i > 0 && i % 2 === 0) {
                const minPausa = Math.round((reg.ts - registros[i-1].ts) / 60000);
                htmlCard += `<div class="pause-divider">Pausa: ${formatarDuraçãoPausa(minPausa)}</div>`;
            }

            const label = i % 2 === 0 ? 'Início' : 'Pausa';
            const obs = reg.obs ? `<span style="color:#fbbf24; font-size:0.7rem"> [${reg.obs}]</span>` : '';

            htmlCard += `
                <div class="time-row">
                    <div><strong>${label}: ${reg.hora}</strong>${obs}</div>
                    <button class="btn-edit" onclick="editar(${reg.id})">Editar</button>
                </div>`;

            // Soma tempo trabalhado (sempre entre um Início e uma Pausa)
            if (i % 2 !== 0) {
                minTrabalhadosNoDia += Math.round((reg.ts - registros[i-1].ts) / 60000);
            }
        });

        bloco.innerHTML = htmlCard;
        container.appendChild(bloco);

        // Soma ao saldo do topo se estiver no ciclo escolhido
        if (pertenceAoCicloAtual(data)) {
            saldoCicloTotal += (minTrabalhadosNoDia - META_MINUTOS);
        }
    });

    const elTotal = document.getElementById('totalCiclo');
    if(elTotal) {
        elTotal.innerText = formatarHhMm(saldoCicloTotal, true);
        elTotal.style.color = saldoCicloTotal >= 0 ? "#16a34a" : "#dc2626";
    }
}

// LANÇAR OCORRÊNCIA MANUAL
function salvarOcorrencia() {
    const dataIn = document.getElementById('ocData').value;
    const horaIn = document.getElementById('ocHora').value;
    const motivo = document.getElementById('ocMotivo').value;
    if(!dataIn || !horaIn) return alert("Preencha os campos!");

    const [ano, mes, dia] = dataIn.split('-');
    const [h, m] = horaIn.split(':');
    const db = getDB();
    db.push({
        id: Date.now(),
        data: `${dia}/${mes}/${ano}`,
        hora: horaIn,
        ts: new Date(ano, mes-1, dia, h, m).getTime(),
        obs: motivo
    });
    db.sort((a, b) => a.ts - b.ts);
    setDB(db);
    document.getElementById('modalOcorrencia').style.display = 'none';
    renderizar();
}

// PDF, EDITAR E LIMPAR
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const db = getDB();
    const rows = [];
    const grupos = db.reduce((acc, r) => { (acc[r.data] = acc[r.data] || []).push(r); return acc; }, {});
    Object.keys(grupos).forEach(data => {
        const regs = grupos[data];
        let min = 0;
        for (let i=0; i<regs.length; i+=2) if(regs[i+1]) min += Math.round((regs[i+1].ts - regs[i].ts)/60000);
        rows.push([data, regs.map(r=>r.hora).join(" | "), formatarHhMm(min), formatarHhMm(min-META_MINUTOS, true)]);
    });
    doc.autoTable({ head: [['Data', 'Batidas', 'Total', 'Saldo']], body: rows });
    doc.save(`Ponto_Ciclo.pdf`);
}

window.editar = function(id) {
    let db = getDB();
    const reg = db.find(r => r.id === id);
    const novo = prompt("Novo horário (HH:MM):", reg.hora);
    if (novo) { 
        reg.hora = novo; 
        const [h, m] = novo.split(':');
        const d = new Date(reg.ts); d.setHours(h, m);
        reg.ts = d.getTime();
        db.sort((a,b) => a.ts - b.ts);
        setDB(db); renderizar(); 
    }
};

document.getElementById('btnLimpar').onclick = () => { 
    if(confirm("Deseja apagar TODO o histórico?")) { 
        localStorage.removeItem('brutus_final_v6'); 
        location.reload(); 
    } 
};

// CÂMERA
const btnCam = document.getElementById('btnCamera'), modalCam = document.getElementById('cameraModal'), vid = document.getElementById('video'), can = document.getElementById('canvas');
let stream = null;
btnCam.onclick = async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        vid.srcObject = stream; modalCam.style.display = 'flex';
    } catch (e) { alert("Câmera não disponível."); }
};
document.getElementById('btnFecharCam').onclick = () => { 
    modalCam.style.display = 'none'; 
    if (stream) stream.getTracks().forEach(t => t.stop()); 
};
document.getElementById('btnCapturar').onclick = () => {
    const ctx = can.getContext('2d'); ctx.drawImage(vid, 0, 0, 320, 240);
    const db = getDB();
    db.push({ 
        id: Date.now(), 
        data: new Date().toLocaleDateString('pt-BR'), 
        hora: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), 
        ts: Date.now(), 
        foto: can.toDataURL('image/jpeg', 0.5) 
    });
    setDB(db); 
    document.getElementById('btnFecharCam').click(); 
    renderizar();
};