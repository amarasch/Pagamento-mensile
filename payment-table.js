// Constants
const QUOTA_MINIMA = 5;
const ADMIN_PHONE = "+393407265193"; // Add the specific number here

// DOM Elements
let paymentModal;
let paymentForm;
let lupettoSelect;
let meseSelect;
let importoInput;

// Track changes
let modifiche = [];

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeTable();
    initializeModal();
    loadSavedData();
    setupSendChangesButton();
});

function setupSendChangesButton() {
    const button = document.createElement('button');
    button.id = 'sendChangesBtn';
    button.className = 'send-changes-btn';
    button.textContent = 'Invia Modifiche';
    button.onclick = inviaModifiche;
    
    const buttonContainer = document.querySelector('.button-container');
    buttonContainer.appendChild(button);
}

function saveToLocalStorage(row, cellIndex, value) {
    const storage = JSON.parse(localStorage.getItem('paymentData') || '{}');
    const nomeLupetto = row.cells[0].textContent;
    const nomeGenitore = row.cells[1].textContent;
    const mese = document.querySelector(`table thead th:nth-child(${cellIndex + 1})`).textContent;
    
    if (!storage[nomeLupetto]) {
        storage[nomeLupetto] = {};
    }
    
    storage[nomeLupetto][mese] = value;
    localStorage.setItem('paymentData', JSON.stringify(storage));
    
    // Add to modifiche array
    modifiche.push({
        nomeLupetto,
        nomeGenitore,
        mese,
        importo: value
    });
}

function loadSavedData() {
    const storage = JSON.parse(localStorage.getItem('paymentData') || '{}');
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const nomeLupetto = row.cells[0].textContent;
        const savedData = storage[nomeLupetto];
        
        if (savedData) {
            Object.entries(savedData).forEach(([mese, value]) => {
                const cellIndex = Array.from(row.parentElement.parentElement.querySelector('thead tr').cells)
                    .findIndex(cell => cell.textContent === mese);
                
                if (cellIndex >= 0) {
                    row.cells[cellIndex].textContent = `€${value}`;
                }
            });
            calcolaTotale(row);
        }
    });
}

async function inviaModifiche() {
    if (modifiche.length === 0) {
        alert('Non ci sono modifiche da inviare.');
        return;
    }

    let messaggio = 'Riepilogo Pagamenti:\n\n';
    modifiche.forEach(modifica => {
        messaggio += `${modifica.nomeLupetto} (${modifica.nomeGenitore}): €${modifica.importo} per ${modifica.mese}\n`;
    });

    const confirmed = await showConfirmDialog(
        'Vuoi inviare tutte le modifiche tramite SMS?',
        'Conferma Invio'
    );

    if (confirmed) {
        apriMessaggioSMS(ADMIN_PHONE, messaggio);
        modifiche = []; // Clear the changes after sending
    }
}


function initializeTable() {
    const table = document.querySelector('table');
    
    // Add click event listeners to all cells
    table.addEventListener('click', (event) => {
        const cell = event.target;
        if (cell.tagName === 'TD') {
            const cellIndex = cell.cellIndex;
            // Only make payment cells editable (columns 4-9, index 3-8)
            if (cellIndex >= 3 && cellIndex <= 8) {
                makeEditable(cell);
            }
        }
    });

    // Initialize empty cells with click-to-edit functionality
    const cells = table.querySelectorAll('td');
    cells.forEach(cell => {
        const cellIndex = cell.cellIndex;
        if (cellIndex >= 3 && cellIndex <= 8) {
            cell.setAttribute('title', 'Clicca per inserire un pagamento');
        }
    });
}

function makeEditable(cell) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = QUOTA_MINIMA;
    input.step = '0.01';
    input.value = cell.textContent.replace('€', '').trim();
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';

    const originalContent = cell.textContent;
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();

    input.addEventListener('blur', async () => {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            if (value > QUOTA_MINIMA) {
                const row = cell.parentElement;
                const nomeLupetto = row.cells[0].textContent;
                const telefono = row.cells[2].textContent;
                const mese = document.querySelector(`table thead th:nth-child(${cell.cellIndex + 1})`).textContent;

                const confirmed = await showConfirmDialog(
                    `Confermi l'inserimento della quota di €${value} per ${nomeLupetto}?`,
                    "Conferma Pagamento"
                );

                if (confirmed) {
                    cell.textContent = `€${value}`;
                    saveToLocalStorage(row, cell.cellIndex, value);
                    const messaggio = `Confermato il pagamento della quota di €${value} per ${nomeLupetto} per il mese di ${mese}. Grazie!`;
                    if (telefono) {
                        apriMessaggioSMS(telefono, messaggio);
                    }
                    calcolaTotale(row);
                } else {
                    cell.textContent = originalContent;
                }
            } else {
                alert(`La quota mensile deve essere maggiore di €${QUOTA_MINIMA}.`);
                cell.textContent = originalContent;
            }
        } else {
            cell.textContent = originalContent;
        }
    });


    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
        if (e.key === 'Escape') {
            cell.textContent = originalContent;
        }
    });
}

function initializeModal() {
    // Get modal elements
    paymentModal = document.getElementById('paymentInputModal');
    paymentForm = document.getElementById('paymentForm');
    lupettoSelect = document.getElementById('selectLupetto');
    meseSelect = document.getElementById('selectMese');
    importoInput = document.getElementById('importo');

    // Add event listeners
    document.getElementById('openPaymentModal').addEventListener('click', openModal);
    document.querySelector('.close-button').addEventListener('click', closeModal);
    document.querySelector('.cancel-btn').addEventListener('click', closeModal);
    paymentForm.addEventListener('submit', handlePaymentSubmit);

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === paymentModal) {
            closeModal();
        }
    });

    // Populate lupetto select options
    populateLupettoOptions();
}

function populateLupettoOptions() {
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tbody tr');
    lupettoSelect.innerHTML = '<option value="">Seleziona un lupetto</option>';

    rows.forEach((row, index) => {
        const nomeLupetto = row.cells[0].textContent.trim();
        if (nomeLupetto) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = nomeLupetto;
            lupettoSelect.appendChild(option);
        }
    });
}

function openModal() {
    paymentModal.style.display = 'block';
    populateLupettoOptions(); // Refresh options
    paymentForm.reset();
}

function closeModal() {
    paymentModal.style.display = 'none';
    paymentForm.reset();
}

async function handlePaymentSubmit(event) {
    event.preventDefault();

    const lupettoIndex = parseInt(lupettoSelect.value);
    const meseIndex = parseInt(meseSelect.value);
    const importo = parseFloat(importoInput.value);

    if (importo <= QUOTA_MINIMA) {
        alert(`La quota mensile deve essere maggiore di €${QUOTA_MINIMA}.`);
        return;
    }

    const row = document.querySelector('table tbody').children[lupettoIndex];
    const nomeLupetto = row.cells[0].textContent;
    const telefono = row.cells[2].textContent;
    const mese = document.querySelector(`table thead th:nth-child(${meseIndex + 1})`).textContent;

    const confirmed = await showConfirmDialog(
        `Confermi l'inserimento della quota di €${importo} per ${nomeLupetto}?`,
        "Conferma Pagamento"
    );

    if (confirmed) {
        // Update cell value with € symbol
        row.cells[meseIndex].textContent = `€${importo}`;

        // Send confirmation message
        const messaggio = `Confermato il pagamento della quota di €${importo} per ${nomeLupetto} per il mese di ${mese}. Grazie!`;
        if (telefono) {
            apriMessaggioSMS(telefono, messaggio);
        }

        // Calculate new total
        calcolaTotale(row);
        closeModal();
    }
}

function calcolaTotale(row) {
    let totale = 0;
    
    // Sum all payments (columns 4-9)
    for (let i = 3; i <= 8; i++) {
        const value = parseFloat(row.cells[i].textContent.replace('€', ''));
        if (!isNaN(value)) {
            totale += value;
        }
    }
    
    // Update total column (column 10) with € symbol
    row.cells[9].textContent = `€${totale}`;
}

function apriMessaggioSMS(numeroDestinatario, messaggio) {
    const encodedMessage = encodeURIComponent(messaggio);
    const url = `sms:${numeroDestinatario}?body=${encodedMessage}`;
    window.location.href = url;
}

function showConfirmDialog(message, title) {
    return new Promise((resolve) => {
        const confirmed = confirm(message);
        resolve(confirmed);
    });
}

// Aggiungi funzionalità di ricerca alla tabella

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Cerca...';
    searchInput.id = 'searchInput';
    searchInput.style.margin = '10px';
    searchInput.style.padding = '8px';
    searchInput.style.width = '80%';
    searchInput.style.fontSize = '16px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '4px';

    const tableContainer = document.querySelector('.table-container');
    tableContainer.insertBefore(searchInput, tableContainer.firstChild);

    searchInput.addEventListener('input', () => {
        const filter = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const match = cells.some(cell => cell.textContent.toLowerCase().includes(filter));
            row.style.display = match ? '' : 'none';
        });
    });

    // Stili CSS per ottimizzazione mobile
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @media screen and (max-width: 768px) {
            #searchInput {
                width: 100%;
                margin: 10px 0;
                font-size: 14px;
                padding: 10px;
            }
        }
    `;
    document.head.appendChild(styleTag);
});