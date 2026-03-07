/**
 * App Controller - Orchestrates UI and Engine
 */

let activeSlot = null;

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initLottery();
    bindEvents();
});

function bindEvents() {
    // Mode Switching
    document.getElementById('btn-editor-mode').onclick = () => setMode('editor');
    document.getElementById('btn-lottery-mode').onclick = () => {
        setMode('lottery');
        startLottery();
    };

    // Tool Buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            
            if (currentTool === 'road') {
                startRoadDrawing();
            } else {
                stopRoadDrawing();
            }
        };
    });

    // Canvas Clicks for Creation
    canvas.on('mouse:down', (opt) => {
        if (canvas.isDragging || canvas.isDrawingMode) return;
        
        // If using Pillar or Eraser, we don't want to select/drag existing objects
        if (currentTool === 'pillar' || currentTool === 'eraser') {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }

        // If clicking an object (and not using pillar/eraser), we want to interact with it
        if (opt.target && currentTool !== 'pillar' && currentTool !== 'eraser') return;

        const pointer = canvas.getPointer(opt.e);
        const { x, y } = pointer;

        if (currentTool === 'slot') {
            createParkingSlot(x, y, 0);
            // Optionally auto-open modal or let user dblclick
        } else if (currentTool === 'pillar') {
            addPillar(x, y, true);
        } else if (currentTool === 'elevator') {
            addElevator(x, y, 'public');
        } else if (currentTool === 'elevator-home') {
            addElevator(x, y, 'home');
        }
    });

    // Removed the previous mouse:up handler that was causing conflicts

    // Utility Actions
    document.getElementById('btn-save').onclick = exportToJSON;
    document.getElementById('btn-load').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = f => importFromJSON(f.target.result);
            reader.readAsText(file);
        };
        input.click();
    };
    document.getElementById('btn-clear').onclick = () => {
        if (confirm("確定要清空畫布嗎？")) canvas.clear();
    };

    // Zoom
    document.getElementById('zoom-in').onclick = () => canvas.setZoom(canvas.getZoom() * 1.1);
    document.getElementById('zoom-out').onclick = () => canvas.setZoom(canvas.getZoom() / 1.1);
    document.getElementById('zoom-reset').onclick = () => canvas.setZoom(1);

    // Editor Search
    document.getElementById('btn-editor-search').onclick = () => {
        const id = document.getElementById('editor-search-input').value;
        const slot = getAllSlots().find(s => s.data.id === id);
        if (slot) {
            highlightSlot(slot);
        } else {
            alert(`找不到車位：${id}`);
        }
    };

    // Keyboard Shortcuts (Ctrl+C, Ctrl+V)
    window.addEventListener('keydown', handleKeyPress);

    // Modal
    document.getElementById('btn-modal-cancel').onclick = closeModal;
    document.getElementById('btn-modal-save').onclick = saveSlotProperties;
}

let clipboard = null;

function handleKeyPress(e) {
    if (e.ctrlKey && e.key === 'c') {
        const active = canvas.getActiveObject();
        if (active && active.data?.type === 'slot') {
            clipboard = active;
        }
    }

    if (e.ctrlKey && e.key === 'v') {
        if (clipboard) {
            duplicateSlot(clipboard);
        }
    }

    if (e.key === 'Delete') {
        const active = canvas.getActiveObject();
        if (active) canvas.remove(active);
    }
}

function duplicateSlot(source) {
    // Offset position for visibility
    const x = source.left + 20;
    const y = source.top + 20;
    const angle = source.angle;

    // Create new slot at offset, keeping the angle
    createParkingSlot(x, y, angle);
    const newSlot = canvas.getActiveObject();
    
    // Ensure ID is reset to 000
    newSlot.data.id = '000';
    const textObj = newSlot._objects.find(o => o.type === 'text');
    textObj.set('text', `${newSlot.data.rating} 000`);
    
    canvas.renderAll();
}

function setMode(mode) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.control-group').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`btn-${mode}-mode`).classList.add('active');
    document.getElementById(`${mode}-controls`).classList.add('active');
    document.getElementById('mode-display').innerText = `Mode: ${mode.toUpperCase()}`;

    if (mode === 'lottery') {
        currentTool = null;
        stopRoadDrawing();
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    }
}

function showSlotModal(slot) {
    activeSlot = slot;
    document.getElementById('modal-slot-id').value = slot.data.id;
    document.getElementById('modal-slot-rating').value = slot.data.rating;
    document.getElementById('slot-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('slot-modal').style.display = 'none';
    activeSlot = null;
}

function saveSlotProperties() {
    if (activeSlot) {
        const newId = document.getElementById('modal-slot-id').value || '000';
        const newRating = document.getElementById('modal-slot-rating').value;
        
        // Validation: Check if ID is already used by ANOTHER slot
        const isDuplicate = getAllSlots().some(s => 
            s !== activeSlot && s.data.id === newId && newId !== '000'
        );

        if (isDuplicate) {
            alert(`⚠️ 車位號碼 ${newId} 已被使用！請輸入不同的號碼。`);
            return; // Stop saving
        }

        activeSlot.data.id = newId;
        activeSlot.data.rating = newRating;
        
        // Update Text visual
        const textObj = activeSlot._objects.find(o => o.type === 'text');
        textObj.set('text', `${newRating} ${newId}`);
        
        canvas.renderAll();
    }
    closeModal();
}
