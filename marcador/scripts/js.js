const btnGravar = document.getElementById('btnGravar');
const btnLimpar = document.getElementById('btnLimpar');
const container = document.getElementById('historicoDias');
const dashHoje = document.getElementById('dashboardHoje');
const txtTrabalhadas = document.getElementById('horasTrabalhadas');
const txtRestantes = document.getElementById('horasRestantes');

const META_MINUTOS = (7 * 60) + 20;

document.addEventListener('DOMContentLoaded', renderizar);

btnGravar.addEventListener('click', () => {
    const agora = new Date();
    const novoRegistro = {
        id: Date.now(), // ID único para encontrar o registro na edição
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: agora.getTime()
    };

    let historico = JSON.parse(localStorage.getItem('pontos_v4') || '[]');
    historico.push(novoRegistro);
    localStorage.setItem('pontos_v4', JSON.stringify(historico));
    renderizar();
});

function renderizar() {
    const historico = JSON.parse(localStorage.getItem('pontos_v4') || '[]');
    container.innerHTML = '';
    
    const hoje = new Date().toLocaleDateString('pt-BR');
    const diasAgrupados = historico.reduce((acc, reg) => {
        if (!acc[reg.data]) acc[reg.data] = [];
        acc[acc[reg.data].push(reg)];
        return acc;
    }, {});

    // Corrigindo ordem de agrupamento e exibição
    const datas = Object.keys(historico.reduce((acc, reg) => {
        acc[reg.data] = acc[reg.data] || [];
        acc[reg.data].push(reg);
        return acc;
    }, {})).reverse();

    const grupos = historico.reduce((acc, reg) => {
        acc[reg.data] = acc[reg.data] || [];
        acc[reg.data].push(reg);
        return acc;
    }, {});

    datas.forEach(data => {
        const registros = grupos[data];
        const bloco = document.createElement('div');
        bloco.className = 'day-block';
        let html = `<div class="day-header">${data}</div>`;

        let minutosTrabalhados = 0;

        registros.forEach((reg, i) => {
            let badge = '';
            if (i > 0) {
                const diffMin = Math.round((reg.timestamp - registros[i-1].timestamp) / 60000);
                if (i % 2 !== 0) {
                    minutosTrabalhados += diffMin;
                } else {
                    const tipo = diffMin > 45 ? "Almoço" : "Café";
                    badge = `<div class="interval-badge">${tipo}: ${diffMin}m</div>`;
                }
            }

            html += `
                <div class="time-row">
                    <div class="time-info">
                        <span>${i % 2 == 0 ? 'Início' : 'Pausa'}: <strong>${reg.hora}</strong></span>
                        ${badge}
                    </div>
                    <button class="btn-edit" onclick="editarRegistro(${reg.id})">Editar</button>
                </div>
            `;
        });

        bloco.innerHTML = html;
        container.appendChild(bloco);

        if (data === hoje) atualizarDashboard(minutosTrabalhados);
    });
}

function editarRegistro(id) {
    let historico = JSON.parse(localStorage.getItem('pontos_v4') || '[]');
    const registro = historico.find(r => r.id === id);
    
    const novoHorario = prompt("Digite o novo horário (ex: 07:15):", registro.hora);
    
    if (novoHorario && /^([01]\d|2[0-3]):([0-5]\d)$/.test(novoHorario)) {
        // Criar um novo timestamp baseado na data original mas com o horário novo
        const [horas, minutos] = novoHorario.split(':');
        const novaDataObj = new Date(registro.timestamp);
        novaDataObj.setHours(parseInt(horas), parseInt(minutos), 0);

        registro.hora = novoHorario;
        registro.timestamp = novaDataObj.getTime();

        // Reordenar o histórico caso a edição mude a cronologia
        historico.sort((a, b) => a.timestamp - b.timestamp);
        
        localStorage.setItem('pontos_v4', JSON.stringify(historico));
        renderizar();
    } else if (novoHorario) {
        alert("Formato inválido! Use HH:MM (ex: 08:30)");
    }
}

function atualizarDashboard(trabalhados) {
    dashHoje.style.display = 'grid';
    const h = Math.floor(trabalhados / 60);
    const m = trabalhados % 60;
    txtTrabalhadas.innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

    const restantes = META_MINUTOS - trabalhados;
    if (restantes > 0) {
        const rh = Math.floor(restantes / 60);
        const rm = restantes % 60;
        txtRestantes.innerText = `${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')}`;
        txtRestantes.style.color = "#2563eb";
    } else {
        txtRestantes.innerText = "META BATIDA!";
        txtRestantes.style.color = "#16a34a";
    }
}

btnLimpar.addEventListener('click', () => {
    if(confirm("Limpar tudo?")) {
        localStorage.removeItem('pontos_v4');
        location.reload();
    }
});
