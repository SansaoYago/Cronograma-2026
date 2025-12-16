// ==========================================================
// VARIÁVEIS DE ESTADO
// ==========================================================
let currentYear = 2026;
let currentMonth = 0; // Janeiro (0 = Jan, 11 = Dez)
let activities = [];
let dayTeams = {};
let currentModalActivities = [];
let currentModalDate = '';

// ==========================================================
// VARIÁVEIS DO DOM
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
// CONSTANTES
// ==========================================================
const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Periodicidades que são contadas e listadas no INDICADOR do dia
const COUNTABLE_PERIODICITIES = [
    'MENSAL',
    'BIMESTRAL',
    'TRIMESTRAL',
    'QUADRIMESTRAL',
    'SEMESTRAL',
    'ANUAL'
];

// Mapeamento para as classes CSS do calendário (cor de fundo do dia)
const dayClassMap = {
    'TBRA_FREEZING': 'freezing-tbra',
    'B2B_HUAWEI_FREEZING': 'freezing-b2b-huawei',
    'TBRA_RELEASE': 'freezing-tbra-release-ngin',
    'ENGEMON': 'general-activity',
    'VENDORS': 'general-activity',
    'VERTIV_POWER': 'general-activity', // Adicionado para cor de dia
    'VERTIV_COOLING': 'general-activity', // Adicionado para cor de dia
    'CARRIER': 'general-activity', // Adicionado para cor de dia
    'SOTREQ': 'general-activity', // Adicionado para cor de dia
    'ENERG': 'general-activity', // Adicionado para cor de dia
    'COTEPE': 'general-activity', // Adicionado para cor de dia
    'FERIADO': 'holiday'
};

// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================
function getCurrentShift() {
    // Determina se é dia (6h às 17h59) ou noite (18h às 5h59)
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'day' : 'night';
}

// ==========================================================
// CARREGAMENTO DO JSON
// ==========================================================
async function loadActivities() {
    try {
        const response = await fetch('./data/activities.json'); 
        if (!response.ok) {
            console.error("Não foi possível carregar o arquivo JSON.");
            return;
        }

        const rawData = await response.json();

        activities = [];
        dayTeams = {};

        rawData.forEach(item => {

            // BLOCO DE EQUIPE (não tem 'company', mas tem 'on_call_day' ou 'on_call_night')
            if (
                item.date &&
                !item.company &&
                (item.on_call_day || item.on_call_night)
            ) {
                dayTeams[item.date] = {
                    day: item.on_call_day || null,
                    night: item.on_call_night || null
                };
                return;
            }

            // BLOCO DE ATIVIDADE (Tem 'company', incluindo FERIADO e VENDORS)
            if (item.date && item.company) { 
                activities.push(item);
            }
        });

    } catch (error) {
        console.error("Erro ao carregar o JSON:", error);
    }
}

// ==========================================================
// RENDERIZAÇÃO DO CALENDÁRIO
// ==========================================================
function renderCalendar(year, month) {
    daysGrid.innerHTML = '';
    currentMonthYearHeader.textContent = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 6 = Sábado

    // Dias vazios no início
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day', 'empty');
        daysGrid.appendChild(emptyDay);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.dataset.date = dateString;
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;

        const dailyActivities = activities.filter(a => a.date === dateString);

        // CONTADOR SOMENTE PARA ATIVIDADES COM PERIODICIDADE CONTÁVEL
        const countableActivities = dailyActivities.filter(a =>
            COUNTABLE_PERIODICITIES.includes(a.periodicity)
        );

        if (countableActivities.length > 0) {
            const indicator = document.createElement('span');
            indicator.classList.add('activity-indicator');
            indicator.textContent = `${countableActivities.length} Ativ.`;
            dayElement.appendChild(indicator);
        }

        // COR DO DIA (Prioridade: Feriado > Freezing/Release > Vendors/Engemon)
        let appliedClass = null;

        if (dailyActivities.some(a => a.company === 'FERIADO')) {
            appliedClass = dayClassMap['FERIADO'];
        } else {
            // Ordem de prioridade para a cor de fundo do dia
            const priorityOrder = [
                'TBRA_FREEZING',
                'B2B_HUAWEI_FREEZING',
                'TBRA_RELEASE',
                // Novos Vendors adicionados à lista de prioridade (embora usem 'general-activity' no map)
                'VERTIV_POWER',
                'VERTIV_COOLING',
                'CARRIER',
                'SOTREQ',
                'ENERG',
                'COTEPE',
                'ENGEMON',
                'VENDORS'
            ];

            for (const group of priorityOrder) {
                if (dailyActivities.some(a => a.company_group === group)) {
                    appliedClass = dayClassMap[group];
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
// MODAL
// ==========================================================
function openActivityModal(dateString, dailyActivities) {
    currentModalDate = dateString;
    activitiesList.innerHTML = '';
    modalTeamInfo.innerHTML = '';
    
    modalDateDisplay.textContent = dateString;

    // 1. FILTRAR ATIVIDADES LISTÁVEIS (Tudo, exceto Ferido)
    const listableActivities = dailyActivities.filter(a =>
        a.company && a.company !== 'FERIADO'
    );
    currentModalActivities = listableActivities; 

    // 2. EQUIPE DE PLANTÃO
    const teamInfo = dayTeams[dateString];
    const shift = getCurrentShift();

    if (teamInfo) {
        const teamName = shift === 'day' ? teamInfo.day : teamInfo.night;
        if (teamName) {
            modalTeamInfo.innerHTML = `
                <div class="on-call-modal">
                    👥 <strong>Equipe de plantão (${shift === 'day' ? 'Diurno' : 'Noturno'}):</strong>
                    ${teamName}
                </div>
            `;
        }
    }

    // 3. FERIADO (TEXTO SIMPLES)
    const holiday = dailyActivities.find(a => a.company === 'FERIADO');
    if (holiday) {
        const feriadoEl = document.createElement('p');
        feriadoEl.style.color = 'red';
        feriadoEl.style.fontWeight = 'bold';
        feriadoEl.style.marginBottom = '15px';
        feriadoEl.innerHTML = `
            🛑 ${holiday.description || 'Feriado'}
            <hr style="margin-top: 5px; border-color: #f8c0c0;">
        `;
        activitiesList.appendChild(feriadoEl);
    }
    
    // 4. ATIVIDADES LISTÁVEIS
    if (listableActivities.length === 0 && !holiday) {
        activitiesList.innerHTML += '<p class="no-activity">Nenhuma atividade agendada neste dia.</p>';
        exportPdfTrigger.style.display = 'none';
    } else {
        // Se houver atividades listáveis, mostra o botão de PDF
        exportPdfTrigger.style.display = listableActivities.length > 0 ? 'block' : 'none';

        listableActivities.forEach(activity => {
            const periodicityText = activity.periodicity || 'N/A';
            
            // Criação da Tag (Ex: p-B2B_HUAWEI)
            const tagClassName = periodicityText.toUpperCase().replace(/-/g, '_'); 
            const tag = `<span class="periodicidade-tag p-${tagClassName}">${periodicityText}</span>`;

            const item = document.createElement('div');
            
            // LÓGICA DE CLASSE DE BORDA (Prioridades)
            const defaultPeriodicBorder = `border-p-${tagClassName}`;
            let borderClass = defaultPeriodicBorder; 
            
            const groupName = activity.company_group ? activity.company_group.toUpperCase() : null;

            // 1. Prioridade Máxima: Serviço Específico (Ex: Engemon Incêndio/Automação)
            if (activity.service_type) {
                borderClass = `border-${activity.service_type}`; 
            } 
            // 2. Segunda Prioridade: Company Group (Ex: Vertiv, Carrier, etc.)
            else if (groupName) {
                // Remove espaços e traços para CSS limpo, se company_group for usado
                const sanitizedGroupName = groupName.replace(/-/g, '_');
                borderClass = `border-group-${sanitizedGroupName}`;
            }
            // 3. Fallback: Periodicidade Padrão (Ex: MENSAL, FREEZING, etc.)
            // Não precisa de else, pois 'borderClass' já está com 'defaultPeriodicBorder' se as outras falharem.

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
// EXPORTAR PDF
// ==========================================================
async function exportActivitiesToPDF() {
    if (currentModalActivities.length === 0) return;

    const modalContent = document.querySelector('.modal-content');

    exportPdfTrigger.style.display = 'none';

    const canvas = await html2canvas(modalContent, {
        scale: 2,
        useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`atividades_${currentModalDate}.pdf`);

    exportPdfTrigger.style.display = 'block';
}

// ==========================================================
// FECHAR MODAL
// ==========================================================
function closeModal() {
    activityModal.style.display = 'none';
}

// ==========================================================
// EVENTOS
// ==========================================================
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentYear, currentMonth);
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar(currentYear, currentMonth);
});

closeModalBtn.addEventListener('click', closeModal);

window.addEventListener('click', e => {
    if (e.target === activityModal) closeModal();
});

if (exportPdfTrigger) {
    exportPdfTrigger.addEventListener('click', exportActivitiesToPDF);
}

// ==========================================================
// INIT (INICIALIZAÇÃO)
// ==========================================================
async function init() {
    await loadActivities();
    renderCalendar(currentYear, currentMonth);
}

init();