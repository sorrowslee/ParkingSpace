/**
 * Parking Engine - Handles Fabric.js canvas and object drawing
 */

let canvas;
let currentTool = null;
let isPanning = false;
let lastCursorX, lastCursorY;

const SLOT_WIDTH = 50;
const SLOT_HEIGHT = 100;
const GRID_SIZE = 40; // Align with CSS background-size
const PILLAR_SIZE = 40;

function initCanvas() {
    canvas = new fabric.Canvas('parking-canvas', {
        width: window.innerWidth - 320,
        height: window.innerHeight,
        backgroundColor: 'transparent',
        selection: true,
        fireRightClick: true,
        stopContextMenu: true
    });

    // Infinite Canvas Panning + Tool Selection Logic
    // Unified Input Handling for PC and iPad
    let dragThreshold = 10;
    let initialTouchDistance = 0;
    let initialZoom = 1;

    canvas.on('mouse:down', function(opt) {
        let evt = opt.e;
        const isLottery = window.currentMode === 'lottery';
        
        // Potential panning if Alt, Right Click, Background, or Lottery mode
        if (evt.altKey === true || opt.button === 3 || !opt.target || isLottery) {
            this.isPreparingDrag = true;
            this.isDragging = false;
            
            // Disable selection box if we are panning or in lottery mode
            this.selection = false;

            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
            
            this.lastPosX = clientX;
            this.lastPosY = clientY;
            this.startX = clientX;
            this.startY = clientY;

            // Store initial distance for pinch-to-zoom
            if (evt.touches && evt.touches.length === 2) {
                initialTouchDistance = Math.hypot(
                    evt.touches[0].clientX - evt.touches[1].clientX,
                    evt.touches[0].clientY - evt.touches[1].clientY
                );
                initialZoom = canvas.getZoom();
                this.isPreparingDrag = false; // Zooming, not panning
                this.selection = false; // Explicitly disable selection for pinch
            }
        }
    });

    canvas.on('mouse:move', function(opt) {
        let e = opt.e;
        
        // Handle Pinch-to-Zoom
        if (e.touches && e.touches.length === 2) {
            this.isPreparingDrag = false;
            this.isDragging = false;
            this.selection = false;

            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            if (initialTouchDistance === 0) {
                initialTouchDistance = currentDistance;
                initialZoom = canvas.getZoom();
            } else {
                let zoom = (currentDistance / initialTouchDistance) * initialZoom;
                if (zoom > 5) zoom = 5;
                if (zoom < 0.2) zoom = 0.2;
                
                // Zoom at center of fingers
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const canvasBox = canvas.getElement().getBoundingClientRect();
                
                canvas.zoomToPoint({ 
                    x: centerX - canvasBox.left, 
                    y: centerY - canvasBox.top 
                }, zoom);
            }
            if (e.cancelable) e.preventDefault();
            return;
        }

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Transition from Preparing to Active Drag
        if (this.isPreparingDrag && !this.isDragging) {
            const moveX = Math.abs(clientX - this.startX);
            const moveY = Math.abs(clientY - this.startY);
            if (moveX > dragThreshold || moveY > dragThreshold) {
                this.isDragging = true;
                canvas.discardActiveObject();
                this.selection = false;
            }
        }

        if (this.isDragging) {
            let vpt = this.viewportTransform;
            vpt[4] += clientX - this.lastPosX;
            vpt[5] += clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = clientX;
            this.lastPosY = clientY;
        }

        const pointer = canvas.getPointer(opt.e);
        // Drawing tools (PC only, usually)
        if (!this.isDragging && !this.isPreparingDrag) {
            if (currentTool === 'pillar' && opt.e.buttons === 1) addPillar(pointer.x, pointer.y, false);
            if (currentTool === 'road' && opt.e.buttons === 1) addRoad(pointer.x, pointer.y);
            if (currentTool === 'eraser' && opt.e.buttons === 1 && opt.target) {
                canvas.remove(opt.target);
                canvas.requestRenderAll();
            }
        }
    });

    canvas.on('mouse:up', function(opt) {
        this.setViewportTransform(this.viewportTransform);
        this.wasDragging = this.isDragging;
        this.isDragging = false;
        this.isPreparingDrag = false;
        
        // Only restore selection if in editor mode
        this.selection = window.currentMode === 'editor';
        
        initialTouchDistance = 0;
    });

    // Zoom Handling (PC Mouse Wheel)
    canvas.on('mouse:wheel', function(opt) {
        let delta = opt.e.deltaY;
        let zoom = canvas.getZoom() * (0.999 ** delta);
        if (zoom > 5) zoom = 5;
        if (zoom < 0.2) zoom = 0.2;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    // Object double click for specific types
    canvas.on('mouse:dblclick', function(opt) {
        if (opt.target && opt.target.data?.type === 'slot') {
            showSlotModal(opt.target);
        }
    });

    // Handle single click actions (Eraser)
    canvas.on('mouse:down', function(opt) {
        if (currentTool === 'eraser' && opt.target) {
            canvas.remove(opt.target);
            canvas.requestRenderAll();
        }
    });
    // Initial Resize
    window.addEventListener('resize', () => {
        canvas.setDimensions({
            width: window.innerWidth - 200,
            height: window.innerHeight
        });
    });

    // Keep labels upright during rotation
    canvas.on('object:rotating', (opt) => {
        if (opt.target && opt.target.data?.type === 'slot') {
            updateSlotLabelRotation(opt.target);
        }
    });

    canvas.on('object:modified', (opt) => {
        if (opt.target && opt.target.data?.type === 'slot') {
            updateSlotLabelRotation(opt.target);
        }
    });
}

/**
 * Object Factories
 */

function createParkingSlot(x, y, angle = 0) {
    const rect = new fabric.Rect({
        width: SLOT_WIDTH,
        height: SLOT_HEIGHT,
        fill: 'rgba(56, 189, 248, 0.1)',
        stroke: '#38bdf8',
        strokeWidth: 2,
        rx: 4,
        ry: 4
    });

    const text = new fabric.Text('000', {
        fontSize: 14,
        fill: '#f8fafc',
        originX: 'center',
        originY: 'center',
        left: SLOT_WIDTH / 2,
        top: SLOT_HEIGHT / 2,
        fontFamily: 'Outfit'
    });

    const group = new fabric.Group([rect, text], {
        left: x,
        top: y,
        angle: angle,
        originX: 'center',
        originY: 'center'
    });

    group.data = {
        type: 'slot',
        id: '000',
        rating: 'B',
        isOccupied: false
    };

    // Only allow rotation and movement, NO SCALING
    group.setControlsVisibility({
        tr: false, 
        br: false, 
        bl: false, 
        tl: false,
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        mtr: true // Only Rotation handle
    });

    canvas.add(group);
    updateSlotLabelRotation(group);
    canvas.setActiveObject(group);
}

function updateSlotLabelRotation(slot) {
    if (!slot || slot.data?.type !== 'slot') return;
    const textObj = slot._objects.find(o => o.type === 'text');
    if (textObj) {
        // Set text angle to the negative of group angle to keep it at 0 absolute degrees
        textObj.set('angle', -slot.angle);
        canvas.requestRenderAll();
    }
}

function addPillar(x, y, single = true) {
    // Snap to Top-Left of the Grid Cell for perfect fill
    const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    // Check for existing pillar at this grid spot to prevent duplicates
    const objects = canvas.getObjects('rect').filter(o => o.data?.type === 'pillar');
    for (let obj of objects) {
        if (obj.left === snappedX && obj.top === snappedY) return;
    }

    const pillar = new fabric.Rect({
        left: snappedX,
        top: snappedY,
        width: PILLAR_SIZE,
        height: PILLAR_SIZE,
        fill: '#94a3b8',
        stroke: '#475569',
        strokeWidth: 1,
        originX: 'left',
        originY: 'top',
        selectable: false, // Prevents accidental dragging when brushing
        hoverCursor: 'default'
    });

    pillar.data = { type: 'pillar' };
    pillar.setControlsVisibility({
        tr: false, br: false, bl: false, tl: false,
        mt: false, mb: false, ml: false, mr: false,
        mtr: true
    });
    canvas.add(pillar);
}

function addElevator(x, y, type = 'public') {
    const isHome = type === 'home';
    const rect = new fabric.Rect({
        left: x,
        top: y,
        width: 60,
        height: 60,
        fill: isHome ? '#22c55e' : '#6366f1',
        stroke: isHome ? '#166534' : '#4f46e5',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
    });

    const text = new fabric.Text(isHome ? 'H' : 'E', {
        left: x,
        top: y,
        fontSize: 24,
        fill: 'white',
        originX: 'center',
        originY: 'center',
        fontWeight: 'bold'
    });

    const group = new fabric.Group([rect, text], {
        originX: 'center',
        originY: 'center'
    });
    
    group.data = { type: isHome ? 'elevator-home' : 'elevator' };
    group.setControlsVisibility({
        tr: false, br: false, bl: false, tl: false,
        mt: false, mb: false, ml: false, mr: false,
        mtr: true
    });

    canvas.add(group);
}

function addRoad(x, y) {
    // Snap to Top-Left of the Grid Cell
    const snappedX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    // Check for existing road/pillar at this grid spot
    const objects = canvas.getObjects('rect').filter(o => o.data?.type === 'road' || o.data?.type === 'pillar');
    for (let obj of objects) {
        if (obj.left === snappedX && obj.top === snappedY) return;
    }

    const road = new fabric.Rect({
        left: snappedX,
        top: snappedY,
        width: GRID_SIZE,
        height: GRID_SIZE,
        fill: 'rgba(234, 179, 8, 0.4)', // Yellow (tailored to neon theme)
        stroke: '#eab308',
        strokeWidth: 1,
        originX: 'left',
        originY: 'top',
        selectable: false,
        hoverCursor: 'default'
    });

    road.data = { type: 'road' };
    canvas.add(road);
}

function startRoadDrawing() {
    // Legacy support for pencil drawing - removing as per request
    canvas.isDrawingMode = false;
}

function stopRoadDrawing() {
    canvas.isDrawingMode = false;
}

function clearSession() {
    localStorage.removeItem('parkingspace_backup');
    localStorage.removeItem('parkingspace_filename');
}

// Export / Import State
let currentFileHandle = null;
let currentFileName = "全新內容";

async function exportToJSON(forcePrompt = false) {
    const data = JSON.stringify(canvas.toJSON(['data']), null, 2);
    
    // Use existing handle if available and not forcing prompt
    if (currentFileHandle && !forcePrompt) {
        try {
            const writable = await currentFileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            console.log('Directly saved to existing handle');
            return true;
        } catch (err) {
            console.error('Direct save failed:', err);
            // Fall through to file picker if direct save fails
        }
    }

    // Standard Save As flow
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: currentFileName === "全新內容" ? 'parking-layout.json' : currentFileName,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            currentFileHandle = handle;
            currentFileName = handle.name;
            const writable = await handle.createWritable();
            await writable.write(data);
            await writable.close();
            updateAppTitle();
            return true;
        } catch (err) {
            console.error('Save canceled or failed', err);
            return false;
        }
    } else {
        // Fallback for older browsers
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName === "全新內容" ? 'parking-layout.json' : currentFileName;
        a.click();
        return true;
    }
}

async function handleLoadFile(callback) {
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
                multiple: false
            });
            const file = await handle.getFile();
            const content = await file.text();
            
            importFromJSON(content, callback);
            currentFileHandle = handle;
            currentFileName = handle.name;
        } catch (err) {
            console.error('Load canceled', err);
        }
    } else {
        // Fallback input trigger (handled in app.js for now)
        return 'fallback';
    }
}

function importFromJSON(jsonString, callback) {
    canvas.loadFromJSON(jsonString, () => {
        canvas.getObjects().forEach(obj => {
            if (obj.data?.type === 'pillar' || obj.data?.type === 'road') {
                obj.set({
                    selectable: false,
                    hoverCursor: 'default'
                });
            }
            if (obj.data?.type === 'slot') {
                updateSlotLabelRotation(obj);
            }
        });
        canvas.renderAll();
        if (callback) callback();
    });
}
