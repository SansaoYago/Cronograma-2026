// ==========================================================
// VARIÁVEIS DE ESTADO
// ==========================================================
let currentYear = 2026;
let currentMonth = 0; // Janeiro
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

const COUNTABLE_PERIODICITIES = [
    'MENSAL',
    'BIMESTRAL',
    'TRIMESTRAL',
    'QUADRIMESTRAL',
    'SEMESTRAL',
    'ANUAL'
];

const dayClassMap = {
    'TBRA_FREEZING': 'freezing-tbra',
    'B2B_HUAWEI_FREEZING': 'freezing-b2b-huawei',
    'TBRA_RELEASE': 'freezing-tbra-release-ngin',
    'ENGEMON': 'general-activity',
    'VENDORS': 'general-activity',
    'FERIADO': 'holiday'
};

// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================
function getCurrentShift() {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'day' : 'night';
}

// ==========================================================
// CARREGAMENTO DO JSON
// ==========================================================
async function loadActivities() {
    try {
        const response = await fetch('./data/activities.json');
        if (!response.ok) return;

        const rawData = await response.json();

        activities = [];
        dayTeams = {};

        rawData.forEach(item => {

            // BLOCO DE EQUIPE
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

            // BLOCO DE ATIVIDADE
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
    const startDayOfWeek = firstDayOfMonth.getDay();

    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day', 'empty');
        daysGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.dataset.date = dateString;
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;

        const dailyActivities = activities.filter(a => a.date === dateString);

        // CONTADOR SOMENTE ATIVIDADES COM PERIODICIDADE
        const countableActivities = dailyActivities.filter(a =>
            COUNTABLE_PERIODICITIES.includes(a.periodicity)
        );

        if (countableActivities.length > 0) {
            const indicator = document.createElement('span');
            indicator.classList.add('activity-indicator');
            indicator.textContent = `${countableActivities.length} Ativ.`;
            dayElement.appendChild(indicator);
        }

        // COR DO DIA
        let appliedClass = null;

        if (dailyActivities.some(a => a.company === 'FERIADO')) {
            appliedClass = dayClassMap['FERIADO'];
        } else {
            const priorityOrder = [
                'TBRA_FREEZING',
                'B2B_HUAWEI_FREEZING',
                'TBRA_RELEASE',
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

    // ATIVIDADES VÁLIDAS
    currentModalActivities = dailyActivities.filter(a =>
        COUNTABLE_PERIODICITIES.includes(a.periodicity)
    );

    modalDateDisplay.textContent = dateString;
    activitiesList.innerHTML = '';
    modalTeamInfo.innerHTML = '';

    // EQUIPE
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

    // FERIADO (TEXTO SIMPLES)
    const holiday = dailyActivities.find(a => a.company === 'FERIADO');
    if (holiday) {
        const feriadoEl = document.createElement('p');
        feriadoEl.style.color = 'red';
        feriadoEl.style.fontWeight = 'bold';
        feriadoEl.textContent = holiday.description;
        activitiesList.appendChild(feriadoEl);
    }

    // ATIVIDADES
    if (currentModalActivities.length === 0) {
        activitiesList.innerHTML += '<p>Nenhuma atividade agendada.</p>';
        exportPdfTrigger.style.display = 'none';
    } else {
        exportPdfTrigger.style.display = 'block';

        currentModalActivities.forEach(activity => {
            const tag = `<span class="periodicidade-tag p-${activity.periodicity}">${activity.periodicity}</span>`;

            const item = document.createElement('div');
            item.className = 'activity-item';
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
// EXPORTAR PDF (IDÊNTICO AO MODAL, COM CSS)
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
    currentMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    if (currentMonth === 11) currentYear--;
    renderCalendar(currentYear, currentMonth);
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    if (currentMonth === 0) currentYear++;
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
// INIT
// ==========================================================
async function init() {
    await loadActivities();
    renderCalendar(currentYear, currentMonth);
}

init();
