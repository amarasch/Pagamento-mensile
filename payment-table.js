// Constants
const QUOTA_MINIMA = 5;

// DOM Elements
let paymentModal;
let paymentForm;
let lupettoSelect;
let meseSelect;
let importoInput;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeTable();
    initializeModal();
});

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