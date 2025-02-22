// Constants
const QUOTA_MINIMA = 0;
const ADMIN_PHONE = "+393407265193"; // Add the specific number here

// DOM Elements
let paymentModal;
let paymentForm;
let lupettoSelect;
let meseSelect;
let importoInput;
let quotaCancelleriaInput;
let quotaVDBInput;

// Track changes
let modifiche = [];

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeModal();
    loadSavedData();
    creaPulsanteCancella();
    quotaCancelleriaInput = document.getElementById('quotaCancelleria');
    quotaVDBInput = document.getElementById('quotaVDB');

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

function saveToLocalStorage() {
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tbody tr');
    const data = {};

    rows.forEach(row => {
        const nomeLupetto = row.cells[0].textContent;
        const pagamenti = {};
        
        // Save payments for each month (columns 3-8)
        for (let i = 3; i <= 8; i++) {
            const mese = table.querySelector(`thead th:nth-child(${i + 1})`).textContent;
            const value = row.cells[i].textContent.replace('€', '').trim();
            if (value) {
                pagamenti[mese] = value;
            }
        }
        
        if (Object.keys(pagamenti).length > 0) {
            data[nomeLupetto] = pagamenti;
        }
    });

    localStorage.setItem('paymentData', JSON.stringify(data));
}

function loadSavedData() {
    const data = JSON.parse(localStorage.getItem('tableData') || '{}');
    const tables = {
        principale: document.querySelector('table'),
        mensili: document.querySelector('.quote-mensili'),
        vdb: document.querySelector('.quote-vdb')
    };

    for (let [key, table] of Object.entries(tables)) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const nomeLupetto = row.cells[0].textContent;
            const savedData = data[key]?.[nomeLupetto];
            
            if (savedData) {
                Object.entries(savedData).forEach(([mese, value]) => {
                    const cellIndex = Array.from(table.querySelector('thead tr').cells)
                        .findIndex(cell => cell.textContent === mese);
                    
                    if (cellIndex >= 0) {
                        row.cells[cellIndex].textContent = `€${value}`;
                    }
                });
                calcolaTotale(row);
            }
        });
    }
}

// Modifica la funzione apriMessaggioSMS per usare WhatsApp
function apriMessaggioWhatsApp(numeroDestinatario, messaggio) {
    // Rimuovi eventuali spazi o caratteri speciali dal numero
    const numeroFormattato = numeroDestinatario.replace(/\s+/g, '');
    // Rimuovi il + iniziale se presente
    const numeroPulito = numeroFormattato.replace('+', '');
    
    // Crea il link per WhatsApp
    const encodedMessage = encodeURIComponent(messaggio);
    const whatsappUrl = `https://wa.me/${numeroPulito}?text=${encodedMessage}`;
    
    // Apri WhatsApp in una nuova finestra
    window.open(whatsappUrl, '_blank');
}

async function inviaModifiche() {
    const modifiche = getStoredModifiche();
    
    if (modifiche.length === 0) {
        alert('Non ci sono modifiche da inviare.');
        return;
    }

    let messaggio = '*Riepilogo Pagamenti:*\n\n';
        modifiche.forEach(modifica => {
        // Uso la formattazione di WhatsApp per il testo
        messaggio += ` *Conferma Pagamento*\nQuota Totale: €${modifica.importoTotale}\n- Cancelleria: €${modifica.quotaCancelleria}\n- VDB: €${modifica.quotaVDB}\nper ${modifica.nomeLupetto} per il mese di ${modifica.mese}. Grazie!\n\n ` ;
       
        
    });

    const confirmed = await showConfirmDialog(
        'Vuoi inviare tutte le modifiche tramite WhatsApp?',
        'Conferma Invio'
    );

    
    if (confirmed) {

        apriMessaggioWhatsApp(ADMIN_PHONE, messaggio);
        // Opzionale: pulisci le modifiche dopo l'invio
        localStorage.removeItem('modifiche');
        
    }
}


function getStoredModifiche() {
    return JSON.parse(localStorage.getItem('modifiche') || '[]');
}

function saveModifica(nomeLupetto, nomeGenitore, mese, importoTotale, quotaCancelleria, quotaVDB) {
    let modifiche = getStoredModifiche();
    modifiche.push({
        nomeLupetto,
        nomeGenitore,
        mese,
        importoTotale,
        quotaCancelleria,
        quotaVDB
    });
    localStorage.setItem('modifiche', JSON.stringify(modifiche));
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
    document.getElementById('sendChangesBtn').addEventListener('click', inviaModifiche);
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
    populateLupettoOptions(); // Refresh options
    paymentForm.reset();
}

function closeModal() {
    paymentModal.style.display = 'none';
    paymentForm.reset();
}

function saveTableData() {
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
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const nomeLupetto = row.cells[0].textContent;
            const pagamenti = {};
            
            for (let i = 3; i <= 8; i++) {
                const mese = table.querySelector(`thead th:nth-child(${i + 1})`).textContent;
                const value = row.cells[i].textContent.replace('€', '').trim();
                if (value) {
                    pagamenti[mese] = value;
                }
            }
            
            if (Object.keys(pagamenti).length > 0) {
                data[key][nomeLupetto] = pagamenti;
            }
        });
    }

    localStorage.setItem('tableData', JSON.stringify(data));
}



async function handlePaymentSubmit(event) {
    event.preventDefault();

    const lupettoIndex = parseInt(lupettoSelect.value);
    const meseIndex = parseInt(meseSelect.value);
    const quotaCancelleria = parseFloat(quotaCancelleriaInput.value);
    const quotaVDB = parseFloat(quotaVDBInput.value);
    const importoTotale = quotaCancelleria + quotaVDB;

    // if (quotaCancelleria <= QUOTA_MINIMA || quotaVDB <= QUOTA_MINIMA) {
    //     alert(`Ogni quota deve essere maggiore di €${QUOTA_MINIMA}.`);
    //     return;
    // }

    const row = document.querySelector('table tbody').children[lupettoIndex];
    const nomeLupetto = row.cells[0].textContent;
    const nomeGenitore = row.cells[1].textContent;
    const telefono = row.cells[2].textContent;
    const mese = document.querySelector(`table thead th:nth-child(${meseIndex + 1})`).textContent;

    const confirmed = await showConfirmDialog(
        `Confermi l'inserimento delle quote:\nCancelleria: €${quotaCancelleria}\nVDB: €${quotaVDB}\nTotale: €${importoTotale}\nper ${nomeLupetto}?`,
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
        
        saveModifica(nomeLupetto, nomeGenitore, mese, importoTotale, quotaCancelleria, quotaVDB);
        saveTableData();

        const messaggio = `*Conferma Pagamento*\nQuota Totale: €${importoTotale}\n- Cancelleria: €${quotaCancelleria}\n- VDB: €${quotaVDB}\nper ${nomeLupetto} per il mese di ${mese}. Grazie!`;
        if (telefono) {
            apriMessaggioWhatsApp(telefono, messaggio);
        }

        calcolaTotale(row);
        calcolaTotale(rowMensili);
        calcolaTotale(rowVDB);
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


document.addEventListener('DOMContentLoaded', () => {
    // Gestione click sulle celle eventi
    const eventiCells = document.querySelectorAll('[data-label="Pagamento Eventi"]');
    eventiCells.forEach(cell => {
        cell.addEventListener('click', toggleEventoPagato);
        
        // Recupera stato salvato
        const nomeLupetto = cell.parentElement.cells[0].textContent;
        const statoPagamento = localStorage.getItem(`evento_${nomeLupetto}`);
        if (statoPagamento === 'true') {
            cell.innerHTML = '✓';
            cell.style.color = 'green';
            cell.style.fontWeight = 'bold';
        }
    });

    // Aggiungi bottone reset
    const button = document.createElement('button');
    button.textContent = 'Cancella Tutti i Pagamenti Eventi';
    button.setAttribute('data-label', 'reset-button');
    
    button.addEventListener('click', async () => {
        if (confirm('Sei sicuro di voler cancellare tutti i pagamenti eventi?')) {
            eventiCells.forEach(cell => {
                cell.innerHTML = '';
                cell.style.color = '';
                cell.style.fontWeight = '';
                const nomeLupetto = cell.parentElement.cells[0].textContent;
                localStorage.removeItem(`evento_${nomeLupetto}`);
            });
        }
    });
    
});

function toggleEventoPagato(event) {
    const cell = event.target;
    const nomeLupetto = cell.parentElement.cells[0].textContent;
    
    if (cell.innerHTML === '✓') {
        cell.innerHTML = '';
        cell.style.color = '';
        cell.style.fontWeight = '';
        localStorage.removeItem(`evento_${nomeLupetto}`);
    } else {
        cell.innerHTML = '✓';
        cell.style.color = 'green';
        cell.style.fontWeight = 'bold';
        localStorage.setItem(`evento_${nomeLupetto}`, 'true');
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
            const cells = document.querySelectorAll('.eventi-cell');
            cells.forEach(cell => {
                cell.innerHTML = '';
                cell.style.color = '';
                cell.style.fontWeight = '';
                const nomeLupetto = cell.parentElement.cells[0].textContent;
                localStorage.removeItem(`evento_${nomeLupetto}`);
            });
        }
    });
    
    const buttonContainer = document.querySelector('.button-container');
    buttonContainer.appendChild(button);
}