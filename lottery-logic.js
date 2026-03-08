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

    // Bind ID search buttons
    const selectBtn = document.getElementById('btn-lottery-id-select');
    if (selectBtn) {
        selectBtn.onclick = () => {
            const input = document.getElementById('input-lottery-select');
            const id = input.value;
            if (setSlotOccupiedById(id, true)) {
                input.value = ''; // Clear input on success
            }
        };
    }

    // Bind Home Elevator Button
    const homeBtn = document.getElementById('btn-lottery-home');
    if (homeBtn) {
        homeBtn.onclick = centerOnHomeElevator;
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
    console.log(`[Lottery] 開始篩選等級: ${level}`);
    
    // First clear existing highlights
    clearAllHighlights();

    // Mark button as active
    const activeBtn = document.getElementById(`btn-lottery-${level}`);
    if (activeBtn) activeBtn.classList.add('active');

    const slots = getAllSlots();
    const targetRating = level.trim().toUpperCase();
    
    let foundCount = 0;
    let matchCount = 0;
    let visibleCount = 0;

    slots.forEach(slot => {
        foundCount++;
        const data = slot.data || {};
        const slotRating = (data.rating || '').toString().trim().toUpperCase();
        const isMatch = (slotRating === targetRating) && !data.isOccupied;
        
        if (isMatch) {
            matchCount++;
            slot.setCoords(); // Force recalculate bounding box
            if (slot.isOnScreen()) {
                visibleCount++;
                const rect = getRectFromSlot(slot);
                if (rect) {
                    rect.set({
                        stroke: '#fbbf24', // Highlight Gold
                        strokeWidth: 4,
                        shadow: new fabric.Shadow({
                            color: 'rgba(251, 191, 36, 0.8)',
                            blur: 15
                        })
                    });
                    slot.set('dirty', true); 
                    if (slot.group) slot.group.set('dirty', true);
                }
            }
        }
    });
    console.log(`[Lottery] 總計車位: ${foundCount}, 等級符合: ${matchCount}, 畫面內符合: ${visibleCount}`);
    canvas.requestRenderAll();

}

function clearAllHighlights() {
    const slots = getAllSlots();
    slots.forEach(slot => {
        updateSlotVisual(slot);
        const rect = getRectFromSlot(slot);
        if (rect) {
            rect.set('shadow', null);
            slot.set('dirty', true);
            if (slot.group) slot.group.set('dirty', true);
        }
    });
    
    document.querySelectorAll('.tool-btn.rating-A, .tool-btn.rating-B, .tool-btn.rating-C, .tool-btn.rating-D')
        .forEach(btn => btn.classList.remove('active'));

    canvas.requestRenderAll();
}

function getRectFromSlot(slot) {
    if (slot.type === 'rect') return slot;
    if (slot._objects) {
        return slot._objects.find(o => o.type === 'rect');
    }
    return null;
}

function getAllSlots() {
    // Look for anything with data.type === 'slot'
    return canvas.getObjects().filter(obj => obj.data?.type === 'slot');
}

function updateSlotVisual(slot) {
    if (!slot || !slot.data) return;
    
    const rect = getRectFromSlot(slot);
    if (!rect) return;

    if (slot.data.isOccupied) {
        rect.set({
            fill: 'rgba(239, 68, 68, 0.4)',
            stroke: '#ef4444',
            strokeWidth: 2
        });
    } else {
        rect.set({
            fill: 'rgba(56, 189, 248, 0.1)',
            stroke: '#38bdf8',
            strokeWidth: 1
        });
    }
    slot.set('dirty', true);
    if (slot.group) slot.group.set('dirty', true);
    canvas.requestRenderAll();
}

/**
 * Check if object is in viewport (deprecated in favor of isOnScreen)
 */
function isObjectInRect(obj, rect) {
    return obj.isOnScreen();
}

function setSlotOccupiedById(id, isOccupied) {
    if (!id) return false;
    const slots = getAllSlots();
    const slot = slots.find(s => s.data?.id === id);
    
    if (slot) {
        slot.data.isOccupied = isOccupied;
        updateSlotVisual(slot);
        persistToLocal();
        
        // Also pan to the slot so user can see it
        if (typeof highlightSlot === 'function') {
            highlightSlot(slot);
        }
        return true;
    } else {
        alert(`找不到車位號碼: ${id}`);
        return false;
    }
}

function centerOnHomeElevator() {
    const homeElevator = canvas.getObjects().find(o => o.data?.type === 'elevator-home');
    if (homeElevator) {
        if (typeof highlightSlot === 'function') {
            highlightSlot(homeElevator);
        }
    } else {
        alert('地圖中找不到「家電梯」！');
    }
}
