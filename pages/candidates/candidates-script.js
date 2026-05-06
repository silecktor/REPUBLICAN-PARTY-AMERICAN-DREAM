document.addEventListener('DOMContentLoaded', () => {
    initCandidatesPage();
});

async function initCandidatesPage() {
    initScrollAnimations();
    await loadCandidates();
}

// ========== АНИМАЦИЯ ПОЯВЛЕНИЯ ==========
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
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    });
    
    sections.forEach((section, index) => {
        section.style.transitionDelay = `${index * 0.08}s`;
        observer.observe(section);
    });
}

// ========== ЗАГРУЗКА КАНДИДАТОВ ==========
async function loadCandidates() {
    const governorSection = document.getElementById('governor-section');
    const ministersGrid = document.getElementById('ministers-grid');
    const counterElement = document.getElementById('candidates-count');
    
    if (!governorSection || !ministersGrid) return;

    // Индикатор загрузки
    governorSection.innerHTML = '<div class="loading-indicator" style="text-align:center;padding:40px;">Загрузка кандидатов...</div>';
    ministersGrid.innerHTML = '<div class="loading-indicator" style="text-align:center;padding:40px;grid-column:1/-1;">Загрузка министров...</div>';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch('../../data/candidates.json', {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Ошибка при чтении JSON');
        
        const candidates = await response.json();

        // Фильтруем активных
        const activeCandidates = candidates.filter(c => c.active !== false);
        
        // Обновляем счётчик в hero
        if (counterElement) {
            counterElement.textContent = activeCandidates.length;
        }
        
        if (activeCandidates.length === 0) {
            governorSection.innerHTML = '';
            ministersGrid.innerHTML = `
                <div class="no-candidates" style="grid-column:1/-1;">
                    <h3>Состав кабинета формируется</h3>
                    <p>Информация о кандидатах на министерские посты будет опубликована после завершения внутрипартийного отбора.</p>
                </div>
            `;
            if (counterElement) {
                counterElement.textContent = '0';
            }
            return;
        }

        // Разделяем: губернатор отдельно, министры — в сетку
        const governor = activeCandidates.find(c => c.tier === 'governor');
        const ministers = activeCandidates.filter(c => c.tier !== 'governor');

        // Рендерим губернатора
        if (governor) {
            governorSection.innerHTML = '';
            governorSection.appendChild(createGovernorCard(governor));
        } else {
            governorSection.innerHTML = '';
        }

        // Рендерим министров
        ministersGrid.innerHTML = '';
        if (ministers.length > 0) {
            ministers.forEach(minister => {
                ministersGrid.appendChild(createMinisterCard(minister));
            });
            
            // Убираем все классы центрирования
            ministersGrid.classList.remove('few-items', 'one-item', 'two-items');
            
            // Если меньше 3 карточек — добавляем нужный класс
            if (ministers.length === 1) {
                ministersGrid.classList.add('few-items', 'one-item');
            } else if (ministers.length === 2) {
                ministersGrid.classList.add('few-items', 'two-items');
            }
        } else {
            ministersGrid.innerHTML = `
                <div class="no-candidates" style="grid-column:1/-1;">
                    <p>Министерский состав находится на стадии утверждения.</p>
                </div>
            `;
        }

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Ошибка загрузки кандидатов:", error);
        
        if (counterElement) {
            counterElement.textContent = '—';
        }
        
        if (governorSection) {
            governorSection.innerHTML = '';
        }
        if (ministersGrid) {
            ministersGrid.innerHTML = `
                <div class="no-candidates" style="grid-column:1/-1;">
                    <h3>Ошибка загрузки</h3>
                    <p>Не удалось загрузить данные кандидатов. Пожалуйста, попробуйте позже.</p>
                </div>
            `;
        }
    }
}

// ========== ИКОНКИ ДОЛЖНОСТЕЙ ==========
function getMinisterIcon(role) {
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('прокурор') || roleLower.includes('юстиц')) {
        // Весы правосудия
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="6" x2="9" y2="10"></line>
            <line x1="12" y1="6" x2="15" y2="10"></line>
            <circle cx="7" cy="14" r="3"></circle>
            <circle cx="17" cy="14" r="3"></circle>
            <line x1="7" y1="17" x2="7" y2="22"></line>
            <line x1="17" y1="17" x2="17" y2="22"></line>
            <line x1="2" y1="22" x2="22" y2="22"></line>
        </svg>`;
    }
    
    if (roleLower.includes('финанс')) {
        // Знак доллара в круге
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v12"></path>
            <path d="M15 9.5C15 8.12 13.66 7 12 7C10.34 7 9 8.12 9 9.5C9 10.88 10.34 12 12 12C13.66 12 15 13.12 15 14.5C15 15.88 13.66 17 12 17C10.34 17 9 15.88 9 14.5"></path>
        </svg>`;
    }
    
    if (roleLower.includes('оборон')) {
        // Звезда
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>`;
    }
    
    if (roleLower.includes('безопасн')) {
        // Щит с галочкой
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M9 12l2 2 4-4"></path>
        </svg>`;
    }
    
    if (roleLower.includes('культур')) {
        // Книга
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <line x1="8" y1="7" x2="16" y2="7"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>`;
    }
    
    if (roleLower.includes('здравоохран') || roleLower.includes('здоров')) {
        // Медицинский крест
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="4"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>`;
    }
    
    if (roleLower.includes('адвокат') || roleLower.includes('коллег')) {
        // Молоток судьи
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 9l-3 3 2 2 8-8-2-2-3 3"></path>
            <rect x="10" y="14" width="8" height="3" rx="1"></rect>
            <line x1="10" y1="17" x2="18" y2="17"></line>
        </svg>`;
    }
    
    if (roleLower.includes('вице') || roleLower.includes('губернатор') && !roleLower.includes('кандидат')) {
        // Здание правительства
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"></path>
            <path d="M5 21V7l8-4v18"></path>
            <path d="M19 21V11l-6-3"></path>
            <line x1="9" y1="9" x2="9" y2="9.01"></line>
            <line x1="9" y1="12" x2="9" y2="12.01"></line>
            <line x1="9" y1="15" x2="9" y2="15.01"></line>
            <line x1="9" y1="18" x2="9" y2="18.01"></line>
        </svg>`;
    }
    
    // Иконка по умолчанию — портфель министра
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"></rect>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
        <line x1="12" y1="12" x2="12" y2="16"></line>
        <line x1="10" y1="14" x2="14" y2="14"></line>
    </svg>`;
}

// ========== КАРТОЧКА ГУБЕРНАТОРА ==========
function createGovernorCard(governor) {
    const card = document.createElement('div');
    card.className = 'governor-card';
    
    const photoSrc = governor.photo ? governor.photo : '';
    const photoHTML = photoSrc 
        ? `<div class="governor-photo-wrapper"><img src="${photoSrc}" alt="${escapeHTML(governor.name)}" loading="lazy"></div>`
        : `<div class="governor-photo-wrapper"><div class="default-avatar">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="20" r="12" stroke="currentColor" stroke-width="2.5"/>
                <path d="M12 52C12 40 20.5 30 32 30C43.5 30 52 40 52 52" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </div></div>`;
    
    card.innerHTML = `
        <div class="governor-photo">
            ${photoHTML}
        </div>
        <div class="governor-info">
            <span class="governor-badge">Кандидат в губернаторы</span>
            <h2 class="governor-name">${escapeHTML(governor.name)}</h2>
            <blockquote class="governor-quote">${escapeHTML(governor.quote)}</blockquote>
            <p class="governor-bio">${escapeHTML(governor.bio)}</p>
        </div>
    `;
    
    return card;
}

// ========== КАРТОЧКА МИНИСТРА ==========
function createMinisterCard(minister) {
    const card = document.createElement('div');
    card.className = 'minister-card';
    
    const photoSrc = minister.photo ? minister.photo : '';
    const photoHTML = photoSrc
        ? `<img src="${photoSrc}" alt="${escapeHTML(minister.name)}" class="minister-photo" loading="lazy">`
        : `<div class="minister-photo-placeholder">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="22" r="10" stroke="currentColor" stroke-width="2.5"/>
                <path d="M14 52C14 42 20.5 34 32 34C43.5 34 50 42 50 52" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </div>`;
    
    const iconHTML = getMinisterIcon(minister.role);
    
    card.innerHTML = `
        ${photoHTML}
        <div class="minister-role-icon">${iconHTML}</div>
        <span class="minister-role">${escapeHTML(minister.role)}</span>
        <h3 class="minister-name">${escapeHTML(minister.name)}</h3>
        <blockquote class="minister-quote">${escapeHTML(minister.quote)}</blockquote>
        <p class="minister-bio">${escapeHTML(minister.bio)}</p>
    `;
    
    return card;
}

// ========== ЭКРАНИРОВАНИЕ HTML ==========
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}   