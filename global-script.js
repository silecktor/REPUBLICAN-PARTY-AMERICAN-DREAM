document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await loadSharedComponents();
    initTheme();
    initMobileNav();
    setActiveNavLink();
    initScrollAnimations();
    initScrollToTop();
    initSearch();
    await loadLeaders();
    initParticles();
    initMemberCounter();
    initTypeWriter();
}

// ========== ЗАГРУЗКА ОБЩИХ КОМПОНЕНТОВ ==========
async function loadSharedComponents() {
    const basePath = getBasePath();
    
    await Promise.all([
        loadComponent('header-placeholder', basePath + 'shared/header.html'),
        loadComponent('footer-placeholder', basePath + 'shared/footer.html')
    ]);
    
    fixSharedPaths(basePath);
    
    setTimeout(() => {
        updateFooterMemberCount();
        updatePartyStats();
    }, 200);
}

function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/pages/')) {
        const depth = (path.match(/\//g) || []).length - 1;
        return '../'.repeat(depth);
    }
    return './';
}

async function loadComponent(placeholderId, filePath) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return;
    
    try {
        const response = await fetch(filePath);
        if (response.ok) {
            placeholder.innerHTML = await response.text();
        } else {
            console.warn(`Не удалось загрузить ${filePath}: ${response.status}`);
        }
    } catch (error) {
        console.error(`Ошибка загрузки ${filePath}:`, error);
    }
}

function fixSharedPaths(basePath) {
    const rootPath = basePath === './' ? '' : basePath;
    
    const paths = {
        '#home-link': rootPath + 'index.html',
        '#logo-path': rootPath + 'assets/images/logo.png',
        '#discord-icon-path': rootPath + 'assets/icons/discord-icon.png',
        '#program-link': rootPath + 'pages/program/index.html',
        '#candidates-link': rootPath + 'pages/candidates/index.html',
        '#charter-link': rootPath + 'pages/charter/index.html',
        '#members-link': rootPath + 'pages/members/index.html',
        '#apply-link': rootPath + 'pages/apply/index.html',
        '#faq-link': rootPath + 'pages/faq/index.html',
        '#discord-link': 'https://discord.gg/2MrcUENkaD',
        '#party-hotline': 'ВРЕМЕННО ОТСУТСТВУЕТ'
    };
    
    document.querySelectorAll('[href^="#"]').forEach(el => {
        const placeholder = el.getAttribute('href');
        if (paths[placeholder]) {
            el.setAttribute('href', paths[placeholder]);
        }
    });
    
    document.querySelectorAll('[src^="#"]').forEach(el => {
        const placeholder = el.getAttribute('src');
        if (paths[placeholder]) {
            el.setAttribute('src', paths[placeholder]);
        }
    });
}

// ========== СЧЁТЧИК ЧЛЕНОВ В ФУТЕРЕ С АНИМАЦИЕЙ ==========
async function updateFooterMemberCount() {
    const footer = document.querySelector('.main-footer');
    if (!footer) return;
    
    const countEl = footer.querySelector('#footer-member-count');
    if (!countEl) return;
    
    let oldValue = parseInt(countEl.textContent);
    if (isNaN(oldValue)) oldValue = 0;
    
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRHonAfiyB-uF6cAh0WnbPZPVJJer0VY3dCvZhJxgfjuKZNiDefGhV33DVaJ76jQQzrXKk0dU2G748T/pub?gid=1290341152&single=true&output=csv', {
            cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки CSV');
        
        const csv = await response.text();
        const lines = csv.split('\n').filter(line => line.trim());
        let newCount = 0;
        
        if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const nameColumnIndex = headers.findIndex(h => h === 'Имя фамилия' || h === 'Имя Фамилия');
            const activeColumnIndex = headers.findIndex(h => h === 'Действующий');
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const name = values[nameColumnIndex] || '';
                let isActive = true;
                if (activeColumnIndex !== -1) {
                    isActive = (values[activeColumnIndex] || '').toUpperCase() === 'TRUE';
                }
                if (name && isActive) newCount++;
            }
        }
        
        animateNumber(countEl, oldValue, newCount, 800);
        
    } catch (error) {
        console.error('Ошибка счётчика:', error);
        countEl.textContent = '—';
    }
}

function animateNumber(element, start, end, duration) {
    if (start === end) return;
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * eased);
        element.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end;
        }
    }
    requestAnimationFrame(update);
}

async function updatePartyStats() {
    const basePath = getBasePath();
    const jsonPath = basePath + 'data/party-stats.json';
    const footer = document.querySelector('.main-footer');
    if (!footer) return;
    
    const statRows = footer.querySelectorAll('.footer-stat-row');
    if (statRows.length === 0) return;
    
    try {
        const response = await fetch(jsonPath, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const stats = await response.json();
        
        if (statRows[0] && stats.founded) {
            statRows[0].innerHTML = `<span>Основана: ${stats.founded}</span><span class="footer-stat-dot online"></span>`;
        }
        if (statRows[1] && stats.conventions !== undefined) {
            statRows[1].innerHTML = `<span>Съездов проведено: ${stats.conventions}</span><span class="footer-stat-dot"></span>`;
        }
        if (statRows[2] && stats.lawsProposed !== undefined) {
            statRows[2].innerHTML = `<span>Законов предложено: ${stats.lawsProposed}</span><span class="footer-stat-dot"></span>`;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ========== УПРАВЛЕНИЕ ТЕМОЙ ==========
function initTheme() {
    const themeIcon = document.getElementById('theme-icon');
    const iconInner = document.getElementById('icon-inner');
    if (!themeIcon || !iconInner) return;
    
    const savedTheme = localStorage.getItem('theme') || 'dark-mode';
    document.body.className = savedTheme;
    updateThemeIconDOM(iconInner, savedTheme);
    
    themeIcon.addEventListener('click', () => {
        const currentTheme = document.body.className;
        const newTheme = currentTheme === 'dark-mode' ? 'light-mode' : 'dark-mode';
        
        iconInner.style.transform = 'rotate(180deg) scale(0.5)';
        iconInner.style.opacity = '0';
        
        setTimeout(() => {
            document.body.className = newTheme;
            localStorage.setItem('theme', newTheme);
            updateThemeIconDOM(iconInner, newTheme);
            iconInner.style.transform = 'rotate(0deg) scale(1)';
            iconInner.style.opacity = '1';
        }, 300);
    });
}

function updateThemeIconDOM(iconElement, theme) {
    if (theme === 'dark-mode') {
        iconElement.innerHTML = `<svg class="theme-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>`;
    } else {
        iconElement.innerHTML = `<svg class="theme-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>`;
    }
}

// ========== МОБИЛЬНОЕ МЕНЮ ==========
function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    const closeMenu = () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Открыть меню');
    };

    const openMenu = () => {
        nav.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Закрыть меню');
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (nav.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (nav.contains(e.target) || toggle.contains(e.target)) return;
        closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth > 1024) closeMenu();
    }, 150));
}

// ========== АНИМАЦИЯ ПОЯВЛЕНИЯ ПРИ СКРОЛЛЕ ==========
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
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    sections.forEach(section => observer.observe(section));
}

// ========== КНОПКА «НАВЕРХ» ==========
function initScrollToTop() {
    if (document.getElementById('scroll-top-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'scroll-top-btn';
    btn.className = 'scroll-top-btn';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Наверх');
    document.body.appendChild(btn);
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
    
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== ПЕЧАТНАЯ МАШИНКА ==========
function initTypeWriter() {
    const quoteElement = document.getElementById('typewriter-quote');
    if (!quoteElement) return;
    
    const fullText = quoteElement.getAttribute('data-quote') || '';
    if (!fullText) return;
    
    let i = 0;
    let isTypingStarted = false;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isTypingStarted) {
                isTypingStarted = true;
                quoteElement.textContent = '';
                typeNextChar();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(quoteElement);
    
    function typeNextChar() {
        if (i < fullText.length) {
            quoteElement.textContent += fullText.charAt(i);
            i++;
            const delay = (fullText.charAt(i-1) === '.' || fullText.charAt(i-1) === '!' || fullText.charAt(i-1) === '?') ? 120 : 40;
            setTimeout(typeNextChar, delay);
        }
    }
}

// ========== ПОИСК ПО САЙТУ ==========
let searchIndex = [];
let searchPanel = null;
let searchInput = null;
let searchResults = null;

function initSearch() {
    if (document.getElementById('global-search-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'global-search-panel';
    panel.className = 'search-panel hidden';
    panel.innerHTML = `
        <div class="search-container">
            <input type="text" id="global-search-input" placeholder="Поиск по сайту, лидерам, кандидатам, уставу..." autocomplete="off">
            <button id="global-search-close" aria-label="Закрыть поиск">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div id="global-search-results" class="search-results"></div>
    `;
    document.body.appendChild(panel);
    searchPanel = panel;
    searchInput = document.getElementById('global-search-input');
    searchResults = document.getElementById('global-search-results');
    
    const closeBtn = document.getElementById('global-search-close');
    closeBtn.addEventListener('click', () => {
        searchPanel.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        searchResults.innerHTML = '';
    });
    
    searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        const matches = searchIndex.filter(item => 
            item.title.toLowerCase().includes(query) || 
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.content && item.content.toLowerCase().includes(query))
        ).slice(0, 10);
        
        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
            return;
        }
        
        searchResults.innerHTML = matches.map(match => `
            <div class="search-result-item" data-url="${match.url}" data-section="${match.sectionId || ''}" data-article="${match.articleId || ''}">
                <div class="result-title">${escapeHTML(match.title)}</div>
                <div class="result-desc">${escapeHTML(match.description ? match.description.substring(0, 100) : '')}</div>
                <div class="result-type">${match.type === 'page' ? 'Страница' : match.type === 'leader' ? 'Лидер' : match.type === 'candidate' ? 'Кандидат' : 'Устав'}</div>
            </div>
        `).join('');
        
        document.querySelectorAll('#global-search-results .search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const url = el.dataset.url;
                const sectionId = el.dataset.section;
                if (url) {
                    window.location.href = sectionId ? `${url}#${sectionId}` : url;
                }
            });
        });
    }, 300));
    
    setTimeout(() => {
        const searchToggle = document.getElementById('search-toggle');
        if (searchToggle) {
            searchToggle.addEventListener('click', () => {
                searchPanel.classList.toggle('hidden');
                if (!searchPanel.classList.contains('hidden')) {
                    searchInput.focus();
                }
            });
        }
    }, 500);
    
    buildSearchIndex();
}

async function buildSearchIndex() {
    const basePath = getBasePath();
    searchIndex = [];
    
    const pages = [
        { title: 'Главная', url: basePath + 'index.html', keywords: 'главная манифест партия', type: 'page' },
        { title: 'Программа', url: basePath + 'pages/program/index.html', keywords: 'программа цели задачи пункты', type: 'page' },
        { title: 'Кандидаты', url: basePath + 'pages/candidates/index.html', keywords: 'кандидаты губернатор министры', type: 'page' },
        { title: 'Устав', url: basePath + 'pages/charter/index.html', keywords: 'устав правила положения', type: 'page' },
        { title: 'Члены партии', url: basePath + 'pages/members/index.html', keywords: 'члены реестр список', type: 'page' },
        { title: 'Вступить', url: basePath + 'pages/apply/index.html', keywords: 'вступить заявка подать', type: 'page' },
        { title: 'FAQ', url: basePath + 'pages/faq/index.html', keywords: 'вопросы ответы часто задаваемые', type: 'page' }
    ];
    pages.forEach(page => {
        searchIndex.push({
            type: page.type,
            title: page.title,
            url: page.url,
            description: page.keywords,
            content: page.keywords
        });
    });
    
    try {
        const leaders = await fetch(basePath + 'data/leaders.json').then(r => r.json()).catch(() => []);
        if (Array.isArray(leaders)) {
            leaders.forEach(leader => {
                searchIndex.push({
                    type: 'leader',
                    title: `${leader.name} — ${leader.role || 'лидер'}`,
                    url: basePath + 'index.html',
                    description: leader.bio || '',
                    content: `${leader.name} ${leader.role} ${leader.bio || ''}`
                });
            });
        }
    } catch(e) { console.warn('Не загружены лидеры для поиска'); }
    
    try {
        const candidates = await fetch(basePath + 'data/candidates.json').then(r => r.json()).catch(() => []);
        if (Array.isArray(candidates)) {
            candidates.filter(c => c.active !== false).forEach(c => {
                let title = c.name;
                if (c.tier === 'governor') title += ' — кандидат в губернаторы';
                else if (c.tier === 'vice-governor') title += ' — вице-губернатор';
                else title += ` — ${c.role}`;
                searchIndex.push({
                    type: 'candidate',
                    title: title,
                    url: basePath + 'pages/candidates/index.html',
                    description: c.bio || '',
                    content: `${c.name} ${c.role} ${c.quote || ''} ${c.bio || ''}`
                });
            });
        }
    } catch(e) { console.warn('Не загружены кандидаты для поиска'); }
    
    try {
        const charter = await fetch(basePath + 'data/charter.json').then(r => r.json()).catch(() => null);
        if (charter && charter.chapters) {
            charter.chapters.forEach((chapter, chIdx) => {
                const chapterId = `chapter-${chIdx+1}`;
                searchIndex.push({
                    type: 'charter',
                    title: `${chapter.number}. ${chapter.title}`,
                    url: basePath + 'pages/charter/index.html',
                    description: '',
                    content: `${chapter.number} ${chapter.title}`,
                    sectionId: chapterId
                });
                if (chapter.articles) {
                    chapter.articles.forEach((article, artIdx) => {
                        const articleId = `${chapterId}-article-${artIdx+1}`;
                        searchIndex.push({
                            type: 'charter',
                            title: `${chapter.number} — ${article.number || 'Статья'} ${article.title || ''}`,
                            url: basePath + 'pages/charter/index.html',
                            description: article.text ? article.text.substring(0, 150) : '',
                            content: `${article.number || ''} ${article.title || ''} ${article.text || ''}`,
                            sectionId: chapterId,
                            articleId: articleId
                        });
                    });
                }
            });
        }
    } catch(e) { console.warn('Не загружен устав для поиска'); }
}

// ========== АКТИВАЦИЯ ССЫЛОК МЕНЮ ==========
function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-list a');
    const currentPath = window.location.pathname;
    navLinks.forEach(link => link.classList.remove('active'));
    for (let link of navLinks) {
        const href = link.getAttribute('href');
        if ((currentPath.endsWith('/') || currentPath.endsWith('index.html')) && href === 'index.html') {
            link.classList.add('active'); break;
        }
        if (currentPath.includes(href.replace('index.html', ''))) {
            link.classList.add('active'); break;
        }
    }
}

// ========== ЗАГРУЗКА ЛИДЕРОВ + АДАПТИВНАЯ СЕТКА ==========
async function loadLeaders() {
    const container = document.getElementById('leaders-container');
    if (!container) return;

    showLeaderSkeletons(container);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const basePath = getBasePath();

    try {
        const response = await fetch(basePath + 'data/leaders.json', { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Ошибка при чтении JSON');
        
        const leaders = await response.json();
        container.innerHTML = '';

        if (!Array.isArray(leaders) || leaders.length === 0) {
            container.innerHTML = '<p style="color: var(--gold); text-align: center; padding: 40px;">Состав руководства будет объявлен позже</p>';
            return;
        }

        leaders.forEach((leader, index) => {
            const card = document.createElement('div');
            card.className = 'leader-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-expanded', 'false');
            card.dataset.index = index;
            
            let avatarSrc = leader.avatar && leader.avatar.trim() !== '' ? leader.avatar : basePath + 'assets/images/default-avatar.png';
            
            const img = document.createElement('img');
            img.src = avatarSrc;
            img.className = 'leader-avatar';
            img.alt = 'Аватар ' + escapeHTML(leader.name);
            img.loading = 'lazy';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'leader-name';
            nameDiv.textContent = leader.name;
            
            const roleDiv = document.createElement('div');
            roleDiv.className = 'leader-role';
            roleDiv.textContent = leader.role;
            
            const bioDiv = document.createElement('div');
            bioDiv.className = 'leader-bio';
            bioDiv.textContent = leader.bio;
            
            card.appendChild(img);
            card.appendChild(nameDiv);
            card.appendChild(roleDiv);
            card.appendChild(bioDiv);
            
            card.addEventListener('click', () => {
                toggleLeader(card);
            });
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLeader(card);
                }
            });
            container.appendChild(card);
        });

        applyLeadersLayout();

        window.addEventListener('resize', debounce(() => {
            applyLeadersLayout();
        }, 150));

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Ошибка загрузки лидеров:", error);
        container.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">Не удалось загрузить данные руководства.<br>Пожалуйста, попробуйте позже.</p>';
    }
}

// НОВАЯ ФУНКЦИЯ — АДАПТИВНАЯ СЕТКА (1,2,3,4,5+)
function applyLeadersLayout() {
    const wrapper = document.querySelector('.leaders-wrapper');
    if (!wrapper) return;
    
    const cards = document.querySelectorAll('.leader-card');
    const count = cards.length;
    
    // Убираем все старые классы
    wrapper.classList.remove('layout-1', 'layout-2', 'layout-3', 'layout-4', 'layout-5plus');
    
    if (count === 1) {
        wrapper.classList.add('layout-1');
    } else if (count === 2) {
        wrapper.classList.add('layout-2');
    } else if (count === 3) {
        wrapper.classList.add('layout-3');
    } else if (count === 4) {
        wrapper.classList.add('layout-4');
        // Перестраиваем DOM для 4 карточек: первая отдельно, остальные 3 в ряд
        const firstCard = cards[0];
        const otherCards = Array.from(cards).slice(1);
        const othersContainer = document.createElement('div');
        othersContainer.className = 'others-row';
        otherCards.forEach(card => {
            othersContainer.appendChild(card);
        });
        wrapper.innerHTML = '';
        wrapper.appendChild(firstCard);
        wrapper.appendChild(othersContainer);
    } else if (count >= 5) {
        wrapper.classList.add('layout-5plus');
        const firstCard = cards[0];
        const otherCards = Array.from(cards).slice(1);
        const othersContainer = document.createElement('div');
        othersContainer.className = 'others-grid';
        otherCards.forEach(card => {
            othersContainer.appendChild(card);
        });
        wrapper.innerHTML = '';
        wrapper.appendChild(firstCard);
        wrapper.appendChild(othersContainer);
    }
}

function toggleLeader(selectedCard) {
    const cards = document.querySelectorAll('.leader-card');
    const isExpanded = selectedCard.classList.contains('expanded');
    
    cards.forEach(card => {
        card.classList.remove('expanded');
        card.setAttribute('aria-expanded', 'false');
    });
    
    if (!isExpanded) {
        selectedCard.classList.add('expanded');
        selectedCard.setAttribute('aria-expanded', 'true');
    }
}

function showLeaderSkeletons(container) {
    container.innerHTML = '';
    const skeletonCount = 3;
    for (let i = 0; i < skeletonCount; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'leader-card skeleton-leader';
        skeleton.innerHTML = `
            <div class="skeleton-avatar"></div>
            <div class="skeleton-line" style="width: 70%; margin-top: 15px;"></div>
            <div class="skeleton-line" style="width: 50%;"></div>
            <div class="skeleton-line" style="width: 90%;"></div>
        `;
        container.appendChild(skeleton);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initParticles() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;
    const particlesContainer = document.getElementById('hero-particles');
    if (!particlesContainer) return;
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 3 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 10;
        const opacity = Math.random() * 0.3 + 0.1;
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(236, 134, 39, ${opacity});
            border-radius: 50%;
            left: ${x}%;
            top: ${y}%;
            animation: floatUp ${duration}s ${delay}s linear infinite;
            pointer-events: none;
        `;
        particlesContainer.appendChild(particle);
    }
}

function initMemberCounter() {
    const counterElement = document.getElementById('member-count-number');
    if (!counterElement) return;
    const targetCount = parseInt(counterElement.dataset.target) || 247;
    const startCount = parseInt(counterElement.dataset.start) || 0;
    const duration = 2000;
    const startTime = performance.now();
    function animateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startCount + (targetCount - startCount) * eased);
        counterElement.textContent = current;
        if (progress < 1) requestAnimationFrame(animateCounter);
        else counterElement.textContent = targetCount;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                requestAnimationFrame(animateCounter);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    observer.observe(counterElement);
}
