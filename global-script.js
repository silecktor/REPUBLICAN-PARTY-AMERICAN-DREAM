﻿document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await loadSharedComponents();
    initTheme();
    initMobileNav();
    setActiveNavLink();
    initScrollAnimations();
    await loadLeaders();
    initParticles();
    initMemberCounter();
}

// ========== ЗАГРУЗКА ОБЩИХ КОМПОНЕНТОВ ==========
async function loadSharedComponents() {
    const basePath = getBasePath();
    
    await Promise.all([
        loadComponent('header-placeholder', basePath + 'shared/header.html'),
        loadComponent('footer-placeholder', basePath + 'shared/footer.html')
    ]);
    
    fixSharedPaths(basePath);
    
    // ДАЁМ ВРЕМЯ НА ПОЛНУЮ ОТРИСОВКУ
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

async function updateFooterMemberCount() {
    // ИЩЕМ ИМЕННО ВНУТРИ ФУТЕРА
    const footer = document.querySelector('.main-footer');
    if (!footer) {
        console.log('Футер не найден в DOM');
        return;
    }
    
    const countEl = footer.querySelector('#footer-member-count');
    if (!countEl) {
        console.log('Элемент footer-member-count не найден внутри футера');
        return;
    }
    
    console.log('Обновляем счётчик членов...');
    
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRHonAfiyB-uF6cAh0WnbPZPVJJer0VY3dCvZhJxgfjuKZNiDefGhV33DVaJ76jQQzrXKk0dU2G748T/pub?gid=1290341152&single=true&output=csv', {
            cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки CSV');
        
        const csv = await response.text();
        const lines = csv.split('\n').filter(line => line.trim());
        let count = 0;
        
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
                
                if (name && isActive) count++;
            }
        }
        
        countEl.textContent = count;
        console.log('Счётчик обновлён:', count);
        
    } catch (error) {
        console.error('Ошибка счётчика:', error);
        countEl.textContent = '—';
    }
}

async function updatePartyStats() {
    const basePath = getBasePath();
    const jsonPath = basePath + 'data/party-stats.json';
    
    // ИЩЕМ КОНТЕЙНЕР ВНУТРИ ФУТЕРА
    const footer = document.querySelector('.main-footer');
    if (!footer) {
        console.log('Футер не найден в DOM');
        return;
    }
    
    const statRows = footer.querySelectorAll('.footer-stat-row');
    if (statRows.length === 0) {
        console.log('Элементы .footer-stat-row не найдены внутри футера');
        return;
    }
    
    console.log('Загружаем JSON по пути:', jsonPath);
    
    try {
        const response = await fetch(jsonPath, {
            cache: 'no-cache'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const stats = await response.json();
        console.log('JSON получен:', stats);
        
        if (statRows[0] && stats.founded) {
            statRows[0].innerHTML = `<span>Основана: ${stats.founded}</span><span class="footer-stat-dot online"></span>`;
        }
        
        if (statRows[1] && stats.conventions !== undefined) {
            statRows[1].innerHTML = `<span>Съездов проведено: ${stats.conventions}</span><span class="footer-stat-dot"></span>`;
        }
        
        if (statRows[2] && stats.lawsProposed !== undefined) {
            statRows[2].innerHTML = `<span>Законов предложено: ${stats.lawsProposed}</span><span class="footer-stat-dot"></span>`;
        }
        
        console.log('Статистика обновлена');
        
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
    iconElement.textContent = theme === 'dark-mode' ? '☀️' : '🌙';
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
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });
    
    sections.forEach(section => {
        observer.observe(section);
    });
}

// ========== АКТИВАЦИЯ ССЫЛОК МЕНЮ ==========
function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-list a');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    for (let link of navLinks) {
        const href = link.getAttribute('href');
        
        if ((currentPath.endsWith('/') || currentPath.endsWith('index.html')) && href === 'index.html') {
            link.classList.add('active');
            break;
        }
        
        if (currentPath.includes(href.replace('index.html', ''))) {
            link.classList.add('active');
            break;
        }
    }
}

// ========== ЗАГРУЗКА ЛИДЕРОВ ==========
async function loadLeaders() {
    const container = document.getElementById('leaders-container');
    if (!container) return;

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Загрузка руководства...';
    container.appendChild(loadingIndicator);

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
        container.removeChild(loadingIndicator);

        if (!Array.isArray(leaders) || leaders.length === 0) {
            container.innerHTML = '<p style="color: var(--gold); grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1.1rem;">Состав руководства будет объявлен позже</p>';
            return;
        }

        leaders.forEach((leader, index) => {
            const card = document.createElement('div');
            card.className = 'leader-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-expanded', 'false');
            card.dataset.index = index;
            
            const avatarSrc = leader.avatar ? leader.avatar : basePath + 'assets/images/default-avatar.png';
            
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
                if (isAnimating) return;
                toggleLeader(index, leaders.length);
            });
            
            card.addEventListener('keypress', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isAnimating) {
                    e.preventDefault();
                    toggleLeader(index, leaders.length);
                }
            });
            
            container.appendChild(card);
        });

        updateLayout(-1, leaders.length);
        
        window.addEventListener('resize', debounce(() => {
            updateLayout(activeIdx, leaders.length);
        }, 150));

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Ошибка загрузки лидеров:", error);
        container.innerHTML = '<p style="color: #e74c3c; grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1.1rem;">Не удалось загрузить данные руководства.<br>Пожалуйста, попробуйте позже.</p>';
    }
}

// ========== ЭКРАНИРОВАНИЕ HTML ==========
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== DEBOUNCE ==========
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

// ========== ПАРТИКЛЫ НА ФОНЕ ==========
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

// ========== СЧЁТЧИК ЧЛЕНОВ ПАРТИИ ==========
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
        
        if (progress < 1) {
            requestAnimationFrame(animateCounter);
        } else {
            counterElement.textContent = targetCount;
        }
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

// ========== УПРАВЛЕНИЕ КАРТОЧКАМИ ==========
let activeIdx = -1;
let isAnimating = false;

function toggleLeader(index, total) {
    if (isAnimating) return;
    
    isAnimating = true;
    activeIdx = (activeIdx === index) ? -1 : index;
    updateLayout(activeIdx, total);
    
    setTimeout(() => {
        isAnimating = false;
    }, 850);
}

function updateLayout(expandedIdx, total) {
    const cards = document.querySelectorAll('.leader-card');
    const wrapper = document.querySelector('.leaders-wrapper');
    
    if (!wrapper || cards.length === 0) return;
    
    if (window.innerWidth <= 768) {
        cards.forEach((card, i) => {
            card.style.left = 'auto';
            card.style.top = 'auto';
            card.style.width = 'auto';
            card.style.zIndex = 'auto';
            card.style.position = 'relative';
            
            if (expandedIdx === i) {
                card.classList.add('expanded');
                card.setAttribute('aria-expanded', 'true');
            } else {
                card.classList.remove('expanded');
                card.setAttribute('aria-expanded', 'false');
            }
        });
        return;
    }
    
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    
    const setPos = (el, leftPercent, topPercent, widthPercent, isExp) => {
        const left = (wrapperWidth * leftPercent) / 100;
        const top = (wrapperHeight * topPercent) / 100;
        const width = (wrapperWidth * widthPercent) / 100;
        
        el.style.position = 'absolute';
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${width}px`;
        el.setAttribute('aria-expanded', isExp ? 'true' : 'false');
        
        if (isExp) {
            el.classList.add('expanded');
            el.style.zIndex = "100";
        } else {
            el.classList.remove('expanded');
            el.style.zIndex = "1";
        }
    };

    if (total === 3) {
        if (expandedIdx === -1) {
            setPos(cards[0], 35.45, 2.22, 29.09, false);
            setPos(cards[1], 16.36, 48.89, 29.09, false);
            setPos(cards[2], 54.55, 48.89, 29.09, false);
        } 
        else if (expandedIdx === 0) {
            setPos(cards[0], 22.73, 5.56, 54.55, true);
            setPos(cards[1], 1.82, 57.78, 27.27, false); 
            setPos(cards[2], 70.91, 57.78, 27.27, false);
        }
        else if (expandedIdx === 1) {
            setPos(cards[1], 4.55, 16.67, 54.55, true);
            setPos(cards[0], 68.18, 5.56, 27.27, false); 
            setPos(cards[2], 68.18, 50.00, 27.27, false);
        }
        else if (expandedIdx === 2) {
            setPos(cards[2], 40.91, 16.67, 54.55, true);
            setPos(cards[0], 4.55, 5.56, 27.27, false);  
            setPos(cards[1], 4.55, 50.00, 27.27, false); 
        }
    } 
    else if (total === 2) {
        if (expandedIdx === -1) {
            setPos(cards[0], 16.36, 16.67, 29.09, false);
            setPos(cards[1], 54.55, 16.67, 29.09, false);
        } else if (expandedIdx === 0) {
            setPos(cards[0], 4.55, 11.11, 54.55, true);
            setPos(cards[1], 68.18, 16.67, 27.27, false);
        } else if (expandedIdx === 1) {
            setPos(cards[1], 40.91, 11.11, 54.55, true);
            setPos(cards[0], 4.55, 16.67, 27.27, false);
        }
    } else if (total === 1) {
        setPos(cards[0], 25.00, 20.00, 50.00, expandedIdx === 0);
    }
    
    if (expandedIdx !== -1) {
        wrapper.style.height = '1000px';
    } else {
        wrapper.style.height = '900px';
    }
}