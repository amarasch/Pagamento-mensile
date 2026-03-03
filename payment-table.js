// Constants
const QUOTA_MINIMA = 0;
const ADMIN_PHONE = "+393407265193";

// DOM Elements
let paymentModal;
let paymentForm;
let lupettoSelect;
let meseSelect;
let importoInput;
let quotaCancelleriaInput;
let quotaVDBInput;
let deletePaymentModal;
let deletePaymentForm;
let lupettoSelectDelete;
let meseSelectDelete;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeModal();
    initializeDeleteModal(); 
    loadSavedData();
    creaPulsanteCancella();
    quotaCancelleriaInput = document.getElementById('quotaCancelleria');
    quotaVDBInput = document.getElementById('quotaVDB');
    setupSearchInput();
    setupEventiCells();
});

async function saveTableData() {
    const tables = {
        principale: document.querySelector('table'),
        mensili: document.querySelector('.quote-mensili'),
        vdb: document.querySelector('.quote-vdb')
    };
    
    const data = {
        principale: {},
        mensili: {},
        vdb: {}
    };

    for (let [key, table] of Object.entries(tables)) {
        const headerCells = Array.from(table.querySelectorAll('thead th'));
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const nomeLupetto = row.cells[0].textContent.trim();
            const pagamenti = {};
            
            // Itera sulle celle della riga usando l'header come riferimento
            for (let i = 3; i <= 8; i++) {
                if (!headerCells[i]) continue;
                const mese = headerCells[i].textContent.trim();
                const value = row.cells[i] ? row.cells[i].textContent.replace('€', '').trim() : '';
                if (value && value !== '') {
                    pagamenti[mese] = value;
                }
            }
            
            if (Object.keys(pagamenti).length > 0) {
                data[key][nomeLupetto] = pagamenti;
            }
        });
    }

    // Salva su Firebase
    try {
        await window.db.collection('pagamenti').doc('tableData').set({
            data: data,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Dati salvati su Firebase');
    } catch (error) {
        console.error('❌ Errore salvataggio Firebase:', error);
        alert('Errore nel salvataggio online. Riprova.');
    }
}

async function loadSavedData() {
    try {
        const doc = await window.db.collection('pagamenti').doc('tableData').get();
        
        if (!doc.exists) {
            console.log('Nessun dato online disponibile');
            return;
        }
        
        const data = doc.data().data;
        
        const tables = {
            principale: document.querySelector('table'),
            mensili: document.querySelector('.quote-mensili'),
            vdb: document.querySelector('.quote-vdb')
        };

        for (let [key, table] of Object.entries(tables)) {
            const headerCells = Array.from(table.querySelectorAll('thead th'));
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const nomeLupetto = row.cells[0].textContent.trim();
                const savedData = data[key]?.[nomeLupetto];
                
                if (savedData) {
                    Object.entries(savedData).forEach(([mese, value]) => {
                        const cellIndex = headerCells.findIndex(cell => cell.textContent.trim() === mese);
                        
                        if (cellIndex >= 0 && row.cells[cellIndex]) {
                            row.cells[cellIndex].textContent = `€${value}`;
                        }
                    });
                    calcolaTotale(row);
                }
            });
        }
        
        console.log('✅ Dati caricati da Firebase');
    } catch (error) {
        console.error('Errore caricamento dati:', error);
    }
}

function initializeModal() {
    paymentModal = document.getElementById('paymentInputModal');
    paymentForm = document.getElementById('paymentForm');
    lupettoSelect = document.getElementById('selectLupetto');
    meseSelect = document.getElementById('selectMese');
    importoInput = document.getElementById('importo');

    document.getElementById('openPaymentModal').addEventListener('click', openModal);
    document.querySelector('.close-button').addEventListener('click', closeModal);
    document.querySelector('.cancel-btn').addEventListener('click', closeModal);
    paymentForm.addEventListener('submit', handlePaymentSubmit);

    window.addEventListener('click', (event) => {
        if (event.target === paymentModal) {
            closeModal();
        }
    });

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
    populateLupettoOptions();
    paymentForm.reset();
}

function closeModal() {
    paymentModal.style.display = 'none';
    paymentForm.reset();
}

function initializeDeleteModal() {
    deletePaymentModal = document.getElementById('deletePaymentModal');
    deletePaymentForm = document.getElementById('deletePaymentForm');
    lupettoSelectDelete = document.getElementById('selectLupettoDelete');
    meseSelectDelete = document.getElementById('selectMeseDelete');

    document.getElementById('openDeleteModal').addEventListener('click', openDeleteModal);
    document.querySelector('.close-button-delete').addEventListener('click', closeDeleteModal);
    document.querySelector('.cancel-btn-delete').addEventListener('click', closeDeleteModal);
    deletePaymentForm.addEventListener('submit', handleDeletePaymentSubmit);

    window.addEventListener('click', (event) => {
        if (event.target === deletePaymentModal) {
            closeDeleteModal();
        }
    });
}

function openDeleteModal() {
    deletePaymentModal.style.display = 'block';
    populateLupettoDeleteOptions();
    deletePaymentForm.reset();
}

function closeDeleteModal() {
    deletePaymentModal.style.display = 'none';
    deletePaymentForm.reset();
}

function populateLupettoDeleteOptions() {
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tbody tr');
    lupettoSelectDelete.innerHTML = '<option value="">Seleziona un lupetto</option>';

    rows.forEach((row, index) => {
        const nomeLupetto = row.cells[0].textContent.trim();
        if (nomeLupetto) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = nomeLupetto;
            lupettoSelectDelete.appendChild(option);
        }
    });
}

async function handleDeletePaymentSubmit(event) {
    event.preventDefault();

    const lupettoIndex = parseInt(lupettoSelectDelete.value);
    const meseIndex = parseInt(meseSelectDelete.value);

    const row = document.querySelector('table tbody').children[lupettoIndex];
    const nomeLupetto = row.cells[0].textContent;
    const mese = document.querySelector(`table thead th:nth-child(${meseIndex + 1})`).textContent;
    
    // Verifica se c'è un pagamento da cancellare
    const currentValue = row.cells[meseIndex].textContent.trim();
    if (!currentValue || currentValue === '') {
        alert('⚠️ Non c\'è nessun pagamento da cancellare per questo lupetto in questo mese!');
        return;
    }

    const confirmed = await showConfirmDialog(
        `Sei sicuro di voler cancellare il pagamento di ${currentValue} per ${nomeLupetto} nel mese di ${mese}?\n\n⚠️ Sarà cancellato ONLINE immediatamente!`,
        "Conferma Cancellazione"
    );

    if (confirmed) {
        // Cancella dalla tabella principale
        row.cells[meseIndex].textContent = '';
        
        // Cancella dalla tabella quote mensili
        const rowMensili = document.querySelector('.quote-mensili tbody').children[lupettoIndex];
        rowMensili.cells[meseIndex].textContent = '';
        
        // Cancella dalla tabella quote vdb
        const rowVDB = document.querySelector('.quote-vdb tbody').children[lupettoIndex];
        rowVDB.cells[meseIndex].textContent = '';
        
        // Salva SUBITO su Firebase
        await saveTableData();
        
        alert('✅ Pagamento cancellato ONLINE! Modifica visibile da tutti i dispositivi.');

        calcolaTotale(row);
        calcolaTotale(rowMensili);
        calcolaTotale(rowVDB);
        closeDeleteModal();
    }
}

async function handlePaymentSubmit(event) {
    event.preventDefault();

    const lupettoIndex = parseInt(lupettoSelect.value);
    const meseIndex = parseInt(meseSelect.value);
    const quotaCancelleria = parseFloat(quotaCancelleriaInput.value);
    const quotaVDB = parseFloat(quotaVDBInput.value);
    const importoTotale = quotaCancelleria + quotaVDB;

    const row = document.querySelector('table tbody').children[lupettoIndex];
    const nomeLupetto = row.cells[0].textContent;
    const nomeGenitore = row.cells[1].textContent;
    const telefono = row.cells[2].textContent;
    const mese = document.querySelector(`table thead th:nth-child(${meseIndex + 1})`).textContent;

    const confirmed = await showConfirmDialog(
        `Confermi l'inserimento delle quote:\nCancelleria: €${quotaCancelleria}\nVDB: €${quotaVDB}\nTotale: €${importoTotale}\nper ${nomeLupetto}?\n\n⚠️ Sarà salvato ONLINE immediatamente!`,
        "Conferma Pagamento"
    );

    if (confirmed) {
        // Aggiorna la tabella principale
        row.cells[meseIndex].textContent = `€${importoTotale}`;
        
        // Aggiorna la tabella quote mensili
        const rowMensili = document.querySelector('.quote-mensili tbody').children[lupettoIndex];
        rowMensili.cells[meseIndex].textContent = `€${quotaCancelleria}`;
        
        // Aggiorna la tabella quote vdb
        const rowVDB = document.querySelector('.quote-vdb tbody').children[lupettoIndex];
        rowVDB.cells[meseIndex].textContent = `€${quotaVDB}`;

        calcolaTotale(row);
        calcolaTotale(rowMensili);
        calcolaTotale(rowVDB);

        // Apri WhatsApp PRIMA dell'await (altrimenti Safari/iOS blocca il popup)
        const messaggio = `*Conferma Pagamento*\nQuota Totale: €${importoTotale}\n- Cancelleria: €${quotaCancelleria}\n- VDB: €${quotaVDB}\nper ${nomeLupetto} per il mese di ${mese}. Grazie!`;
        let whatsappWindow = null;
        if (telefono) {
            const numeroFormattato = telefono.replace(/\s+/g, '').replace('+', '');
            const encodedMessage = encodeURIComponent(messaggio);
            whatsappWindow = window.open(`https://wa.me/${numeroFormattato}?text=${encodedMessage}`, '_blank');
        }
        
        // Salva SUBITO su Firebase
        await saveTableData();
        
        alert('✅ Pagamento salvato ONLINE! Visibile da tutti i dispositivi.');

        closeModal();
    }
}

function calcolaTotale(row) {
    let totale = 0;
    for (let i = 3; i <= 8; i++) {
        const value = parseFloat(row.cells[i].textContent.replace('€', ''));
        if (!isNaN(value)) {
            totale += value;
        }
    }
    row.cells[9].textContent = `€${totale}`;
}

function apriMessaggioWhatsApp(numeroDestinatario, messaggio) {
    const numeroFormattato = numeroDestinatario.replace(/\s+/g, '');
    const numeroPulito = numeroFormattato.replace('+', '');
    const encodedMessage = encodeURIComponent(messaggio);
    const whatsappUrl = `https://wa.me/${numeroPulito}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

function showConfirmDialog(message, title) {
    return new Promise((resolve) => {
        const confirmed = confirm(message);
        resolve(confirmed);
    });
}

function setupSearchInput() {
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
}

function setupEventiCells() {
    // Gestione click sulle celle eventi - solo mostra/nascondi spunta
    const eventiCells = document.querySelectorAll('[data-label="Pagamento Eventi"]');
    eventiCells.forEach(cell => {
        cell.addEventListener('click', toggleEventoPagato);
    });
}

function toggleEventoPagato(event) {
    const cell = event.target;
    
    if (cell.innerHTML === '✓') {
        cell.innerHTML = '';
        cell.style.color = '';
        cell.style.fontWeight = '';
    } else {
        cell.innerHTML = '✓';
        cell.style.color = 'green';
        cell.style.fontWeight = 'bold';
    }
}

function creaPulsanteCancella() {
    const button = document.createElement('button');
    button.textContent = 'Cancella Tutti i Pagamenti Eventi';
    button.className = 'reset-button';

    button.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(
            'Sei sicuro di voler cancellare tutti i pagamenti eventi?',
            'Conferma Cancellazione'
        );
        
        if (confirmed) {
            const cells = document.querySelectorAll('[data-label="Pagamento Eventi"]');
            cells.forEach(cell => {
                cell.innerHTML = '';
                cell.style.color = '';
                cell.style.fontWeight = '';
            });
            alert('✅ Tutti i pagamenti eventi cancellati!');
        }
    });
    
    const buttonContainer = document.querySelector('.button-container');
    buttonContainer.appendChild(button);
}