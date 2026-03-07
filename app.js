/**
 * App Controller - Orchestrates UI and Engine
 */

let activeSlot = null;

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initLottery();
    bindEvents();
    checkForParams();
    
    // Safety check before leaving
    window.onbeforeunload = (e) => {
        // Only show if there's unsaved work relative to last save
        // For now, simplicity: always warn if canvas has objects
        if (canvas.getObjects().length > 0) {
            return "您可能有未儲存的變更，確定要離開嗎？";
        }
    };

    // Auto-Recovery on Load
    setTimeout(tryRecoverSession, 500);
});

function tryRecoverSession() {
    // If we're loading a specific map via URL, skip recovery
    const params = new URLSearchParams(window.location.search);
    if (params.has('use')) return;

    const savedData = localStorage.getItem('parkingspace_backup');
    const savedName = localStorage.getItem('parkingspace_filename');
    
    if (savedData && confirm("偵測到上次未完成的編輯紀錄，是否要恢復？")) {
        importFromJSON(savedData);
        if (savedName) {
            currentFileName = savedName;
            updateAppTitle();
        }
    }
}

function bindEvents() {
    // Mode Switching
    document.getElementById('btn-editor-mode').onclick = () => setMode('editor');
    document.getElementById('btn-lottery-mode').onclick = () => {
        setMode('lottery');
        clearAllHighlights();
    };

    // Editor Tool Buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            
            if (currentTool === 'road') {
                startRoadDrawing();
            } else {
                stopRoadDrawing();
            }
        };
    });

    // Initialize Lottery Buttons
    if (typeof initLottery === 'function') {
        initLottery();
    }

    // Canvas Clicks for Creation/Interaction
    canvas.on('mouse:down', (opt) => {
        if (canvas.isDragging || canvas.isDrawingMode) return;
        
        // Lottery Mode Interaction
        if (currentMode === 'lottery') {
            if (opt.target && opt.target.data?.type === 'slot') {
                toggleSlotStatus(opt.target);
            }
            return;
        }

        // Editor Mode Tools
        // If using Pillar, Road or Eraser, we don't want to select/drag existing objects...
        if (currentTool === 'pillar' || currentTool === 'road' || currentTool === 'eraser') {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }

        // If clicking an object (and not using tools), we want to interact with it
        if (opt.target && currentTool !== 'pillar' && currentTool !== 'road' && currentTool !== 'eraser') return;

        const pointer = canvas.getPointer(opt.e);
        const { x, y } = pointer;

        if (currentTool === 'slot') {
            createParkingSlot(x, y, 0);
            // Optionally auto-open modal or let user dblclick
        } else if (currentTool === 'pillar') {
            addPillar(x, y, true);
        } else if (currentTool === 'road') {
            addRoad(x, y);
        } else if (currentTool === 'elevator') {
            addElevator(x, y, 'public');
        } else if (currentTool === 'elevator-home') {
            addElevator(x, y, 'home');
        }
    });

    // Removed the previous mouse:up handler that was causing conflicts

    // Utility Actions
    document.getElementById('btn-save').onclick = () => exportToJSON(false);
    document.getElementById('btn-save-as').onclick = () => exportToJSON(true);
    
    document.getElementById('btn-load').onclick = async () => {
        const onLoad = () => {
            setMode(currentMode);
            updateAppTitle();
        };

        const result = await handleLoadFile(onLoad);
        if (result === 'fallback') {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = f => {
                    importFromJSON(f.target.result, onLoad);
                    currentFileName = file.name;
                };
                reader.readAsText(file);
            };
            input.click();
        }
    };

    document.getElementById('btn-clear').onclick = () => {
        if (confirm("確定要清空畫布嗎？")) {
            canvas.clear();
            currentFileHandle = null;
            currentFileName = "全新內容";
            updateAppTitle();
            clearSession();
        }
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

function highlightSlot(slot) {
    if (!slot) return;
    
    // Select the slot
    canvas.setActiveObject(slot);
    
    // Center viewport on the slot
    canvas.viewportCenterObject(slot);
    
    // Flash animation
    let count = 0;
    const interval = setInterval(() => {
        slot.set('opacity', count % 2 === 0 ? 0.3 : 1);
        canvas.requestRenderAll();
        count++;
        if (count > 6) {
            clearInterval(interval);
            slot.set('opacity', 1);
            canvas.requestRenderAll();
        }
    }, 200);
}

    // Modal
    document.getElementById('btn-modal-cancel').onclick = closeModal;
    document.getElementById('btn-modal-save').onclick = saveSlotProperties;

    // Mobile Menu Toggle
    document.getElementById('menu-toggle').onclick = () => {
        document.querySelector('.sidebar').classList.toggle('open');
    };
}

async function checkForParams() {
    const params = new URLSearchParams(window.location.search);
    const targetMap = params.get('use');

    if (targetMap) {
        document.body.classList.add('lottery-only');
        setMode('lottery');
        
        try {
            const response = await fetch(`maps/${targetMap}.json`);
            if (response.ok) {
                const data = await response.text();
                importFromJSON(data, () => {
                    setMode('lottery');
                    updateAppTitle();
                });
                currentFileName = targetMap;
                // Override onbeforeunload for view-only experience
                window.onbeforeunload = null;
            } else {
                console.error('Map file not found');
            }
        } catch (err) {
            console.error('Failed to auto-load map:', err);
        }
    }
}

let clipboard = null;

function handleKeyPress(e) {
    if (currentMode === 'lottery') return; // Disable shortcuts in lottery mode
    
    // Ctrl+S: Save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        exportToJSON(false);
        return;
    }

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

function updateAppTitle() {
    const cleanName = currentFileName.replace(/\.[^/.]+$/, "");
    document.title = `${cleanName} - ParkingSpace`;
    document.getElementById('mobile-filename').innerText = cleanName;
}

// Initial Title
updateAppTitle();

let currentMode = 'editor';

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.control-group').forEach(c => c.classList.remove('active'));
    
    document.getElementById(`btn-${mode}-mode`).classList.add('active');
    document.getElementById(`${mode}-controls`).classList.add('active');
    document.getElementById('mode-display').innerText = `Mode: ${mode.toUpperCase()}`;

    // Canvas interactivity based on mode
    if (mode === 'lottery') {
        currentTool = null;
        stopRoadDrawing();
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        
        // Disable selection and editing
        canvas.selection = false;
        canvas.forEachObject(obj => {
            obj.selectable = false;
            obj.evented = true; // Still need events for clicking
        });
        canvas.discardActiveObject();
    } else {
        // Enable selection and editing
        canvas.selection = true;
        canvas.forEachObject(obj => {
            // Restore selectability for slots only
            if (obj.data?.type === 'slot') {
                obj.selectable = true;
            }
        });
    }
    
    canvas.requestRenderAll();
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
        persistToLocal();
    }
    closeModal();
}

function persistToLocal() {
    const data = JSON.stringify(canvas.toJSON(['data']));
    localStorage.setItem('parkingspace_backup', data);
    localStorage.setItem('parkingspace_filename', currentFileName);
}
