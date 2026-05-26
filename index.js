// ---------- DATA MODEL ----------

const CATEGORIES = {
    deepWork: { label: "Deep work", class: "deepWork" },
    rest: { label: "Recovery", class: "rest" },
    maintenance: { label: "Maintenance", class: "maintenance" },
    social: { label: "Social & Leisure", class: "social" },
    health: { label: "Growth", class: "health" },
    employment: { label: "Job", class: "employment" },
    empty: { label: "Unlogged", class: "empty" }
};

let currentYear = 2026;
let currentMonth = 4;

let dataStore = new Map();
let activeFilter = null;

// Drag paint system
let isDragging = false;

let paintData = {
    category: 'deepWork',
    activity: ''
};

// 2-hour blocks
const HOUR_BLOCKS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

const HOUR_LABELS = [
    "00–02",
    "02–04",
    "04–06",
    "06–08",
    "08–10",
    "10–12",
    "12–14",
    "14–16",
    "16–18",
    "18–20",
    "20–22",
    "22–00"
];

// Monday-first
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- HELPERS ----------

function getCellKey(dateStr, hourBlock) {
    return `${dateStr}|${hourBlock}`;
}

function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function escapeHtml(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ---------- STORAGE ----------

function loadData() {
    const stored = localStorage.getItem('lifegrid_weekly_correct');

    if (stored) {
        try {
            const parsed = JSON.parse(stored);

            dataStore.clear();

            for (let [k, v] of Object.entries(parsed)) {
                dataStore.set(k, v);
            }

        } catch (e) {
            console.error("Failed to load localStorage:", e);
        }
    }
}

function saveData() {
    const obj = Object.fromEntries(dataStore);

    localStorage.setItem(
        'lifegrid_weekly_correct',
        JSON.stringify(obj)
    );
}

// ---------- CELL DATA ----------

function getCellData(year, month, day, hourBlock) {

    const dateStr = formatDate(year, month, day);

    const key = getCellKey(dateStr, hourBlock);

    if (dataStore.has(key)) {
        return dataStore.get(key);
    }

    return {
        category: 'empty',
        activity: ''
    };
}

async function setCellData(
    year,
    month,
    day,
    hourBlock,
    category,
    activityTag
) {

    const dateStr = formatDate(year, month, day);

    const key = getCellKey(dateStr, hourBlock);

    if (
        category === 'empty' &&
        (!activityTag || activityTag.trim() === '')
    ) {

        dataStore.delete(key);

    } else {

        dataStore.set(key, {
            category,
            activity: activityTag
                ? activityTag.trim()
                : ''
        });
    }

    saveData();
    renderWeeks();
}

// ---------- DRAG PAINT ----------

async function paintCell(day, hourBlock) {

    await setCellData(
        currentYear,
        currentMonth,
        day,
        hourBlock,
        paintData.category,
        paintData.activity
    );
}

// ---------- RESET ----------

function resetMonth() {

    const days = getDaysInMonth(
        currentYear,
        currentMonth
    );

    for (let d = 1; d <= days; d++) {

        const dateStr = formatDate(
            currentYear,
            currentMonth,
            d
        );

        for (let hb of HOUR_BLOCKS) {

            const key = getCellKey(dateStr, hb);

            if (dataStore.has(key)) {
                dataStore.delete(key);
            }
        }
    }

    saveData();
    renderWeeks();
}

// ---------- WEEK GENERATION ----------

function getWeeksForMonth(year, month) {

    const daysInMonth = getDaysInMonth(year, month);

    let daysArray = [];

    for (let day = 1; day <= daysInMonth; day++) {

        const dateObj = new Date(year, month, day);

        let weekday = dateObj.getDay();

        let monFirstWeekday =
            (weekday === 0)
                ? 6
                : weekday - 1;

        daysArray.push({
            day,
            date: formatDate(year, month, day),
            weekday: monFirstWeekday,
            dateObj
        });
    }

    let weeks = [];

    let week = new Array(7).fill(null);

    for (let item of daysArray) {

        week[item.weekday] = item;

        if (item.weekday === 6) {

            weeks.push([...week]);

            week = new Array(7).fill(null);
        }
    }

    if (week.some(w => w !== null)) {
        weeks.push([...week]);
    }

    return weeks;
}

// ---------- LEGEND ----------

function renderLegend() {

    const legendDiv =
        document.getElementById('legendContainer');

    if (!legendDiv) return;

    let html = `
        <div class="legend-item ${activeFilter === null ? 'active-filter' : ''}" data-filter="all">
            <div class="legend-color" style="background:#cddae9; border:1px solid #b8c5d6;"></div>
            <span>All</span>
        </div>
    `;

    for (let [catKey, catInfo] of Object.entries(CATEGORIES)) {

        let colorStyle = '#ebedf0';

        if (catKey === 'deepWork') colorStyle = '#1f77b4';
        else if (catKey === 'rest') colorStyle = '#2ca02c';
        else if (catKey === 'maintenance') colorStyle = '#ff7f0e';
        else if (catKey === 'social') colorStyle = '#d62728';
        else if (catKey === 'health') colorStyle = '#9467bd';
        else if (catKey === 'employment') colorStyle = '#8c564b';

        html += `
            <div class="legend-item ${activeFilter === catKey ? 'active-filter' : ''}" data-filter="${catKey}">
                <div class="legend-color" style="background:${colorStyle}; border:1px solid #ccd7e6;"></div>
                <span>${catInfo.label}</span>
            </div>
        `;
    }

    legendDiv.innerHTML = html;

    document.querySelectorAll('.legend-item').forEach(el => {

        el.addEventListener('click', () => {

            const filterVal =
                el.getAttribute('data-filter');

            activeFilter =
                (filterVal === 'all')
                    ? null
                    : filterVal;

            renderLegend();
            renderWeeks();
        });
    });
}

// ---------- RENDER ----------

function renderWeeks() {

    const container =
        document.getElementById('weeksContainer');

    if (!container) return;

    const weeks =
        getWeeksForMonth(
            currentYear,
            currentMonth
        );

    let totalHtml = '';

    for (let wIdx = 0; wIdx < weeks.length; wIdx++) {

        const week = weeks[wIdx];

        const validDays = week
            .filter(d => d !== null)
            .map(d => d.day);

        const rangeStr =
            validDays.length
                ? `${validDays[0]}–${validDays[validDays.length - 1]}`
                : '';

        totalHtml += `
            <div class="week-card">

                <div class="week-header">
                    <span>📅 Week ${wIdx + 1}</span>
                    <span class="week-range">${rangeStr}</span>
                </div>

                <div class="week-grid">
        `;

        totalHtml += `<div class="corner-cell"></div>`;

        for (let h = 0; h < HOUR_LABELS.length; h++) {

            totalHtml += `
                <div class="time-header">
                    ${HOUR_LABELS[h]}
                </div>
            `;
        }

        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {

            const dayData = week[dayIdx];

            const dayName = DAY_NAMES[dayIdx];

            if (dayData === null) {

                totalHtml += `
                    <div class="day-label" style="background:#f9fafc; opacity:0.6;">
                        ${dayName}
                        <span class="day-date">—</span>
                    </div>
                `;

                for (let h = 0; h < HOUR_BLOCKS.length; h++) {

                    totalHtml += `
                        <div class="cell empty" style="background:#f1f3f6; opacity:0.3;"></div>
                    `;
                }

            } else {

                const actualDay = dayData.day;

                totalHtml += `
                    <div class="day-label">
                        <span class="day-name">${dayName}</span>
                        <span class="day-date">${actualDay}</span>
                    </div>
                `;

                for (let hIdx = 0; hIdx < HOUR_BLOCKS.length; hIdx++) {

                    const hourBlock = HOUR_BLOCKS[hIdx];

                    const cellInfo = getCellData(
                        currentYear,
                        currentMonth,
                        actualDay,
                        hourBlock
                    );

                    let category = cellInfo.category;

                    let activity = cellInfo.activity;

                    let shouldShow = true;

                    if (activeFilter !== null) {

                        if (
                            activeFilter === 'empty' &&
                            category !== 'empty'
                        ) {
                            shouldShow = false;
                        }

                        else if (
                            activeFilter !== 'empty' &&
                            category !== activeFilter
                        ) {
                            shouldShow = false;
                        }
                    }

                    if (!shouldShow) {

                        totalHtml += `
                            <div class="cell empty" style="opacity:0.25; background:#eef1f5;">
                                —
                            </div>
                        `;

                        continue;
                    }

                    let categoryClass =
                        CATEGORIES[category]?.class || 'empty';

                    let tooltip =
                        `${CATEGORIES[category]?.label || 'Unlogged'}`;

                    if (activity) {
                        tooltip += ` · ${activity}`;
                    }

                    tooltip += ` (${HOUR_LABELS[hIdx]})`;

                    tooltip = escapeHtml(tooltip);

                    let displayText = activity
                        ? activity.length > 12
                            ? activity.slice(0, 10) + '..'
                            : activity
                        : '';

                    displayText = escapeHtml(displayText);

                    totalHtml += `
                        <div
                            class="cell ${categoryClass}"
                            data-day="${actualDay}"
                            data-hour="${hourBlock}"
                            data-tooltip="${tooltip}"
                        >
                            ${displayText}
                        </div>
                    `;
                }
            }
        }

        totalHtml += `
                </div>
            </div>
        `;
    }

    container.innerHTML = totalHtml;

    // ---------- CELL EVENTS ----------

    document.querySelectorAll('.cell[data-day]').forEach(cell => {

        const dayAttr =
            cell.getAttribute('data-day');

        const hourAttr =
            cell.getAttribute('data-hour');

        if (dayAttr && hourAttr) {

            const day = parseInt(dayAttr);

            const hour = parseInt(hourAttr);

            // Normal click opens modal
            cell.addEventListener('click', (e) => {

                if (e.shiftKey) return;

                openModal(day, hour);

                e.stopPropagation();
            });

            // SHIFT + mouse down starts drag paint
            cell.addEventListener('mousedown', async (e) => {

                if (!e.shiftKey) return;

                isDragging = true;

                await paintCell(day, hour);

                e.preventDefault();
            });

            // Drag over paints
            cell.addEventListener('mouseenter', async () => {

                if (!isDragging) return;

                await paintCell(day, hour);
            });
        }
    });

    updateStats();
}

// ---------- MODAL ----------

let modalDay = null;
let modalHour = null;

function openModal(day, hourBlock) {

    const cellData = getCellData(
        currentYear,
        currentMonth,
        day,
        hourBlock
    );

    const modal =
        document.getElementById('cellModal');

    const catSelect =
        document.getElementById('modalCategory');

    const activityInput =
        document.getElementById('modalActivity');

    if (!modal) return;

    modalDay = day;
    modalHour = hourBlock;

    catSelect.value = cellData.category;

    activityInput.value =
        cellData.activity || '';

    modal.style.display = 'flex';
}

function closeModal() {

    const modal =
        document.getElementById('cellModal');

    if (modal) {
        modal.style.display = 'none';
    }

    modalDay = null;
    modalHour = null;
}

function saveModal() {

    if (
        modalDay !== null &&
        modalHour !== null
    ) {

        const category =
            document.getElementById('modalCategory').value;

        const activity =
            document.getElementById('modalActivity').value;

        setCellData(
            currentYear,
            currentMonth,
            modalDay,
            modalHour,
            category,
            activity
        );

        // Update drag brush
        paintData = {
            category,
            activity
        };
    }

    closeModal();
}

// ---------- STATS ----------

function updateStats() {

    const daysInMonth =
        getDaysInMonth(
            currentYear,
            currentMonth
        );

    let counts = {
        deepWork: 0,
        rest: 0,
        maintenance: 0,
        social: 0,
        health: 0,
        employment: 0,
        empty: 0
    };

    for (let day = 1; day <= daysInMonth; day++) {

        for (let hb of HOUR_BLOCKS) {

            const cell = getCellData(
                currentYear,
                currentMonth,
                day,
                hb
            );

            counts[cell.category] =
                (counts[cell.category] || 0) + 1;
        }
    }

    const total =
        daysInMonth * HOUR_BLOCKS.length;

    const logged =
        total - counts.empty;

    const summaryDiv =
        document.getElementById('statsSummary');

    if (summaryDiv) {

        summaryDiv.innerHTML = `
            <div class="summary-chip">📊 Tracked: ${logged}/${total} blocks</div>
            <div class="summary-chip">💼 Work: ${counts.deepWork}</div>
            <div class="summary-chip">😴 Rest: ${counts.rest}</div>
            <div class="summary-chip">📋 Maintenance: ${counts.maintenance}</div>
            <div class="summary-chip">🎉 Social: ${counts.social}</div>
            <div class="summary-chip">🧘 Health: ${counts.health}</div>
            <div class="summary-chip">💼 Job: ${counts.employment}</div>
        `;
    }
}

// ---------- MONTH NAVIGATION ----------

function updateMonthDisplay() {

    const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ];

    document.getElementById('monthDisplay').innerText =
        `${monthNames[currentMonth]} ${currentYear}`;
}

function goPrevMonth() {

    if (currentMonth === 0) {

        currentMonth = 11;
        currentYear--;

    } else {

        currentMonth--;
    }

    updateMonthDisplay();

    renderWeeks();
}

function goNextMonth() {

    if (currentMonth === 11) {

        currentMonth = 0;
        currentYear++;

    } else {

        currentMonth++;
    }

    updateMonthDisplay();

    renderWeeks();
}

// ---------- INIT ----------

function init() {

    currentYear = 2026;
    currentMonth = 4;

    loadData();

    updateMonthDisplay();

    renderLegend();

    renderWeeks();

    document
        .getElementById('prevMonthBtn')
        .addEventListener('click', goPrevMonth);

    document
        .getElementById('nextMonthBtn')
        .addEventListener('click', goNextMonth);

    document
        .getElementById('resetMonthBtn')
        .addEventListener('click', () => {

            const monthName = new Date(
                currentYear,
                currentMonth
            ).toLocaleString('default', {
                month: 'long',
                year: 'numeric'
            });

            if (
                confirm(`Reset all data for ${monthName}?`)
            ) {
                resetMonth();
            }
        });

    document
        .getElementById('saveCellBtn')
        .addEventListener('click', saveModal);

    document
        .getElementById('closeModalBtn')
        .addEventListener('click', closeModal);

    // Close modal outside click
    window.addEventListener('click', (e) => {

        const modal =
            document.getElementById('cellModal');

        if (e.target === modal) {
            closeModal();
        }
    });

    // Stop dragging when mouse released
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// ---------- START ----------

init();

// ---------- DARK MODE ----------

const darkModeToggle =
    document.getElementById('darkModeToggle');

if (darkModeToggle) {

    if (
        localStorage.getItem('lifegrid_darkmode') === 'enabled'
    ) {

        document.body.classList.add('dark');

        darkModeToggle.textContent = '☀️ Light';
    }

    darkModeToggle.addEventListener('click', () => {

        document.body.classList.toggle('dark');

        const isDark =
            document.body.classList.contains('dark');

        darkModeToggle.textContent =
            isDark
                ? '☀️ Light'
                : '🌙 Dark';

        localStorage.setItem(
            'lifegrid_darkmode',
            isDark
                ? 'enabled'
                : 'disabled'
        );
    });
}
// Brush selector
const brushCategory = document.getElementById('brushCategory');
const brushActivity = document.getElementById('brushActivity');

function updateBrush() {
    paintData = {
        category: brushCategory.value,
        activity: brushActivity.value || ''
    };
}

brushCategory?.addEventListener('change', updateBrush);
brushActivity?.addEventListener('input', updateBrush);

// Show Shift key hint
document.addEventListener('keydown', (e) => {
    if (e.shiftKey) {
        document.body.classList.add('drag-paint-mode');
        const statusEl = document.getElementById('syncStatus');
        if (statusEl && statusEl.textContent !== '🎨 Drag painting') {
            statusEl.dataset.originalText = statusEl.textContent;
            statusEl.textContent = '🎨 Hold Shift + drag to paint';
            statusEl.style.color = '#ff7f0e';
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (!e.shiftKey) {
        document.body.classList.remove('drag-paint-mode');
        const statusEl = document.getElementById('syncStatus');
        if (statusEl && statusEl.dataset.originalText) {
            statusEl.textContent = statusEl.dataset.originalText;
            statusEl.style.color = '';
            delete statusEl.dataset.originalText;
        }
        isDragging = false;
    }
});