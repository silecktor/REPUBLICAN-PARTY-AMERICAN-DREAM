document.addEventListener('DOMContentLoaded', () => {
    initMembersPage();
});

// ========== GOOGLE SHEETS URLs ==========
const REGISTRY_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRHonAfiyB-uF6cAh0WnbPZPVJJer0VY3dCvZhJxgfjuKZNiDefGhV33DVaJ76jQQzrXKk0dU2G748T/pub?gid=1290341152&single=true&output=csv';
const BLACKLIST_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRHonAfiyB-uF6cAh0WnbPZPVJJer0VY3dCvZhJxgfjuKZNiDefGhV33DVaJ76jQQzrXKk0dU2G748T/pub?gid=0&single=true&output=csv';

let currentTab = 'registry';
let registryData = { active: [], former: [] };
let blacklistData = [];
let expandedRow = null;

async function initMembersPage() {
    initScrollAnimations();
    initTabs();
    initSearch();
    initRefreshButton();
    await loadAllData();
}

function initScrollAnimations() {
    const sections = document.querySelectorAll('.fade-in-section');
    if (sections.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    sections.forEach((section, index) => {
        section.style.transitionDelay = `${index * 0.06}s`;
        observer.observe(section);
    });
}

function initTabs() {
    const tabs = document.querySelectorAll('.members-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            document.getElementById('search-input').value = '';
            document.getElementById('search-clear').style.display = 'none';
            expandedRow = null;
            renderTable();
        });
    });
}

function initSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    
    input.addEventListener('input', () => {
        clearBtn.style.display = input.value ? 'flex' : 'none';
        expandedRow = null;
        renderTable();
    });
    
    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        expandedRow = null;
        renderTable();
        input.focus();
    });
}

function initRefreshButton() {
    const btn = document.getElementById('refresh-btn');
    btn.addEventListener('click', async () => {
        btn.classList.add('loading');
        btn.querySelector('span').textContent = 'Загрузка...';
        expandedRow = null;
        await loadAllData();
        btn.classList.remove('loading');
        btn.querySelector('span').textContent = 'Обновить';
        showNotification('Данные обновлены');
    });
}

async function loadAllData() {
    showLoading();
    try {
        const [registryCSV, blacklistCSV] = await Promise.all([
            fetchCSV(REGISTRY_URL),
            fetchCSV(BLACKLIST_URL)
        ]);
        
        registryData = parseRegistry(registryCSV);
        blacklistData = parseBlacklist(blacklistCSV);
        
        updateCounts();
        renderTable();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showError();
    }
}

async function fetchCSV(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Ошибка сети');
    return await response.text();
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }
    
    return rows;
}

function parseRegistry(csvText) {
    const rows = parseCSV(csvText);
    const active = [];
    const former = [];
    
    rows.forEach(row => {
        const name = row['Имя фамилия'] || row['Имя Фамилия'] || '';
        const isActive = (row['Действующий'] || '').toUpperCase() === 'TRUE';
        
        if (isActive && name) {
            active.push(row);
        } else if (!isActive && name) {
            former.push(row);
        }
    });
    
    return { active, former };
}

function parseBlacklist(csvText) {
    const rows = parseCSV(csvText);
    return rows.filter(row => {
        const name = row['Имя фамилия'] || row['Имя Фамилия'] || '';
        return name.trim() !== '';
    });
}

function getStatusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('председатель') && !s.includes('зам')) return 'status-chairman';
    if (s.includes('зам')) return 'status-deputy';
    if (s.includes('ген') || s.includes('секретарь')) return 'status-secretary';
    if (s.includes('старший')) return 'status-senior';
    if (s.includes('испытательный') || s.includes('испыт')) return 'status-probation';
    return 'status-member';
}

function getStatusBadge(status, cssClass) {
    return `<span class="status-badge ${cssClass}">${escapeHTML(status)}</span>`;
}

function renderTable() {
    const container = document.getElementById('table-container');
    const footer = document.getElementById('table-footer');
    const query = (document.getElementById('search-input').value || '').toLowerCase();
    
    if (currentTab === 'registry') {
        renderRegistryTable(container, footer, query);
    } else {
        renderBlacklistTable(container, footer, query);
    }
}

function renderRegistryTable(container, footer, query) {
    let activeFiltered = registryData.active;
    let formerFiltered = registryData.former;
    
    if (query) {
        activeFiltered = registryData.active.filter(row => matchesQuery(row, query));
        formerFiltered = registryData.former.filter(row => matchesQuery(row, query));
    }
    
    const total = activeFiltered.length + formerFiltered.length;
    
    if (total === 0) {
        container.innerHTML = `
            <div class="no-data">
                <h3>${query ? 'Ничего не найдено' : 'Реестр пуст'}</h3>
                <p>${query ? 'Попробуйте изменить запрос.' : 'Информация о членах партии появится здесь.'}</p>
            </div>`;
        footer.innerHTML = '';
        return;
    }
    
    let html = `<table class="members-table"><thead><tr>
        <th data-sort="number">№ <span class="sort-arrow">▼</span></th>
        <th data-sort="name">Имя Фамилия <span class="sort-arrow">▼</span></th>
        <th data-sort="id">ID-карта <span class="sort-arrow">▼</span></th>
        <th data-sort="status">Статус <span class="sort-arrow">▼</span></th>
        <th data-sort="date">Дата вступления <span class="sort-arrow">▼</span></th>
        <th>Комментарий</th>
    </tr></thead><tbody>`;
    
    activeFiltered.forEach((row, i) => {
        html += renderRegistryRow(row, i + 1, false);
    });
    
    if (formerFiltered.length > 0) {
        html += `<tr class="divider-row"><td colspan="6">Бывшие члены (${formerFiltered.length})</td></tr>`;
        formerFiltered.forEach((row, i) => {
            html += renderRegistryRow(row, activeFiltered.length + i + 1, true);
        });
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    footer.innerHTML = `<span>Всего: <span class="total-count">${total}</span> записей</span><span>Действующих: <span class="total-count">${activeFiltered.length}</span></span>`;
    
    initSortListeners();
    initRowClickListeners();
}

function renderRegistryRow(row, index, isFormer) {
    const name = row['Имя фамилия'] || row['Имя Фамилия'] || '';
    const idCard = row['ID-карта'] || '';
    const status = row['Статус'] || '';
    const joinDate = row['Дата вступления'] || '';
    const endDate = row['Дата выхода'] || '';
    const comment = row['Комментарий'] || '';
    const rowClass = isFormer ? 'former-member' : '';
    
    let statusClass;
    if (isFormer) {
        statusClass = 'status-former';
    } else {
        statusClass = getStatusBadgeClass(status);
    }
    
    return `<tr class="${rowClass}" data-expanded="false">
        <td>${index}</td>
        <td>${escapeHTML(name)}</td>
        <td>${escapeHTML(idCard) || '—'}</td>
        <td>${getStatusBadge(status, statusClass)}</td>
        <td>${escapeHTML(joinDate) || '—'}</td>
        <td>${escapeHTML(comment) || '—'}</td>
    </tr>
    <tr class="expanded-row">
        <td colspan="6">
            <div class="expanded-row-inner collapsed">
                <div class="expanded-details">
                    <div class="detail-item"><span class="detail-label">ID-карта</span><span class="detail-value">${escapeHTML(idCard) || '—'}</span></div>
                    <div class="detail-item"><span class="detail-label">Дата вступления</span><span class="detail-value">${escapeHTML(joinDate) || '—'}</span></div>
                    ${endDate ? `<div class="detail-item"><span class="detail-label">Дата выхода</span><span class="detail-value">${escapeHTML(endDate)}</span></div>` : ''}
                    <div class="detail-item"><span class="detail-label">Комментарий</span><span class="detail-value">${escapeHTML(comment) || 'Нет'}</span></div>
                </div>
            </div>
        </td>
    </tr>`;
}

function renderBlacklistTable(container, footer, query) {
    let filtered = blacklistData;
    if (query) {
        filtered = blacklistData.filter(row => matchesQuery(row, query));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <h3>${query ? 'Ничего не найдено' : 'Чёрный список пуст'}</h3>
                <p>${query ? 'Попробуйте изменить запрос.' : 'В чёрном списке пока никого нет.'}</p>
            </div>`;
        footer.innerHTML = '';
        return;
    }
    
    let html = `<table class="members-table"><thead><tr>
        <th data-sort="number">№ <span class="sort-arrow">▼</span></th>
        <th data-sort="name">Имя Фамилия <span class="sort-arrow">▼</span></th>
        <th data-sort="id">ID-карта <span class="sort-arrow">▼</span></th>
        <th data-sort="date">Дата занесения <span class="sort-arrow">▼</span></th>
        <th>Причина</th>
    </tr></thead><tbody>`;
    
    filtered.forEach((row, i) => {
        html += renderBlacklistRow(row, i + 1);
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    footer.innerHTML = `<span>Всего в чёрном списке: <span class="total-count">${filtered.length}</span></span>`;
    
    initSortListeners();
    initRowClickListeners();
}

function renderBlacklistRow(row, index) {
    const name = row['Имя фамилия'] || row['Имя Фамилия'] || '';
    const idCard = row['ID-карта'] || '';
    const addDate = row['Дата занесения'] || '';
    const removeDate = row['Дата вынесения'] || '';
    const reason = row['Причина занесения'] || '';
    
    return `<tr class="blacklist-row" data-expanded="false">
        <td>${index}</td>
        <td>${escapeHTML(name)}</td>
        <td>${escapeHTML(idCard) || '—'}</td>
        <td>${escapeHTML(addDate) || '—'}</td>
        <td>${escapeHTML(reason) || '—'}</td>
    </tr>
    <tr class="expanded-row">
        <td colspan="5">
            <div class="expanded-row-inner collapsed">
                <div class="expanded-details">
                    <div class="detail-item"><span class="detail-label">ID-карта</span><span class="detail-value">${escapeHTML(idCard) || '—'}</span></div>
                    <div class="detail-item"><span class="detail-label">Дата занесения</span><span class="detail-value">${escapeHTML(addDate) || '—'}</span></div>
                    ${removeDate ? `<div class="detail-item"><span class="detail-label">Дата вынесения</span><span class="detail-value">${escapeHTML(removeDate)}</span></div>` : ''}
                    <div class="detail-item"><span class="detail-label">Причина</span><span class="detail-value">${escapeHTML(reason) || 'Не указана'}</span></div>
                </div>
            </div>
        </td>
    </tr>`;
}

function matchesQuery(row, query) {
    const name = (row['Имя фамилия'] || row['Имя Фамилия'] || '').toLowerCase();
    const idCard = (row['ID-карта'] || '').toLowerCase();
    const status = (row['Статус'] || '').toLowerCase();
    const reason = (row['Причина занесения'] || '').toLowerCase();
    return name.includes(query) || idCard.includes(query) || status.includes(query) || reason.includes(query);
}

function initSortListeners() {
    const headers = document.querySelectorAll('.members-table thead th[data-sort]');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sortType = th.dataset.sort;
            const isAsc = th.querySelector('.sort-arrow')?.textContent.trim() === '▲';
            
            headers.forEach(h => {
                h.classList.remove('sorted');
                const arrow = h.querySelector('.sort-arrow');
                if (arrow) arrow.textContent = '▼';
            });
            
            th.classList.add('sorted');
            const arrow = th.querySelector('.sort-arrow');
            if (arrow) arrow.textContent = isAsc ? '▼' : '▲';
            
            sortData(sortType, !isAsc);
        });
    });
}

function sortData(sortType, ascending) {
    const getActiveData = () => {
        if (currentTab === 'registry') {
            return [...registryData.active, ...registryData.former];
        }
        return [...blacklistData];
    };
    
    let data = getActiveData();
    
    const getValue = (row, type) => {
        switch(type) {
            case 'number': return parseInt(row['№'] || '0');
            case 'name': return (row['Имя фамилия'] || row['Имя Фамилия'] || '').toLowerCase();
            case 'id': return (row['ID-карта'] || '').toLowerCase();
            case 'status': return (row['Статус'] || '').toLowerCase();
            case 'date': return (row['Дата вступления'] || row['Дата занесения'] || '');
            default: return '';
        }
    };
    
    data.sort((a, b) => {
        const valA = getValue(a, sortType);
        const valB = getValue(b, sortType);
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    });
    
    if (currentTab === 'registry') {
        const active = data.filter(r => (r['Действующий'] || '').toUpperCase() === 'TRUE');
        const former = data.filter(r => (r['Действующий'] || '').toUpperCase() !== 'TRUE');
        registryData.active = active;
        registryData.former = former;
    } else {
        blacklistData = data;
    }
    
    expandedRow = null;
    renderTable();
}

function initRowClickListeners() {
    const rows = document.querySelectorAll('.members-table tbody tr:not(.expanded-row):not(.divider-row)');
    rows.forEach(row => {
        row.addEventListener('click', () => {
            const expandedRowEl = row.nextElementSibling;
            if (!expandedRowEl || !expandedRowEl.classList.contains('expanded-row')) return;
            
            const inner = expandedRowEl.querySelector('.expanded-row-inner');
            if (!inner) return;
            
            const isCurrentlyExpanded = inner.classList.contains('expanded');
            
            // Закрываем предыдущую раскрытую строку
            if (expandedRow && expandedRow !== row) {
                const prevExpandedEl = expandedRow.nextElementSibling;
                if (prevExpandedEl && prevExpandedEl.classList.contains('expanded-row')) {
                    const prevInner = prevExpandedEl.querySelector('.expanded-row-inner');
                    if (prevInner) {
                        prevInner.classList.remove('expanded');
                        prevInner.classList.add('collapsed');
                    }
                }
                expandedRow.dataset.expanded = 'false';
            }
            
            if (isCurrentlyExpanded) {
                inner.classList.remove('expanded');
                inner.classList.add('collapsed');
                row.dataset.expanded = 'false';
                expandedRow = null;
            } else {
                inner.classList.remove('collapsed');
                inner.classList.add('expanded');
                row.dataset.expanded = 'true';
                expandedRow = row;
            }
        });
    });
}

function updateCounts() {
    document.getElementById('registry-count').textContent = registryData.active.length;
    document.getElementById('blacklist-count').textContent = blacklistData.length;
}

function showNotification(text) {
    const el = document.getElementById('notification');
    document.getElementById('notification-text').textContent = text;
    el.style.display = 'block';
    el.querySelector('.notification-inner').style.animation = 'none';
    el.querySelector('.notification-inner').offsetHeight;
    el.querySelector('.notification-inner').style.animation = 'fadeInOut 3s ease forwards';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function showLoading() {
    document.getElementById('table-container').innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Загрузка данных из Google Таблицы...</p>
        </div>`;
    document.getElementById('table-footer').innerHTML = '';
}

function showError() {
    document.getElementById('table-container').innerHTML = `
        <div class="no-data">
            <h3>Ошибка загрузки</h3>
            <p>Не удалось загрузить данные из Google Таблицы. Проверьте подключение и попробуйте снова.</p>
        </div>`;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}