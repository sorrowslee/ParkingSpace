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
    canvas.on('mouse:down', function(opt) {
        let evt = opt.e;
        // Alt key OR Right Click (button 3) starts panning
        if (evt.altKey === true || isPanning || opt.button === 3) {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
            // Prevent selection on right click
            canvas.discardActiveObject();
        } else if (currentTool === 'pillar' || currentTool === 'eraser' || currentTool === 'road') {
            // Disable selection box when using these tools
            this.selection = false;
        }
    });

    canvas.on('mouse:move', function(opt) {
        if (this.isDragging) {
            let e = opt.e;
            let vpt = this.viewportTransform;
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }

        const pointer = canvas.getPointer(opt.e);

        // Handle Continuous Pillar/Wall Brush
        if (currentTool === 'pillar' && opt.e.buttons === 1 && !this.isDragging) {
            addPillar(pointer.x, pointer.y, false);
        }

        // Handle Continuous Road Brush
        if (currentTool === 'road' && opt.e.buttons === 1 && !this.isDragging) {
            addRoad(pointer.x, pointer.y);
        }

        // Handle Continuous Eraser Brush
        if (currentTool === 'eraser' && opt.e.buttons === 1 && !this.isDragging) {
            if (opt.target) {
                canvas.remove(opt.target);
                canvas.requestRenderAll();
            }
        }
    });

    canvas.on('mouse:up', function(opt) {
        this.setViewportTransform(this.viewportTransform);
        this.isDragging = false;
        this.selection = true;
    });

    // Zoom Handling (simplified)
    canvas.on('mouse:wheel', function(opt) {
        let delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
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
            width: window.innerWidth - 320,
            height: window.innerHeight
        });
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
    canvas.setActiveObject(group);
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
        });
        canvas.renderAll();
        if (callback) callback();
    });
}
