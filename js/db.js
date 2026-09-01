// js/db.js
// Quran App IndexedDB Service for storing parsed JSON data and providing offline access

const DB_NAME = 'QuranAppDB';
const DB_VERSION = 1;

window.QuranDB = {
    db: null,
    
    init() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            if (this.dbFailed) {
                reject(new Error("IndexedDB previously failed"));
                return;
            }
            if (!window.indexedDB) {
                this.dbFailed = true;
                reject(new Error("IndexedDB not supported"));
                return;
            }
            
            // Add safety timeout (e.g. for iframes where it might hang)
            const timeoutId = setTimeout(() => {
                this.dbFailed = true;
                reject(new Error("IndexedDB init timeout after 1000ms"));
            }, 1000);

            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = (e) => {
                    clearTimeout(timeoutId);
                    this.dbFailed = true;
                    console.error("IndexedDB error:", e.target.error);
                    reject(e.target.error);
                };
                
                request.onsuccess = (e) => {
                    clearTimeout(timeoutId);
                    this.db = e.target.result;
                    resolve(this.db);
                };
                
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('app_cache')) {
                        db.createObjectStore('app_cache', { keyPath: 'id' });
                    }
                };
            } catch (err) {
                clearTimeout(timeoutId);
                reject(err);
            }
        });
    },
    
    async get(id) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                let resolved = false;
                const timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        console.warn(`IndexedDB timeout for get(${id})`);
                        resolve(null);
                    }
                }, 3000); // 3000ms max for DB retrieval
                
                try {
                    const tx = db.transaction('app_cache', 'readonly');
                    const store = tx.objectStore('app_cache');
                    const request = store.get(id);
                    
                    request.onsuccess = () => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve(request.result ? request.result.data : null);
                        }
                    };
                    
                    request.onerror = () => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve(null); // safely fallback
                        }
                    };
                } catch (e) {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve(null);
                    }
                }
            });
        } catch (error) {
            console.warn("DB get failed, falling back to fetch:", error);
            return null; // fallback to null
        }
    },
    
    async set(id, data) {
        try {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                let resolved = false;
                const timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        console.warn(`IndexedDB timeout for set(${id})`);
                        resolve();
                    }
                }, 5000); // 5000ms max for DB save
                
                try {
                    const tx = db.transaction('app_cache', 'readwrite');
                    const store = tx.objectStore('app_cache');
                    const request = store.put({ id: id, data: data, timestamp: Date.now() });
                    
                    request.onsuccess = () => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve();
                        }
                    };
                    request.onerror = () => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve(); // Safely resolve
                        }
                    };
                } catch (e) {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                }
            });
        } catch (error) {
            console.warn("DB set failed, ignoring cache:", error);
            return;
        }
    }
};
