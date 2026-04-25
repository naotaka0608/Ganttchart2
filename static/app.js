let currentScale = 'day';
let pxPerDay = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    
    if (currentScale === 'day') {
        while (curr <= endDate) {
            const el = document.createElement('div');
            el.className = 'timeline-cell-header';
            const dayOfWeek = curr.getDay();
            if (dayOfWeek === 0) el.classList.add('sunday');
            if (dayOfWeek === 6) el.classList.add('saturday');
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
    
    // Sort logic handled mostly by backend or drag-and-drop array order
    // But tree structure might override visual flat order if we strictly parent-child it.
    // For simplicity with drag and drop, we'll try to maintain user's flat order as much as possible,
    // but tree hierarchy is enforced visually.
    const roots = buildTree(tasks);
    const displayTasks = flattenTree(roots);
    
    displayTasks.forEach((task) => {
        if (task.isHidden) return; // Skip rendering hidden children
        
        const hasChildren = task.children && task.children.length > 0;
        const isSubTask = task.level > 0;
        const isCollapsed = collapsedTasks.has(task.id);
        
        // Task List Row
        const listRow = document.createElement('div');
        listRow.className = 'task-row' + (task.milestone ? ' milestone' : '') + (isSubTask ? ' sub-task' : '');
        
        let toggleHTML = '';
        if (hasChildren) {
            toggleHTML = `<i class="ph-bold ph-caret-down tree-toggle ${isCollapsed ? 'collapsed' : ''}" data-id="${task.id}"></i>`;
        } else if (!isSubTask) {
            toggleHTML = `<span style="display:inline-block; width:20px;"></span>`;
        }

        listRow.innerHTML = `
            <div class="col-name">
                <i class="ph ph-dots-six-vertical drag-handle"></i>
                ${toggleHTML}
                ${task.name}
            </div>
            <div class="col-assignee">${task.assignee || ''}</div>
            <div class="col-date">${task.start_date}</div>
            <div class="col-date">${task.end_date}</div>
            <div class="col-progress">${task.progress}%</div>
        `;
        
        // Toggle click
        const toggleIcon = listRow.querySelector('.tree-toggle');
        if (toggleIcon) {
            toggleIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (collapsedTasks.has(task.id)) collapsedTasks.delete(task.id);
                else collapsedTasks.add(task.id);
                render();
            });
        }
        
        // Edit click
        listRow.addEventListener('click', (e) => {
            if (!e.target.classList.contains('drag-handle') && !e.target.classList.contains('tree-toggle')) {
                openModal(task);
            }
        });
        
        // Drag and drop reordering
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
        
        // Timeline Row & Bar
        const tRow = document.createElement('div');
        tRow.className = 'gantt-row';
        
        const sd = new Date(task.start_date);
        const ed = new Date(task.end_date);
        
        if (sd >= startDate && sd <= endDate) {
            const leftDays = (sd - startDate) / DAY_MS;
            const duration = (ed - sd) / DAY_MS + 1; // +1 to include end date fully
            
            const bar = document.createElement('div');
            bar.className = 'gantt-bar' + (task.milestone ? ' milestone' : '');
            bar.style.left = `${leftDays * pxPerDay}px`;
            if (task.color) {
                bar.style.background = task.color;
            }
            
            if (!task.milestone) {
                bar.style.width = `${duration * pxPerDay}px`;
                bar.innerHTML = `
                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                    <div class="resize-handle resize-left"></div>
                    <span class="bar-label">${task.name}</span>
                    <div class="resize-handle resize-right"></div>
                    ${task.assignee ? `<span class="assignee-label">${task.assignee}</span>` : ''}
                `;
            } else {
                bar.title = task.name;
                if (task.assignee) {
                    bar.innerHTML = `<span class="assignee-label" style="right:-20px;">${task.assignee}</span>`;
                }
            }
            
            makeDraggable(bar, task);
            tRow.appendChild(bar);
        }
        
        elements.timelineBody.appendChild(tRow);
    });
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
            if (newWidth < pxPerDay) newWidth = pxPerDay; // min 1 day
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
        document.getElementById('task-color').value = task.color || '#3b82f6';
        document.getElementById('task-milestone').checked = task.milestone;
    } else {
        document.getElementById('task-id').value = '';
        document.getElementById('task-parent-id').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-start').value = today;
        document.getElementById('task-end').value = today;
        document.getElementById('task-color').value = '#3b82f6';
    }
    
    // Update color swatches
    const currentColor = document.getElementById('task-color').value;
    colorSwatches.forEach(s => {
        s.classList.toggle('active', s.dataset.color === currentColor);
    });
    
    // Disable self as parent
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
        color: document.getElementById('task-color').value,
        milestone: document.getElementById('task-milestone').checked,
        dependencies: "",
        parent_id: parentId ? parseInt(parentId, 10) : null
    };
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
