document.addEventListener('DOMContentLoaded', () => {
    initFaqPage();
});

async function initFaqPage() {
    initScrollAnimations();
    await loadFaq();
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

// ========== ЗАГРУЗКА FAQ ИЗ JSON ==========
async function loadFaq() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    // Показываем загрузку
    container.innerHTML = `
        <div class="faq-loading">
            <div class="spinner"></div>
            <p>Загрузка вопросов...</p>
        </div>
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const basePath = getBasePath();

    try {
        const response = await fetch(basePath + 'data/faq.json', {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Ошибка при чтении JSON');
        
        const faqData = await response.json();
        
        if (!Array.isArray(faqData) || faqData.length === 0) {
            container.innerHTML = `
                <div class="faq-no-data">
                    <h3>Вопросов пока нет</h3>
                    <p>FAQ находится в стадии наполнения. Загляните позже!</p>
                </div>
            `;
            return;
        }

        // Рендерим аккордеон
        renderFaqAccordion(container, faqData);
        initAccordion();

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Ошибка загрузки FAQ:", error);
        container.innerHTML = `
            <div class="faq-no-data">
                <h3>Ошибка загрузки</h3>
                <p>Не удалось загрузить список вопросов. Пожалуйста, попробуйте позже.</p>
            </div>
        `;
    }
}

function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/pages/')) {
        const depth = (path.match(/\//g) || []).length - 1;
        return '../'.repeat(depth);
    }
    return './';
}

// ========== РЕНДЕР АККОРДЕОНА ==========
function renderFaqAccordion(container, faqData) {
    let html = '';
    
    faqData.forEach(item => {
        const question = escapeHTML(item.question);
        const answer = escapeHTML(item.answer);
        
        html += `
            <div class="faq-item open" data-id="${item.id}">
                <div class="faq-question">
                    <span class="faq-question-text">${question}</span>
                    <svg class="faq-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-text">${answer}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== ИНИЦИАЛИЗАЦИЯ АККОРДЕОНА ==========
function initAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            
            // Закрываем все
            faqItems.forEach(faqItem => {
                faqItem.classList.remove('open');
            });
            
            // Открываем текущий, если он был закрыт
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
}

// ========== ЭКРАНИРОВАНИЕ HTML ==========
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
