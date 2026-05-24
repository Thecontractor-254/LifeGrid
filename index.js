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
    let currentMonth = 4; // May (0-index)
    let dataStore = new Map();
    let activeFilter = null;

    // 2-hour blocks (start hour)
    const HOUR_BLOCKS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    const HOUR_LABELS = ["00–02", "02–04", "04–06", "06–08", "08–10", "10–12", "12–14", "14–16", "16–18", "18–20", "20–22", "22–00"];

    // Days of week (Monday first)
    const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    function getCellKey(dateStr, hourBlock) {
        return `${dateStr}|${hourBlock}`;
    }

    function formatDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // Storage
    function loadData() {
        const stored = localStorage.getItem('lifegrid_weekly_correct');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                dataStore.clear();
                for (let [k, v] of Object.entries(parsed)) dataStore.set(k, v);
            } catch(e) {}
        }
    }
    function saveData() {
        const obj = Object.fromEntries(dataStore);
        localStorage.setItem('lifegrid_weekly_correct', JSON.stringify(obj));
    }

    function getCellData(year, month, day, hourBlock) {
        const dateStr = formatDate(year, month, day);
        const key = getCellKey(dateStr, hourBlock);
        if (dataStore.has(key)) return dataStore.get(key);
        return { category: 'empty', activity: '' };
    }

    function setCellData(year, month, day, hourBlock, category, activityTag) {
        const dateStr = formatDate(year, month, day);
        const key = getCellKey(dateStr, hourBlock);
        if (category === 'empty' && (!activityTag || activityTag.trim() === '')) {
            dataStore.delete(key);
        } else {
            dataStore.set(key, { category: category, activity: activityTag ? activityTag.trim() : '' });
        }
        saveData();
        renderWeeks();
    }

    function resetMonth() {
        const days = getDaysInMonth(currentYear, currentMonth);
        for (let d = 1; d <= days; d++) {
            const dateStr = formatDate(currentYear, currentMonth, d);
            for (let hb of HOUR_BLOCKS) {
                const key = getCellKey(dateStr, hb);
                if (dataStore.has(key)) dataStore.delete(key);
            }
        }
        saveData();
        renderWeeks();
    }

    // Get weeks: each week is array of 7 objects { day, date, monthOffset? }
    // We only include days from current month (no prev/next month ghost days)
    // but weeks may have fewer than 7 days at start/end of month
    function getWeeksForMonth(year, month) {
        const firstDayOfMonth = new Date(year, month, 1);
        let startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday
        // Convert to Monday-first: 0=Mon, 6=Sun
        let startMondayIndex = (startWeekday === 0) ? 6 : startWeekday - 1;
        
        const daysInMonth = getDaysInMonth(year, month);
        let weeks = [];
        let currentWeek = [];
        
        // Fill first week with empty slots until first Monday? Actually we want Mon-Sun as columns.
        // For partial weeks, we still show only the days that exist in this month.
        // We'll just build days in order and chunk every 7 days, but aligning to Mon-Sun.
        // Simpler: Get all days of month, group into weeks starting Monday.
        let daysArray = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            let weekday = dateObj.getDay();
            let monFirstWeekday = (weekday === 0) ? 6 : weekday - 1; // 0=Mon..6=Sun
            daysArray.push({ day, date: formatDate(year, month, day), weekday: monFirstWeekday, dateObj });
        }
        
        // Group by week (Monday start)
        let week = new Array(7).fill(null);
        for (let item of daysArray) {
            if (week[item.weekday] !== undefined) {
                week[item.weekday] = item;
            }
            if (item.weekday === 6) { // Sunday, push week
                weeks.push([...week]);
                week = new Array(7).fill(null);
            }
        }
        // push last week if not empty
        if (week.some(w => w !== null)) weeks.push([...week]);
        return weeks;
    }

    function renderLegend() {
        const legendDiv = document.getElementById('legendContainer');
        if (!legendDiv) return;
        let html = `<div class="legend-item ${activeFilter === null ? 'active-filter' : ''}" data-filter="all">
                        <div class="legend-color" style="background:#cddae9; border:1px solid #b8c5d6;"></div>
                        <span>All</span>
                    </div>`;
        for (let [catKey, catInfo] of Object.entries(CATEGORIES)) {
            let colorStyle = '';
            if (catKey === 'deepWork') colorStyle = '#1f77b4';
            else if (catKey === 'rest') colorStyle = '#2ca02c';
            else if (catKey === 'maintenance') colorStyle = '#ff7f0e';
            else if (catKey === 'social') colorStyle = '#d62728';
            else if (catKey === 'health') colorStyle = '#9467bd';
            else if (catKey === 'employment') colorStyle = '#8c564b';
            else colorStyle = '#ebedf0';
            html += `<div class="legend-item ${activeFilter === catKey ? 'active-filter' : ''}" data-filter="${catKey}">
                        <div class="legend-color" style="background:${colorStyle}; border:1px solid #ccd7e6;"></div>
                        <span>${catInfo.label}</span>
                    </div>`;
        }
        legendDiv.innerHTML = html;
        document.querySelectorAll('.legend-item').forEach(el => {
            el.addEventListener('click', () => {
                const filterVal = el.getAttribute('data-filter');
                activeFilter = (filterVal === 'all') ? null : filterVal;
                renderLegend();
                renderWeeks();
            });
        });
    }

    function renderWeeks() {
        const container = document.getElementById('weeksContainer');
        if (!container) return;

        const weeks = getWeeksForMonth(currentYear, currentMonth);
        let totalHtml = '';

        for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
            const week = weeks[wIdx]; // array of 7 (null or {day, date, ...})
            
            // Compute week range text
            const validDays = week.filter(d => d !== null).map(d => d.day);
            const rangeStr = validDays.length ? `${validDays[0]}–${validDays[validDays.length-1]}` : '';
            
            totalHtml += `<div class="week-card">
                            <div class="week-header">
                                <span>📅 Week ${wIdx + 1}</span>
                                <span class="week-range">${rangeStr}</span>
                            </div>
                            <div class="week-grid">`;
            
            // Top row: empty corner + time headers (12 columns)
            totalHtml += `<div class="corner-cell"></div>`;
            for (let h = 0; h < HOUR_LABELS.length; h++) {
                totalHtml += `<div class="time-header">${HOUR_LABELS[h]}</div>`;
            }
            
            // For each day of week (Mon to Sun)
            for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                const dayData = week[dayIdx];
                const dayName = DAY_NAMES[dayIdx];
                
                if (dayData === null) {
                    // empty column (day not in this month)
                    totalHtml += `<div class="day-label" style="background:#f9fafc; opacity:0.6;">${dayName}<span class="day-date">—</span></div>`;
                    for (let h = 0; h < HOUR_BLOCKS.length; h++) {
                        totalHtml += `<div class="cell empty" style="background:#f1f3f6; opacity:0.3;"></div>`;
                    }
                } else {
                    const actualDay = dayData.day;
                    const dateStr = dayData.date;
                    
                    totalHtml += `<div class="day-label">
                                    <span class="day-name">${dayName}</span>
                                    <span class="day-date">${actualDay}</span>
                                  </div>`;
                    
                    // Render 12 time cells for this day
                    for (let hIdx = 0; hIdx < HOUR_BLOCKS.length; hIdx++) {
                        const hourBlock = HOUR_BLOCKS[hIdx];
                        const cellInfo = getCellData(currentYear, currentMonth, actualDay, hourBlock);
                        let category = cellInfo.category;
                        let activity = cellInfo.activity;
                        
                        let shouldShow = true;
                        if (activeFilter !== null) {
                            if (activeFilter === 'empty' && category !== 'empty') shouldShow = false;
                            else if (activeFilter !== 'empty' && category !== activeFilter) shouldShow = false;
                        }
                        
                        if (!shouldShow) {
                            totalHtml += `<div class="cell empty" style="opacity:0.25; background:#eef1f5;">—</div>`;
                            continue;
                        }
                        
                        let categoryClass = CATEGORIES[category]?.class || 'empty';
                        let tooltip = `${CATEGORIES[category]?.label || 'Unlogged'}`;
                        if (activity) tooltip += ` · ${activity}`;
                        tooltip += ` (${HOUR_LABELS[hIdx]})`;
                        let displayText = activity ? (activity.length > 12 ? activity.slice(0,10)+'..' : activity) : '';
                        if (!displayText && category !== 'empty') displayText = '';
                        totalHtml += `<div class="cell ${categoryClass}" data-day="${actualDay}" data-hour="${hourBlock}" data-tooltip="${tooltip.replace(/"/g, '&quot;')}">${displayText}</div>`;
                    }
                }
            }
            totalHtml += `</div></div>`;
        }
        
        container.innerHTML = totalHtml;
        
        // attach click handlers
        document.querySelectorAll('.cell[data-day]').forEach(cell => {
            const dayAttr = cell.getAttribute('data-day');
            const hourAttr = cell.getAttribute('data-hour');
            if (dayAttr && hourAttr) {
                cell.addEventListener('click', (e) => {
                    const day = parseInt(dayAttr);
                    const hour = parseInt(hourAttr);
                    openModal(day, hour);
                    e.stopPropagation();
                });
            }
        });
        
        updateStats();
    }

    let modalDay = null, modalHour = null;
    function openModal(day, hourBlock) {
        const cellData = getCellData(currentYear, currentMonth, day, hourBlock);
        const modal = document.getElementById('cellModal');
        const catSelect = document.getElementById('modalCategory');
        const activityInput = document.getElementById('modalActivity');
        if (!modal) return;
        modalDay = day;
        modalHour = hourBlock;
        catSelect.value = cellData.category;
        activityInput.value = cellData.activity || '';
        modal.style.display = 'flex';
    }
    
    function closeModal() {
        document.getElementById('cellModal').style.display = 'none';
        modalDay = null;
        modalHour = null;
    }
    
    function saveModal() {
        if (modalDay !== null && modalHour !== null) {
            const category = document.getElementById('modalCategory').value;
            const activity = document.getElementById('modalActivity').value;
            setCellData(currentYear, currentMonth, modalDay, modalHour, category, activity);
        }
        closeModal();
    }
    
    function updateStats() {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        let counts = { deepWork: 0, rest: 0, maintenance: 0, social: 0, health: 0, empty: 0 };
        for (let day = 1; day <= daysInMonth; day++) {
            for (let hb of HOUR_BLOCKS) {
                const cell = getCellData(currentYear, currentMonth, day, hb);
                counts[cell.category] = (counts[cell.category] || 0) + 1;
            }
        }
        const total = daysInMonth * HOUR_BLOCKS.length;
        const logged = total - counts.empty;
        const summaryDiv = document.getElementById('statsSummary');
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="summary-chip">📊 Tracked: ${logged}/${total} blocks</div>
                <div class="summary-chip">💼 Work: ${counts.deepWork}</div>
                <div class="summary-chip">😴 Rest: ${counts.rest}</div>
                <div class="summary-chip">📋 Admin: ${counts.maintenance}</div>
                <div class="summary-chip">🎉 Social: ${counts.social}</div>
                <div class="summary-chip">🧘 Health: ${counts.health}</div>
                <div class="summary-chip">💼 Job: ${counts.employment}</div>
            `;
        }
    }
    
    function updateMonthDisplay() {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        document.getElementById('monthDisplay').innerText = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    function goPrevMonth() {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
        } else currentMonth--;
        updateMonthDisplay();
        renderWeeks();
    }
    
    function goNextMonth() {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
        } else currentMonth++;
        updateMonthDisplay();
        renderWeeks();
    }
    
    function init() {
        currentYear = 2026;
        currentMonth = 4; // May
        loadData();
        updateMonthDisplay();
        renderLegend();
        renderWeeks();
        document.getElementById('prevMonthBtn').addEventListener('click', goPrevMonth);
        document.getElementById('nextMonthBtn').addEventListener('click', goNextMonth);
        document.getElementById('resetMonthBtn').addEventListener('click', () => {
            if (confirm(`Reset all data for ${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}?`))
                resetMonth();
        });
        document.getElementById('saveCellBtn').addEventListener('click', saveModal);
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('cellModal');
            if (e.target === modal) closeModal();
        });
    }
    
    init();

    // Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    // Check localStorage for saved preference
    if (localStorage.getItem('lifegrid_darkmode') === 'enabled') {
        document.body.classList.add('dark');
        darkModeToggle.textContent = '☀️ Light';
    }
    
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        darkModeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
        localStorage.setItem('lifegrid_darkmode', isDark ? 'enabled' : 'disabled');
    });
}