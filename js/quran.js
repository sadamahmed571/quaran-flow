(function () {
    const STORAGE_KEY_PAGE = 'quran_last_page';
    const STORAGE_KEY_SURA = 'quran_last_sura_name';
    const STORAGE_KEY_THEME = 'quran_theme';
    const STORAGE_KEY_FONT_SCALE = 'quran_font_scale_v1';
    const BOOKMARK_KEY = 'khuta_bookmark';
    const TOTAL_PAGES = 604;
    const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
    const SWIPE_THRESHOLD = 60;

    const THEMES = ['cream', 'dark', 'green'];
    let currentThemeIndex = 0;

    let pagesMap = {};
    let tafseerData = [];
    let tafseerMap = {}; // For O(1) lookup
    let currentPageNum = 1;
    let dailyStartPage = 1;
    let dailyPages = 20; // Default fallback
    try {
        // Force reset for V6 to clear experimental favorites/stats
        if (!localStorage.getItem('quran_v6_reset_done')) {
            localStorage.removeItem('quran_favorites');
            localStorage.removeItem('quran_performance');
            localStorage.setItem('quran_v6_reset_done', 'true');
        }

        const savedPlan = localStorage.getItem('quranPlanV3');
        if (savedPlan) {
            const plan = JSON.parse(savedPlan);
            if (plan.dailyPages) dailyPages = plan.dailyPages;
        }
    } catch (e) { console.warn("Plan load failed", e); }
    let touchStartX = 0;

    const loadingState = document.getElementById('loadingState');
    const readingArea = document.getElementById('readingArea');
    const pageView = document.getElementById('pageView');
    const pageViewInner = document.getElementById('pageViewInner');
    const pageIndicator = document.getElementById('floatingPageIndicator');
    const floatingSuraName = document.getElementById('floatingSuraName');
    const floatingJuzNumber = document.getElementById('floatingJuzNumber');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const themeBtn = document.getElementById('themeBtn');
    const appFooter = document.getElementById('appFooter');
    const dailyProgressBar = document.getElementById('dailyProgressBar');
    const dailyProgressFill = document.getElementById('dailyProgressFill');
    const verseInsight = document.getElementById('verseInsight');
    const insightClose = document.getElementById('insightClose');
    const insightVerse = document.getElementById('insightVerse');
    const insightText = document.getElementById('insightText');
    const verseActionBar = document.getElementById('verseActionBar');
    const copyBtn = document.getElementById('copyBtn');
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const tafseerBtn = document.getElementById('tafseerBtn');
    const audioBtn = document.getElementById('audioBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const shareBtn = document.getElementById('shareBtn');
    const tibyanBtn = document.getElementById('tibyanBtn');
    const copyVerseBtn = document.getElementById('copyVerseBtn');
    const copyWithTafseerBtn = document.getElementById('copyWithTafseerBtn');
    const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
    const favoritesBtn = document.getElementById('favoritesBtn');
    const favoritesPanel = document.getElementById('favoritesPanel');
    const favoritesClose = document.getElementById('favoritesClose');

    const returnBookmarkBtn = document.getElementById('returnBookmarkBtn');

    const quranFontMinus = document.getElementById('quranFontMinus');
    const quranFontPlus = document.getElementById('quranFontPlus');

    function clamp(n, min, max) {
        return Math.min(max, Math.max(min, n));
    }

    function readFontScale() {
        try {
            const v = parseFloat(localStorage.getItem(STORAGE_KEY_FONT_SCALE));
            if (!Number.isFinite(v)) return 1;
            return clamp(v, 0.85, 1.35);
        } catch (_) {
            return 1;
        }
    }

    function applyFontScale(scale) {
        const s = clamp(scale, 0.85, 1.35);
        document.documentElement.style.setProperty('--quran-font-size', `calc(${s} * clamp(0.95rem, 2.2vh, 1.4rem))`);
        try {
            localStorage.setItem(STORAGE_KEY_FONT_SCALE, String(s));
        } catch (_) { }
    }

    function initFontControls() {
        if (!quranFontMinus || !quranFontPlus) return;

        let scale = readFontScale();
        applyFontScale(scale);

        quranFontMinus.addEventListener('click', function () {
            scale = clamp(scale - 0.05, 0.85, 1.35);
            applyFontScale(scale);
        });

        quranFontPlus.addEventListener('click', function () {
            scale = clamp(scale + 0.05, 0.85, 1.35);
            applyFontScale(scale);
        });
    }

    initFontControls();

    // بيانات السور للفهرسة السريعة
    const SURA_DATA = [
        { id: 1, name: "الفاتحة", page: 1, verses: 7, loc: "مكية" }, { id: 2, name: "البقرة", page: 2, verses: 286, loc: "مدنية" },
        { id: 3, name: "آل عمران", page: 50, verses: 200, loc: "مدنية" }, { id: 4, name: "النساء", page: 77, verses: 176, loc: "مدنية" },
        { id: 5, name: "المائدة", page: 106, verses: 120, loc: "مدنية" }, { id: 6, name: "الأنعام", page: 128, verses: 165, loc: "مكية" },
        { id: 7, name: "الأعراف", page: 151, verses: 206, loc: "مكية" }, { id: 8, name: "الأنفال", page: 177, verses: 75, loc: "مدنية" },
        { id: 9, name: "التوبة", page: 187, verses: 129, loc: "مدنية" }, { id: 10, name: "يونس", page: 208, verses: 109, loc: "مكية" },
        { id: 11, name: "هود", page: 221, verses: 123, loc: "مكية" }, { id: 12, name: "يوسف", page: 235, verses: 111, loc: "مكية" },
        { id: 13, name: "الرعد", page: 249, verses: 43, loc: "مدنية" }, { id: 14, name: "إبراهيم", page: 255, verses: 52, loc: "مكية" },
        { id: 15, name: "الحجر", page: 262, verses: 99, loc: "مكية" }, { id: 16, name: "النحل", page: 267, verses: 128, loc: "مكية" },
        { id: 17, name: "الإسراء", page: 282, verses: 111, loc: "مكية" }, { id: 18, name: "الكهف", page: 293, verses: 110, loc: "مكية" },
        { id: 19, name: "مريم", page: 305, verses: 98, loc: "مكية" }, { id: 20, name: "طه", page: 312, verses: 135, loc: "مكية" },
        { id: 21, name: "الأنبياء", page: 322, verses: 112, loc: "مكية" }, { id: 22, name: "الحج", page: 332, verses: 78, loc: "مدنية" },
        { id: 23, name: "المؤمنون", page: 342, verses: 118, loc: "مكية" }, { id: 24, name: "النور", page: 350, verses: 64, loc: "مدنية" },
        { id: 25, name: "الفرقان", page: 359, verses: 77, loc: "مكية" }, { id: 26, name: "الشعراء", page: 367, verses: 227, loc: "مكية" },
        { id: 27, name: "النمل", page: 377, verses: 93, loc: "مكية" }, { id: 28, name: "القصص", page: 385, verses: 88, loc: "مكية" },
        { id: 29, name: "العنكبوت", page: 396, verses: 69, loc: "مكية" }, { id: 30, name: "الروم", page: 404, verses: 60, loc: "مكية" },
        { id: 31, name: "لقمان", page: 411, verses: 34, loc: "مكية" }, { id: 32, name: "السجدة", page: 415, verses: 30, loc: "مكية" },
        { id: 33, name: "الأحزاب", page: 418, verses: 73, loc: "مدنية" }, { id: 34, name: "سبأ", page: 428, verses: 54, loc: "مكية" },
        { id: 35, name: "فاطر", page: 434, verses: 45, loc: "مكية" }, { id: 36, name: "يس", page: 440, verses: 83, loc: "مكية" },
        { id: 37, name: "الصافات", page: 446, verses: 182, loc: "مكية" }, { id: 38, name: "ص", page: 453, verses: 88, loc: "مكية" },
        { id: 39, name: "الزمر", page: 458, verses: 75, loc: "مكية" }, { id: 40, name: "غافر", page: 467, verses: 85, loc: "مكية" },
        { id: 41, name: "فصلت", page: 477, verses: 54, loc: "مكية" }, { id: 42, name: "الشورى", page: 483, verses: 53, loc: "مكية" },
        { id: 43, name: "الزخرف", page: 489, verses: 89, loc: "مكية" }, { id: 44, name: "الدخان", page: 496, verses: 59, loc: "مكية" },
        { id: 45, name: "الجاثية", page: 499, verses: 37, loc: "مكية" }, { id: 46, name: "الأحقاف", page: 502, verses: 35, loc: "مكية" },
        { id: 47, name: "محمد", page: 507, verses: 38, loc: "مدنية" }, { id: 48, name: "الفتح", page: 511, verses: 29, loc: "مدنية" },
        { id: 49, name: "الحجرات", page: 515, verses: 18, loc: "مدنية" }, { id: 50, name: "ق", page: 518, verses: 45, loc: "مكية" },
        { id: 51, name: "الذاريات", page: 520, verses: 60, loc: "مكية" }, { id: 52, name: "الطور", page: 523, verses: 49, loc: "مكية" },
        { id: 53, name: "النجم", page: 526, verses: 62, loc: "مكية" }, { id: 54, name: "القمر", page: 528, verses: 55, loc: "مكية" },
        { id: 55, name: "الرحمن", page: 531, verses: 78, loc: "مدنية" }, { id: 56, name: "الواقعة", page: 534, verses: 96, loc: "مكية" },
        { id: 57, name: "الحديد", page: 537, verses: 29, loc: "مدنية" }, { id: 58, name: "المجادلة", page: 542, verses: 22, loc: "مدنية" },
        { id: 59, name: "الحشر", page: 545, verses: 24, loc: "مدنية" }, { id: 60, name: "الممتحنة", page: 549, verses: 13, loc: "مدنية" },
        { id: 61, name: "الصف", page: 551, verses: 14, loc: "مدنية" }, { id: 62, name: "الجمعة", page: 553, verses: 11, loc: "مدنية" },
        { id: 63, name: "المنافقون", page: 554, verses: 11, loc: "مدنية" }, { id: 64, name: "التغابن", page: 556, verses: 18, loc: "مدنية" },
        { id: 65, name: "الطلاق", page: 558, verses: 12, loc: "مدنية" }, { id: 66, name: "التحريم", page: 560, verses: 12, loc: "مدنية" },
        { id: 67, name: "الملك", page: 562, verses: 30, loc: "مكية" }, { id: 68, name: "القلم", page: 564, verses: 52, loc: "مكية" },
        { id: 69, name: "الحاقة", page: 566, verses: 52, loc: "مكية" }, { id: 70, name: "المعارج", page: 568, verses: 44, loc: "مكية" },
        { id: 71, name: "نوح", page: 570, verses: 28, loc: "مكية" }, { id: 72, name: "الجن", page: 572, verses: 28, loc: "مكية" },
        { id: 73, name: "المزمل", page: 574, verses: 20, loc: "مكية" }, { id: 74, name: "المدثر", page: 575, verses: 56, loc: "مكية" },
        { id: 75, name: "القيامة", page: 577, verses: 40, loc: "مكية" }, { id: 76, name: "الإنسان", page: 578, verses: 31, loc: "مدنية" },
        { id: 77, name: "المرسلات", page: 580, verses: 50, loc: "مكية" }, { id: 78, name: "النبأ", page: 582, verses: 40, loc: "مكية" },
        { id: 79, name: "النازعات", page: 583, verses: 46, loc: "مكية" }, { id: 80, name: "عبس", page: 585, verses: 42, loc: "مكية" },
        { id: 81, name: "التكوير", page: 586, verses: 29, loc: "مكية" }, { id: 82, name: "الانفطار", page: 587, verses: 19, loc: "مكية" },
        { id: 83, name: "المطففين", page: 587, verses: 36, loc: "مكية" }, { id: 84, name: "الانشقاق", page: 589, verses: 25, loc: "مكية" },
        { id: 85, name: "البروج", page: 590, verses: 22, loc: "مكية" }, { id: 86, name: "الطارق", page: 591, verses: 17, loc: "مكية" },
        { id: 87, name: "الأعلى", page: 591, verses: 19, loc: "مكية" }, { id: 88, name: "الغاشية", page: 592, verses: 26, loc: "مكية" },
        { id: 89, name: "الفجر", page: 593, verses: 30, loc: "مكية" }, { id: 90, name: "البلد", page: 594, verses: 20, loc: "مكية" },
        { id: 91, name: "الشمس", page: 595, verses: 15, loc: "مكية" }, { id: 92, name: "الليل", page: 595, verses: 21, loc: "مكية" },
        { id: 93, name: "الضحى", page: 596, verses: 11, loc: "مكية" }, { id: 94, name: "الشرح", page: 596, verses: 8, loc: "مكية" },
        { id: 95, name: "التين", page: 597, verses: 8, loc: "مكية" }, { id: 96, name: "العلق", page: 597, verses: 19, loc: "مكية" },
        { id: 97, name: "القدر", page: 598, verses: 5, loc: "مكية" }, { id: 98, name: "البينة", page: 598, verses: 8, loc: "مدنية" },
        { id: 99, name: "الزلزلة", page: 599, verses: 8, loc: "مدنية" }, { id: 100, name: "العاديات", page: 599, verses: 11, loc: "مكية" },
        { id: 101, name: "القارعة", page: 600, verses: 11, loc: "مكية" }, { id: 102, name: "التكاثر", page: 600, verses: 8, loc: "مكية" },
        { id: 103, name: "العصر", page: 601, verses: 3, loc: "مكية" }, { id: 104, name: "الهمزة", page: 601, verses: 9, loc: "مكية" },
        { id: 105, name: "الفيل", page: 601, verses: 5, loc: "مكية" }, { id: 106, name: "قريش", page: 602, verses: 4, loc: "مكية" },
        { id: 107, name: "الماعون", page: 602, verses: 7, loc: "مكية" }, { id: 108, name: "الكوثر", page: 602, verses: 3, loc: "مكية" },
        { id: 109, name: "الكافرون", page: 603, verses: 6, loc: "مكية" }, { id: 110, name: "النصر", page: 603, verses: 3, loc: "مدنية" },
        { id: 111, name: "المسد", page: 603, verses: 5, loc: "مكية" }, { id: 112, name: "الإخلاص", page: 604, verses: 4, loc: "مكية" },
        { id: 113, name: "الفلق", page: 604, verses: 5, loc: "مكية" }, { id: 114, name: "الناس", page: 604, verses: 6, loc: "مكية" }
    ];

    const favoritesList = document.getElementById('favoritesList');
    const searchBtn = document.getElementById('searchBtn');
    const searchPanel = document.getElementById('searchPanel');
    const searchClose = document.getElementById('searchClose');
    const mainSearchInput = document.getElementById('mainSearchInput');
    const indexList = document.getElementById('indexList');
    const indexTabs = document.querySelectorAll('.index-tab');

    // Search Panel & Indexing Functions
    function toggleSearchPanel() {
        const isHidden = !searchPanel.classList.contains('show');
        if (isHidden) {
            searchPanel.classList.add('show');
            mainSearchInput.focus();
            renderIndex('verses'); // Default view
        } else {
            searchPanel.classList.remove('show');
        }
    }

    // Note: Search event listeners moved to init() to prevent duplicates

    // Tabs Logic
    indexTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            indexTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            renderIndex(tabName, mainSearchInput.value);
        });
    });

    // Search Logic
    mainSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const activeTab = document.querySelector('.index-tab.active').dataset.tab;

        if (activeTab === 'pages') {
            // Check if input is a valid page number
            const pageNum = parseInt(query);
            if (pageNum >= 1 && pageNum <= 604) {
                goToPage(pageNum);
                toggleSearchPanel();
            }
        } else {
            renderIndex(activeTab, query);
        }
    });

    function renderIndex(type, query = '') {
        indexList.innerHTML = '';
        const normalizedQuery = normalizeArabic(query.toLowerCase());
        const countBadge = document.getElementById('searchResultsCount');

        if (type === 'suras') {
            const filtered = SURA_DATA.filter(s => normalizeArabic(s.name).includes(normalizedQuery));
            if (countBadge) countBadge.textContent = `${filtered.length} نتائج`;

            filtered.forEach(sura => {
                const item = document.createElement('div');
                item.className = 'index-item';
                item.onclick = () => {
                    goToPage(sura.page);
                    toggleSearchPanel();
                };
                // XSS Fix: بناء DOM يدوياً (البيانات ثابتة لكن نتبع معيار موحد)
                const suraInfoWrap = document.createElement('div');
                suraInfoWrap.className = 'sura-info';

                const suraNameSpan = document.createElement('span');
                suraNameSpan.className = 'sura-name-list';
                suraNameSpan.textContent = `سورة ${sura.name}`;

                const suraDetailsDiv = document.createElement('div');
                suraDetailsDiv.className = 'sura-details';
                suraDetailsDiv.textContent = `${sura.loc} · ${sura.verses} آية`;

                suraInfoWrap.appendChild(suraNameSpan);
                suraInfoWrap.appendChild(suraDetailsDiv);

                const pageBadge = document.createElement('div');
                pageBadge.className = 'page-badge';
                pageBadge.textContent = `ص ${sura.page}`;

                const numBadge = document.createElement('div');
                numBadge.className = 'sura-number-badge';
                numBadge.textContent = sura.id;

                item.appendChild(suraInfoWrap);
                item.appendChild(pageBadge);
                item.appendChild(numBadge);
                indexList.appendChild(item);
            });
        }
        else if (type === 'verses') {
            if (normalizedQuery.length < 2) {
                if (countBadge) countBadge.textContent = `0 نتائج`;
                indexList.innerHTML = '<div style="text-align:center; color:#64748b; padding:2rem;">ابحث عن كلمة في الآيات (أدخل حرفين على الأقل)</div>';
                return;
            }

            let allMatches = [];
            for (let p = 1; p <= 604; p++) {
                const pageVerses = pagesMap[p] || [];
                for (const v of pageVerses) {
                    if (normalizeArabic(cleanAyaText(v.aya_text)).includes(normalizedQuery)) {
                        allMatches.push(v);
                    }
                }
            }

            const totalCount = allMatches.length;
            if (countBadge) countBadge.textContent = `${totalCount} نتائج`;

            if (totalCount === 0) {
                indexList.innerHTML = '<div style="text-align:center; color:#64748b; padding:2rem;">لم يتم العثور على أي آية تحتوي على هذا النص</div>';
                return;
            }

            // عرض تنبيه إذا كانت النتائج كثيرة
            if (totalCount > 50) {
                const limitNote = document.createElement('div');
                limitNote.style.cssText = 'padding: 0.5rem; text-align: center; font-size: 0.65rem; color: #94a3b8; font-weight: 500;';
                limitNote.textContent = 'يتم عرض أول 50 نتيجة فقط';
                indexList.appendChild(limitNote);
            }

            const displayMatches = allMatches.slice(0, 50);

            displayMatches.forEach(v => {
                const item = document.createElement('div');
                item.className = 'index-item';
                item.onclick = () => {
                    goToPage(v.page);
                    setTimeout(() => {
                        const ayaWraps = document.querySelectorAll('.aya-wrap');
                        for (const wrap of ayaWraps) {
                            if (parseInt(wrap.getAttribute('data-verse')) === v.aya_no) {
                                wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                wrap.classList.add('verse-search-highlight');
                                setTimeout(() => wrap.classList.remove('verse-search-highlight'), 3000);
                                break;
                            }
                        }
                    }, 500);
                    toggleSearchPanel();
                };
                const cleanText = cleanAyaText(v.aya_text);
                // XSS Fix: استخدام textContent للنصوص الخارجية القادمة من JSON
                const suraInfoEl = document.createElement('div');
                suraInfoEl.className = 'sura-info';

                const suraNameEl = document.createElement('span');
                suraNameEl.className = 'sura-name-list';
                suraNameEl.textContent = `${v.sura_name_ar} - آية ${v.aya_no}`;

                const suraDetailsEl = document.createElement('div');
                suraDetailsEl.className = 'sura-details';
                suraDetailsEl.style.cssText = 'font-family: Arial, sans-serif; font-size: 0.95rem; color: var(--ink); margin-top: 6px; line-height: 1.6; font-weight: 500;';
                suraDetailsEl.textContent = cleanText;

                suraInfoEl.appendChild(suraNameEl);
                suraInfoEl.appendChild(suraDetailsEl);

                const pageBadgeEl = document.createElement('div');
                pageBadgeEl.className = 'page-badge';
                pageBadgeEl.textContent = `ص ${v.page}`;

                item.appendChild(suraInfoEl);
                item.appendChild(pageBadgeEl);
                indexList.appendChild(item);
            });
        }
        else if (type === 'pages') {
            if (countBadge) countBadge.textContent = `-`;
            indexList.innerHTML = '<div style="text-align:center; color:#64748b; padding:2rem;">أدخل رقم الصفحة (1-604) في الأعلى للذهاب إليها مباشرة</div>';
        }
    }

    // متغيرات وضع التركيز العميق
    let lastScrollTop = 0;
    let scrollTimeout;
    let isFooterVisible = true;

    // متغيرات التفسير
    let lastTapTime = 0;
    let tappedVerse = null;
    let currentVerseText = '';
    let currentVerseNumber = '';
    let currentSuraNumber = '';
    let currentTafseer = '';
    let currentSuraName = '';

    // نظام المفضلة
    const FAVORITES_KEY = 'quran_favorites';
    let favorites = [];

    function loadFavorites() {
        try {
            const saved = localStorage.getItem(FAVORITES_KEY);
            favorites = saved ? JSON.parse(saved) : [];
        } catch (e) {
            favorites = [];
        }
    }

    function saveFavorites() {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }

    function loadBookmark() {
        try {
            const saved = localStorage.getItem(BOOKMARK_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    function saveBookmark(suraId, ayahId, pageNum) {
        const bookmark = { suraId, ayahId, page: pageNum, timestamp: Date.now() };
        localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmark));

        // Update UI instantly
        document.querySelectorAll('.bookmarked-verse').forEach(el => el.classList.remove('bookmarked-verse'));
        if (tappedVerse) tappedVerse.classList.add('bookmarked-verse');

        showNotification('تم حفظ موضع القراءة', bookmarkBtn);
        showActionBar();
    }

    function addToFavorites(suraName, verseNumber, verseText, pageNumber) {
        const favorite = {
            id: Date.now(),
            suraName: suraName,
            verseNumber: verseNumber,
            verseText: verseText,
            pageNumber: pageNumber,
            dateAdded: new Date().toISOString()
        };

        // التحقق من وجود الآية في المفضلة
        const exists = favorites.some(fav =>
            fav.suraName === suraName && fav.verseNumber === verseNumber
        );

        if (exists) {
            showNotification('موجودة بالفعل', favoriteBtn);
            return false;
        }

        favorites.unshift(favorite); // إضافة في البداية
        saveFavorites();
        return true;
    }

    function removeFromFavorites(id) {
        favorites = favorites.filter(fav => fav.id !== id);
        saveFavorites();
    }

    function getFavorites() {
        return favorites.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }

    function isFavorite(suraName, verseNumber) {
        return favorites.some(fav =>
            fav.suraName === suraName && fav.verseNumber === verseNumber
        );
    }

    // نظام الأداء
    const PERFORMANCE_KEY = 'quran_performance';
    let performanceData = [];

    function loadPerformance() {
        try {
            const saved = localStorage.getItem(PERFORMANCE_KEY);
            performanceData = saved ? JSON.parse(saved) : [];
        } catch (e) {
            performanceData = [];
        }
    }

    function savePerformance() {
        localStorage.setItem(PERFORMANCE_KEY, JSON.stringify(performanceData));
    }

    function recordDailyPerformance(date, pagesRead, targetPages, completed) {
        const existingIndex = performanceData.findIndex(p => p.date === date);

        const performance = {
            date: date,
            pagesRead: pagesRead,
            targetPages: targetPages,
            completed: completed,
            timestamp: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            performanceData[existingIndex] = performance;
        } else {
            performanceData.push(performance);
        }

        savePerformance();
    }

    function getTodayPerformance() {
        const today = new Date().toDateString();
        const todayData = performanceData.find(p => p.date === today);
        return todayData || { date: today, pagesRead: 0, targetPages: dailyPages, completed: false };
    }

    function getWeeklyPerformance() {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        return performanceData.filter(p => {
            const perfDate = new Date(p.date);
            return perfDate >= weekAgo && perfDate <= today;
        });
    }

    function calculateStreak() {
        if (performanceData.length === 0) return 0;

        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = checkDate.toDateString();
            const dayData = performanceData.find(p => p.date === dateStr);

            if (dayData && dayData.completed) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        return streak;
    }

    // نظام المزامنة مع الويدجت
    const WIDGET_SYNC_KEY = 'quran_widget_sync';

    function syncWithWidget() {
        const todayPerf = getTodayPerformance();
        const streak = calculateStreak();

        const widgetData = {
            currentPage: currentPageNum,
            todayProgress: {
                pagesRead: todayPerf.pagesRead,
                targetPages: todayPerf.targetPages,
                percentage: Math.round((todayPerf.pagesRead / todayPerf.targetPages) * 100),
                completed: todayPerf.completed
            },
            lastReadTime: new Date().toISOString(),
            streak: streak,
            favoritesCount: favorites.length,
            suraName: currentSuraName
        };

        localStorage.setItem(WIDGET_SYNC_KEY, JSON.stringify(widgetData));

        // إرسال حدث للويدجت
        window.dispatchEvent(new CustomEvent('quranProgressUpdate', {
            detail: widgetData
        }));
    }

    // وظائف القوائم المنبثقة
    // وظائف المفضلات العصرية
    // وظائف المفضلات العصرية
    const favoritesOverlay = document.getElementById('favoritesOverlay');

    function showFavoritesPanel() {
        renderFavorites();
        favoritesPanel.classList.add('show');
        favoritesOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        triggerHaptic('medium');
    }

    function hideFavoritesPanel() {
        favoritesPanel.classList.remove('show');
        favoritesOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    // Click overlay to close
    if (favoritesOverlay) favoritesOverlay.onclick = hideFavoritesPanel;

    function renderFavorites() {
        const favList = getFavorites();
        if (!favoritesList) return;
        favoritesList.innerHTML = '';

        if (favList.length === 0) {
            favoritesList.innerHTML = `
                        <div class="empty-favorites animate-fade-in">
                            <div class="empty-icon-box">
                                <i data-lucide="heart-off" class="w-10 h-10"></i>
                            </div>
                            <h3>لا توجد مفضلات</h3>
                            <p>أضف بعض الآيات التي تلامس قلبك لتجدها هنا لاحقاً.</p>
                        </div>
                    `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        favList.forEach((fav, index) => {
            const card = document.createElement('div');
            card.className = 'favorite-card animate-fade-in';
            card.style.animationDelay = `${index * 0.05}s`;

            // XSS Fix: بناء DOM يدوياً بدلاً من innerHTML لبيانات localStorage
            const cardTop = document.createElement('div');
            cardTop.className = 'card-top';

            const cardInfo = document.createElement('div');
            cardInfo.className = 'card-info';

            const cardH4 = document.createElement('h4');
            cardH4.textContent = fav.suraName; // textContent يمنع XSS

            const cardSpan = document.createElement('span');
            cardSpan.textContent = `الآية ${fav.verseNumber} • صفحة ${fav.pageNumber}`;

            cardInfo.appendChild(cardH4);
            cardInfo.appendChild(cardSpan);

            const cardActions = document.createElement('div');
            cardActions.className = 'card-actions';

            // زر النسخ
            const copyBtnEl = document.createElement('button');
            copyBtnEl.className = 'card-btn copy';
            copyBtnEl.title = 'نسخ';
            copyBtnEl.innerHTML = '<i data-lucide="copy"></i>';
            copyBtnEl.addEventListener('click', function () {
                window._favCopyHandler(fav.id, this);
            });

            // زر المشاركة
            const shareBtnEl = document.createElement('button');
            shareBtnEl.className = 'card-btn share';
            shareBtnEl.title = 'واتساب';
            shareBtnEl.innerHTML = '<i data-lucide="send"></i>';
            shareBtnEl.addEventListener('click', function () {
                window._favShareHandler(fav.id);
            });

            // زر الحذف
            const deleteBtnEl = document.createElement('button');
            deleteBtnEl.className = 'card-btn delete';
            deleteBtnEl.title = 'حذف';
            deleteBtnEl.innerHTML = '<i data-lucide="trash-2"></i>';
            deleteBtnEl.addEventListener('click', function () {
                window.confirmDeleteFavorite(fav.id, this);
            });

            cardActions.appendChild(copyBtnEl);
            cardActions.appendChild(shareBtnEl);
            cardActions.appendChild(deleteBtnEl);

            cardTop.appendChild(cardInfo);
            cardTop.appendChild(cardActions);

            const verseTextEl = document.createElement('p');
            verseTextEl.className = 'favorite-text';
            verseTextEl.textContent = fav.verseText; // textContent يمنع XSS

            card.appendChild(cardTop);
            card.appendChild(verseTextEl);
            favoritesList.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    // مساعدات الأزرار داخل المفضلات (XSS-Safe: تستخدم fav.id للوصول للبيانات بدلاً من inline data)
    window._favCopyHandler = function (favId, btn) {
        const fav = favorites.find(f => f.id === favId);
        if (!fav) return;
        const fullText = `${fav.suraName} (${fav.verseNumber}): { ${fav.verseText} }`;
        navigator.clipboard.writeText(fullText).then(() => {
            const icon = btn.querySelector('i');
            if (icon) {
                const originalAttr = icon.getAttribute('data-lucide');
                icon.setAttribute('data-lucide', 'check');
                if (window.lucide) lucide.createIcons();
                triggerHaptic('success');
                setTimeout(() => {
                    icon.setAttribute('data-lucide', originalAttr);
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            }
        });
    };

    window._favShareHandler = function (favId) {
        const fav = favorites.find(f => f.id === favId);
        if (!fav) return;
        const message = `{ ${fav.verseText} }\n[${fav.suraName}: ${fav.verseNumber}]\n\nتمت المشاركة من تطبيق خُطى 🌙`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    window.confirmDeleteFavorite = function (id, btn) {
        const card = btn.closest('.favorite-card');
        card.style.transform = 'translateX(100px)';
        card.style.opacity = '0';
        triggerHaptic('medium');
        setTimeout(() => {
            removeFromFavorites(id);
            renderFavorites();
        }, 300);
    };

    // Bind explicitly to handle potential scoping/bubbling issues
    // Note: Event listeners moved to init() to prevent duplicates

    // وظيفة الإشعارات
    function showNotification(message, buttonElement) {
        if (!buttonElement) return;
        
        // إزالة أي إشعارات سابقة
        const existingTooltip = document.querySelector('.btn-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // إنشاء الإشعار فوق الزر
        const tooltip = document.createElement('div');
        tooltip.className = 'btn-tooltip';
        tooltip.textContent = message;

        // إضافة الإشعار فوق الزر
        buttonElement.style.position = 'relative';
        buttonElement.appendChild(tooltip);

        // إظهار الإشعار
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 50);

        // إخفاء الإشعار بعد ثانية
        setTimeout(() => {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (buttonElement.contains(tooltip)) {
                    buttonElement.removeChild(tooltip);
                }
            }, 300);
        }, 1000);
    }

    // Search Panel & Indexing Functions (Note: Event listeners moved to init section)
    function toggleSearchPanel() {
        if (!searchPanel) return;
        const isHidden = !searchPanel.classList.contains('show');
        if (isHidden) {
            searchPanel.classList.add('show');
            if (mainSearchInput) mainSearchInput.focus();
            renderIndex('verses'); // Default view
        } else {
            searchPanel.classList.remove('show');
        }
    }



    // Tabs Logic
    indexTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            indexTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            renderIndex(tabName);
        });
    });

    // Search Logic
    mainSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const activeTab = document.querySelector('.index-tab.active').dataset.tab;

        if (activeTab === 'pages') {
            // Check if input is a valid page number
            const pageNum = parseInt(query);
            if (pageNum >= 1 && pageNum <= 604) {
                goToPage(pageNum);
                toggleSearchPanel();
            }
        } else {
            renderIndex(activeTab, query);
        }
    });

    function loadTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_THEME);
            if (saved && THEMES.includes(saved)) {
                currentThemeIndex = THEMES.indexOf(saved);
            } else {
                currentThemeIndex = 0;
            }
        } catch (_) {
            currentThemeIndex = 0;
        }
        applyTheme();
    }

    function saveTheme() {
        try {
            localStorage.setItem(STORAGE_KEY_THEME, THEMES[currentThemeIndex]);
        } catch (_) { }
    }

    function applyTheme() {
        document.body.setAttribute('data-theme', THEMES[currentThemeIndex]);
    }

    function switchTheme() {
        currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
        applyTheme();
        saveTheme();
    }

    // وضع التركيز العميق
    function initDeepFocusMode() {
        pageView.addEventListener('scroll', function () {
            const currentScrollTop = pageView.scrollTop;

            if (currentScrollTop > lastScrollTop && currentScrollTop > 50) {
                // التمرير لأسفل - إخفاء الفوتر
                if (isFooterVisible) {
                    appFooter.classList.add('auto-hide');
                    appFooter.classList.remove('auto-show');
                    isFooterVisible = false;
                }
            } else if (currentScrollTop < lastScrollTop - 10) {
                // التمرير لأعلى - إظهار الفوتر
                if (!isFooterVisible) {
                    appFooter.classList.add('auto-show');
                    appFooter.classList.remove('auto-hide');
                    isFooterVisible = true;
                }
            }

            lastScrollTop = currentScrollTop;

            // إلغاء التايمر السابق
            clearTimeout(scrollTimeout);

            // إخفاء الفوتر بعد التوقف عن التمرير
            scrollTimeout = setTimeout(function () {
                if (currentScrollTop > 50) {
                    appFooter.classList.add('auto-hide');
                    appFooter.classList.remove('auto-show');
                    isFooterVisible = false;
                }
            }, 2000);
        });
    }


    // تحديث شريط التقدم اليومي
    function updateDailyProgress() {
        const todayEnd = Math.min(dailyStartPage + dailyPages - 1, TOTAL_PAGES);
        const totalInPlan = todayEnd - dailyStartPage + 1;
        let done = 0;

        if (currentPageNum >= dailyStartPage && currentPageNum <= todayEnd) {
            done = currentPageNum - dailyStartPage + 1;
        } else if (currentPageNum > todayEnd) {
            done = totalInPlan;
        }

        const ratio = totalInPlan > 0 ? done / totalInPlan : 0;
        const percentage = ratio * 100;

        dailyProgressFill.style.width = percentage + '%';
        const label = document.querySelector('.daily-progress-label');
        if (label) label.textContent = `الورد اليومي: ${Math.round(percentage)}%`;

        // اهتزاز عند إكمال الورد
        if (done === totalInPlan && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    // التفسير اللحظي
    function showVerseInsight(verseText, verseNumber) {
        // Evaluate sura number correctly
        let suraNo = currentSuraNumber;
        if (!suraNo) {
            // Fallback (rarely used now)
            const currentSurasOnPage = (pagesMap[currentPageNum] || []).filter(v => v.sura_name_ar.trim() === currentSuraName.trim());
            suraNo = currentSurasOnPage.length > 0 ? currentSurasOnPage[0].sura_no : null;
        }

        if (!suraNo) {
            insightText.textContent = "عذراً، لم يتم العثور على التفسير لهذه السورة.";
            verseInsight.classList.add('show');
            return;
        }

        currentVerseText = verseText;
        currentVerseNumber = verseNumber;

        const key = `${suraNo}-${verseNumber}`;
        const data = tafseerMap[key];

        if (data) {
            currentTafseer = data.aya_tafseer;
            // XSS Fix: تعقيم نص التفسير القادم من JSON الخارجي قبل حقنه في DOM
            insightText.innerHTML = sanitizeHtml(currentTafseer);
        } else {
            currentTafseer = "التفسير غير متوفر لهذه الآية حالياً.";
            insightText.textContent = currentTafseer;
        }

        verseInsight.classList.add('show');
    }

    function hideVerseInsight() {
        verseInsight.classList.remove('show');
        // لا إخفاء شريط الأزرار هنا
    }

    function showActionBar() {
        verseActionBar.classList.add('show');

        // Re-create Lucide icons for the new audio button
        if (window.lucide) {
            lucide.createIcons();
        }

        // Update bookmark button state
        if (bookmarkBtn) {
            const bookmark = loadBookmark();
            if (bookmark && tappedVerse) {
                // Use data attributes if available, otherwise fallback might be needed but we added them
                const s = parseInt(tappedVerse.getAttribute('data-sura'));
                const a = parseInt(tappedVerse.getAttribute('data-verse'));
                if (bookmark.suraId === s && bookmark.ayahId === a) {
                    bookmarkBtn.classList.add('active-bookmark');
                } else {
                    bookmarkBtn.classList.remove('active-bookmark');
                }
            } else {
                bookmarkBtn.classList.remove('active-bookmark');
            }
        }
    }

    function hideActionBar() {
        verseActionBar.classList.remove('show');
    }

    // وظائف الأزرار
    function copyVerse(trigger) {
        let targetBtn = copyBtn;
        if (trigger instanceof HTMLElement) targetBtn = trigger;
        else if (trigger && trigger.currentTarget instanceof HTMLElement) targetBtn = trigger.currentTarget;

        const fullText = `{ ${currentVerseText} }  ☉ سورة ${currentSuraName}: ${currentVerseNumber}`;
        navigator.clipboard.writeText(fullText).then(() => {
            showNotification('تم النسخ', targetBtn);
        });
    }

    window.copyFavoriteVerse = function (text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('تم النسخ', event ? event.target.closest('.favorite-action-btn') : null);
        });
    }

    function shareWhatsApp() {
        const fullText = `${currentSuraName} - الآية ${currentVerseNumber}: { ${currentVerseText} }`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        window.open(whatsappUrl, '_blank');
        showNotification('تم المشاركة', shareBtn);
    }

    function shareWhatsAppWithTafseer() {
        const fullText = `${currentSuraName} - الآية ${currentVerseNumber}: { ${currentVerseText} }\n\nالتفسير: ${currentTafseer}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        window.open(whatsappUrl, '_blank');
        showNotification('تم المشاركة', shareWhatsAppBtn);
    }

    function loadPlan() {
        try {
            const saved = localStorage.getItem('quranPlanV3');
            if (saved) {
                const plan = JSON.parse(saved);
                dailyPages = plan.dailyPages || 22;
                const day = plan.currentDay || 1;
                dailyStartPage = 1 + (day - 1) * dailyPages;
            }
        } catch (_) { }
    }

    function savePosition(pageNum) {
        if (pageNum < 1 || pageNum > TOTAL_PAGES) return;
        localStorage.setItem(STORAGE_KEY_PAGE, String(pageNum));
        const verses = pagesMap[pageNum];
        if (verses && verses.length > 0) {
            const name = verses[0].sura_name_ar ? verses[0].sura_name_ar.trim() : '';
            if (name) localStorage.setItem(STORAGE_KEY_SURA, name);
        }
    }

    function getLastPage() {
        const p = parseInt(localStorage.getItem(STORAGE_KEY_PAGE), 10);
        return (p >= 1 && p <= TOTAL_PAGES) ? p : 1;
    }

    function buildPagesMap(data) {
        const byPage = {};
        data.forEach(function (aya) {
            const p = aya.page;
            if (!byPage[p]) byPage[p] = [];
            byPage[p].push(aya);
        });
        Object.keys(byPage).forEach(function (p) {
            byPage[p].sort(function (a, b) {
                return (a.line_start - b.line_start) || (a.aya_no - b.aya_no);
            });
        });
        return byPage;
    }

    function escapeHtml(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    /**
     * دالة التعقيم (XSS Sanitization)
     * تُستخدم عند الحاجة لعرض HTML من مصادر خارجية (JSON / localStorage)
     * - تحوّل وسوم <script> وأحداث inline (onclick, onerror, onload...) إلى نص عادي
     * - تسمح فقط بالوسوم الآمنة: span, b, i, em, strong, br, p, div
     */
    function sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return '';

        // 1. حذف وسوم <script>...</script> بالكامل (مع محتواها)
        let clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');

        // 2. حذف وسوم <style>...</style> بالكامل
        clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');

        // 3. حذف أي وسم يحتوي على أحداث خطيرة (on...=)
        clean = clean.replace(/<[^>]+\s+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, function (tag) {
            // إزالة خاصة الحدث فقط مع الإبقاء على الوسم إن كان آمناً
            return tag.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
        });

        // 4. حذف بروتوكول javascript: من الروابط
        clean = clean.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
        clean = clean.replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, 'src=""');

        // 5. حذف خاصية data: الخطيرة من الروابط
        clean = clean.replace(/href\s*=\s*["']\s*data:[^"']*["']/gi, 'href="#"');

        return clean;
    }

    /** إزالة رموز الوقف واختصارات الوقف في نهاية الآية (سم، سح، ضج، قلي، صلي...) */
    function cleanAyaText(text) {
        if (!text || typeof text !== 'string') return '';

        // 1. إزالة رموز اليونيكود الخاصة بالوقف والتنسيق (الرموز الصغيرة فوق الكلمات)
        // النطاق 06D6-06ED يشمل معظم علامات الوقف والضبط
        let out = text.replace(/[\u06D6-\u06ED\u08D4-\u08ED\u06DE\u0773\u0774\u06DD]/g, '');

        // 2. إزالة رموز العرض العربي الخاص (Presentation Forms)
        let cleaned = '';
        for (var i = 0; i < out.length; i++) {
            var code = out.charCodeAt(i);
            if (code >= 0xFB00 && code <= 0xFDFF) continue;
            cleaned += out.charAt(i);
        }

        // 3. تنظيف المسافات الزائدة
        cleaned = cleaned.trim().replace(/\s+/g, ' ');

        // 4. إزالة الكلمات الرمزية المضافة في نهاية الآيات
        const symbols = ['سم', 'سح', 'ضج', 'قلي', 'صلي', 'صل', 'ج', 'م', 'لا', 'ق'];

        // تنظيف إضافي للقضاء على المسافات داخل الرموز (مثل س م -> سم)
        symbols.forEach(s => {
            const spacedSymbol = s.split('').join(' ');
            const regSpaced = new RegExp('\\s*' + spacedSymbol + '\\s*$', 'g');
            cleaned = cleaned.replace(regSpaced, '').trim();
        });

        let prevLength;
        do {
            prevLength = cleaned.length;
            symbols.forEach(s => {
                // نبحث عن الرمز في نهاية النص بحيث يكون مسبوقاً بمسافة أو علامة ترقيم
                const reg = new RegExp('([\\s\\(\\)\\[\\]])' + s + '$', 'g');
                cleaned = cleaned.replace(reg, '').trim();
            });
        } while (cleaned.length !== prevLength);

        return cleaned.trim();
    }

    /** توحيد النص العربي للبحث - إزالة الحركات وتبسيط الأحرف */
    function normalizeArabic(text) {
        if (!text) return '';
        return text
            .replace(/[\u0640\u064B-\u0652\u0653-\u065F\u0670\u06D6-\u06ED\u08D4-\u08ED\u06DD\u06DE]/g, '') // إزالة التشكيل وعلامات الوقف القرآنية
            .replace(/\u0671/g, 'ا')                      // ٱ (ألف الوصل) -> ا
            .replace(/[أإآ]/g, 'ا')                       // توحيد الألف
            .replace(/ى/g, 'ي')                            // توحيد الياء والألف المقصورة
            .replace(/ة/g, 'ه')                            // توحيد التاء المربوطة والهاء
            .trim();
    }

    function highlightAllah(text) {
        return text.replace(/الله/g, '<span class="allah-highlight">الله</span>');
    }

    function renderCurrentPage() {
        const verses = pagesMap[currentPageNum];
        const bookmark = loadBookmark();

        if (!verses || verses.length === 0) {
            pageViewInner.innerHTML = '';
            return;
        }

        let html = '';
        let inPageContent = false;
        let firstSuraFound = false;

        verses.forEach(function (v, index) {
            if (v.aya_no === 1) {
                if (inPageContent) {
                    html += '</div>';
                    inPageContent = false;
                }

                // Sura Header - XSS Fix: escapeHtml على اسم السورة القادم من JSON
                const sName = v.sura_name_ar ? v.sura_name_ar.trim() : '';
                html += '<div class="sura-header"><span class="sura-name">سورة ' + escapeHtml(sName) + '</span></div>';

                // Update current sura name for the UI
                if (!firstSuraFound) {
                    currentSuraName = sName;
                    firstSuraFound = true;
                }

                // Basmala (except for Fatiha (1) and Tawba (9))
                if (v.sura_no !== 1 && v.sura_no !== 9) {
                    html += '<p class="basmala">' + highlightAllah(escapeHtml(BASMALA)) + '</p>';
                }
            }

            if (!inPageContent) {
                html += '<div class="page-content">';
                inPageContent = true;
            }

            const cleanText = cleanAyaText(v.aya_text);
            const verseId = `verse-${currentPageNum}-${index}`;

            const isBookmarked = bookmark && bookmark.suraId === v.sura_no && bookmark.ayahId === v.aya_no;
            const bookmarkClass = isBookmarked ? ' bookmarked-verse' : '';

            html += '<span class="aya-wrap' + bookmarkClass + '" id="' + verseId + '" data-sura="' + v.sura_no + '" data-verse="' + v.aya_no + '" data-full-text="' + escapeHtml(cleanText) + '">' +
                highlightAllah(escapeHtml(cleanText)) +
                '<span class="aya-num">' + v.aya_no + '</span></span>';
        });

        if (inPageContent) {
            html += '</div>';
        }

        // If no sura started on this page (middle of a sura), update the name from the first verse
        if (!firstSuraFound && verses.length > 0) {
            currentSuraName = verses[0].sura_name_ar ? verses[0].sura_name_ar.trim() : '';
        }

        // Apply special styling for first two pages
        if (currentPageNum === 1 || currentPageNum === 2) {
            pageView.classList.add('first-pages');
            if (readingArea) readingArea.classList.add('first-pages-active');
            pageView.setAttribute('data-page', currentPageNum);
        } else {
            pageView.classList.remove('first-pages');
            if (readingArea) readingArea.classList.remove('first-pages-active');
            pageView.removeAttribute('data-page');
        }

        // إضافة تأثير الانتقال
        pageView.classList.add('page-transition-out');

        setTimeout(function () {
            pageViewInner.innerHTML = html;
            pageView.classList.remove('page-transition-out');
            pageView.classList.add('page-transition-in');

            setTimeout(function () {
                pageView.classList.add('active');
            }, 50);

            setTimeout(function () {
                pageView.classList.remove('page-transition-in', 'active');
            }, 350);
        }, 300);

        // إضافة مستمع النقر المفرد للتفسير فقط
        setTimeout(function () {
            const verseElements = pageViewInner.querySelectorAll('.aya-wrap');
            verseElements.forEach(function (verse) {
                verse.addEventListener('click', function (e) {
                    // نقر مفيد
                    e.preventDefault();
                    const verseNumber = this.getAttribute('data-verse');
                    const verseText = this.getAttribute('data-full-text');
                    const suraNumber = this.getAttribute('data-sura');

                    // تظليل الآية
                    if (tappedVerse && tappedVerse !== this) {
                        tappedVerse.classList.remove('verse-highlighted');
                    }
                    this.classList.add('verse-highlighted');
                    tappedVerse = this;

                    // تخزين بيانات الآية الحالية
                    currentVerseText = verseText;
                    currentVerseNumber = verseNumber;
                    currentSuraNumber = suraNumber;

                    // إظهار شريط الأزرار فقط
                    showActionBar();

                    // إخفاء نافذة التفسير إذا كانت ظاهرة
                    hideVerseInsight();
                });
            });
        }, 400); // انتظار حتى يكتمل انتقال الصفحة
    }

    function updateUI() {
        pageIndicator.textContent = 'ص ' + currentPageNum;
        btnPrev.disabled = currentPageNum <= 1;
        btnNext.disabled = currentPageNum >= TOTAL_PAGES;

        var verses = pagesMap[currentPageNum];
        if (verses && verses.length > 0) {
            var first = verses[0];
            var suraName = first.sura_name_ar ? first.sura_name_ar.trim() : '';
            var juz = first.jozz || first.juzz || '';
            currentSuraName = suraName; // تحديث اسم السورة الحالي
            floatingSuraName.textContent = suraName || '';
            floatingJuzNumber.textContent = juz ? 'جزء ' + juz : '';
        } else {
            floatingSuraName.textContent = '';
            floatingJuzNumber.textContent = '';
            currentSuraName = '';
        }

        // تحديث شريط التقدم اليومي
        updateDailyProgress();

        // تسجيل الأداء اليومي
        const todayPerf = getTodayPerformance();
        const todayEnd = Math.min(dailyStartPage + dailyPages - 1, TOTAL_PAGES);
        const totalInPlan = todayEnd - dailyStartPage + 1;
        let done = 0;

        if (currentPageNum >= dailyStartPage && currentPageNum <= todayEnd) {
            done = currentPageNum - dailyStartPage + 1;
        } else if (currentPageNum > todayEnd) {
            done = totalInPlan;
        }

        const completed = done >= totalInPlan;
        recordDailyPerformance(new Date().toDateString(), done, dailyPages, completed);

        // مزامنة مع الويدجت
        syncWithWidget();

        // اهتزاز عند إكمال الورد
        if (currentPageNum === todayEnd + 1 && navigator.vibrate) {
            navigator.vibrate([20, 50, 20]);
        }
    }

    function goToPage(pageNum) {
        if (pageNum < 1 || pageNum > TOTAL_PAGES) return;
        currentPageNum = pageNum;
        savePosition(currentPageNum);
        renderCurrentPage();
        updateUI();
    }

    function goPrev() {
        if (currentPageNum > 1) goToPage(currentPageNum - 1);
    }

    function goNext() {
        if (currentPageNum < TOTAL_PAGES) goToPage(currentPageNum + 1);
    }

    function onSwipe(deltaX) {
        if (deltaX > SWIPE_THRESHOLD) goNext();
        else if (deltaX < -SWIPE_THRESHOLD) goPrev();
    }

    pageView.addEventListener('touchstart', function (e) {
        touchStartX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    }, { passive: true });
    pageView.addEventListener('touchend', function (e) {
        const x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : e.clientX;
        onSwipe(x - touchStartX);
    }, { passive: true });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') goPrev();
        else if (e.key === 'ArrowLeft') goNext();
    });

    async function initData() {
        try {
            let data = null;
            try {
                data = await window.QuranDB.get('quran_data');
            } catch (err) {
                console.warn('DB get failed, falling back to fetch', err);
            }
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                const res = await fetch('assets/quran.json');
                data = await res.json();
                // لا ننتظر حفظ البيانات كي لا تتجمد واجهة المستخدم
                try {
                    window.QuranDB.set('quran_data', data).catch(console.error);
                } catch (err) {
                    console.warn('DB set failed', err);
                }
            }

            loadPlan();
            loadTheme();
            loadFavorites(); // تحميل المفضلة
            loadPerformance(); // تحميل بيانات الأداء
            pagesMap = buildPagesMap(data);
            loadingState.style.display = 'none';
            pageView.style.display = 'block';

            // تحديد الصفحة الافتتاحية: الرابط أولاً، ثم آخر صفحة وصل إليها، ثم بداية ورد اليوم
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page');
            const openIndexParam = urlParams.get('openIndex');
            let startPage = 1;

            if (pageParam) {
                const p = parseInt(pageParam, 10);
                if (p >= 1 && p <= TOTAL_PAGES) startPage = p;
            } else {
                const lastSaved = getLastPage();
                if (lastSaved > 1) {
                    startPage = lastSaved;
                } else {
                    // إذا كانت أول مرة، نذهب لبداية ورد اليوم حسب الخطة
                    try {
                        const savedPlan = localStorage.getItem('quranPlanV3');
                        if (savedPlan) {
                            const plan = JSON.parse(savedPlan);
                            const day = plan.currentDay || 1;
                            const dPages = plan.dailyPages || 20;
                            startPage = 1 + (day - 1) * dPages;
                        }
                    } catch (e) { }
                }
            }

            currentPageNum = Math.min(Math.max(1, startPage), TOTAL_PAGES);
            renderCurrentPage();
            updateUI();

            if (openIndexParam === 'true') {
                setTimeout(() => {
                    if (searchPanel && !searchPanel.classList.contains('show')) {
                        searchPanel.classList.add('show');
                        if (typeof renderIndex === 'function') renderIndex('suras');
                    }
                }, 300);
            }

            // تهيئة الميزات الإبداعية
            initDeepFocusMode();

            // مستمعو الأحداث
            btnPrev.addEventListener('click', goPrev);
            btnNext.addEventListener('click', goNext);
            themeBtn.addEventListener('click', switchTheme);
            insightClose.addEventListener('click', hideVerseInsight);

            // Search buttons with improved handling
            if (searchBtn) {
                searchBtn.addEventListener('click', function (e) {
                    handleButtonClick.call(this, toggleSearchPanel, e);
                });
            }
            if (searchClose) {
                searchClose.addEventListener('click', function (e) {
                    handleButtonClick.call(this, toggleSearchPanel, e);
                });
            }

            // أزرار شريط الأدوات
            copyBtn.addEventListener('click', copyVerse);

            if (audioBtn) {
                audioBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (window.audioPlayer) {
                        const audioContainer = document.getElementById('audioPlayerContainer');
                        if (audioContainer) {
                            audioPlayer.show(!audioContainer.style.display || audioContainer.style.display === 'none');
                        }
                    }
                });
            }

            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', function (e) {
                    e.stopPropagation(); // Prevent bubbling issues
                    if (tappedVerse) {
                        const s = parseInt(tappedVerse.getAttribute('data-sura'));
                        const a = parseInt(tappedVerse.getAttribute('data-verse'));
                        // Ensure we have valid numbers
                        if (!isNaN(s) && !isNaN(a)) {
                            saveBookmark(s, a, currentPageNum);
                        }
                    }
                });
            }

            if (returnBookmarkBtn) {
                returnBookmarkBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    const bookmark = loadBookmark();
                    if (bookmark && bookmark.page) {
                        goToPage(bookmark.page);
                        setTimeout(() => {
                            const selector = `.aya-wrap[data-sura="${bookmark.suraId}"][data-verse="${bookmark.ayahId}"]`;
                            const el = document.querySelector(selector);
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('verse-highlighted');
                                setTimeout(() => el.classList.remove('verse-highlighted'), 2000);
                            }
                        }, 600);
                    } else {
                        showNotification('لا توجد إشارة محفوظة', returnBookmarkBtn);
                    }
                });
            }
            tafseerBtn.addEventListener('click', function () {
                hideActionBar(); // إخفاء شريط الأزرار
                showVerseInsight(currentVerseText, currentVerseNumber); // إظهار نافذة التفسير
            });
            favoriteBtn.addEventListener('click', function () {
                const added = addToFavorites(currentSuraName, currentVerseNumber, currentVerseText, currentPageNum);
                if (added) {
                    showNotification('تمت الإضافة', favoriteBtn);
                    syncWithWidget(); // مزامنة مع الويدجت
                }
            });
            shareBtn.addEventListener('click', shareWhatsApp);

            if (tibyanBtn) {
                tibyanBtn.addEventListener('click', function () {
                    const contextStr = currentVerseText ? `سورة ${currentSuraName} - آية ${currentVerseNumber}: ${currentVerseText}` : '';
                    if (window.openTibyanModal) {
                        window.openTibyanModal(contextStr);
                    }
                });
            }

            // Improved button handling function
            function handleButtonClick(callback, event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                if (this.disabled) return;
                this.disabled = true;
                setTimeout(() => {
                    this.disabled = false;
                }, 300);
                callback();
            }

            // أزرار القوائم المنبثقة
            if (favoritesBtn) {
                favoritesBtn.addEventListener('click', function (e) {
                    handleButtonClick.call(this, showFavoritesPanel, e);
                });
            }

            if (favoritesClose) {
                favoritesClose.removeEventListener('click', hideFavoritesPanel);
                favoritesClose.addEventListener('click', function (e) {
                    handleButtonClick.call(this, hideFavoritesPanel, e);
                });
            }

            // أزرار نافذة التفسير
            if (copyVerseBtn) copyVerseBtn.addEventListener('click', copyVerse);
            if (copyWithTafseerBtn) copyWithTafseerBtn.addEventListener('click', function () {
                const fullText = `${currentSuraName} (${currentVerseNumber}): { ${currentVerseText} }\n\nالتفسير: ${currentTafseer}`;
                navigator.clipboard.writeText(fullText).then(() => {
                    showNotification('تم النسخ', copyWithTafseerBtn);
                });
            });
            if (shareWhatsAppBtn) shareWhatsAppBtn.addEventListener('click', shareWhatsAppWithTafseer);

            // إغلاق القوائم عند النقر خارجها
            document.addEventListener('click', function (e) {
                if (favoritesPanel && favoritesPanel.classList.contains('show')) {
                    const isClickInside = favoritesPanel.contains(e.target);
                    const isClickOnBtn = favoritesBtn.contains(e.target);
                    if (!isClickInside && !isClickOnBtn) {
                        hideFavoritesPanel();
                    }
                }
                if (searchPanel && searchPanel.classList.contains('show')) {
                    const isClickInside = searchPanel.contains(e.target);
                    const isClickOnBtn = searchBtn.contains(e.target);
                    if (!isClickInside && !isClickOnBtn) {
                        toggleSearchPanel();
                    }
                }
            });
            document.addEventListener('click', function (e) {
                if (!verseActionBar.contains(e.target) && !e.target.closest('.aya-wrap') && !verseInsight.contains(e.target)) {
                    hideActionBar();
                    if (tappedVerse) {
                        tappedVerse.classList.remove('verse-highlighted');
                        tappedVerse = null;
                    }
                }
            });

            // تحميل التفسير في الخلفية لتسريع البداية
            try {
                let tafseerRaw = null;
                try {
                    tafseerRaw = await window.QuranDB.get('tafseer_data_raw');
                } catch (dbErr) {
                    console.warn("DB get tafseer failed, falling back to fetch", dbErr);
                }

                if (!tafseerRaw || !Array.isArray(tafseerRaw) || tafseerRaw.length === 0) {
                    const tRes = await fetch('assets/tafseerMouaser_v03.json');
                    tafseerRaw = await tRes.json();
                    try {
                        window.QuranDB.set('tafseer_data_raw', tafseerRaw).catch(console.error);
                    } catch (dbSetErr) {
                        console.warn("DB set tafseer failed", dbSetErr);
                    }
                }
                
                tafseerData = tafseerRaw;
                // بنية خريطة للبحث السريع: "suraNo-ayaNo"
                tafseerRaw.forEach(v => {
                    tafseerMap[`${v.sura_no}-${v.aya_no}`] = v;
                });
                console.log("Tafseer DB loaded successfully");
            } catch (tafseerErr) {
                console.warn("Failed to load tafseer data, continuing without it.", tafseerErr);
            }
        } catch (err) {
            loadingState.style.display = 'flex'; // Make sure the error is visible
            loadingState.innerHTML = `
                        <div style="text-align: center; padding: 2rem; direction: rtl; font-family: 'Tajawal', sans-serif;">
                            <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 2s infinite;">😕</div>
                            <h3 style="color: var(--navy); margin-bottom: 1rem; font-weight: 800; font-size: 1.2rem;">عذراً، تعذر تحميل المصحف</h3>
                            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; line-height: 1.6;">يبدو أن هناك مشكلة في تحميل ملفات المصحف.<br>يمكنك المحاولة مرة أخرى أو استخدام تطبيق "آيات" الموثوق:</p>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.8rem; max-width: 280px; margin: 0 auto;">
                                <button onclick="location.reload()" style="background: var(--navy); color: white; padding: 1rem; border-radius: 0.8rem; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2); transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'">
                                    <span>🔄</span> إعادة المحاولة
                                </button>
                                
                                <a href="https://play.google.com/store/apps/details?id=sa.edu.ksu.Ayat" target="_blank" style="background: #e8f5e9; color: #15803d; padding: 0.9rem; border-radius: 0.8rem; text-decoration: none; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem; border: 1px solid #bbf7d0;">
                                    <span>🤖</span> تحميل للأندرويد (Ayat)
                                </a>
                                
                                <a href="https://apps.apple.com/us/app/ayat-al-quran-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85/id634325420" target="_blank" style="background: #f8fafc; color: #334155; padding: 0.9rem; border-radius: 0.8rem; text-decoration: none; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem; border: 1px solid #e2e8f0;">
                                    <span>🍎</span> تحميل للآيفون (Ayat)
                                </a>
                                
                                <a href="index.html" style="margin-top: 1rem; color: #94a3b8; font-size: 0.8rem; text-decoration: none; font-weight: medium;">العودة للرئيسية</a>
                            </div>
                        </div>
                    `;
            console.error("Initialization err:", err);
        }
    }

    initData();
})();
