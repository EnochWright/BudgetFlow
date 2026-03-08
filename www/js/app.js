/**
 * Main UI Controller for Budget Flow
 */

document.addEventListener('DOMContentLoaded', () => {

    // Elements
    const views = {
        dashboard: document.getElementById('view-dashboard')
    };

    const lists = {
        rules: document.getElementById('list-rules'),
        actuals: document.getElementById('list-actuals'),
        ledger: document.getElementById('list-ledger')
    };

    const containers = {
        rules: document.getElementById('rules-container'),
        actuals: document.getElementById('actuals-container'),
        ledger: document.getElementById('ledger-container')
    };

    const stats = {
        balance: document.getElementById('current-balance'),
        low: document.getElementById('projected-low'),
        lowLabel: document.getElementById('projected-low-label'),
        lowDate: document.getElementById('projected-low-date'),
        currentDate: document.getElementById('current-date-display')
    };

    const modal = {
        overlay: document.getElementById('transaction-modal'),
        form: document.getElementById('entry-form'),
        title: document.getElementById('modal-title'),
        btnDelete: document.getElementById('btn-delete'),
        types: document.querySelectorAll('input[name="entry_type"]'),
        ruleFields: document.getElementById('rule-fields'),
        actualFields: document.getElementById('actual-fields'),
        about: document.getElementById('about-modal'),
        closeAboutBtn: document.getElementById('close-about-btn'),
        reportBtn: document.getElementById('report-btn'),
        report: document.getElementById('report-modal'),
        closeReportBtn: document.getElementById('close-report-btn'),
        reportContent: document.getElementById('report-content')
    };

    const menu = {
        btn: document.getElementById('menu-btn'),
        dropdown: document.getElementById('dropdown-menu'),
        backupBtn: document.getElementById('backup-btn'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        resetBtn: document.getElementById('reset-btn'),
        importBtn: document.getElementById('import-btn'),
        fileInput: document.getElementById('import-file'),
        aboutBtn: document.getElementById('about-btn')
    };

    // State
    let chartInstance = null;
    let currentEditId = null;

    // --- Initialization ---

    function init() {
        stats.currentDate.textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        bindEvents();
        refreshUI();
    }

    function refreshUI() {
        renderRules();
        renderActuals();
        updateProjectionsAndChart();
    }

    // --- Event Binding ---

    function bindEvents() {
        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.list-view').forEach(v => v.classList.remove('active'));

                e.target.classList.add('active');
                lists[e.target.dataset.target.replace('list-', '')].classList.add('active');
            });
        });

        // Add Button
        document.getElementById('add-btn').addEventListener('click', () => {
            openModal();
        });

        // Modal Close
        document.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.overlay.addEventListener('click', (e) => {
            if (e.target === modal.overlay) closeModal();
        });

        // About Modal Events
        menu.aboutBtn.addEventListener('click', () => {
            menu.dropdown.classList.remove('show');
            modal.about.classList.add('active');
        });
        modal.closeAboutBtn.addEventListener('click', () => {
            modal.about.classList.remove('active');
        });
        modal.about.addEventListener('click', (e) => {
            if (e.target === modal.about) modal.about.classList.remove('active');
        });

        // Report Modal Events
        document.getElementById('report-btn').addEventListener('click', () => {
            renderMonthlyReport();
            modal.report.classList.add('active');
        });
        modal.closeReportBtn.addEventListener('click', () => {
            modal.report.classList.remove('active');
        });
        modal.report.addEventListener('click', (e) => {
            if (e.target === modal.report) modal.report.classList.remove('active');
        });

        // Modal Type Toggle
        modal.types.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const type = e.target.value;
                if (e.target.value === 'rule') {
                    modal.ruleFields.style.display = 'block';
                    modal.actualFields.style.display = 'none';
                    document.getElementById('entry-start-date').setAttribute('required', 'true');
                } else {
                    modal.ruleFields.style.display = 'none';
                    modal.actualFields.style.display = 'block';
                    document.getElementById('entry-start-date').removeAttribute('required');

                    // Default to today
                    if (!document.getElementById('actual-date').value) {
                        document.getElementById('actual-date').value = window.projections.formatLocalDate(new Date());
                    }
                }
            });
        });

        // Frequency Change Logic
        const frequencySelect = document.getElementById('entry-frequency');
        const dayOfMonthGroup = document.getElementById('group-day-of-month');
        const dayOfWeekGroup = document.getElementById('group-day-of-week');

        frequencySelect.addEventListener('change', (e) => {
            dayOfMonthGroup.style.display = 'none';
            dayOfWeekGroup.style.display = 'none';

            if (e.target.value === 'monthly') {
                dayOfMonthGroup.style.display = 'block';
            } else if (e.target.value === 'weekly') {
                dayOfWeekGroup.style.display = 'block';
            }
        });

        // Form Submit
        modal.form.addEventListener('submit', handleFormSubmit);

        // Delete Button
        modal.btnDelete.addEventListener('click', handleDelete);

        // Menu Toggle
        menu.btn.addEventListener('click', () => {
            menu.dropdown.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menu.btn.contains(e.target) && !menu.dropdown.contains(e.target)) {
                menu.dropdown.classList.remove('show');
            }
        });

        // Backup Data
        menu.backupBtn.addEventListener('click', handleBackup);

        // Export CSV
        menu.exportCsvBtn.addEventListener('click', handleExportCSV);

        // Reset Data
        menu.resetBtn.addEventListener('click', handleReset);

        // Import Data
        menu.importBtn.addEventListener('click', () => {
            menu.dropdown.classList.remove('show');
            menu.fileInput.click();
        });
        menu.fileInput.addEventListener('change', handleImport);

        // Projection Days Control
        document.getElementById('projection-days').addEventListener('change', (e) => {
            let days = parseInt(e.target.value) || 60;
            days = Math.max(7, Math.min(365, days)); // Clamp between 1 week and 1 year
            e.target.value = days;
            updateProjectionsAndChart();
        });
    }

    // --- Modal Logic ---

    function openModal(editItem = null, type = 'rule') {
        currentEditId = editItem ? editItem.id : null;
        modal.form.reset();
        modal.title.textContent = editItem ? 'Edit Entry' : 'New Entry';
        modal.btnDelete.style.display = editItem ? 'block' : 'none';

        // Set Type Toggle
        document.querySelector(`input[name="entry_type"][value="${type}"]`).checked = true;
        document.querySelector(`input[name="entry_type"][value="${type}"]`).dispatchEvent(new Event('change'));

        // Reset display state of conditionally shown fields
        document.getElementById('group-day-of-month').style.display = 'none';
        document.getElementById('group-day-of-week').style.display = 'none';

        // Disable toggle if editing
        modal.types.forEach(r => r.disabled = !!editItem);

        if (editItem) {
            document.getElementById('entry-flow-type').value = editItem.type;
            document.getElementById('entry-name').value = editItem.name;
            document.getElementById('entry-amount').value = editItem.amount;

            if (type === 'rule') {
                document.getElementById('entry-frequency').value = editItem.frequency;
                document.getElementById('entry-day-of-month').value = editItem.dayOfMonth || '';

                // For weekly: setup dayOfWeek
                if (editItem.frequency === 'weekly') {
                    document.getElementById('entry-day-of-week').value = editItem.dayOfWeek || 0;
                }

                document.getElementById('entry-start-date').value = editItem.startDate;
                if (editItem.endDate) document.getElementById('entry-end-date').value = editItem.endDate;

                // Trigger frequency change to hide/show Day of Month appropriately
                document.getElementById('entry-frequency').dispatchEvent(new Event('change'));
            } else {
                document.getElementById('actual-date').value = editItem.date;
            }
        } else {
            // Defaults for new
            const today = window.projections.formatLocalDate(new Date());
            document.getElementById('entry-start-date').value = today;
            document.getElementById('entry-day-of-month').value = new Date().getDate();
            document.getElementById('actual-date').value = today;
            document.getElementById('entry-frequency').value = 'monthly';
            document.getElementById('entry-frequency').dispatchEvent(new Event('change'));
        }

        modal.overlay.classList.add('active');
    }

    function openQuickLogModal(rule, nextDateStr) {
        currentEditId = null; // Creating a new actual, NOT editing the rule
        modal.form.reset();
        modal.title.textContent = 'Log Actual';
        modal.btnDelete.style.display = 'none';

        // Force actual mode
        document.querySelector(`input[name="entry_type"][value="actual"]`).checked = true;
        document.querySelector(`input[name="entry_type"][value="actual"]`).dispatchEvent(new Event('change'));
        modal.types.forEach(r => r.disabled = true); // Lock to actual

        // Pre-fill fields from rule
        document.getElementById('entry-flow-type').value = rule.type;
        document.getElementById('entry-name').value = rule.name;
        document.getElementById('entry-amount').value = rule.amount;

        // Use the next date if available, otherwise fallback to today
        const defaultDate = nextDateStr || window.projections.formatLocalDate(new Date());
        document.getElementById('actual-date').value = defaultDate;

        modal.overlay.classList.add('active');
    }

    function closeModal() {
        modal.overlay.classList.remove('active');
        currentEditId = null; // Reset so next 'Add' is truly new
    }

    // --- Report Logic ---
    function renderMonthlyReport() {
        const rules = window.db.getRules();
        let totalIncome = 0;
        let totalExpense = 0;

        let incomeItems = [];
        let expenseItems = [];

        rules.forEach(rule => {
            if (rule.frequency === 'one-off') return; // Skip one-offs for the monthly normalized budget

            let monthlyAmount = parseFloat(rule.amount);
            if (rule.frequency === 'weekly') {
                monthlyAmount = monthlyAmount * (52 / 12);
            } else if (rule.frequency === 'bi-weekly') {
                monthlyAmount = monthlyAmount * (26 / 12);
            } else if (rule.frequency === 'bi-monthly') {
                monthlyAmount = monthlyAmount * 2;
            }

            const itemHtml = `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--card-border);">
                    <div>
                        <div style="font-weight: 500;">${rule.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: capitalize;">${rule.frequency}</div>
                    </div>
                    <div style="font-weight: 600;">${formatCurrency(monthlyAmount)}</div>
                </div>
            `;

            if (rule.type === 'inflow') {
                totalIncome += monthlyAmount;
                incomeItems.push({ html: itemHtml, amount: monthlyAmount });
            } else {
                totalExpense += monthlyAmount;
                expenseItems.push({ html: itemHtml, amount: monthlyAmount });
            }
        });

        // Sort descending by amount
        incomeItems.sort((a, b) => b.amount - a.amount);
        expenseItems.sort((a, b) => b.amount - a.amount);

        const incomeHtml = incomeItems.map(i => i.html).join('');
        const expenseHtml = expenseItems.map(i => i.html).join('');

        const netTotal = totalIncome - totalExpense;
        const netColor = netTotal >= 0 ? 'var(--success)' : 'var(--danger)';

        modal.reportContent.innerHTML = `
            <div class="stat-card primary-gradient" style="margin-bottom: 20px;">
                <span class="stat-label">Monthly Net Cash Flow</span>
                <h2 class="stat-value" style="color: ${netTotal >= 0 ? '#fff' : '#ff9999'};">${formatCurrency(netTotal)}</h2>
            </div>

            <h3 style="color: var(--success); margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid var(--success); padding-bottom: 5px;">Incomes (${formatCurrency(totalIncome)})</h3>
            <div style="margin-bottom: 25px;">
                ${incomeHtml || '<p style="color: var(--text-muted); font-size: 0.9rem;">No recurring incomes found.</p>'}
            </div>

            <h3 style="color: var(--danger); margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid var(--danger); padding-bottom: 5px;">Expenses (${formatCurrency(totalExpense)})</h3>
            <div style="margin-bottom: 25px;">
                ${expenseHtml || '<p style="color: var(--text-muted); font-size: 0.9rem;">No recurring expenses found.</p>'}
            </div>
        `;
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const typeRadio = document.querySelector('input[name="entry_type"]:checked').value;
        const flowType = document.getElementById('entry-flow-type').value;
        const name = document.getElementById('entry-name').value;
        const amount = parseFloat(document.getElementById('entry-amount').value);

        if (typeRadio === 'rule') {
            const rule = {
                id: currentEditId,
                type: flowType,
                name, amount,
                frequency: document.getElementById('entry-frequency').value,
                dayOfMonth: parseInt(document.getElementById('entry-day-of-month').value) || 1,
                dayOfWeek: parseInt(document.getElementById('entry-day-of-week').value) || 0,
                startDate: document.getElementById('entry-start-date').value,
                endDate: document.getElementById('entry-end-date').value || null
            };
            window.db.saveRule(rule);
        } else {
            const actual = {
                id: currentEditId,
                type: flowType,
                name, amount,
                date: document.getElementById('actual-date').value
            };
            window.db.saveActual(actual);
        }

        closeModal();
        currentEditId = null; // Clear edit state so subsequent adds don't overwrite
        refreshUI();
    }

    function handleDelete(e) {
        e.preventDefault();
        if (!currentEditId) return;

        const typeRadio = document.querySelector('input[name="entry_type"]:checked').value;
        if (confirm('Are you sure you want to delete this?')) {
            if (typeRadio === 'rule') {
                window.db.deleteRule(currentEditId);
            } else {
                window.db.deleteActual(currentEditId);
            }
            closeModal();
            refreshUI();
        }
    }

    // --- Data Import/Export ---

    async function shareNativeFile(fileName, data, encoding = 'utf8') {
        try {
            const Filesystem = window.Capacitor.Plugins.Filesystem;
            const Share = window.Capacitor.Plugins.Share;

            if (!Filesystem || !Share) {
                throw new Error("Filesystem or Share plugin not found. Ensure they are installed and synced.");
            }

            const writeResult = await Filesystem.writeFile({
                path: fileName,
                data: data,
                directory: 'CACHE',
                encoding: encoding
            });

            await Share.share({
                title: fileName,
                url: writeResult.uri,
                dialogTitle: 'Save or Share'
            });
        } catch (err) {
            console.error('Error sharing native file:', err);
            alert('Failed to share file: ' + err.message);
        }
    }

    function downloadWebFile(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleBackup() {
        menu.dropdown.classList.remove('show');
        const rules = window.db.getRules();
        const actuals = window.db.getActuals();

        const backup = {
            version: 1,
            timestamp: new Date().toISOString(),
            rules,
            actuals
        };

        const dataStr = JSON.stringify(backup, null, 2);
        const fileName = `BudgetFlow_Backup_${window.projections.formatLocalDate(new Date())}.json`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            shareNativeFile(fileName, dataStr, 'utf8');
        } else {
            const blob = new Blob([dataStr], { type: 'application/json' });
            downloadWebFile(blob, fileName);
        }
    }

    function handleExportCSV() {
        menu.dropdown.classList.remove('show');
        const actuals = window.db.getActuals();

        // CSV Header
        let csvContent = "Date,Name,Type,Amount,Status\n";

        // Sort actuals oldest first for traditional ledger view, or keep newest first
        const sortedActuals = [...actuals].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedActuals.forEach(actual => {
            const safeName = actual.name.replace(/"/g, '""');
            const status = actual.isSkip ? "Skipped" : "Logged";
            const row = `"${actual.date}","${safeName}","${actual.type}","${actual.amount}","${status}"`;
            csvContent += row + "\n";
        });

        const fileName = `BudgetFlow_Actuals_${window.projections.formatLocalDate(new Date())}.csv`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            shareNativeFile(fileName, csvContent, 'utf8');
        } else {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            downloadWebFile(blob, fileName);
        }
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.rules && data.actuals) {
                    if (confirm('This will overwrite all existing data. Are you sure you want to proceed?')) {
                        localStorage.setItem('ebf_rules', JSON.stringify(data.rules));
                        localStorage.setItem('ebf_actuals', JSON.stringify(data.actuals));
                        // Re-trigger refresh from app to grab the new localStorage
                        refreshUI();
                        alert('Data successfully imported!');
                    }
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
            // Reset input so the same file can be selected again if needed
            e.target.value = '';
        };
        reader.readAsText(file);
    }

    function handleReset() {
        menu.dropdown.classList.remove('show');
        if (confirm("WARNING: You are about to delete ALL data. Proceed?")) {
            if (confirm("FINAL CONFIRMATION: This action is permanent and cannot be undone. Click OK to wipe all data.")) {
                window.db.clearAll();
                refreshUI();
            }
        }
    }

    // --- Rendering logic ---

    function formatCurrency(num) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }

    function renderRules() {
        const rules = window.db.getRules();
        const actuals = window.db.getActuals();

        // Sort: Inflow first, then alphabetical
        rules.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'inflow' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        containers.rules.innerHTML = '';

        if (rules.length === 0) {
            containers.rules.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">No projection rules found.</p>';
            return;
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        rules.forEach(rule => {
            const div = document.createElement('div');
            div.className = 'list-item';

            const amtClass = rule.type === 'inflow' ? 'amount-inflow' : 'amount-outflow';
            const sign = rule.type === 'inflow' ? '+' : '-';

            // Calculate Next Date
            const nextDate = window.projections.getNextOccurrenceDate(rule, actuals);

            // Check if past due
            let isPastDue = false;
            if (nextDate) {
                const todayStr = window.projections.formatLocalDate(new Date());
                if (nextDate < todayStr) isPastDue = true;
            }

            const nextDateStr = nextDate ? `Next: ${nextDate}${isPastDue ? ' (Past Due)' : ''}` : 'Inactive';
            const pastDueColor = isPastDue ? 'color: var(--danger); font-weight: 600;' : '';

            let freqText = '';
            if (rule.frequency === 'weekly') {
                const dayIndex = rule.dayOfWeek !== undefined ? parseInt(rule.dayOfWeek) : 0;
                freqText = `Weekly (${dayNames[dayIndex]})`;
            } else if (rule.frequency === 'one-off') {
                freqText = 'One-off';
            } else {
                freqText = `Monthly (Day ${rule.dayOfMonth || 'N/A'})`;
            }

            div.innerHTML = `
                <div class="item-main" style="flex: 1;">
                    <span class="item-name">${rule.name}</span>
                    <span class="item-meta">${freqText} • <span style="${pastDueColor}">${nextDateStr}</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="item-amount ${amtClass}">${sign}${formatCurrency(rule.amount)}</div>
                    <button class="icon-btn quick-log-btn" title="Log as Actual" data-id="${rule.id}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button class="icon-btn skip-btn" title="Skip Occurrence" data-id="${rule.id}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;

            // Row click edits rule
            div.querySelector('.item-main').addEventListener('click', () => openModal(rule, 'rule'));
            div.querySelector('.item-amount').addEventListener('click', () => openModal(rule, 'rule'));

            // Explicit quick-log button listener
            div.querySelector('.quick-log-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // prevent opening rule edit modal
                openQuickLogModal(rule, nextDate);
            });

            // Skip button listener
            div.querySelector('.skip-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                // Use 'nextDate' if available, otherwise fallback to today.
                const skipDate = nextDate || window.projections.formatLocalDate(new Date());
                if (confirm(`Skip the occurrence on ${skipDate} for ${rule.name}?`)) {
                    const skipActual = {
                        type: rule.type,
                        name: rule.name,
                        amount: 0, // amount doesn't matter for skip, but 0 prevents any balance impact
                        date: skipDate,
                        isSkip: true
                    };
                    window.db.saveActual(skipActual);
                    refreshUI();
                }
            });

            containers.rules.appendChild(div);
        });
    }

    function renderActuals() {
        const actuals = window.db.getActuals();
        // Sort newest first
        actuals.sort((a, b) => new Date(b.date) - new Date(a.date));

        containers.actuals.innerHTML = '';

        if (actuals.length === 0) {
            containers.actuals.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">No actuals logged yet.</p>';
            return;
        }

        actuals.forEach(actual => {
            const div = document.createElement('div');
            div.className = 'list-item';

            if (actual.isSkip) {
                div.innerHTML = `
                    <div class="item-main">
                        <span class="item-name" style="text-decoration: line-through; color: var(--text-muted);">${actual.name} (Skipped)</span>
                        <span class="item-meta">${actual.date}</span>
                    </div>
                    <div class="item-amount" style="color: var(--text-muted); padding-right: 15px;">Skipped</div>
                `;
            } else {
                const amtClass = actual.type === 'inflow' ? 'amount-inflow' : 'amount-outflow';
                const sign = actual.type === 'inflow' ? '+' : '-';

                div.innerHTML = `
                    <div class="item-main">
                        <span class="item-name">${actual.name}</span>
                        <span class="item-meta">${actual.date}</span>
                    </div>
                    <div class="item-amount ${amtClass}">${sign}${formatCurrency(actual.amount)}</div>
                `;
            }

            div.addEventListener('click', () => openModal(actual, 'actual'));
            containers.actuals.appendChild(div);
        });
    }

    // --- Chart & Projections ---

    function updateProjectionsAndChart() {
        // Project based on input
        const daysInput = document.getElementById('projection-days');
        const daysToProject = parseInt(daysInput.value) || 60;

        // Project next N days
        const { projections: data, rawActualBalance, todayDeductions } = window.projections.generateProjections(daysToProject);

        if (!data || data.length === 0) return;

        // Update Stats
        const currentBal = data[0].balance;
        stats.balance.textContent = formatCurrency(currentBal);

        // Render sub-label
        const todayDateText = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        // Display actual balance, and if there are deductions, show them explicitly
        if (todayDeductions !== 0) {
            stats.currentDate.textContent = `Actual: ${formatCurrency(rawActualBalance)} • Deductions: ${formatCurrency(todayDeductions)}`;
        } else {
            stats.currentDate.textContent = `Actual: ${formatCurrency(rawActualBalance)}`;
        }

        // Dynamically calculate low for the exact requested range
        const projectionWindowData = data.slice(0, daysToProject);
        const lowestPoint = Math.min(...projectionWindowData.map(d => d.balance));
        const lowestPointData = projectionWindowData.find(d => d.balance === lowestPoint);

        stats.low.textContent = formatCurrency(lowestPoint);
        stats.lowLabel.textContent = `${daysToProject}-Day Low`;

        if (lowestPointData && lowestPointData.date) {
            const lowDateObj = window.projections.parseLocalDate(lowestPointData.date);
            stats.lowDate.textContent = `Occurs on ${lowDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            stats.lowDate.textContent = '';
        }

        if (lowestPoint < 0) {
            stats.low.style.color = 'var(--danger)';
        } else {
            stats.low.style.color = '';
        }

        // Draw Chart
        const ctx = document.getElementById('projectionChart').getContext('2d');

        const labels = data.map(d => {
            const date = new Date(d.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        const balances = data.map(d => d.balance);

        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(88, 166, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(88, 166, 255, 0.0)');

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Projected Balance',
                    data: balances,
                    borderColor: '#58a6ff',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        theme: 'dark',
                        callbacks: {
                            label: function (context) {
                                return formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(240, 246, 252, 0.05)' },
                        ticks: { color: '#8b949e', maxTicksLimit: 6 }
                    },
                    y: {
                        grid: { color: 'rgba(240, 246, 252, 0.05)' },
                        ticks: {
                            color: '#8b949e',
                            callback: function (value) { return '$' + value; }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
            }
        });

        // Update Ledger Tab
        renderLedger(data);
    }

    function renderLedger(projectionData) {
        containers.ledger.innerHTML = '';

        if (!projectionData || projectionData.length === 0) {
            containers.ledger.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">No projection data available.</p>';
            return;
        }

        projectionData.forEach(day => {
            const div = document.createElement('div');
            div.className = 'list-item';
            // Disable hover effect for non-clickable ledger items
            div.style.cursor = 'default';
            div.style.transform = 'none';

            let eventsHtml = '';
            let amountHtml = '';

            if (day.events && day.events.length > 0) {
                eventsHtml = day.events.map(e => {
                    const sign = e.type === 'inflow' ? '+' : '-';
                    const colorClass = e.type === 'inflow' ? 'amount-inflow' : 'amount-outflow';
                    return `<div style="font-size:0.85rem; color:var(--text-muted); padding-left:10px; border-left:2px solid var(--card-border); margin-top:4px;">
                                ${e.name}: <span class="${colorClass}">${sign}${formatCurrency(e.amount)}</span>
                            </div>`;
                }).join('');
            } else {
                eventsHtml = `<div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px; font-style:italic;">No transactions</div>`;
            }

            // The main stat is the running balance
            const balColor = day.balance < 0 ? 'var(--danger)' : 'var(--text-color)';

            div.innerHTML = `
                <div class="item-main" style="flex:1;">
                    <span class="item-name" style="color:var(--primary);">${day.date}</span>
                    <div style="margin-top:5px;">${eventsHtml}</div>
                </div>
                <div class="item-amount" style="color:${balColor}; font-weight:700;">
                    ${formatCurrency(day.balance)}
                </div>
            `;

            containers.ledger.appendChild(div);
        });
    }

    // Start
    init();

});
