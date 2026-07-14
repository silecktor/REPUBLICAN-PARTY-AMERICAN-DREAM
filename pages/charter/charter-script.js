document.addEventListener('DOMContentLoaded', () => {
    initCharterPage();
});

async function initCharterPage() {
    initScrollAnimations();
    initPrintPdfMenu();     
    await loadCharter();
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

//  меню с тремя точками 
function initPrintPdfMenu() {
    const container = document.querySelector('.charter-controls-inner');
    if (!container) return;
    
    // Удаляем старую кнопку печати, если есть
    const oldBtn = document.getElementById('print-btn');
    if (oldBtn) oldBtn.remove();
    
    // Создаём кнопку с тремя точками
    const dotsBtn = document.createElement('button');
    dotsBtn.id = 'dots-menu-btn';
    dotsBtn.className = 'dots-menu-btn';
    dotsBtn.innerHTML = '⋮';
    dotsBtn.setAttribute('aria-label', 'Меню');
    container.appendChild(dotsBtn);
    
    // Создаём выпадающее меню
    const menu = document.createElement('div');
    menu.id = 'dots-menu';
    menu.className = 'dots-menu hidden';
    menu.innerHTML = `
        <button id="print-pdf-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 14h12v8H6v-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Распечатать PDF</span>
        </button>
        <button id="download-pdf-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Скачать PDF</span>
        </button>
    `;
    document.body.appendChild(menu);
    
    // Позиционирование меню под кнопкой
    function positionMenu() {
        const rect = dotsBtn.getBoundingClientRect();
        menu.style.top = rect.bottom + 5 + 'px';
        menu.style.right = window.innerWidth - rect.right + 'px';
    }
    
    // Открыть/закрыть меню
    dotsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
        document.querySelectorAll('.dots-menu').forEach(m => m.classList.add('hidden'));
        if (isHidden) {
            positionMenu();
            menu.classList.remove('hidden');
        } else {
            menu.classList.add('hidden');
        }
    });
    
    // Закрыть при клике вне
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== dotsBtn) {
            menu.classList.add('hidden');
        }
    });
    window.addEventListener('resize', () => {
        if (!menu.classList.contains('hidden')) positionMenu();
    });
    
    // Распечатать PDF
    const printPdfBtn = document.getElementById('print-pdf-btn');
    printPdfBtn.addEventListener('click', () => {
        const pdfUrl = '../../assets/documents/charter.pdf';
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        iframe.src = pdfUrl;
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 500);
        };
        menu.classList.add('hidden');
    });
    
    // Скачать PDF
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    downloadPdfBtn.addEventListener('click', () => {
        const pdfUrl = '../../assets/documents/charter.pdf';
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'Ustav_American_Dream.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        menu.classList.add('hidden');
    });
}

async function loadCharter() {
    const chaptersContainer = document.getElementById('charter-chapters');
    const signaturesContainer = document.getElementById('charter-signatures');
    const historyContainer = document.getElementById('charter-history');
    const amendmentNotice = document.getElementById('amendment-notice');
    if (!chaptersContainer) return;
    chaptersContainer.innerHTML = '<div class="loading-indicator" style="text-align:center;padding:40px;">Загрузка устава...</div>';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch('../../data/charter.json', { signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Ошибка при чтении JSON');
        const data = await response.json();
        document.getElementById('charter-title').textContent = data.document.title;
        document.getElementById('charter-subtitle').textContent = data.document.subtitle;
        document.getElementById('charter-adopted').textContent = data.document.adopted;
        document.getElementById('charter-date').textContent = data.document.approvalDate || data.document.date || '';
        if (data.document.lastAmendment && data.document.lastAmendment.protocol) {
            document.getElementById('amendment-details').textContent = data.document.lastAmendment.protocol + ' — ' + data.document.lastAmendment.description;
            amendmentNotice.style.display = 'block';
        }
        renderChapters(chaptersContainer, data.chapters);
        if (signaturesContainer && data.document.signatures) {
            renderSignatures(signaturesContainer, data.document.signatures, data.document.approvalDate || '', data.document.seal || '');
        }
        if (historyContainer && data.document.amendmentsHistory && data.document.amendmentsHistory.length > 0) {
            renderHistory(historyContainer, data.document.amendmentsHistory);
        }
        initSingleModeToggle();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Ошибка загрузки устава:", error);
        chaptersContainer.innerHTML = '<div style="text-align:center;padding:60px;"><h3 style="color:var(--gold);">Ошибка загрузки</h3><p style="color:var(--text-gray);">Не удалось загрузить текст устава.</p></div>';
    }
}

// ИЗМЕНЕНО: все главы открыты по умолчанию
function renderChapters(container, chapters) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'chapters-wrapper';
    chapters.forEach((chapter, chapterIndex) => {
        const chapterId = `chapter-${chapterIndex + 1}`;
        const block = document.createElement('div');
        block.className = 'chapter-block';
        block.id = chapterId;
        // ВСЕ ГЛАВЫ ОТКРЫТЫ ПО УМОЛЧАНИЮ
        block.classList.add('open');
        
        const header = document.createElement('div');
        header.className = 'chapter-header';
        header.innerHTML = `<span class="chapter-header-text">${escapeHTML(chapter.number)}. ${escapeHTML(chapter.title)}</span><svg class="chapter-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const body = document.createElement('div');
        body.className = 'chapter-body';
        const bodyInner = document.createElement('div');
        bodyInner.className = 'chapter-body-inner';
        chapter.articles.forEach((article, artIdx) => {
            const articleId = `${chapterId}-article-${artIdx + 1}`;
            const articleBlock = document.createElement('div');
            articleBlock.className = 'article-block';
            articleBlock.id = articleId;
            articleBlock.innerHTML = `<div class="article-header"><span class="article-number">${escapeHTML(article.number)}</span>${article.title ? `<span class="article-title">${escapeHTML(article.title)}</span>` : ''}</div><p class="article-text">${escapeHTML(article.text)}</p>`;
            bodyInner.appendChild(articleBlock);
        });
        body.appendChild(bodyInner);
        header.addEventListener('click', () => {
            const singleMode = document.getElementById('single-mode-toggle');
            if (singleMode && singleMode.checked) {
                const allBlocks = wrapper.querySelectorAll('.chapter-block');
                allBlocks.forEach(b => { if (b !== block) b.classList.remove('open'); });
            }
            block.classList.toggle('open');
        });
        block.appendChild(header);
        block.appendChild(body);
        wrapper.appendChild(block);
    });
    container.appendChild(wrapper);
}

function renderSignatures(container, signatures, approvalDate, sealPath) {
    if (!Array.isArray(signatures) || signatures.length === 0) { container.innerHTML = ''; return; }
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    const getSignatureSrc = (sig) => {
        if (currentTheme === 'light' && sig.signatureLight) return sig.signatureLight;
        if (sig.signatureDark) return sig.signatureDark;
        return null;
    };
    const signaturesHTML = signatures.map(sig => {
        const src = getSignatureSrc(sig);
        return `
            <div class="signature-block" style="text-align: right;">
                ${src ? `<div class="signature-image-wrapper" style="justify-content: flex-end;"><img src="${src}" alt="Подпись ${escapeHTML(sig.name)}"></div>` : ''}
                <div class="signature-line" style="margin-left: auto; margin-right: 0;"></div>
                <div class="signature-courtesy">С уважением,</div>
                <div class="signature-role">${escapeHTML(sig.role)}</div>
                <div class="signature-name">${escapeHTML(sig.name)}</div>
            </div>`;
    }).join('');
    container.innerHTML = `
        <div class="signatures-wrapper">
            <div class="signatures-header">
                <p class="signatures-header-text">Утверждён учредителями <strong>Партии «American Dream»</strong>.</p>
                ${approvalDate ? `<p class="signatures-approval">Утверждён ${escapeHTML(approvalDate)}</p>` : ''}
            </div>
            <div class="signatures-main">
                <div class="signatures-seal-column">
                    <div class="signature-seal">${sealPath ? `<img src="${sealPath}" alt="Печать партии">` : '<span>М.П.</span>'}</div>
                    <div class="signature-seal-label">Печать<br>партии</div>
                </div>
                <div class="signatures-column">${signaturesHTML}</div>
            </div>
        </div>`;
}

function renderHistory(container, history) {
    container.innerHTML = `<div class="history-wrapper"><h3 class="history-title">История изменений</h3><ul class="history-list">${history.map(item => `<li class="history-item"><div class="history-protocol">${escapeHTML(item.protocol)}</div><div class="history-description">${escapeHTML(item.description)}</div></li>`).join('')}</ul></div>`;
}

function initSingleModeToggle() {
    const toggle = document.getElementById('single-mode-toggle');
    if (!toggle) return;
    const savedMode = localStorage.getItem('charterSingleMode');
    if (savedMode !== null) toggle.checked = savedMode === 'true';
    toggle.addEventListener('change', () => {
        localStorage.setItem('charterSingleMode', toggle.checked);
        if (toggle.checked) {
            const allBlocks = document.querySelectorAll('.chapter-block.open');
            if (allBlocks.length > 1) {
                allBlocks.forEach((block, index) => { if (index !== 0) block.classList.remove('open'); });
            }
        }
    });
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
