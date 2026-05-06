/**
 * AudioService - Smart Audio Engine for Quran Recitations
 * Handles API integration, URL generation, and audio quality management
 */

class AudioService {
    constructor() {
        // Reciters configuration (can be extended)
        this.reciters = {
            'mishary': {
                id: 'mishary',
                name: 'مشاري راشد العفاسي',
                everyAyahId: 'Mishary_Rashid_Alafasy_128kbps',
                quranComId: 7
            },
            'sudais': {
                id: 'sudais',
                name: 'عبدالرحمن السديس',
                everyAyahId: 'Abdulrahman_Sudais_192kbps',
                quranComId: 4
            },
            'husary': {
                id: 'husary',
                name: 'محمود خليل الحصري',
                everyAyahId: 'Mahmoud_Khalil_Al-Husary_128kbps',
                quranComId: 3
            }
        };

        // Audio quality options
        this.qualities = {
            '32': { bitrate: 32, label: '32kbps' },
            '64': { bitrate: 64, label: '64kbps' },
            '128': { bitrate: 128, label: '128kbps' }
        };

        this.currentReciter = 'mishary';
        this.currentQuality = '128';
        this.playbackMode = 'ayah'; // 'ayah' or 'surah'
    }

    /**
     * Get audio URL for a specific ayah using everyayah.com API
     * @param {number} surahNumber - Surah number (1-114)
     * @param {number} ayahNumber - Ayah number within the surah
     * @param {string} reciterId - Reciter identifier (optional, uses current if not provided)
     * @returns {string} Audio URL
     */
    getAyahAudioUrl(surahNumber, ayahNumber, reciterId = null) {
        const reciter = reciterId ? this.reciters[reciterId] : this.reciters[this.currentReciter];
        const surahStr = surahNumber.toString().padStart(3, '0');
        const ayahStr = ayahNumber.toString().padStart(3, '0');
        
        return `https://everyayah.com/data/${reciter.everyAyahId}/${surahStr}${ayahStr}.mp3`;
    }

    /**
     * Get audio URL for a complete surah using quran.com API
     * @param {number} surahNumber - Surah number (1-114)
     * @param {string} reciterId - Reciter identifier (optional, uses current if not provided)
     * @returns {Promise<string>} Audio URL from API
     */
    async getSurahAudioUrl(surahNumber, reciterId = null) {
        const reciter = reciterId ? this.reciters[reciterId] : this.reciters[this.currentReciter];
        
        try {
            const response = await fetch(
                `https://api.quran.com/api/v4/chapter_recitations/${reciter.quranComId}/${surahNumber}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch surah audio URL');
            }
            
            const data = await response.json();
            return data.audio_files?.audio_file?.audio_url || null;
        } catch (error) {
            console.error('Error fetching surah audio:', error);
            return null;
        }
    }

    /**
     * Get list of available reciters
     * @returns {Array} Array of reciter objects
     */
    getReciters() {
        return Object.values(this.reciters);
    }

    /**
     * Set current reciter
     * @param {string} reciterId - Reciter identifier
     */
    setReciter(reciterId) {
        if (this.reciters[reciterId]) {
            this.currentReciter = reciterId;
        }
    }

    /**
     * Get current reciter
     * @returns {Object} Current reciter object
     */
    getCurrentReciter() {
        return this.reciters[this.currentReciter];
    }

    /**
     * Set audio quality
     * @param {string} quality - Quality identifier ('32', '64', '128')
     */
    setQuality(quality) {
        if (this.qualities[quality]) {
            this.currentQuality = quality;
        }
    }

    /**
     * Get current quality
     * @returns {Object} Current quality object
     */
    getCurrentQuality() {
        return this.qualities[this.currentQuality];
    }

    /**
     * Get available qualities
     * @returns {Array} Array of quality objects
     */
    getQualities() {
        return Object.values(this.qualities);
    }

    /**
     * Set playback mode
     * @param {string} mode - 'ayah' or 'surah'
     */
    setPlaybackMode(mode) {
        if (mode === 'ayah' || mode === 'surah') {
            this.playbackMode = mode;
        }
    }

    /**
     * Get playback mode
     * @returns {string} Current playback mode
     */
    getPlaybackMode() {
        return this.playbackMode;
    }

    /**
     * Get audio URL based on current settings
     * @param {number} surahNumber - Surah number
     * @param {number} ayahNumber - Ayah number (for ayah mode)
     * @returns {string|Promise<string>} Audio URL
     */
    getAudioUrl(surahNumber, ayahNumber = null) {
        if (this.playbackMode === 'ayah' && ayahNumber !== null) {
            return this.getAyahAudioUrl(surahNumber, ayahNumber);
        } else if (this.playbackMode === 'surah') {
            return this.getSurahAudioUrl(surahNumber);
        }
        return null;
    }

    /**
     * Check if audio is cached
     * @param {string} url - Audio URL
     * @returns {Promise<boolean>} True if cached
     */
    async isAudioCached(url) {
        if (!('caches' in window)) return false;
        
        try {
            const cache = await caches.open('quran-audio-v1');
            const response = await cache.match(url);
            return response !== undefined;
        } catch (error) {
            console.error('Error checking cache:', error);
            return false;
        }
    }

    /**
     * Preload audio for a range of ayahs
     * @param {number} surahNumber - Surah number
     * @param {number} startAyah - Starting ayah
     * @param {number} endAyah - Ending ayah
     * @returns {Promise<number>} Number of successfully cached files
     */
    async preloadAyahs(surahNumber, startAyah, endAyah) {
        let cachedCount = 0;
        
        for (let ayah = startAyah; ayah <= endAyah; ayah++) {
            const url = this.getAyahAudioUrl(surahNumber, ayah);
            
            try {
                const cache = await caches.open('quran-audio-v1');
                const response = await fetch(url);
                
                if (response.ok) {
                    await cache.put(url, response);
                    cachedCount++;
                }
            } catch (error) {
                console.error(`Error preloading ayah ${ayah}:`, error);
            }
        }
        
        return cachedCount;
    }

    /**
     * Get storage usage information
     * @returns {Promise<Object>} Storage usage data
     */
    async getStorageInfo() {
        if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
            return { quota: 0, usage: 0, percentage: 0 };
        }
        
        try {
            const estimate = await navigator.storage.estimate();
            const quota = estimate.quota || 0;
            const usage = estimate.usage || 0;
            const percentage = quota > 0 ? (usage / quota) * 100 : 0;
            
            return {
                quota: Math.round(quota / (1024 * 1024)), // MB
                usage: Math.round(usage / (1024 * 1024)), // MB
                percentage: Math.round(percentage)
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { quota: 0, usage: 0, percentage: 0 };
        }
    }
}

// Export singleton instance
const audioService = new AudioService();
