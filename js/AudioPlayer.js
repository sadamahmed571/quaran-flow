/**
 * AudioPlayer - Smart Audio Player Component
 * Handles audio playback, speed control, quality selection, and UI management
 */

class AudioPlayer {
    constructor() {
        this.audioElement = new Audio();
        this.isPlaying = false;
        this.currentSurah = null;
        this.currentAyah = null;
        this.playbackSpeed = 1.0;
        this.isOffline = !navigator.onLine;
        
        // UI Elements
        this.playerContainer = null;
        this.playPauseBtn = null;
        this.progressSlider = null;
        this.currentTimeDisplay = null;
        this.durationDisplay = null;
        this.speedControl = null;
        this.qualityControl = null;
        this.reciterControl = null;
        this.offlineIndicator = null;
        this.loadingIndicator = null;
        
        // Event listeners
        this.initEventListeners();
    }

    /**
     * Initialize event listeners for audio element and network status
     */
    initEventListeners() {
        // Audio events
        this.audioElement.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audioElement.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audioElement.addEventListener('ended', () => this.onEnded());
        this.audioElement.addEventListener('error', (e) => this.onError(e));
        this.audioElement.addEventListener('waiting', () => this.onWaiting());
        this.audioElement.addEventListener('playing', () => this.onPlaying());
        
        // Network status
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());
    }

    /**
     * Create and initialize the audio player UI
     * @param {HTMLElement} container - Container element for the player
     */
    initUI(container) {
        this.playerContainer = container;
        
        container.innerHTML = `
            <div class="audio-player-container">
                <div class="audio-player-header">
                    <div class="audio-info">
                        <span class="audio-reciter" id="audioReciterName">مشاري راشد العفاسي</span>
                        <span class="audio-verse" id="audioVerseInfo">سورة الفاتحة - آية 1</span>
                    </div>
                    <div class="audio-status">
                        <span class="offline-indicator" id="offlineIndicator" style="display: none;">
                            <i data-lucide="wifi-off"></i>
                            أوفلاين
                        </span>
                        <span class="loading-indicator" id="loadingIndicator" style="display: none;">
                            <i data-lucide="loader-2" class="spin"></i>
                            جاري التحميل...
                        </span>
                    </div>
                </div>
                
                <div class="audio-progress-container">
                    <span class="time-display" id="currentTime">0:00</span>
                    <input type="range" class="progress-slider" id="progressSlider" 
                           min="0" max="100" value="0" step="0.1">
                    <span class="time-display" id="duration">0:00</span>
                </div>
                
                <div class="audio-controls">
                    <div class="control-group">
                        <button class="control-btn" id="prevBtn" title="الآية السابقة">
                            <i data-lucide="skip-back"></i>
                        </button>
                        <button class="control-btn play-pause-btn" id="playPauseBtn" title="تشغيل/إيقاف">
                            <i data-lucide="play" id="playIcon"></i>
                            <i data-lucide="pause" id="pauseIcon" style="display: none;"></i>
                        </button>
                        <button class="control-btn" id="nextBtn" title="الآية التالية">
                            <i data-lucide="skip-forward"></i>
                        </button>
                    </div>
                    
                    <div class="control-group settings-group">
                        <div class="settings-dropdown">
                            <button class="control-btn" id="speedBtn" title="السرعة">
                                <i data-lucide="gauge"></i>
                                <span id="speedValue">1x</span>
                            </button>
                            <div class="dropdown-menu" id="speedMenu">
                                <button class="dropdown-item" data-speed="0.5">0.5x</button>
                                <button class="dropdown-item" data-speed="0.75">0.75x</button>
                                <button class="dropdown-item active" data-speed="1">1x</button>
                                <button class="dropdown-item" data-speed="1.25">1.25x</button>
                                <button class="dropdown-item" data-speed="1.5">1.5x</button>
                            </div>
                        </div>
                        
                        <div class="settings-dropdown">
                            <button class="control-btn" id="qualityBtn" title="الجودة">
                                <i data-lucide="settings-2"></i>
                                <span id="qualityValue">128kbps</span>
                            </button>
                            <div class="dropdown-menu" id="qualityMenu">
                                <button class="dropdown-item" data-quality="32">32kbps</button>
                                <button class="dropdown-item" data-quality="64">64kbps</button>
                                <button class="dropdown-item active" data-quality="128">128kbps</button>
                            </div>
                        </div>
                        
                        <div class="settings-dropdown">
                            <button class="control-btn" id="reciterBtn" title="القارئ">
                                <i data-lucide="mic"></i>
                            </button>
                            <div class="dropdown-menu" id="reciterMenu">
                                <button class="dropdown-item active" data-reciter="mishary">مشاري العفاسي</button>
                                <button class="dropdown-item" data-reciter="sudais">عبدالرحمن السديس</button>
                                <button class="dropdown-item" data-reciter="husary">محمود الحصري</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="cache-info" id="cacheInfo">
                    <span class="cache-usage">التخزين: <span id="cacheUsage">0 MB</span> / 200 MB</span>
                </div>
            </div>
        `;
        
        // Cache UI element references
        this.playPauseBtn = container.querySelector('#playPauseBtn');
        this.playIcon = container.querySelector('#playIcon');
        this.pauseIcon = container.querySelector('#pauseIcon');
        this.progressSlider = container.querySelector('#progressSlider');
        this.currentTimeDisplay = container.querySelector('#currentTime');
        this.durationDisplay = container.querySelector('#duration');
        this.prevBtn = container.querySelector('#prevBtn');
        this.nextBtn = container.querySelector('#nextBtn');
        this.speedBtn = container.querySelector('#speedBtn');
        this.speedMenu = container.querySelector('#speedMenu');
        this.speedValue = container.querySelector('#speedValue');
        this.qualityBtn = container.querySelector('#qualityBtn');
        this.qualityMenu = container.querySelector('#qualityMenu');
        this.qualityValue = container.querySelector('#qualityValue');
        this.reciterBtn = container.querySelector('#reciterBtn');
        this.reciterMenu = container.querySelector('#reciterMenu');
        this.reciterName = container.querySelector('#audioReciterName');
        this.verseInfo = container.querySelector('#audioVerseInfo');
        this.offlineIndicator = container.querySelector('#offlineIndicator');
        this.loadingIndicator = container.querySelector('#loadingIndicator');
        this.cacheUsage = container.querySelector('#cacheUsage');
        
        // Initialize UI event listeners
        this.initUIEventListeners();
        
        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Update initial offline status
        this.updateOfflineStatus();
        
        // Update cache info
        this.updateCacheInfo();
    }

    /**
     * Initialize UI event listeners
     */
    initUIEventListeners() {
        // Play/Pause
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // Progress slider
        this.progressSlider.addEventListener('input', (e) => {
            const time = (e.target.value / 100) * this.audioElement.duration;
            this.audioElement.currentTime = time;
        });
        
        // Speed control
        this.speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.speedMenu.classList.toggle('show');
            this.qualityMenu.classList.remove('show');
            this.reciterMenu.classList.remove('show');
        });
        
        this.speedMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setPlaybackSpeed(speed);
                this.speedMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                this.speedMenu.classList.remove('show');
            });
        });
        
        // Quality control
        this.qualityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.qualityMenu.classList.toggle('show');
            this.speedMenu.classList.remove('show');
            this.reciterMenu.classList.remove('show');
        });
        
        this.qualityMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const quality = e.target.dataset.quality;
                audioService.setQuality(quality);
                this.qualityValue.textContent = audioService.getCurrentQuality().label;
                this.qualityMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                this.qualityMenu.classList.remove('show');
                
                // Reload current audio with new quality
                if (this.currentSurah && this.currentAyah) {
                    this.loadAyah(this.currentSurah, this.currentAyah);
                }
            });
        });
        
        // Reciter control
        this.reciterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.reciterMenu.classList.toggle('show');
            this.speedMenu.classList.remove('show');
            this.qualityMenu.classList.remove('show');
        });
        
        this.reciterMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const reciter = e.target.dataset.reciter;
                audioService.setReciter(reciter);
                this.reciterName.textContent = audioService.getCurrentReciter().name;
                this.reciterMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                this.reciterMenu.classList.remove('show');
                
                // Reload current audio with new reciter
                if (this.currentSurah && this.currentAyah) {
                    this.loadAyah(this.currentSurah, this.currentAyah);
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            this.speedMenu.classList.remove('show');
            this.qualityMenu.classList.remove('show');
            this.reciterMenu.classList.remove('show');
        });
        
        // Previous/Next buttons (placeholder - needs integration with Quran data)
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
    }

    /**
     * Load and play a specific ayah
     * @param {number} surahNumber - Surah number
     * @param {number} ayahNumber - Ayah number
     */
    async loadAyah(surahNumber, ayahNumber) {
        this.currentSurah = surahNumber;
        this.currentAyah = ayahNumber;
        
        // Update verse info display
        this.verseInfo.textContent = `سورة ${this.getSurahName(surahNumber)} - آية ${ayahNumber}`;
        
        // Show loading indicator
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
        }
        
        try {
            const url = audioService.getAudioUrl(surahNumber, ayahNumber);
            
            if (url) {
                this.audioElement.src = url;
                await this.audioElement.play();
                this.isPlaying = true;
                this.updatePlayPauseButton();
            }
        } catch (error) {
            console.error('Error loading ayah:', error);
            this.onError(error);
        } finally {
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            this.audioElement.play();
            this.isPlaying = true;
        }
        this.updatePlayPauseButton();
    }

    /**
     * Update play/pause button state
     */
    updatePlayPauseButton() {
        if (!this.playIcon || !this.pauseIcon) return;
        if (this.isPlaying) {
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'block';
        } else {
            this.playIcon.style.display = 'block';
            this.pauseIcon.style.display = 'none';
        }
    }

    /**
     * Set playback speed
     * @param {number} speed - Playback speed (0.5, 0.75, 1, 1.25, 1.5)
     */
    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        this.audioElement.playbackRate = speed;
        this.speedValue.textContent = `${speed}x`;
    }

    /**
     * Play previous ayah (placeholder)
     */
    playPrevious() {
        // This needs integration with Quran data structure
        console.log('Play previous ayah');
    }

    /**
     * Play next ayah (placeholder)
     */
    playNext() {
        // This needs integration with Quran data structure
        console.log('Play next ayah');
    }

    /**
     * Get surah name in Arabic
     * @param {number} surahNumber - Surah number
     * @returns {string} Surah name
     */
    getSurahName(surahNumber) {
        const surahNames = [
            'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة',
            'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
            'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر',
            'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
            'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان',
            'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
            'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر',
            'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
            'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية',
            'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
            'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن',
            'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
            'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق',
            'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
            'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة',
            'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
            'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج',
            'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
            'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين',
            'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
            'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل',
            'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
            'المسد', 'الإخلاص', 'الفلق', 'الناس'
        ];
        
        return surahNames[surahNumber - 1] || `سورة ${surahNumber}`;
    }

    /**
     * Update offline status indicator
     */
    updateOfflineStatus() {
        this.isOffline = !navigator.onLine;
        if (this.offlineIndicator) {
            this.offlineIndicator.style.display = this.isOffline ? 'flex' : 'none';
        }
    }

    /**
     * Update cache usage information
     */
    async updateCacheInfo() {
        const storageInfo = await audioService.getStorageInfo();
        this.cacheUsage.textContent = `${storageInfo.usage} MB`;
    }

    // Audio event handlers
    onTimeUpdate() {
        const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        this.progressSlider.value = progress || 0;
        this.currentTimeDisplay.textContent = this.formatTime(this.audioElement.currentTime);
    }

    onLoadedMetadata() {
        this.durationDisplay.textContent = this.formatTime(this.audioElement.duration);
    }

    onEnded() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        // Auto-play next ayah if available
        this.playNext();
    }

    onError(error) {
        console.error('Audio error:', error);
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
        this.isPlaying = false;
        this.updatePlayPauseButton();
        
        // Show error message
        alert('فشل تحميل الصوت. تحقق من الاتصال بالإنترنت.');
    }

    onWaiting() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'flex';
        }
    }

    onPlaying() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }

    onOnline() {
        this.updateOfflineStatus();
    }

    onOffline() {
        this.updateOfflineStatus();
    }

    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Show/hide the audio player
     * @param {boolean} show - Whether to show the player
     */
    show(show = true) {
        if (this.playerContainer) {
            this.playerContainer.style.display = show ? 'block' : 'none';
        }
    }
}

// Export singleton instance
const audioPlayer = new AudioPlayer();
