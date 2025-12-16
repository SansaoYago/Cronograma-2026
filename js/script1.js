// ==========================================================
// 1. VARIÁVEIS DE ESTADO
// ==========================================================
let currentYear = 2026;
let currentMonth = 0; // Janeiro (0 = Jan, 11 = Dez)
let activities = [];
let dayTeams = {};
let currentModalActivities = [];
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
// 5. CARREGAMENTO DE DADOS (MOCK)
// ==========================================================
const mockActivitiesData = [
    { "date": "2026-01-01", "company": "FERIADO", "description": "FERIADO FIM DE ANO", "company_group": "FERIADO" },
    { "date": "2026-01-01", "on_call_day": "Equipe C", "on_call_night": "Equipe D" },
    { "date": "2026-01-01", "company": "FREEZING COMERCIAL", "description": "TBRA - FREEZING FIM DE ANO", "periodicity": "FREEZING", "company_group": "TBRA_FREEZING" },
    { "date": "2026-01-01", "company": "B2B", "description": "B2B TBRA - FREEZING HUAWEI", "periodicity": "B2B-HUAWEI", "company_group": "B2B_HUAWEI_FREEZING" },
    { "date": "2026-01-01", "company": "Engemon", "description": "(08:00 - 18:00) SISTEMA DE INCÊNDIO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-incendio" },
    { "date": "2026-01-02", "on_call_day": "Equipe A", "on_call_night": "Equipe B" },
    { "date": "2026-01-02", "company": "FREEZING COMERCIAL", "description": "TBRA - FREEZING FIM DE ANO", "periodicity": "FREEZING", "company_group": "TBRA_FREEZING" },
    { "date": "2026-01-02", "company": "B2B", "description": "B2B TBRA - FREEZING HUAWEI", "periodicity": "B2B-HUAWEI", "company_group": "B2B_HUAWEI_FREEZING" },
    { "date": "2026-01-02", "company": "ENGEMON", "description": "SISTEMA DE AUTOMAÇÃO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-automacao" },
    { "date": "2026-01-03", "on_call_day": "Equipe B", "on_call_night": "Equipe C" },
    { "date": "2026-01-03", "company": "FREEZING COMERCIAL", "description": "TBRA - FREEZING FIM DE ANO", "periodicity": "FREEZING", "company_group": "TBRA_FREEZING" },
    { "date": "2026-01-03", "company": "B2B", "description": "B2B TBRA - FREEZING HUAWEI", "periodicity": "B2B-HUAWEI", "company_group": "B2B_HUAWEI_FREEZING" },
    { "date": "2026-01-04", "on_call_day": "Equipe D", "on_call_night": "Equipe A" },
    { "date": "2026-01-04", "company": "FREEZING COMERCIAL", "description": "TBRA - FREEZING FIM DE ANO", "periodicity": "FREEZING", "company_group": "TBRA_FREEZING" },
    { "date": "2026-01-05", "on_call_day": "Equipe C", "on_call_night": "Equipe D" },
    { "date": "2026-01-05", "company": "VERTIV", "description": "(08:00 - 18:00) Baterias", "periodicity": "TRIMESTRAL", "company_group": "VERTIV_POWER" },
    { "date": "2026-01-05", "company": "ENGEMON", "description": "(08:00) SISTEMA DE INCÊNDIO - TESTE DE DISPARO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-incendio" },
    { "date": "2026-01-06", "on_call_day": "Equipe A", "on_call_night": "Equipe B" },
    { "date": "2026-01-06", "company": "VERTIV", "description": "(08:00 - 18:00) Baterias", "periodicity": "TRIMESTRAL", "company_group": "VERTIV_POWER" },
    { "date": "2026-01-06", "company": "ENGEMON", "description": "(08:00) SISTEMA DE INCÊNDIO - TESTE DE DISPARO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-incendio" },
    { "date": "2026-01-07", "on_call_day": "Equipe B", "on_call_night": "Equipe C" },
    { "date": "2026-01-07", "company": "VERTIV", "description": "(08:00 - 18:00) Baterias", "periodicity": "TRIMESTRAL", "company_group": "VERTIV_POWER" },
    { "date": "2026-01-07", "company": "ENGEMON", "description": "(08:00) SISTEMA DE INCÊNDIO - TESTE DE DISPARO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-incendio" },
    { "date": "2026-01-08", "on_call_day": "Equipe D", "on_call_night": "Equipe A" },
    { "date": "2026-01-08", "company": "VERTIV", "description": "(08:00 - 18:00) Baterias", "periodicity": "TRIMESTRAL", "company_group": "VERTIV_POWER" },
    { "date": "2026-01-08", "company": "ENGEMON", "description": "(08:00) SISTEMA DE AUTOMAÇÃO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-automacao" },
    { "date": "2026-01-09", "on_call_day": "Equipe C", "on_call_night": "Equipe D" },
    { "date": "2026-01-09", "company": "VERTIV", "description": "(08:00 - 18:00) Baterias", "periodicity": "TRIMESTRAL", "company_group": "VERTIV_POWER" },
    { "date": "2026-01-09", "company": "ENGEMON", "description": "(08:00) SISTEMA DE AUTOMAÇÃO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-automacao" },
    { "date": "2026-01-10", "on_call_day": "Equipe A", "on_call_night": "Equipe B" },
    { "date": "2026-01-10", "company": "TBRA", "description": "TBRA - RELEASE", "periodicity": "FREEZING", "company_group": "TBRA_RELEASE" },
    { "date": "2026-01-11", "on_call_day": "Equipe B", "on_call_night": "Equipe C" },
    { "date": "2026-01-11", "company": "TBRA", "description": "TBRA - RELEASE", "periodicity": "FREEZING", "company_group": "TBRA_RELEASE" },
    { "date": "2026-01-12", "on_call_day": "Equipe D", "on_call_night": "Equipe A" },
    { "date": "2026-01-12", "company": "TBRA", "description": "TBRA - RELEASE", "periodicity": "FREEZING", "company_group": "TBRA_RELEASE" },
    { "date": "2026-01-12", "company": "VERTIV", "description": "(08:00 - 18:00) Baterias", "periodicity": "TRIMESTRAL", "company_group": "VERTIV_POWER" },
    { "date": "2026-01-12", "company": "ENGEMON", "description": "(08:00) SISTEMA DE INCÊNDIO - TESTE DE DISPARO", "periodicity": "MENSAL", "company_group": "ENGEMON", "service_type": "engemon-incendio" }
];


async function loadActivities() {
    try {
        const rawData = mockActivitiesData;

        activities = [];
        dayTeams = {};

        rawData.forEach(item => {
            // Usa destructuring para clareza
            const { date, company, on_call_day, on_call_night } = item;

            // BLOCO DE EQUIPE
            if (date && !company && (on_call_day || on_call_night)) {
                dayTeams[date] = {
                    day: on_call_day || null,
                    night: on_call_night || null
                };
                return;
            }

            // BLOCO DE ATIVIDADE
            if (date && company) { 
                activities.push(item);
            }
        });

    } catch (error) {
        console.error("Erro ao carregar os dados:", error); 
    }
}

// ==========================================================
// 6. RENDERIZAÇÃO DO CALENDÁRIO
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
        // Uso de Intl.DateTimeFormat para datas complexas, mas para string simples, o template literal é bom.
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.dataset.date = dateString;
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;

        const dailyActivities = activities.filter(a => a.date === dateString);

        // CONTADOR SOMENTE PARA ATIVIDADES COM PERIODICIDADE CONTÁVEL
        const countableActivities = dailyActivities.filter(a =>
            a.periodicity && COUNTABLE_PERIODICITIES.includes(normalizeText(a.periodicity))
        );

        if (countableActivities.length > 0) {
            const indicator = document.createElement('span');
            indicator.classList.add('activity-indicator');
            indicator.textContent = `${countableActivities.length} Ativ.`;
            dayElement.appendChild(indicator);
        }

        // COR DO DIA (Prioridade: Feriado > Freezing/Release > Vendors/Engemon)
        let appliedClass = null;
        
        // Prioridade 1: Feriado
        if (dailyActivities.some(a => normalizeText(a.company) === 'FERIADO')) {
            appliedClass = DAY_CLASS_MAP['FERIADO'];
        } else {
            // Prioridade 2: Freezing/Vendors (usando a ordem definida na constante)
            for (const group of DAY_COLOR_PRIORITY_ORDER) {
                if (dailyActivities.some(a => normalizeText(a.company_group) === group)) {
                    appliedClass = DAY_CLASS_MAP[group];
                    break;
                }
            }
        }

        if (appliedClass) {
            dayElement.classList.add(appliedClass);
        }

        // Evento para abrir o modal
        dayElement.addEventListener('click', () => {
            openActivityModal(dateString, dailyActivities);
        });

        daysGrid.appendChild(dayElement);
    }
}

// ==========================================================
// 7. MODAL
// ==========================================================
function openActivityModal(dateString, dailyActivities) {
    currentModalDate = dateString;
    activitiesList.innerHTML = '';
    modalTeamInfo.innerHTML = '';
    
    modalDateDisplay.textContent = dateString;

    // 1. FILTRAR ATIVIDADES LISTÁVEIS (Tudo, exceto Feriado)
    const listableActivities = dailyActivities.filter(a =>
        a.company && normalizeText(a.company) !== 'FERIADO'
    );
    currentModalActivities = listableActivities; 

    // 2. EQUIPE DE PLANTÃO
    const teamInfo = dayTeams[dateString];
    const shift = getCurrentShift();

    if (teamInfo) {
        // Usa destructuring no objeto teamInfo
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
    const holiday = dailyActivities.find(a => normalizeText(a.company) === 'FERIADO');
    if (holiday) {
        const feriadoEl = document.createElement('p');
        // Mantido o estilo inline para garantir a precedência visual do feriado no modal
        feriadoEl.style.cssText = 'color: red; font-weight: bold; margin-bottom: 15px;'; 
        feriadoEl.innerHTML = `
            🛑 ${holiday.description || 'Feriado'}
            <hr style="margin-top: 5px; border-color: #f8c0c0;">
        `;
        activitiesList.appendChild(feriadoEl);
    }
    
    // 4. LÓGICA DE EXIBIÇÃO DO BOTÃO DE PDF
    // O botão só aparece se houver alguma atividade com periodicidade contável.
    const exportableActivities = listableActivities.filter(a => {
        return COUNTABLE_PERIODICITIES.includes(normalizeText(a.periodicity));
    });
    
    const hasExportableActivities = exportableActivities.length > 0;
    
    if (exportPdfTrigger) {
        exportPdfTrigger.style.display = hasExportableActivities ? 'inline-block' : 'none';
    } else {
         console.warn("Elemento 'export-pdf' não encontrado no DOM.");
    }

    // 5. LISTAGEM DE ATIVIDADES
    if (!listableActivities.length && !holiday) {
        activitiesList.innerHTML += '<p class="no-activity">Nenhuma atividade agendada neste dia.</p>';
    } else {
        listableActivities.forEach(activity => {
            const periodicityText = normalizeText(activity.periodicity);
            
            let tag = '';
            
            // LÓGICA DE TAG (SOMENTE CONTÁVEIS)
            if (COUNTABLE_PERIODICITIES.includes(periodicityText)) {
                tag = `<span class="periodicidade-tag p-${periodicityText}">${periodicityText}</span>`;
            }

            const item = document.createElement('div');
            
            // LÓGICA DE CLASSE DE BORDA (Prioridades)
            let borderClass = `border-p-${periodicityText}`; // 3. Fallback Periodicidade Padrão
            
            const groupName = normalizeText(activity.company_group);

            // 1. Prioridade Máxima: Serviço Específico
            if (activity.service_type) {
                borderClass = `border-${activity.service_type}`; 
            } 
            // 2. Segunda Prioridade: Company Group
            else if (groupName && groupName !== 'N_A') {
                // Renomeado sanitizedGroupName para groupName para simplificar
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
    // Usando style.cssText para aplicar múltiplos estilos de forma eficiente
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
const navigateMonth = (direction) => {
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