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
    scaleBtns: document.querySelectorAll('.scale-btn')
};

// Sync vertical scrolling
elements.timelinePanel.addEventListener('scroll', () => {
    elements.taskListBody.scrollTop = elements.timelinePanel.scrollTop;
});
elements.taskListBody.addEventListener('scroll', () => {
    elements.timelinePanel.scrollTop = elements.taskListBody.scrollTop;
});

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

async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks');
        tasks = await res.json();
        updateDateRange();
        updateParentSelect();
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
    const displayTasks = flattenTree(roots);
    
    displayTasks.forEach((task) => {
        if (task.isHidden) return;
        
        const hasChildren = task.children && task.children.length > 0;
        const isSubTask = task.level > 0;
        const isCollapsed = collapsedTasks.has(task.id);
        
        const listRow = document.createElement('div');
        listRow.className = 'task-row' + (task.milestone ? ' milestone' : '') + (isSubTask ? ' sub-task' : '');
        
        const toggleHTML = hasChildren 
            ? `<i class="ph ph-caret-down tree-toggle ${isCollapsed ? 'collapsed' : ''}" data-id="${task.id}"></i>` 
            : `<span style="display:inline-block; width:20px;"></span>`;
            
        const memoIcon = task.memo ? `<i class="ph ph-info memo-icon" title="${task.memo}"></i>` : '';

        listRow.innerHTML = `
            <div class="col-name">
                <i class="ph ph-dots-six-vertical drag-handle"></i>
                ${toggleHTML}
                <span>${task.name}</span>
                ${memoIcon}
            </div>
            <div class="col-assignee">${task.assignee || ''}</div>
            <div class="col-date">${task.start_date}</div>
            <div class="col-date">${task.end_date}</div>
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
                render();
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
                
                const bar = document.createElement('div');
                bar.className = 'gantt-bar' + (task.milestone ? ' milestone' : '');
                bar.style.left = `${leftDays * pxPerDay}px`;
                
                if (task.memo) {
                    bar.title = task.memo;
                } else {
                    bar.title = task.name;
                }
                
                if (task.color) {
                    bar.style.background = task.color;
                }
                
                const barMemoMark = task.memo ? `<i class="ph ph-chat-text bar-memo-icon"></i>` : '';
                
                if (!task.milestone) {
                    bar.style.width = `${duration * pxPerDay}px`;
                    bar.innerHTML = `
                        <div class="resize-handle resize-left"></div>
                        ${barMemoMark}
                        <div class="progress-fill" style="width: ${task.progress}%"></div>
                        <div class="resize-handle resize-right"></div>
                    `;
                    makeDraggable(bar, task);
                } else {
                    bar.title = task.name;
                    if (task.assignee) {
                        bar.innerHTML = `<span class="assignee-label" style="right:-20px;">${task.assignee}</span>`;
                    }
                }
                
                makeDraggable(bar, task);
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
    let isResizingRight = false;
    let isResizingLeft = false;
    let isMoving = false;
    let startX = 0;
    let initialLeft = 0;
    let initialWidth = 0;
    
    bar.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-right')) {
            isResizingRight = true;
        } else if (e.target.classList.contains('resize-left')) {
            isResizingLeft = true;
        } else {
            isMoving = true;
        }
        
        startX = e.clientX;
        initialLeft = parseFloat(bar.style.left) || 0;
        initialWidth = parseFloat(bar.style.width) || 0;
        document.body.style.cursor = isMoving ? 'grabbing' : 'ew-resize';
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizingRight && !isResizingLeft && !isMoving) return;
        
        const dx = e.clientX - startX;
        
        if (isResizingRight) {
            let newWidth = initialWidth + dx;
            if (newWidth < pxPerDay) newWidth = pxPerDay;
            const snappedWidth = Math.round(newWidth / pxPerDay) * pxPerDay;
            bar.style.width = `${snappedWidth}px`;
        } else if (isResizingLeft) {
            let newLeft = initialLeft + dx;
            let newWidth = initialWidth - dx;
            
            if (newLeft < 0) {
                newLeft = 0;
                newWidth = initialWidth + initialLeft;
            }
            if (newWidth < pxPerDay) {
                newWidth = pxPerDay;
                newLeft = initialLeft + initialWidth - pxPerDay;
            }
            
            const snappedLeft = Math.round(newLeft / pxPerDay) * pxPerDay;
            const snappedWidth = Math.round(newWidth / pxPerDay) * pxPerDay;
            
            bar.style.left = `${snappedLeft}px`;
            bar.style.width = `${snappedWidth}px`;
        } else if (isMoving) {
            let newLeft = initialLeft + dx;
            if (newLeft < 0) newLeft = 0;
            const snappedLeft = Math.round(newLeft / pxPerDay) * pxPerDay;
            bar.style.left = `${snappedLeft}px`;
        }
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
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    await fetchTasks();
}

async function saveTask(data) {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/api/tasks/${data.id}` : '/api/tasks';
    
    if (!data.id) delete data.id;
    
    await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    await fetchTasks();
    closeModal();
}

async function deleteTask(id) {
    if (!confirm('このタスクを削除してよろしいですか？')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await fetchTasks();
    closeModal();
}

function openModal(task = null) {
    resetBaselineOnSave = false;
    elements.form.reset();
    elements.btnDelete.style.display = task ? 'block' : 'none';
    elements.modalTitle.textContent = task ? 'タスク編集' : 'タスク追加';
    
    if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-parent-id').value = task.parent_id || '';
        document.getElementById('task-start').value = task.start_date;
        document.getElementById('task-end').value = task.end_date;
        document.getElementById('task-progress').value = task.progress;
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
        assignee: document.getElementById('task-assignee').value,
        memo: document.getElementById('task-memo').value,
        color: document.getElementById('task-color').value,
        milestone: document.getElementById('task-milestone').checked,
        dependencies: "",
        parent_id: parentId ? parseInt(parentId, 10) : null
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
    const res = await fetch('/api/export/list');
    const data = await res.json();
    alert(`デスクトップに保存しました:\n${data.path}`);
});
elements.btnExportGantt.addEventListener('click', async () => {
    const res = await fetch('/api/export/gantt');
    const data = await res.json();
    alert(`デスクトップに保存しました:\n${data.path}`);
});

fetchTasks();
