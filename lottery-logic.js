/**
 * Lottery Logic - Handles the selection process and recommendation
 */

let lotteryActive = false;

function initLottery() {
    const input = document.getElementById('slot-input');
    const markBtn = document.getElementById('btn-mark-occupied');
    const recommendBtn = document.getElementById('btn-recommend');

    markBtn.addEventListener('click', () => {
        markOccupied(input.value);
        input.value = '';
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            markOccupied(input.value);
            input.value = '';
        }
    });

    recommendBtn.addEventListener('click', showRecommendations);
}

function startLottery() {
    lotteryActive = true;
    // Reset all slots
    const slots = getAllSlots();
    slots.forEach(slot => {
        slot.data.isOccupied = false;
        updateSlotVisual(slot);
    });
    alert("抽選開始！所有車位已重置。");
}

function getAllSlots() {
    return canvas.getObjects().filter(obj => obj.data?.type === 'slot');
}

function markOccupied(slotId) {
    const slots = getAllSlots();
    const target = slots.find(s => s.data.id === slotId);

    if (target) {
        target.data.isOccupied = true;
        updateSlotVisual(target);
        // Removed the "X" lines logic as per user request
    } else {
        alert("找不到此車位號碼：" + slotId);
    }
    canvas.renderAll();
}

function updateSlotVisual(slot) {
    const rect = slot._objects[0];
    if (slot.data.isOccupied) {
        rect.set('fill', 'rgba(239, 68, 68, 0.4)'); // Darker red for occupied
        rect.set('stroke', '#ef4444');
    } else {
        rect.set('fill', 'rgba(56, 189, 248, 0.1)');
        rect.set('stroke', '#38bdf8');
    }
    canvas.renderAll();
}

function showRecommendations() {
    const listContainer = document.getElementById('recommendation-list');
    listContainer.innerHTML = '';

    const available = getAllSlots()
        .filter(s => !s.data.isOccupied) // Fixed: use .data.isOccupied
        .sort((a, b) => a.data.rating.localeCompare(b.data.rating));

    if (available.length === 0) {
        listContainer.innerHTML = '<div class="no-results">無剩餘車位</div>';
        return;
    }

    available.forEach(slot => {
        const item = document.createElement('div');
        item.className = `rec-item rating-${slot.data.rating}`;
        item.innerHTML = `
            <span><strong>${slot.data.id}</strong> (評價 ${slot.data.rating})</span>
            <span class="status-badge">空置</span>
        `;
        item.onclick = () => highlightSlot(slot);
        listContainer.appendChild(item);
    });
}

function highlightSlot(slot) {
    // Set Zoom
    const targetZoom = 1.5;
    canvas.setZoom(targetZoom);

    // Calculate Pan to center the slot
    // The viewport dimensions in canvas coordinates are (canvasWidth / zoom)
    const vpw = canvas.getWidth() / targetZoom;
    const vph = canvas.getHeight() / targetZoom;
    
    canvas.absolutePan({ 
        x: slot.left - vpw / 2, 
        y: slot.top - vph / 2 
    });

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
