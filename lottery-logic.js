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

    const vpt = canvas.viewportTransform;
    
    // Get visible bounds
    const zoom = canvas.getZoom();
    const left = -vpt[4] / zoom;
    const top = -vpt[5] / zoom;
    const width = canvas.getWidth() / zoom;
    const height = canvas.getHeight() / zoom;
    
    const visibleRect = {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height
    };

    const slots = canvas.getObjects().filter(obj => obj.data?.type === 'slot');
    
    slots.forEach(slot => {
        const isMatch = slot.data.rating === level && !slot.data.isOccupied;
        const isInView = isObjectInRect(slot, visibleRect);

        if (isMatch && isInView) {
            const rect = slot._objects.find(o => o.type === 'rect');
            rect.set({
                stroke: '#fbbf24', // Highlight Gold
                strokeWidth: 4,
                shadow: new fabric.Shadow({
                    color: 'rgba(251, 191, 36, 0.8)',
                    blur: 15
                })
            });
        }
    });
    
    canvas.requestRenderAll();
}

function clearAllHighlights() {
    const slots = canvas.getObjects().filter(obj => obj.data?.type === 'slot');
    slots.forEach(slot => {
        updateSlotVisual(slot);
        const rect = slot._objects.find(o => o.type === 'rect');
        rect.set('shadow', null);
    });
    
    // Clear active button states
    document.querySelectorAll('.tool-btn.rating-A, .tool-btn.rating-B, .tool-btn.rating-C, .tool-btn.rating-D')
        .forEach(btn => btn.classList.remove('active'));

    canvas.requestRenderAll();
}

function isObjectInRect(obj, rect) {
    // Simple center-point check for viewport
    return (
        obj.left >= rect.left &&
        obj.left <= rect.right &&
        obj.top >= rect.top &&
        obj.top <= rect.bottom
    );
}

function getAllSlots() {
    return canvas.getObjects().filter(obj => obj.data?.type === 'slot');
}
