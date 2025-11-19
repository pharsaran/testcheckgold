// Initialize Socket.IO connection
const socket = io();

// State management
let currentPrices = {
    spot: { buy: 0, sell: 0 },
    gold9999: { buy: 0, sell: 0 },
    gold9650: { buy: 0, sell: 0 }
};

let currentStatuses = {
    spot: 'online',
    gold9999: 'online',
    gold9650: 'online'
};

// DOM Elements
const priceElements = {
    spot: document.getElementById('spot-price'),
    gold9999Buy: document.getElementById('gold9999-buy'),
    gold9999Sell: document.getElementById('gold9999-sell'),
    gold9650Buy: document.getElementById('gold9650-buy'),
    gold9650Sell: document.getElementById('gold9650-sell')
};

const statusModal = document.getElementById('status-modal');
const btnStatusControl = document.getElementById('btn-status-control');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnSaveStatus = document.getElementById('btn-save-status');
const btnBuy = document.getElementById('btn-buy');
const btnSell = document.getElementById('btn-sell');
const transactionTbody = document.getElementById('transaction-tbody');

// Update connection status
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (statusDot && statusText) {
        if (connected) {
            statusDot.classList.remove('disconnected');
            statusDot.classList.add('connected');
            statusText.textContent = 'เชื่อมต่อแล้ว';
        } else {
            statusDot.classList.remove('connected');
            statusDot.classList.add('disconnected');
            statusText.textContent = 'ตัดการเชื่อมต่อ';
        }
    }
}

// Update last update time
function updateLastUpdateTime() {
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdateEl.textContent = timeString;
    }
}

// Socket.IO Event Listeners
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
    Swal.fire({
        icon: 'success',
        title: 'เชื่อมต่อสำเร็จ',
        text: 'เชื่อมต่อกับเซิร์ฟเวอร์สำเร็จ',
        timer: 2000,
        showConfirmButton: false
    });
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
    Swal.fire({
        icon: 'error',
        title: 'ตัดการเชื่อมต่อ',
        text: 'ตัดการเชื่อมต่อจากเซิร์ฟเวอร์',
        timer: 2000,
        showConfirmButton: false
    });
});

socket.on('initialData', (data) => {
    console.log('Received initial data:', data);
    if (data.prices) {
        updatePrices(data.prices);
    }
    if (data.statuses) {
        updateStatusUI(data.statuses);
        currentStatuses = data.statuses;
    }
    if (data.transactions) {
        displayTransactions(data.transactions);
    }
});

socket.on('priceUpdate', (prices) => {
    console.log('Price updated:', prices);
    updatePrices(prices);
    updateLastUpdateTime();
});

socket.on('statusUpdate', (statuses) => {
    console.log('Status updated:', statuses);
    updateStatusUI(statuses);
    currentStatuses = statuses;
    Swal.fire({
        icon: 'success',
        title: 'อัปเดตสถานะสำเร็จ',
        timer: 2000,
        showConfirmButton: false
    });
});

socket.on('newTransaction', (transaction) => {
    console.log('New transaction:', transaction);
    addTransactionToTable(transaction);
});

// Price Update Functions
function updatePrices(prices) {
    currentPrices = prices;
    
    // Update Spot
    if (prices.spot) {
        const spotPrice = prices.spot.buy || prices.spot.sell || 0;
        priceElements.spot.textContent = formatNumber(spotPrice);
    }
    
    // Update Gold 99.99%
    if (prices.gold9999) {
        priceElements.gold9999Buy.textContent = formatNumber(prices.gold9999.buy || 0);
        priceElements.gold9999Sell.textContent = formatNumber(prices.gold9999.sell || 0);
    }
    
    // Update Gold 96.50%
    if (prices.gold9650) {
        priceElements.gold9650Buy.textContent = formatNumber(prices.gold9650.buy || 0);
        priceElements.gold9650Sell.textContent = formatNumber(prices.gold9650.sell || 0);
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// Status Control Functions
btnStatusControl.addEventListener('click', () => {
    statusModal.style.display = 'flex';
    loadCurrentStatuses();
});

btnCloseModal.addEventListener('click', () => {
    statusModal.style.display = 'none';
});

btnSaveStatus.addEventListener('click', async () => {
    const states = collectStatusStates();
    
    try {
        const response = await fetch('/api/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ states })
        });
        
        const result = await response.json();
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'บันทึกสถานะสำเร็จ',
                timer: 2000,
                showConfirmButton: false
            });
            statusModal.style.display = 'none';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'เกิดข้อผิดพลาดในการบันทึก',
                timer: 3000,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error saving status:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาดในการบันทึก',
            timer: 3000,
            showConfirmButton: false
        });
    }
});

function collectStatusStates() {
    const states = [];
    
    // Collect Spot status
    const spotRadio = document.querySelector('input[name="spot-status"]:checked');
    if (spotRadio) {
        states.push({ priceType: 'spot', status: spotRadio.value });
    }
    
    // Collect Gold 99.99% status
    const gold9999Radio = document.querySelector('input[name="gold9999-status"]:checked');
    if (gold9999Radio) {
        states.push({ priceType: 'gold9999', status: gold9999Radio.value });
    }
    
    // Collect Gold 96.50% status
    const gold9650Radio = document.querySelector('input[name="gold9650-status"]:checked');
    if (gold9650Radio) {
        states.push({ priceType: 'gold9650', status: gold9650Radio.value });
    }
    
    return states;
}

function updateStatusUI(statuses) {
    // Update radio buttons based on current statuses
    if (statuses.spot) {
        const spotRadio = document.querySelector(`input[name="spot-status"][value="${statuses.spot}"]`);
        if (spotRadio) spotRadio.checked = true;
    }
    
    if (statuses.gold9999) {
        const gold9999Radio = document.querySelector(`input[name="gold9999-status"][value="${statuses.gold9999}"]`);
        if (gold9999Radio) gold9999Radio.checked = true;
    }
    
    if (statuses.gold9650) {
        const gold9650Radio = document.querySelector(`input[name="gold9650-status"][value="${statuses.gold9650}"]`);
        if (gold9650Radio) gold9650Radio.checked = true;
    }
}

function loadCurrentStatuses() {
    updateStatusUI(currentStatuses);
}

// Transaction Functions
btnBuy.addEventListener('click', async () => {
    await createTransaction('GOLD', currentPrices.gold9999.buy || 64300, 'buy');
});

btnSell.addEventListener('click', async () => {
    await createTransaction('GOLD', currentPrices.gold9999.sell || 64400, 'sell');
});

async function createTransaction(symbol, price, state) {
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbol, price, state })
        });
        
        const result = await response.json();
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'ทำธุรกรรมสำเร็จ',
                text: `ทำธุรกรรม ${state.toUpperCase()} สำเร็จ`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'เกิดข้อผิดพลาดในการทำธุรกรรม',
                timer: 3000,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error creating transaction:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาดในการทำธุรกรรม',
            timer: 3000,
            showConfirmButton: false
        });
    }
}

function displayTransactions(transactions) {
    if (transactions.length === 0) {
        transactionTbody.innerHTML = '<tr><td colspan="4" class="loading">ไม่มีข้อมูลธุรกรรม</td></tr>';
        return;
    }
    
    transactionTbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${t.symbol}</td>
            <td>${formatNumber(t.price)}</td>
            <td class="state-${t.state}">${t.state.toUpperCase()}</td>
            <td>${formatDateTime(t.dateTime)}</td>
        </tr>
    `).join('');
}

function addTransactionToTable(transaction) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${transaction.symbol}</td>
        <td>${formatNumber(transaction.price)}</td>
        <td class="state-${transaction.state}">${transaction.state.toUpperCase()}</td>
        <td>${formatDateTime(transaction.dateTime)}</td>
    `;
    transactionTbody.insertBefore(row, transactionTbody.firstChild);
    
    // Remove last row if too many
    if (transactionTbody.children.length > 100) {
        transactionTbody.lastChild.remove();
    }
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

// Load initial transactions
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        const transactions = await response.json();
        displayTransactions(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// SweetAlert2 Helper Function (for backward compatibility if needed)
function showToast(message, type = 'success') {
    Swal.fire({
        icon: type === 'success' ? 'success' : 'error',
        title: type === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด',
        text: message,
        timer: 3000,
        showConfirmButton: false
    });
}

// Initialize
loadTransactions();
updateConnectionStatus(false); // Initial state
updateLastUpdateTime(); // Initial time

