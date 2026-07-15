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

    // Показываем скелетоны
    showSkeletons(governorSection, ministersGrid);

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

        // Разделяем: губернатор, вице-губернатор, министры
        const governor = activeCandidates.find(c => c.tier === 'governor');
        const viceGovernor = activeCandidates.find(c => c.tier === 'vice-governor');
        const ministers = activeCandidates.filter(c => c.tier !== 'governor' && c.tier !== 'vice-governor');

        // Рендерим губернатора
        governorSection.innerHTML = '';
        if (governor) {
            governorSection.appendChild(createGovernorCard(governor));
        }

        // Рендерим вице-губернатора (если есть)
        let viceSection = document.getElementById('vice-governor-section');
        if (viceGovernor && viceSection) {
            viceSection.innerHTML = '';
            viceSection.appendChild(createViceGovernorCard(viceGovernor));
            viceSection.style.display = 'block';
        } else if (viceSection) {
            viceSection.style.display = 'none';
        }

        // Рендерим министров
        ministersGrid.innerHTML = '';
        if (ministers.length > 0) {
            ministers.forEach(minister => {
                ministersGrid.appendChild(createMinisterCard(minister));
            });
            
            ministersGrid.classList.remove('few-items', 'one-item', 'two-items');
            
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
        
        governorSection.innerHTML = '';
        const viceSection = document.getElementById('vice-governor-section');
        if (viceSection) viceSection.remove();
        ministersGrid.innerHTML = `
            <div class="no-candidates" style="grid-column:1/-1;">
                <h3>Ошибка загрузки</h3>
                <p>Не удалось загрузить данные кандидатов. Пожалуйста, попробуйте позже.</p>
            </div>
        `;
    }
}

// ========== СКЕЛЕТОНЫ ==========
function showSkeletons(governorSection, ministersGrid) {
    // Скелетон для губернатора
    governorSection.innerHTML = `
        <div class="skeleton-governor">
            <div class="skeleton-avatar-large"></div>
            <div class="skeleton-info">
                <div class="skeleton-line long"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
            </div>
        </div>
    `;
    
    // Скелетоны для министров (3 штуки)
    let skeletonsHtml = '';
    for (let i = 0; i < 3; i++) {
        skeletonsHtml += `
            <div class="skeleton-card">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line long"></div>
            </div>
        `;
    }
    ministersGrid.innerHTML = skeletonsHtml;
}

// ========== ИКОНКИ ДОЛЖНОСТЕЙ ==========
function getMinisterIcon(role) {
    const roleLower = role.toLowerCase();
    
    // Глава коллегии адвокатов
    if (roleLower.includes('коллегия') || roleLower.includes('коллег') || roleLower.includes('адвокат') || roleLower.includes('юрист') || roleLower.includes('bar association')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M8 4V2h8v2"></path>
            <path d="M8 12h8"></path>
            <path d="M8 16h6"></path>
            <path d="M12 8v8"></path>
            <path d="M4 20l3-3"></path>
            <path d="M20 20l-3-3"></path>
        </svg>`;
    }
    
    // Глава аппарата губернатора
    if (roleLower.includes('аппарат') || roleLower.includes('chief of staff') || roleLower.includes('глава аппарата') || roleLower.includes('руководитель аппарата')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"></path>
            <path d="M5 21V7l8-4v18"></path>
            <path d="M19 21V11l-6-3"></path>
            <line x1="9" y1="9" x2="9" y2="9.01"></line>
            <line x1="9" y1="12" x2="9" y2="12.01"></line>
            <line x1="9" y1="15" x2="9" y2="15.01"></line>
            <line x1="9" y1="18" x2="9" y2="18.01"></line>
            <path d="M15 11v10"></path>
        </svg>`;
    }
    
    // Мэр Лос-Сантос
    if (roleLower.includes('лос-сантос') || (roleLower.includes('мэр') && roleLower.includes('сантос')) || roleLower.includes('los santos')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
            <line x1="12" y1="22" x2="12" y2="17"></line>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M8 12c0-2 2-3 4-3s4 1 4 3"></path>
        </svg>`;
    }
    
    // Мэр Блейна
    if (roleLower.includes('блейн') || (roleLower.includes('мэр') && roleLower.includes('блейн')) || roleLower.includes('blaine')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
            <line x1="12" y1="22" x2="12" y2="17"></line>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M8 14c0-3 2-4 4-4s4 1 4 4"></path>
            <path d="M6 18c0-4 3-6 6-6s6 2 6 6"></path>
        </svg>`;
    }
    
    // Прокурор / Юстиция
    if (roleLower.includes('прокурор') || roleLower.includes('юстиц')) {
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
    
    // Финансы
    if (roleLower.includes('финанс')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v12"></path>
            <path d="M15 9.5C15 8.12 13.66 7 12 7C10.34 7 9 8.12 9 9.5C9 10.88 10.34 12 12 12C13.66 12 15 13.12 15 14.5C15 15.88 13.66 17 12 17C10.34 17 9 15.88 9 14.5"></path>
        </svg>`;
    }
    
    // Оборона
    if (roleLower.includes('оборон')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>`;
    }
    
    // Безопасность
    if (roleLower.includes('безопасн') || roleLower.includes('sheriff') || roleLower.includes('шериф')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M9 12l2 2 4-4"></path>
        </svg>`;
    }
    
    // Культура
    if (roleLower.includes('культур')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <line x1="8" y1="7" x2="16" y2="7"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>`;
    }
    
    // Здравоохранение
    if (roleLower.includes('здравоохран') || roleLower.includes('здоров') || roleLower.includes('медицин')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="4"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>`;
    }
    
    // Вице-губернатор (на случай если попадёт сюда)
    if (roleLower.includes('вице') || roleLower.includes('губернатор') && !roleLower.includes('кандидат')) {
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
    
    // Транспорт / Инфраструктура
    if (roleLower.includes('транспорт') || roleLower.includes('инфраструктур') || roleLower.includes('дорог')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18" r="2.5"></circle>
            <circle cx="18.5" cy="18" r="2.5"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
        </svg>`;
    }
    
    // Образование
    if (roleLower.includes('образован') || roleLower.includes('школ') || roleLower.includes('университет')) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>`;
    }
    
    // Дефолтная иконка (для всех остальных)
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"></rect>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
        <line x1="12" y1="12" x2="12" y2="16"></line>
        <line x1="10" y1="14" x2="14" y2="14"></line>
    </svg>`;
}

// ========== КАРТОЧКА ГУБЕРНАТОРА (с единым default-avatar) ==========
function createGovernorCard(governor) {
    const card = document.createElement('div');
    card.className = 'governor-card';
    
    const photoSrc = governor.photo && governor.photo.trim() !== '' ? governor.photo : null;
    const defaultAvatarPath = '../../assets/images/default-avatar.png';
    
    let photoHTML = '';
    if (photoSrc) {
        photoHTML = `<div class="governor-photo-wrapper"><img src="${photoSrc}" alt="${escapeHTML(governor.name)}" loading="lazy"></div>`;
    } else {
        photoHTML = `<div class="governor-photo-wrapper"><img src="${defaultAvatarPath}" alt="${escapeHTML(governor.name)}" class="default-avatar-img" loading="lazy"></div>`;
    }
    
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

// ========== КАРТОЧКА ВИЦЕ-ГУБЕРНАТОРА ==========
function createViceGovernorCard(vice) {
    const card = document.createElement('div');
    card.className = 'vice-governor-card';
    
    const photoSrc = vice.photo && vice.photo.trim() !== '' ? vice.photo : null;
    const defaultAvatarPath = '../../assets/images/default-avatar.png';
    
    let photoHTML = '';
    if (photoSrc) {
        photoHTML = `<img src="${photoSrc}" alt="${escapeHTML(vice.name)}" loading="lazy">`;
    } else {
        photoHTML = `<img src="${defaultAvatarPath}" alt="${escapeHTML(vice.name)}" class="default-avatar-img" loading="lazy">`;
    }
    
    card.innerHTML = `
        <div class="vice-governor-photo">
            ${photoHTML}
        </div>
        <div class="vice-governor-info">
            <span class="vice-governor-badge">Вице-губернатор</span>
            <h3 class="vice-governor-name">${escapeHTML(vice.name)}</h3>
            <blockquote class="vice-governor-quote">${escapeHTML(vice.quote)}</blockquote>
            <p class="vice-governor-bio">${escapeHTML(vice.bio)}</p>
        </div>
    `;
    
    return card;
}

// ========== КАРТОЧКА МИНИСТРА (с единым default-avatar) ==========
function createMinisterCard(minister) {
    const card = document.createElement('div');
    card.className = 'minister-card';
    
    const photoSrc = minister.photo && minister.photo.trim() !== '' ? minister.photo : null;
    const defaultAvatarPath = '../../assets/images/default-avatar.png';
    
    let photoHTML = '';
    if (photoSrc) {
        photoHTML = `<img src="${photoSrc}" alt="${escapeHTML(minister.name)}" class="minister-photo" loading="lazy">`;
    } else {
        photoHTML = `<img src="${defaultAvatarPath}" alt="${escapeHTML(minister.name)}" class="minister-default-avatar" loading="lazy">`;
    }
    
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
