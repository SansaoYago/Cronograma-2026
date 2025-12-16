// ==========================================================
// 1. VARIÁVEIS DE ESTADO
// ==========================================================
let currentYear = 2026;
let currentMonth = new Date().getMonth(); // Começa no mês atual do sistema
let activities = []; // Armazena os registros diários completos do mês atual
let dayTeams = {}; // Mapa para fácil acesso à equipe de plantão e freezing por data
let holidaysData = []; // Armazena o JSON de feriados anual
let currentModalActivities = []; // Usado para exportação de PDF (vendors listados)
let currentModalDate = '';

// ==========================================================
// 2. VARIÁVEIS DO DOM
// ==========================================================
const daysGrid = document.getElementById('days-grid');
const currentMonthYearHeader = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const activityModal = document.getElementById('activity-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalDateDisplay = document.getElementById('modal-date-display');
const activitiesList = document.getElementById('activities-list');
const modalTeamInfo = document.getElementById('modal-team-info');
const exportPdfTrigger = document.getElementById('export-pdf');

// ==========================================================
// 3. CONSTANTES
// ==========================================================
const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Periodicidades que são contadas e LISTADAS COM TAG no modal (Regra de Negócio)
const COUNTABLE_PERIODICITIES = [
    'MENSAL',
    'BIMESTRAL',
    'TRIMESTRAL',
    'QUADRIMESTRAL',
    'SEMESTRAL',
    'ANUAL'
];

// Mapeamento para as classes CSS do calendário (cor de fundo do dia)
const DAY_CLASS_MAP = {
    // Estas são agora as 'reason' do Freezing OU os 'company_group' dos vendors
    'TBRA_FREEZING': 'freezing-tbra',
    'B2B_HUAWEI_FREEZING': 'freezing-b2b-huawei',
    'TBRA_RELEASE': 'freezing-tbra-release-ngin',
    'ENGEMON': 'general-activity',
    'VENDORS': 'general-activity',
    'VERTIV_POWER': 'general-activity', 
    'VERTIV_COOLING': 'general-activity', 
    'CARRIER': 'general-activity', 
    'SOTREQ': 'general-activity', 
    'ENERG': 'general-activity', 
    'COTEPE': 'general-activity', 
    'FERIADO': 'holiday'
};

// Ordem de prioridade para a cor de fundo do dia no calendário (Prioridade do mais alto para o mais baixo)
const DAY_COLOR_PRIORITY_ORDER = [
    'TBRA_FREEZING',
    'B2B_HUAWEI_FREEZING',
    'TBRA_RELEASE',
    'VERTIV_POWER',
    'VERTIV_COOLING',
    'CARRIER',
    'SOTREQ',
    'ENERG',
    'COTEPE',
    'ENGEMON',
    'VENDORS'
];

// ==========================================================
// 4. FUNÇÕES AUXILIARES
// ==========================================================
/**
 * Determina o turno atual (dia ou noite).
 * @returns {('day'|'night')} O turno atual.
 */
function getCurrentShift() {
    // Determina se é dia (6h às 17h59) ou noite (18h às 5h59)
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'day' : 'night';
}

/**
 * Normaliza o texto de periodicidade/grupo.
 * @param {string} text O texto a ser normalizado.
 * @returns {string} O texto em maiúsculas com hífens substituídos por underscores.
 */
const normalizeText = (text) => text ? text.toUpperCase().replace(/-/g, '_') : 'N_A';

// ==========================================================
// 5. CARREGAMENTO DE DADOS (ADAPTADO)
// ==========================================================

/**
 * Carrega e processa os dados (Plantão, Freezing, Vendors) do mês e ano atuais.
 */
async function loadActivities() {
    // 1. Determinar o nome do arquivo mensal
    const monthName = MONTH_NAMES[currentMonth].toLowerCase();
    const fileName = `atividades_${monthName}_${currentYear}.json`;
    const dataPath = `./data/${fileName}`; 

    try {
        // A. Carregar Feriados (Apenas na primeira vez ou ao mudar de ano)
        if (holidaysData.length === 0 || holidaysData[0].data.substring(0, 4) !== String(currentYear)) {
            const holidaysResponse = await fetch(`./data/feriados_${currentYear}.json`);
            if (holidaysResponse.ok) {
                 holidaysData = await holidaysResponse.json();
            } else {
                 holidaysData = [];
            }
        }

        // B. Carregar o JSON do Mês Atual (Plantão + Vendors + Freezing)
        const response = await fetch(dataPath);
        if (!response.ok) {
            console.warn(`Arquivo de dados não encontrado: ${fileName}`);
            activities = []; // Resetar
            dayTeams = {}; // Resetar
            return;
        }

        const monthlyData = await response.json();

        activities = monthlyData; // activities agora é o array mensal completo, já consolidado por dia
        dayTeams = {}; // Resetar o mapa de equipes
        
        // 2. Processar a nova estrutura para popular dayTeams
        activities.forEach(item => {
            const { data, on_call_dia, on_call_noite, freezing } = item;
            
            // Popula o mapa de equipes e freezing para fácil acesso no modal
            dayTeams[data] = {
                day: on_call_dia || null,
                night: on_call_noite || null,
                freezing: freezing || { is_active: false, reason: "", rules: [] }
            };
        });

    } catch (error) {
        console.error("Erro ao carregar ou processar os dados:", error);
        activities = [];
        dayTeams = {};
    }
}

// ==========================================================
// 6. RENDERIZAÇÃO DO CALENDÁRIO (ADAPTADO)
// ==========================================================
function renderCalendar(year, month) {
    daysGrid.innerHTML = '';
    currentMonthYearHeader.textContent = `${MONTH_NAMES[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 6 = Sábado

    // 1. Dias vazios no início
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day', 'empty');
        daysGrid.appendChild(emptyDay);
    }

    // 2. Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.dataset.date = dateString;
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;

        // Busca o objeto do dia inteiro na nova estrutura
        const dailyRecord = activities.find(a => a.data === dateString);
        
        if (dailyRecord) {
            const dailyVendors = dailyRecord.vendors || [];
            const dailyFreezing = dailyRecord.freezing || { is_active: false, reason: "" };

            // A. CONTADOR SOMENTE PARA ATIVIDADES COM PERIODICIDADE CONTÁVEL
            const countableActivities = dailyVendors.filter(v =>
                v.periodicity && COUNTABLE_PERIODICITIES.includes(normalizeText(v.periodicity))
            );

            if (countableActivities.length > 0) {
                const indicator = document.createElement('span');
                indicator.classList.add('activity-indicator');
                indicator.textContent = `${countableActivities.length} Ativ.`;
                dayElement.appendChild(indicator);
            }
            
            // B. COR DO DIA (Prioridade: Feriado > Freezing/Release > Vendors/Engemon)
            let appliedClass = null;
            let groupIndicators = [];
            
            // B1: Prioridade 1: Feriado (Busca no holidaysData anual)
            const isHoliday = holidaysData.some(h => h.data === dateString);
            if (isHoliday) {
                appliedClass = DAY_CLASS_MAP['FERIADO'];
            } else {
                
                // B2: Freezing (Se ativo, adiciona o 'reason' como indicador de grupo)
                if (dailyFreezing.is_active && dailyFreezing.reason) {
                   const freezingGroup = normalizeText(dailyFreezing.reason);
                   if (DAY_CLASS_MAP[freezingGroup]) {
                       groupIndicators.push(freezingGroup);
                   }
                }
                
                // B3: Vendors (Adiciona os company_group)
                dailyVendors.forEach(v => {
                    const group = normalizeText(v.company_group);
                    if (DAY_CLASS_MAP[group] && !groupIndicators.includes(group)) {
                        groupIndicators.push(group);
                    }
                });
                
                // B4: Aplicar a classe com base na prioridade
                for (const group of DAY_COLOR_PRIORITY_ORDER) {
                    if (groupIndicators.includes(group)) {
                        appliedClass = DAY_CLASS_MAP[group];
                        break;
                    }
                }
            }

            if (appliedClass) {
                dayElement.classList.add(appliedClass);
            }
            
            // Evento para abrir o modal (passando o objeto diário, que já contém tudo)
            dayElement.addEventListener('click', () => {
                openActivityModal(dateString, dailyRecord);
            });
        }
        
        daysGrid.appendChild(dayElement);
    }
}

// ==========================================================
// 7. MODAL (ADAPTADO)
// ==========================================================
function openActivityModal(dateString, dailyRecord) { 
    currentModalDate = dateString;
    activitiesList.innerHTML = '';
    modalTeamInfo.innerHTML = '';
    
    modalDateDisplay.textContent = dateString;

    // Se o dia não tem registro, não faz nada além de mostrar o modal vazio
    if (!dailyRecord) {
        activitiesList.innerHTML += '<p class="no-activity">Nenhuma informação agendada neste dia.</p>';
        activityModal.style.display = 'block';
        return;
    }

    // 1. DADOS DE ATIVIDADE
    const listableVendors = dailyRecord.vendors || [];
    currentModalActivities = listableVendors;

    // 2. EQUIPE DE PLANTÃO
    const teamInfo = dayTeams[dateString];
    const shift = getCurrentShift();

    if (teamInfo) {
        const teamName = teamInfo[shift];
        if (teamName) {
            const shiftText = shift === 'day' ? 'Diurno' : 'Noturno';
            modalTeamInfo.innerHTML = `
                <div class="on-call-modal">
                    👥 <strong>Equipe de plantão (${shiftText}):</strong>
                    ${teamName}
                </div>
            `;
        }
    }

    // 3. FERIADO (TEXTO SIMPLES)
    const holiday = holidaysData.find(h => h.data === dateString);
    if (holiday) {
        const feriadoEl = document.createElement('p');
        feriadoEl.style.cssText = 'color: red; font-weight: bold; margin-bottom: 15px;'; 
        feriadoEl.innerHTML = `
            🛑 ${holiday.nome || 'Feriado'} (${holiday.tipo || 'N/A'})
            <hr style="margin-top: 5px; border-color: #f8c0c0;">
        `;
        activitiesList.appendChild(feriadoEl);
    }
    
    // 4. LÓGICA DE FREEZING (NOVA - Trata o objeto freezing)
    const freezingData = dailyRecord.freezing || { is_active: false, reason: "", rules: [] };

    if (freezingData.is_active) {
        const freezingEl = document.createElement('div');
        freezingEl.classList.add('freezing-modal-info');
        
        // Título Freezing
        freezingEl.innerHTML = `
            🚨 <strong>FREEZING ATIVO: ${freezingData.reason || 'Restrição Operacional'}</strong>
            <hr style="margin-top: 5px; border-color: #f8c0c0;">
        `;
        
        // Regras / Particularidades
        if (freezingData.rules && freezingData.rules.length > 0) {
            const ul = document.createElement('ul');
            ul.style.listStyleType = 'disc';
            ul.style.paddingLeft = '20px';
            ul.style.marginBottom = '15px';
            
            freezingData.rules.forEach(rule => {
                const li = document.createElement('li');
                li.textContent = rule;
                ul.appendChild(li);
            });
            freezingEl.appendChild(ul);
        }
        
        activitiesList.appendChild(freezingEl);
    }
    
    // 5. LÓGICA DE EXIBIÇÃO DO BOTÃO DE PDF (Usa listableVendors)
    const exportableActivities = listableVendors.filter(v => {
        return COUNTABLE_PERIODICITIES.includes(normalizeText(v.periodicity));
    });
    
    const hasExportableActivities = exportableActivities.length > 0;
    
    if (exportPdfTrigger) {
        exportPdfTrigger.style.display = hasExportableActivities ? 'inline-block' : 'none';
    } else {
         console.warn("Elemento 'export-pdf' não encontrado no DOM.");
    }

    // 6. LISTAGEM DE ATIVIDADES (vendors)
    if (!listableVendors.length && !holiday && !freezingData.is_active) {
         activitiesList.innerHTML += '<p class="no-activity">Nenhuma atividade agendada neste dia.</p>';
    } else {
        listableVendors.forEach(activity => {
            const periodicityText = normalizeText(activity.periodicity);
            
            let tag = '';
            
            // LÓGICA DE TAG (SOMENTE CONTÁVEIS)
            if (COUNTABLE_PERIODICITIES.includes(periodicityText)) {
                tag = `<span class="periodicidade-tag p-${periodicityText}">${periodicityText}</span>`;
            }

            const item = document.createElement('div');
            
            // LÓGICA DE CLASSE DE BORDA (Prioridades)
            let borderClass = `border-p-${periodicityText}`;
            const groupName = normalizeText(activity.company_group);

            if (activity.service_type) {
                borderClass = `border-${activity.service_type}`; 
            } 
            else if (groupName && groupName !== 'N_A') {
                borderClass = `border-group-${groupName}`;
            }

            item.className = `activity-item ${borderClass}`;
            item.innerHTML = `
                <h4>${activity.company} ${tag}</h4> 
                <p><strong>Serviço:</strong> ${activity.description}</p>
            `;
            activitiesList.appendChild(item);
        });
    }

    activityModal.style.display = 'block';
}

// ==========================================================
// 8. EXPORTAR PDF
// ==========================================================
async function exportActivitiesToPDF() {
    
    // Filtra para PDF (Mantém apenas atividades periódicas contáveis)
    const activitiesForPdf = currentModalActivities.filter(a => {
        return COUNTABLE_PERIODICITIES.includes(normalizeText(a.periodicity));
    });
    
    if (activitiesForPdf.length === 0) {
        alert("Não há atividades periódicas agendadas que possam ser exportadas para PDF neste dia.");
        return;
    }
    
    // 1. Oculta o botão de PDF ANTES de gerar a imagem
    if (exportPdfTrigger) {
        exportPdfTrigger.style.display = 'none';
    }
    
    // 2. CRIAÇÃO DE CONTEÚDO TEMPORÁRIO para exportação
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'width: 190mm; padding: 10mm; background-color: white;';
    
    // Título do PDF
    tempContainer.innerHTML += `
        <h2 style="color: #007bff; text-align: center; margin-bottom: 10px;">Agenda de Serviços - ${currentModalDate}</h2>
        <h4 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;">Atividades Periódicas Exportáveis:</h4>
    `;
    
    activitiesForPdf.forEach(activity => {
        const periodicityText = normalizeText(activity.periodicity);
        const tag = `<span style="color: #333; font-size: 0.8em; padding: 2px 5px; border: 1px solid #aaa; border-radius: 3px; margin-left: 5px;">${periodicityText}</span>`;
        
        const itemHtml = `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 8px;">
                <h4 style="margin: 0 0 5px 0; color: #007bff; font-size: 1.1em;">${activity.company} ${tag}</h4> 
                <p style="margin: 0; font-size: 0.9em;"><strong>Serviço:</strong> ${activity.description}</p>
            </div>
        `;
        tempContainer.innerHTML += itemHtml;
    });

    // 3. Renderiza e gera o PDF
    document.body.appendChild(tempContainer);
    
    // As bibliotecas html2canvas e jspdf são necessárias aqui
    const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true
    });
    
    document.body.removeChild(tempContainer); 
    
    const imgData = canvas.toDataURL('image/png');
    // Constante para a biblioteca jspdf
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`atividades_${currentModalDate}.pdf`);

    // 4. Restaura a visibilidade do botão de PDF APÓS a geração
    const hasExportableActivities = activitiesForPdf.length > 0;
    if (exportPdfTrigger && hasExportableActivities) {
        exportPdfTrigger.style.display = 'inline-block';
    }
}

// ==========================================================
// 9. FECHAR MODAL
// ==========================================================
function closeModal() {
    activityModal.style.display = 'none';
}

// ==========================================================
// 10. EVENTOS
// ==========================================================
// Handler para a navegação de mês
const navigateMonth = async (direction) => {
    if (direction === 'prev') {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    } else {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    // Recarrega os dados ANTES de renderizar o calendário
    await loadActivities();
    renderCalendar(currentYear, currentMonth);
};

prevMonthBtn.addEventListener('click', () => navigateMonth('prev'));
nextMonthBtn.addEventListener('click', () => navigateMonth('next'));

closeModalBtn.addEventListener('click', closeModal);

window.addEventListener('click', e => {
    if (e.target === activityModal) closeModal();
});

if (exportPdfTrigger) {
    exportPdfTrigger.addEventListener('click', exportActivitiesToPDF);
}

// ==========================================================
// 11. INIT (INICIALIZAÇÃO)
// ==========================================================
async function init() {
    await loadActivities();
    renderCalendar(currentYear, currentMonth);
    
    // GARANTIA EXTRA: Garante que o botão comece oculto
    if (exportPdfTrigger) {
        exportPdfTrigger.style.display = 'none';
    }
}

init();