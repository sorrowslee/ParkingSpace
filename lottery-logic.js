/**
 * @typedef {import('fabric').fabric} fabric
 */

let lotteryActive = false;

function initLottery() {
    // Bind Level Buttons
    ['A', 'B', 'C', 'D'].forEach(level => {
        const btn = document.getElementById(`btn-lottery-${level}`);
        if (btn) {
            btn.onclick = () => highlightLevelInViewport(level);
        }
    });

    // Bind Clear Button
    const clearBtn = document.getElementById('btn-lottery-clear');
    if (clearBtn) {
        clearBtn.onclick = clearAllHighlights;
    }
}

function toggleSlotStatus(slot) {
    if (!slot || slot.data?.type !== 'slot') return;
    
    // Toggle state
    slot.data.isOccupied = !slot.data.isOccupied;
    
    // Reset visual (removes any temporary highlights too)
    updateSlotVisual(slot);
    persistToLocal();
}

function updateSlotVisual(slot) {
    const rect = slot._objects.find(o => o.type === 'rect');
    if (!rect) return;

    if (slot.data.isOccupied) {
        rect.set({
            fill: 'rgba(239, 68, 68, 0.4)', // Occupied Red
            stroke: '#ef4444',
            strokeWidth: 2
        });
    } else {
        rect.set({
            fill: 'rgba(56, 189, 248, 0.1)', // Available Blue
            stroke: '#38bdf8',
            strokeWidth: 1
        });
    }
    canvas.requestRenderAll();
}

/**
 * Highlights slots of a certain level that are currently visible on screen
 */
function highlightLevelInViewport(level) {
    // First clear existing highlights but preserve occupied status
    clearAllHighlights();

    // Mark button as active
    const activeBtn = document.getElementById(`btn-lottery-${level}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Robust viewport calculation
    const vptInv = fabric.util.invertTransform(canvas.viewportTransform);
    const topLeft = fabric.util.transformPoint({ x: 0, y: 0 }, vptInv);
    const bottomRight = fabric.util.transformPoint({ x: canvas.getWidth(), y: canvas.getHeight() }, vptInv);
    
    const visibleRect = {
        left: topLeft.x,
        top: topLeft.y,
        right: bottomRight.x,
        bottom: bottomRight.y
    };

    const slots = canvas.getObjects().filter(obj => obj.data?.type === 'slot');
    const targetRating = level.trim().toUpperCase();
    
    slots.forEach(slot => {
        const slotRating = (slot.data.rating || '').toString().trim().toUpperCase();
        const isMatch = slotRating === targetRating && !slot.data.isOccupied;
        const isInView = isObjectInRect(slot, visibleRect);

        if (isMatch && isInView) {
            const rect = slot._objects.find(o => o.type === 'rect');
            if (rect) {
                rect.set({
                    stroke: '#fbbf24', // Highlight Gold
                    strokeWidth: 4,
                    shadow: new fabric.Shadow({
                        color: 'rgba(251, 191, 36, 0.8)',
                        blur: 15
                    })
                });
                slot.set('dirty', true); // Force group re-render
            }
        }
    });
    
    canvas.requestRenderAll();
}

function clearAllHighlights() {
    const slots = canvas.getObjects().filter(obj => obj.data?.type === 'slot');
    slots.forEach(slot => {
        updateSlotVisual(slot);
        const rect = slot._objects.find(o => o.type === 'rect');
        if (rect) {
            rect.set('shadow', null);
            slot.set('dirty', true);
        }
    });
    
    // Clear active button states
    document.querySelectorAll('.tool-btn.rating-A, .tool-btn.rating-B, .tool-btn.rating-C, .tool-btn.rating-D')
        .forEach(btn => btn.classList.remove('active'));

    canvas.requestRenderAll();
}

function isObjectInRect(obj, rect) {
    // Check if the center of the object is within the viewport rectangle
    // Add a small 20px buffer to be more lenient
    const buffer = 20;
    return (
        obj.left >= rect.left - buffer &&
        obj.left <= rect.right + buffer &&
        obj.top >= rect.top - buffer &&
        obj.top <= rect.bottom + buffer
    );
}

function getAllSlots() {
    return canvas.getObjects().filter(obj => obj.data?.type === 'slot');
}

function updateSlotVisual(slot) {
    const rect = slot._objects.find(o => o.type === 'rect');
    if (!rect) return;

    if (slot.data.isOccupied) {
        rect.set({
            fill: 'rgba(239, 68, 68, 0.4)', // Occupied Red
            stroke: '#ef4444',
            strokeWidth: 2
        });
    } else {
        rect.set({
            fill: 'rgba(56, 189, 248, 0.1)', // Available Blue
            stroke: '#38bdf8',
            strokeWidth: 1
        });
    }
    slot.set('dirty', true); // Ensure the group re-renders its cache
    canvas.requestRenderAll();
}
