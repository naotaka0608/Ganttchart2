let appMode = 'read-write';
let currentScale = 'day';
let pxPerDay = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
let resetBaselineOnSave = false;

let tasks = [];
let startDate = new Date();
startDate.setDate(startDate.getDate() - 14);
let endDate = new Date();
endDate.setDate(endDate.getDate() + 45);

let collapsedTasks = new Set();
let isFirstLoad = true;

const elements = {
    taskListBody: document.getElementById('task-list-body'),
    timelineHeader: document.getElementById('timeline-header'),
    timelineBody: document.getElementById('timeline-body'),
    timelinePanel: document.getElementById('timeline-panel'),
    taskListPanel: document.querySelector('.task-list-panel'),
    modal: document.getElementById('task-modal'),
    form: document.getElementById('task-form'),
    btnAddTask: document.getElementById('btn-add-task'),
    btnCancel: document.getElementById('btn-cancel'),
    btnDelete: document.getElementById('btn-delete'),
    modalTitle: document.getElementById('modal-title'),
    btnExportList: document.getElementById('btn-export-list'),
    btnExportGantt: document.getElementById('btn-export-gantt'),
    btnToday: document.getElementById('btn-today'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    zoomPercentage: document.getElementById('zoom-percentage'),
    scaleBtns: document.querySelectorAll('.scale-btn'),
    pageTabs: document.getElementById('page-tabs'),
    btnAddPage: document.getElementById('btn-add-page'),
    pageModal: document.getElementById('page-modal'),
    pageNameInput: document.getElementById('page-name-input'),
    btnPageSave: document.getElementById('btn-page-save'),
    btnPageCancel: document.getElementById('btn-page-cancel'),
    totalManHours: document.getElementById('total-man-hours'),
    btnSettings: document.getElementById('btn-settings'),
    settingsModal: document.getElementById('settings-modal'),
    btnSettingsClose: document.getElementById('btn-settings-close'),
    settingShowDiff: document.getElementById('setting-show-diff'),
    settingShowPattern: document.getElementById('setting-show-pattern'),
    settingBarThickness: document.getElementById('setting-bar-thickness')
};

let pages = [];
let currentPageId = 1;

function updateDiffState(bar) {
    if (!bar.style.getPropertyValue('--planned-left')) return;
    
    const actualLeft = parseFloat(bar.style.left) || 0;
    const actualWidth = parseFloat(bar.style.width) || 0;
    const actualRight = actualLeft + actualWidth;
    
    bar.style.setProperty('--actual-left', `${actualLeft}px`);
    bar.style.setProperty('--actual-right', `${actualRight}px`);
    
    const plannedLeft = parseFloat(bar.style.getPropertyValue('--planned-left'));
    const plannedRight = parseFloat(bar.style.getPropertyValue('--planned-right'));
    
    const epsilon = 0.1; // Threshold to handle floating point precision
    
    if (actualLeft < plannedLeft - epsilon) {
        bar.classList.add('is-extended-left');
        bar.classList.remove('is-shortened-left');
    } else if (actualLeft > plannedLeft + epsilon) {
        bar.classList.add('is-shortened-left');
        bar.classList.remove('is-extended-left');
    } else {
        bar.classList.remove('is-extended-left', 'is-shortened-left');
    }
    
    if (actualRight > plannedRight + epsilon) {
        bar.classList.add('is-extended-right');
        bar.classList.remove('is-shortened-right');
    } else if (actualRight < plannedRight - epsilon) {
        bar.classList.add('is-shortened-right');
        bar.classList.remove('is-extended-right');
    } else {
        bar.classList.remove('is-extended-right', 'is-shortened-right');
    }
}

// Sync vertical scrolling
elements.timelinePanel.addEventListener('scroll', () => {
    elements.taskListBody.scrollTop = elements.timelinePanel.scrollTop;
});
elements.taskListBody.addEventListener('scroll', () => {
    elements.timelinePanel.scrollTop = elements.taskListBody.scrollTop;
});

// Panning with Wheel Click (Middle Click)
let isPanning = false;
let startPanX = 0;
let startScrollLeft = 0;

elements.timelinePanel.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // 1 is middle button (wheel click)
        e.preventDefault();
        isPanning = true;
        startPanX = e.clientX;
        startScrollLeft = elements.timelinePanel.scrollLeft;
        document.body.style.cursor = 'grabbing';
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.clientX - startPanX;
    elements.timelinePanel.scrollLeft = startScrollLeft - dx;
});

document.addEventListener('mouseup', (e) => {
    if (isPanning && e.button === 1) {
        isPanning = false;
        document.body.style.cursor = 'default';
    }
});

elements.timelinePanel.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});


// Zoom with Wheel
elements.timelinePanel.addEventListener('wheel', (e) => {
    e.preventDefault();
        
        const mouseX = e.clientX - elements.timelinePanel.getBoundingClientRect().left;
        const scrollLeft = elements.timelinePanel.scrollLeft;
        const centerDay = (scrollLeft + mouseX) / pxPerDay;
        
        const zoomFactor = e.deltaY > 0 ? 0.8 : 1.25; // down = zoom out, up = zoom in
        let newPxPerDay = pxPerDay * zoomFactor;
        
        if (newPxPerDay < 1) newPxPerDay = 1;
        if (newPxPerDay > 120) newPxPerDay = 120;
        
        pxPerDay = newPxPerDay;
        
        if (pxPerDay > 20) {
            currentScale = 'day';
        } else if (pxPerDay > 5) {
            currentScale = 'week';
        } else {
            currentScale = 'month';
        }
        
        elements.scaleBtns.forEach(b => b.classList.toggle('active', b.dataset.scale === currentScale));
        
        render();
        updateZoomPercentage();
        
        elements.timelinePanel.scrollLeft = centerDay * pxPerDay - mouseX;
}, { passive: false });

// Scale switching
elements.scaleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const scale = e.target.dataset.scale;
        setScale(scale);
        if (scale === 'day') {
            setTimeout(scrollToToday, 50);
        }
    });
});

// Color palette
const colorSwatches = document.querySelectorAll('.color-swatch');
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        document.getElementById('task-color').value = swatch.dataset.color;
    });
});

function setScale(scale) {
    currentScale = scale;
    if (scale === 'day') pxPerDay = 40;
    else if (scale === 'week') pxPerDay = 10;
    else if (scale === 'month') pxPerDay = 3;
    
    elements.scaleBtns.forEach(b => b.classList.toggle('active', b.dataset.scale === scale));
    render();
    updateZoomPercentage();
}

function updateZoomPercentage() {
    if (!elements.zoomPercentage) return;
    const percent = Math.round((pxPerDay / 40) * 100);
    elements.zoomPercentage.textContent = `${percent}%`;
}

function scrollToToday() {
    const today = new Date();
    today.setHours(0,0,0,0);
    if (today >= startDate && today <= endDate) {
        const daysFromStart = (today - startDate) / DAY_MS;
        elements.timelinePanel.scrollLeft = Math.max(0, (daysFromStart - 2) * pxPerDay);
    }
}

// Today button
elements.btnToday.addEventListener('click', () => {
    scrollToToday();
});

// Reset Zoom button
elements.btnZoomReset.addEventListener('click', () => {
    setScale('day');
    setTimeout(scrollToToday, 50);
});

document.getElementById('btn-reset-baseline').addEventListener('click', () => {
    resetBaselineOnSave = true;
    const btn = document.getElementById('btn-reset-baseline');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-check"></i> リセット予約済`;
    btn.style.backgroundColor = 'var(--success)';
    btn.style.color = 'white';
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '';
        btn.style.color = '';
    }, 2000);
});

// Settings Modal logic
elements.btnSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('active');
});

elements.btnSettingsClose.addEventListener('click', () => {
    elements.settingsModal.classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
        elements.settingsModal.classList.remove('active');
    }
});

elements.settingShowDiff.addEventListener('change', async (e) => {
    document.body.classList.toggle('hide-diff', !e.target.checked);
    await saveSetting('setting-show-diff', e.target.checked.toString());
});

elements.settingShowPattern.addEventListener('change', async (e) => {
    document.body.classList.toggle('hide-pattern', !e.target.checked);
    await saveSetting('setting-show-pattern', e.target.checked.toString());
});

elements.settingBarThickness.addEventListener('input', async (e) => {
    setBarThickness(e.target.value);
    await saveSetting('setting-bar-thickness', e.target.value);
});

async function saveSetting(key, value) {
    if (appMode === 'read-only') return;
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key, value })
        });
    } catch (e) {
        console.error('Error saving setting', e);
    }
}

function setBarThickness(level) {
    let barH, barT, diffH, diffT;
    
    if (level == "1") { // Thin (16px)
        barH = 16; barT = 12;
        diffH = 24; diffT = -4; 
    } else if (level == "3") { // Thick (34px)
        barH = 34; barT = 3;
        diffH = 38; diffT = -2; 
    } else { // Normal (2) (28px)
        barH = 28; barT = 6;
        diffH = 36; diffT = -4; 
    }
    
    document.documentElement.style.setProperty('--bar-height', `${barH}px`);
    document.documentElement.style.setProperty('--bar-top', `${barT}px`);
    document.documentElement.style.setProperty('--diff-height', `${diffH}px`);
    document.documentElement.style.setProperty('--diff-top', `${diffT}px`);
    document.documentElement.style.setProperty('--baseline-height', `${diffH}px`);
    document.documentElement.style.setProperty('--baseline-top', `${barT + diffT}px`);
}

// Load settings
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        
        const showDiff = settings['setting-show-diff'] !== 'false';
        const showPattern = settings['setting-show-pattern'] !== 'false';
        const thickness = settings['setting-bar-thickness'] || "2";
        
        elements.settingShowDiff.checked = showDiff;
        elements.settingShowPattern.checked = showPattern;
        elements.settingBarThickness.value = thickness;
        
        document.body.classList.toggle('hide-diff', !showDiff);
        document.body.classList.toggle('hide-pattern', !showPattern);
        setBarThickness(thickness);
    } catch (e) {
        console.error('Error loading settings', e);
    }
}

loadSettings();

async function fetchTasks() {
    try {
        const res = await fetch(`/api/tasks?page_id=${currentPageId}`);
        tasks = await res.json();
        updateDateRange();
        updateParentSelect();
        updateSummary();
        render();
        if (isFirstLoad) {
            setTimeout(scrollToToday, 50);
            isFirstLoad = false;
        }
    } catch (e) {
        console.error('Error fetching tasks', e);
    }
}

function updateDateRange() {
    if (tasks.length === 0) return;
    
    let minDate = new Date(tasks[0].start_date);
    let maxDate = new Date(tasks[0].end_date);
    
    tasks.forEach(t => {
        const sd = new Date(t.start_date);
        const ed = new Date(t.end_date);
        if (sd < minDate) minDate = sd;
        if (ed > maxDate) maxDate = ed;
    });
    
    startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 14);
    endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 45);
}

function updateSummary() {
    if (!elements.totalManHours) return;
    const total = tasks.reduce((sum, t) => sum + (t.man_hours || 0), 0);
    elements.totalManHours.textContent = total.toFixed(1);
}

function render() {
    renderTimelineHeader();
    renderTasks();
}

function renderTimelineHeader() {
    elements.timelineHeader.innerHTML = '';
    let curr = new Date(startDate);
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    
    if (currentScale === 'day') {
        while (curr <= endDate) {
            const el = document.createElement('div');
            el.className = 'timeline-cell-header';
            const dayOfWeek = curr.getDay();
            if (dayOfWeek === 0) el.classList.add('sunday');
            if (dayOfWeek === 6) el.classList.add('saturday');
            
            if (curr.getFullYear() === todayDate.getFullYear() && 
                curr.getMonth() === todayDate.getMonth() && 
                curr.getDate() === todayDate.getDate()) {
                el.classList.add('today');
            }
            
            el.textContent = `${curr.getMonth() + 1}/${curr.getDate()}`;
            el.style.minWidth = `${pxPerDay}px`;
            elements.timelineHeader.appendChild(el);
            curr.setDate(curr.getDate() + 1);
        }
        
        const days = Math.round((endDate - startDate) / DAY_MS) + 1;
        elements.timelineBody.style.width = `${days * pxPerDay}px`;
        elements.timelineBody.style.backgroundSize = `${pxPerDay}px var(--cell-height)`;
    } else if (currentScale === 'week') {
        let tempDate = new Date(startDate);
        while (tempDate <= endDate) {
            const el = document.createElement('div');
            el.className = 'timeline-cell-header';
            el.textContent = `${tempDate.getMonth() + 1}/${tempDate.getDate()}~`;
            el.style.minWidth = `${pxPerDay * 7}px`;
            elements.timelineHeader.appendChild(el);
            tempDate.setDate(tempDate.getDate() + 7);
        }
        const days = Math.round((endDate - startDate) / DAY_MS) + 1;
        elements.timelineBody.style.width = `${days * pxPerDay}px`;
        elements.timelineBody.style.backgroundSize = `${pxPerDay * 7}px var(--cell-height)`;
    } else if (currentScale === 'month') {
        let tempDate = new Date(startDate);
        tempDate.setDate(1);
        while (tempDate <= endDate) {
            const el = document.createElement('div');
            el.className = 'timeline-cell-header';
            el.textContent = `${tempDate.getFullYear()}/${tempDate.getMonth() + 1}`;
            const daysInMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
            el.style.minWidth = `${pxPerDay * daysInMonth}px`;
            elements.timelineHeader.appendChild(el);
            tempDate.setMonth(tempDate.getMonth() + 1);
        }
        const days = Math.round((endDate - startDate) / DAY_MS) + 1;
        elements.timelineBody.style.width = `${days * pxPerDay}px`;
        elements.timelineBody.style.backgroundSize = `${pxPerDay * 30}px var(--cell-height)`;
    }
}

function updateParentSelect() {
    const select = document.getElementById('task-parent-id');
    const currentVal = select.value;
    select.innerHTML = '<option value="">なし（メインタスク）</option>';
    tasks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.id}: ${t.name}`;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

function buildTree(tasks) {
    const taskMap = {};
    const roots = [];
    tasks.forEach(t => {
        t.children = [];
        taskMap[t.id] = t;
    });
    tasks.forEach(t => {
        if (t.parent_id && taskMap[t.parent_id] && t.parent_id !== t.id) {
            taskMap[t.parent_id].children.push(t);
        } else {
            roots.push(t);
        }
    });
    return roots;
}

function calculateParentTasks(roots) {
    function processTask(task) {
        if (task.children && task.children.length > 0) {
            task.children.forEach(processTask);
            
            let minStart = null;
            let maxEnd = null;
            let totalManHours = 0;
            let totalProgressWeight = 0;
            let totalProgressWeightDenominator = 0;
            
            task.children.forEach(child => {
                if (child.start_date) {
                    const cStart = new Date(child.start_date);
                    if (!minStart || cStart < minStart) minStart = cStart;
                }
                if (child.end_date) {
                    const cEnd = new Date(child.end_date);
                    if (!maxEnd || cEnd > maxEnd) maxEnd = cEnd;
                }
                
                const cManHours = child.man_hours || 0;
                totalManHours += cManHours;
                
                if (cManHours > 0) {
                    totalProgressWeight += (child.progress || 0) * cManHours;
                    totalProgressWeightDenominator += cManHours;
                } else {
                    totalProgressWeight += (child.progress || 0);
                    totalProgressWeightDenominator += 1;
                }
            });
            
            if (minStart) task.start_date = minStart.toISOString().split('T')[0];
            if (maxEnd) task.end_date = maxEnd.toISOString().split('T')[0];
            task.man_hours = totalManHours;
            task.progress = totalProgressWeightDenominator > 0 
                ? Math.round(totalProgressWeight / totalProgressWeightDenominator) 
                : 0;
        }
    }
    roots.forEach(processTask);
}

function getAllDescendants(task) {
    let descendants = [];
    if (task.children) {
        task.children.forEach(child => {
            descendants.push(child);
            descendants = descendants.concat(getAllDescendants(child));
        });
    }
    return descendants;
}

async function updateParentChain(task) {
    if (!task.parent_id) return;
    const parentTask = tasks.find(t => t.id === task.parent_id);
    if (!parentTask) return;
    
    const children = tasks.filter(t => t.parent_id === parentTask.id);
    let minStart = null;
    let maxEnd = null;
    let totalManHours = 0;
    let totalProgressWeight = 0;
    let totalProgressWeightDenominator = 0;
    
    children.forEach(child => {
        if (child.start_date) {
            const cStart = new Date(child.start_date);
            if (!minStart || cStart < minStart) minStart = cStart;
        }
        if (child.end_date) {
            const cEnd = new Date(child.end_date);
            if (!maxEnd || cEnd > maxEnd) maxEnd = cEnd;
        }
        const cManHours = child.man_hours || 0;
        totalManHours += cManHours;
        
        if (cManHours > 0) {
            totalProgressWeight += (child.progress || 0) * cManHours;
            totalProgressWeightDenominator += cManHours;
        } else {
            totalProgressWeight += (child.progress || 0);
            totalProgressWeightDenominator += 1;
        }
    });
    
    if (minStart) parentTask.start_date = minStart.toISOString().split('T')[0];
    if (maxEnd) parentTask.end_date = maxEnd.toISOString().split('T')[0];
    parentTask.man_hours = totalManHours;
    parentTask.progress = totalProgressWeightDenominator > 0 ? Math.round(totalProgressWeight / totalProgressWeightDenominator) : 0;
    
    await fetch(`/api/tasks/${parentTask.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(parentTask)
    });
    
    await updateParentChain(parentTask);
}

function flattenTree(roots, result = [], isHidden = false, level = 0, visited = new Set()) {
    roots.forEach(t => {
        if (visited.has(t.id)) return;
        visited.add(t.id);
        
        t.isHidden = isHidden;
        t.level = level;
        result.push(t);
        
        const childHidden = isHidden || collapsedTasks.has(t.id);
        flattenTree(t.children, result, childHidden, level + 1, visited);
    });
    return result;
}

function renderTasks() {
    elements.taskListBody.innerHTML = '';
    elements.timelineBody.innerHTML = '';
    
    const roots = buildTree(tasks);
    calculateParentTasks(roots);
    const displayTasks = flattenTree(roots);
    
    displayTasks.forEach((task) => {
        if (task.isHidden) return;
        
        const hasChildren = task.children && task.children.length > 0;
        const isSubTask = task.level > 0;
        const isCollapsed = collapsedTasks.has(task.id);
        
        const listRow = document.createElement('div');
        listRow.className = 'task-row' + (task.milestone ? ' milestone' : '') + (isSubTask ? ' sub-task' : '') + (hasChildren ? ' parent-task' : '');
        listRow.dataset.id = task.id;
        
        const toggleHTML = hasChildren 
            ? `<i class="ph ph-caret-down tree-toggle ${isCollapsed ? 'collapsed' : ''}" data-id="${task.id}"></i>` 
            : `<span style="display:inline-block; width:20px;"></span>`;
            
        const memoIcon = task.memo ? `<i class="ph ph-info memo-icon" title="${task.memo}"></i>` : '';

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            return dateStr.replace(/-/g, '/');
        };

        listRow.innerHTML = `
            <div class="col-name">
                <i class="ph ph-dots-six-vertical drag-handle"></i>
                ${toggleHTML}
                <span>${task.name}</span>
                ${memoIcon}
            </div>
            <div class="col-assignee">${task.assignee || ''}</div>
            <div class="col-man-hours">${task.man_hours || 0}</div>
            <div class="col-date">${formatDate(task.start_date)}</div>
            <div class="col-date">${formatDate(task.end_date)}</div>
            <div class="col-progress">${task.progress}%</div>
        `;
        
        const toggleIcon = listRow.querySelector('.tree-toggle');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (collapsedTasks.has(task.id)) collapsedTasks.delete(task.id);
                else collapsedTasks.add(task.id);
                render();
            });
        }
        
        listRow.addEventListener('click', (e) => {
            if (!e.target.classList.contains('drag-handle') && !e.target.classList.contains('tree-toggle')) {
                openModal(task);
            }
        });
        
        const dragHandle = listRow.querySelector('.drag-handle');
        dragHandle.addEventListener('mousedown', () => listRow.draggable = true);
        listRow.addEventListener('dragend', () => listRow.draggable = false);
        
        listRow.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            listRow.classList.add('dragging');
        });
        listRow.addEventListener('dragover', (e) => {
            e.preventDefault();
            listRow.style.borderTop = '2px solid var(--accent)';
        });
        listRow.addEventListener('dragleave', (e) => {
            listRow.style.borderTop = '';
        });
        listRow.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (appMode === 'read-only') return;
            listRow.style.borderTop = '';
            const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const targetId = task.id;
            
            if (draggedId && draggedId !== targetId) {
                const draggedIdx = tasks.findIndex(t => t.id === draggedId);
                const targetIdx = tasks.findIndex(t => t.id === targetId);
                
                const [draggedTask] = tasks.splice(draggedIdx, 1);
                tasks.splice(targetIdx, 0, draggedTask);
                
                const taskIds = tasks.map(t => t.id);
                await fetch('/api/tasks/reorder', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ task_ids: taskIds })
                });
                await fetchTasks();
            }
        });
        
        elements.taskListBody.appendChild(listRow);
        
        const tRow = document.createElement('div');
        tRow.className = 'gantt-row';
        
        if (task.start_date && task.end_date) {
            const sd = new Date(task.start_date);
            const ed = new Date(task.end_date);
            
            if (task.baseline_start && task.baseline_end && !task.milestone) {
                const bsd = new Date(task.baseline_start);
                const bed = new Date(task.baseline_end);
                if (bed >= startDate && bsd <= endDate) {
                    const bLeftDays = (bsd - startDate) / DAY_MS;
                    const bDuration = (bed - bsd) / DAY_MS + 1;
                    
                    const baselineBar = document.createElement('div');
                    baselineBar.className = 'baseline-bar';
                    baselineBar.style.left = `${bLeftDays * pxPerDay}px`;
                    baselineBar.style.width = `${bDuration * pxPerDay}px`;
                    baselineBar.title = `当初計画: ${task.baseline_start} 〜 ${task.baseline_end}`;
                    tRow.appendChild(baselineBar);
                }
            }
            
            if (sd >= startDate && sd <= endDate) {
                const leftDays = (sd - startDate) / DAY_MS;
                const duration = (ed - sd) / DAY_MS + 1; 
                
                let statusClass = '';
                let plannedLeft = 0;
                let plannedWidth = 0;
                let plannedRight = 0;
                let hasBaseline = false;
                
                if (task.baseline_start && task.baseline_end && !task.milestone) {
                    hasBaseline = true;
                    const bsd = new Date(task.baseline_start);
                    const bed = new Date(task.baseline_end);
                    plannedLeft = ((bsd - startDate) / DAY_MS) * pxPerDay;
                    plannedWidth = ((bed - bsd) / DAY_MS + 1) * pxPerDay;
                    plannedRight = plannedLeft + plannedWidth;
                }
                
                const bar = document.createElement('div');
                bar.className = 'gantt-bar' + (task.milestone ? ' milestone' : '') + (hasChildren ? ' parent-bar' : '');
                bar.dataset.id = task.id;
                bar.style.left = `${leftDays * pxPerDay}px`;
                
                if (hasBaseline) {
                    bar.style.setProperty('--planned-left', `${plannedLeft}px`);
                    bar.style.setProperty('--planned-right', `${plannedRight}px`);
                }
                
                if (task.memo) {
                    bar.title = task.memo;
                } else {
                    bar.title = task.name;
                }
                
                if (task.color) {
                    bar.style.background = task.color;
                    if (hasChildren) {
                        bar.style.setProperty('--parent-color', task.color);
                    }
                }
                
                const barMemoMark = task.memo ? `<i class="ph ph-chat-text bar-memo-icon"></i>` : '';
                
                if (!task.milestone) {
                    bar.style.width = `${duration * pxPerDay}px`;
                    if (hasChildren) {
                        bar.innerHTML = `
                            <div class="gantt-diff-left"></div>
                            <div class="gantt-diff-right"></div>
                            ${barMemoMark}<div class="progress-fill" style="width: ${task.progress}%"></div>
                        `;
                    } else {
                        bar.innerHTML = `
                            <div class="gantt-diff-left"></div>
                            <div class="gantt-diff-right"></div>
                            <div class="resize-handle resize-left"></div>
                            ${barMemoMark}
                            <div class="progress-fill" style="width: ${task.progress}%"></div>
                            <div class="resize-handle resize-right"></div>
                        `;
                    }
                } else {
                    bar.style.width = '24px'; 
                    bar.innerHTML = `${barMemoMark}<span class="milestone-label">${task.name}</span>`;
                }
                
                if (hasBaseline) {
                    updateDiffState(bar);
                }
                
                if (appMode !== 'read-only') {
                    makeDraggable(bar, task);
                }
                tRow.appendChild(bar);
            }
        }
        
        elements.timelineBody.appendChild(tRow);
    });
    
    // Render Today Marker
    const todayDate = new Date();
    const startLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const todayLocal = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const endLocal = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    if (todayLocal >= startLocal && todayLocal <= endLocal) {
        const leftDays = (todayLocal - startLocal) / DAY_MS;
        const marker = document.createElement('div');
        marker.className = 'today-marker';
        marker.style.left = `${leftDays * pxPerDay}px`;
        marker.style.width = `${pxPerDay}px`;
        elements.timelineBody.appendChild(marker);
    }
}

function makeDraggable(bar, task) {
    if (appMode === 'read-only') return;
    let isResizingRight = false;
    let isResizingLeft = false;
    let isMoving = false;
    let startX = 0;
    let startScrollLeft = 0;
    let initialLeft = 0;
    let initialWidth = 0;
    
    bar.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only allow left click
        
        const hasChildren = task.children && task.children.length > 0;
        
        if (hasChildren) return; // 親タスクはドラッグ操作不可（自動計算のみ）
        
        if (e.target.classList.contains('resize-right')) {
            isResizingRight = true;
        } else if (e.target.classList.contains('resize-left')) {
            isResizingLeft = true;
        } else {
            isMoving = true;
        }
        
        startX = e.clientX;
        startScrollLeft = elements.timelinePanel.scrollLeft;
        initialLeft = parseFloat(bar.style.left) || 0;
        initialWidth = parseFloat(bar.style.width) || 0;
        document.body.style.cursor = isMoving ? 'grabbing' : 'ew-resize';
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizingRight && !isResizingLeft && !isMoving) return;
        
        if (isResizingRight) {
            const rect = document.querySelector('.timeline-body').getBoundingClientRect();
            const mouseXCanvas = e.clientX - rect.left;
            // 右端は「マス目の右側の境界線」にスナップさせるため、Math.ceilを使用する
            let rightEdge = Math.ceil(mouseXCanvas / pxPerDay) * pxPerDay;
            let snappedWidth = rightEdge - initialLeft;
            
            if (snappedWidth < pxPerDay) snappedWidth = pxPerDay;
            bar.style.width = `${snappedWidth}px`;
        } else if (isResizingLeft) {
            const rect = document.querySelector('.timeline-body').getBoundingClientRect();
            const mouseXCanvas = e.clientX - rect.left;
            let dayIndex = Math.floor(mouseXCanvas / pxPerDay);
            let snappedLeft = dayIndex * pxPerDay;
            if (snappedLeft < 0) snappedLeft = 0;
            
            const rightEdge = initialLeft + initialWidth;
            // 最小幅（1日分）を確保
            if (rightEdge - snappedLeft < pxPerDay) {
                snappedLeft = rightEdge - pxPerDay;
            }
            
            const snappedWidth = rightEdge - snappedLeft;
            bar.style.left = `${snappedLeft}px`;
            bar.style.width = `${snappedWidth}px`;
        } else if (isMoving) {
            const currentScrollLeft = elements.timelinePanel.scrollLeft;
            const dx = (e.clientX + currentScrollLeft) - (startX + startScrollLeft);
            let newLeft = initialLeft + dx;
            if (newLeft < 0) newLeft = 0;
            const snappedLeft = Math.round(newLeft / pxPerDay) * pxPerDay;
            bar.style.left = `${snappedLeft}px`;
        }
        
        updateDiffState(bar);
    });
    
    document.addEventListener('mouseup', async (e) => {
        if (!isResizingRight && !isResizingLeft && !isMoving) return;
        
        const wasResizingRight = isResizingRight;
        const wasResizingLeft = isResizingLeft;
        const wasMoving = isMoving;
        
        isResizingRight = false;
        isResizingLeft = false;
        isMoving = false;
        document.body.style.cursor = 'default';
        
        const finalLeft = parseFloat(bar.style.left) || 0;
        const finalWidth = parseFloat(bar.style.width) || pxPerDay;
        
        const daysShifted = Math.round((finalLeft - initialLeft) / pxPerDay);
        const durationChange = Math.round((finalWidth - initialWidth) / pxPerDay);
        
        if (daysShifted !== 0 || durationChange !== 0) {
            const sd = new Date(task.start_date);
            const ed = new Date(task.end_date);
            
            if (wasResizingRight) {
                ed.setDate(ed.getDate() + durationChange);
            } else if (wasResizingLeft) {
                sd.setDate(sd.getDate() + daysShifted);
            } else if (wasMoving) {
                sd.setDate(sd.getDate() + daysShifted);
                ed.setDate(ed.getDate() + daysShifted);
            }
            
            task.start_date = sd.toISOString().split('T')[0];
            task.end_date = ed.toISOString().split('T')[0];
            
            await updateTask(task.id, task);
        }
    });
}

async function updateTask(id, data) {
    const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    const saved = await res.json();
    
    const idx = tasks.findIndex(t => t.id === saved.id);
    if (idx !== -1) tasks[idx] = saved;
    else tasks.push(saved);
    
    await updateParentChain(saved);
    await fetchTasks();
}

async function saveTask(data) {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/api/tasks/${data.id}` : '/api/tasks';
    
    if (!data.id) delete data.id;
    
    const res = await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    const saved = await res.json();
    
    const idx = tasks.findIndex(t => t.id === saved.id);
    if (idx !== -1) tasks[idx] = saved;
    else tasks.push(saved);
    
    await updateParentChain(saved);
    await fetchTasks();
    closeModal();
}

async function deleteTask(id) {
    const ok = await showConfirm('タスクの削除', 'このタスクを削除してよろしいですか？');
    if (!ok) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await fetchTasks();
    closeModal();
}

function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');
        
        const onOk = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(true);
        };
        const onCancel = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(false);
        };
        const cleanup = () => {
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
        };
        
        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        modal.classList.add('active');
    });
}

function openModal(task = null) {
    if (appMode === 'read-only') return;
    resetBaselineOnSave = false;
    elements.form.reset();
    elements.btnDelete.style.display = task ? 'block' : 'none';
    elements.modalTitle.textContent = task ? 'タスク編集' : 'タスク追加';
    
    document.getElementById('task-start').disabled = false;
    document.getElementById('task-end').disabled = false;
    document.getElementById('task-progress').disabled = false;
    document.getElementById('task-man-hours').disabled = false;
    
    if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-parent-id').value = task.parent_id || '';
        document.getElementById('task-start').value = task.start_date;
        document.getElementById('task-end').value = task.end_date;
        document.getElementById('task-progress').value = task.progress;
        document.getElementById('task-man-hours').value = task.man_hours || 0;
        document.getElementById('task-assignee').value = task.assignee || '';
        document.getElementById('task-memo').value = task.memo || '';
        document.getElementById('task-color').value = task.color || '#3b82f6';
        document.getElementById('task-milestone').checked = task.milestone;
    } else {
        document.getElementById('task-id').value = '';
        document.getElementById('task-parent-id').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-start').value = today;
        document.getElementById('task-end').value = today;
        document.getElementById('task-progress').value = 0;
        document.getElementById('task-man-hours').value = 0;
        document.getElementById('task-memo').value = '';
        document.getElementById('task-color').value = '#3b82f6';
    }
    
    const currentColor = document.getElementById('task-color').value;
    colorSwatches.forEach(s => {
        s.classList.toggle('active', s.dataset.color === currentColor);
    });
    
    const select = document.getElementById('task-parent-id');
    Array.from(select.options).forEach(opt => {
        opt.disabled = task && parseInt(opt.value, 10) === task.id;
    });
    
    const hasChildren = task && task.children && task.children.length > 0;
    if (hasChildren) {
        document.getElementById('task-start').disabled = true;
        document.getElementById('task-end').disabled = true;
        document.getElementById('task-progress').disabled = true;
        document.getElementById('task-man-hours').disabled = true;
    }
    
    elements.modal.classList.add('active');
}

function closeModal() {
    elements.modal.classList.remove('active');
}

elements.btnAddTask.addEventListener('click', () => openModal());
elements.btnCancel.addEventListener('click', closeModal);

elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const parentId = document.getElementById('task-parent-id').value;
    const taskData = {
        name: document.getElementById('task-name').value,
        start_date: document.getElementById('task-start').value,
        end_date: document.getElementById('task-end').value,
        progress: parseFloat(document.getElementById('task-progress').value),
        man_hours: parseFloat(document.getElementById('task-man-hours').value || 0),
        assignee: document.getElementById('task-assignee').value,
        memo: document.getElementById('task-memo').value,
        color: document.getElementById('task-color').value,
        milestone: document.getElementById('task-milestone').checked,
        dependencies: "",
        parent_id: parentId ? parseInt(parentId, 10) : null,
        page_id: currentPageId
    };

    if (resetBaselineOnSave) {
        taskData.baseline_start = taskData.start_date;
        taskData.baseline_end = taskData.end_date;
    }

    if (id) taskData.id = parseInt(id, 10);
    saveTask(taskData);
});

elements.btnDelete.addEventListener('click', () => {
    const id = document.getElementById('task-id').value;
    if (id) deleteTask(id);
});

elements.btnExportList.addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const path = await window.pywebview.api.export_list();
        if (path) alert(`保存しました:\n${path}`);
    } else {
        const res = await fetch('/api/export/list');
        const data = await res.json();
        alert(`デスクトップに保存しました:\n${data.path}`);
    }
});
elements.btnExportGantt.addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const path = await window.pywebview.api.export_gantt();
        if (path) alert(`保存しました:\n${path}`);
    } else {
        const res = await fetch('/api/export/gantt');
        const data = await res.json();
        alert(`デスクトップに保存しました:\n${data.path}`);
    }
});

async function fetchPages() {
    try {
        const res = await fetch('/api/pages');
        pages = await res.json();
        if (pages.length > 0 && !pages.find(p => p.id === currentPageId)) {
            currentPageId = pages[0].id;
        }
        renderPages();
    } catch (e) {
        console.error('Error fetching pages', e);
    }
}

function renderPages() {
    elements.pageTabs.innerHTML = '';
    pages.forEach(page => {
        const tab = document.createElement('div');
        tab.className = `page-tab ${page.id === currentPageId ? 'active' : ''}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = page.name;
        tab.appendChild(nameSpan);

        // Delete button for non-primary pages
        if (pages.length > 1) {
            const btnDel = document.createElement('i');
            btnDel.className = 'ph ph-x-circle';
            btnDel.style.marginLeft = '8px';
            btnDel.style.fontSize = '14px';
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePage(page.id);
            });
            tab.appendChild(btnDel);
        }
        
        tab.addEventListener('dblclick', () => {
            if (appMode !== 'read-only') editPageName(page, nameSpan);
        });
        tab.addEventListener('click', () => {
            if (currentPageId !== page.id) {
                currentPageId = page.id;
                renderPages();
                fetchTasks();
            }
        });
        elements.pageTabs.appendChild(tab);
    });
}

async function addPage() {
    elements.pageNameInput.value = '';
    elements.pageModal.classList.add('active');
    elements.pageNameInput.focus();
}

elements.btnPageCancel.addEventListener('click', () => {
    elements.pageModal.classList.remove('active');
});

elements.btnPageSave.addEventListener('click', async () => {
    const name = elements.pageNameInput.value.trim();
    if (!name) return;
    
    const res = await fetch('/api/pages', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: name, sort_order: pages.length })
    });
    const newPage = await res.json();
    
    currentPageId = newPage.id; // 新しいページを現在のページに設定
    elements.pageModal.classList.remove('active');
    await fetchPages();
    await fetchTasks(); // 新しいページ（空）を表示
});

elements.pageNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') elements.btnPageSave.click();
    if (e.key === 'Escape') elements.btnPageCancel.click();
});

async function editPageName(page, span) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = page.name;
    input.className = 'page-name-edit';
    
    span.replaceWith(input);
    input.focus();
    input.select();
    
    const save = async () => {
        const newName = input.value.trim();
        if (newName && newName !== page.name) {
            await fetch(`/api/pages/${page.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: newName })
            });
            await fetchPages();
        } else {
            input.replaceWith(span);
        }
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') input.replaceWith(span);
    });
}

async function deletePage(id) {
    const ok = await showConfirm('ページの削除', 'このページとその中のすべてのタスクを削除してよろしいですか？');
    if (!ok) return;
    await fetch(`/api/pages/${id}`, { method: 'DELETE' });
    if (currentPageId === id) currentPageId = pages.find(p => p.id !== id)?.id || 1;
    await fetchPages();
    await fetchTasks();
}

elements.btnAddPage.addEventListener('click', addPage);

// Initial load
async function init() {
    try {
        const res = await fetch('/api/status');
        const status = await res.json();
        appMode = status.mode;
        
        const badge = document.getElementById('app-mode-badge');
        if (appMode === 'read-only') {
            document.body.classList.add('readonly-mode');
            badge.textContent = '読み取り専用モード';
            badge.className = 'badge-readonly';
            badge.style.display = 'flex';
        } else {
            badge.textContent = 'メインモード (編集可)';
            badge.className = 'badge-main';
            badge.style.display = 'flex';
        }
    } catch (e) {
        console.error('Failed to fetch status', e);
    }
    
    await fetchPages();
    await fetchTasks();
}
init();

// --- Context Menu Logic ---
let currentContextTask = null;
const contextMenu = document.getElementById('context-menu');

document.addEventListener('contextmenu', (e) => {
    if (appMode === 'read-only') {
        e.preventDefault();
        return;
    }
    const target = e.target.closest('.task-row') || e.target.closest('.gantt-bar');
    if (target) {
        e.preventDefault();
        const taskId = parseInt(target.dataset.id, 10);
        currentContextTask = tasks.find(t => t.id === taskId);
        
        if (currentContextTask) {
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.classList.add('active');
        }
    } else {
        contextMenu.classList.remove('active');
    }
});

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        contextMenu.classList.remove('active');
    }
});

document.getElementById('cm-add-child').addEventListener('click', () => {
    contextMenu.classList.remove('active');
    if (currentContextTask) {
        openModal();
        document.getElementById('task-parent-id').value = currentContextTask.id;
    }
});

document.getElementById('cm-duplicate').addEventListener('click', async () => {
    contextMenu.classList.remove('active');
    if (currentContextTask) {
        const copy = { ...currentContextTask };
        delete copy.id;
        copy.name = `${copy.name} のコピー`;
        await saveTask(copy);
    }
});

document.getElementById('cm-delete').addEventListener('click', async () => {
    contextMenu.classList.remove('active');
    if (currentContextTask) {
        await deleteTask(currentContextTask.id);
    }
});

contextMenu.querySelectorAll('.prog-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        contextMenu.classList.remove('active');
        if (currentContextTask) {
            currentContextTask.progress = parseFloat(btn.dataset.prog);
            await updateTask(currentContextTask.id, currentContextTask);
        }
    });
});

contextMenu.querySelectorAll('.cm-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', async () => {
        contextMenu.classList.remove('active');
        if (currentContextTask) {
            currentContextTask.color = swatch.dataset.color;
            await updateTask(currentContextTask.id, currentContextTask);
        }
    });
});
