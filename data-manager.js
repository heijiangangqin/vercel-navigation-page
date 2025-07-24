// 数据管理模块
class DataManager {
    constructor() {
        this.dataKey = 'homepage_data';
        this.data = {
            cards: [],
            todos: [],
            notepad: '',
            widgetOrder: [],
            weatherConfig: {
                apiKey: 'YOUR_AMAP_KEY',
                cityCode: '445281',
                cityName: '普宁市'
            },
            widgetVisibility: {
                weather: true,
                todo: true,
                notepad: true
            }
        };
        this.isInitialized = false;
        this.isVerified = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        // 1. 先读本地缓存，立即渲染
        this.loadFromLocalStorage();
        // 2. 检查 session
        this.isVerified = await this.checkSession();
        // 3. 后台拉取 Redis 数据，若有变化则覆盖本地并刷新
        if (this.isVerified) {
            this.refreshFromRedis();
        }
        this.isInitialized = true;
    }

    async refreshFromRedis() {
        try {
            const resp = await fetch(`/api/redis.js?key=${this.dataKey}`);
            if (!resp.ok) throw new Error('Redis unavailable');
            const result = await resp.json();
            if (result.result) {
                const redisData = JSON.parse(result.result);
                // 判断本地和云端数据是否一致
                if (JSON.stringify(redisData) !== JSON.stringify(this.data)) {
                    this.data = { ...this.data, ...redisData };
                    this.saveToLocalStorage();
                    // 用 Redis 覆盖本地，刷新页面以确保 UI 一致
                    location.reload();
                }
            }
        } catch {}
    }

    async checkSession() {
        try {
            const resp = await fetch(`/api/redis.js?key=${this.dataKey}`);
            if (resp.status === 401) return false;
            return true;
        } catch {
            return false;
        }
    }

    async requestVerificationCode() {
        const resp = await fetch('/api/redis.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'request_code' })
        });
        const data = await resp.json();
        return data.code;
    }

    async verifyCode(code) {
        const resp = await fetch('/api/redis.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_code', code })
        });
        const data = await resp.json();
        if (data.success) {
            this.isVerified = true;
            await this.refreshFromRedis();
            return true;
        }
        return false;
    }

    async loadFromRedis() {
        try {
            const resp = await fetch(`/api/redis.js?key=${this.dataKey}`);
            if (!resp.ok) throw new Error('Redis unavailable');
            const result = await resp.json();
            if (result.result) {
                this.data = { ...this.data, ...JSON.parse(result.result) };
                this.saveToLocalStorage();
            }
        } catch {
            this.loadFromLocalStorage();
        }
    }

    async saveToRedis() {
        if (!this.isVerified) {
            this.saveToLocalStorage();
            return;
        }
        try {
            await fetch('/api/redis.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: this.dataKey, value: this.data })
            });
            this.saveToLocalStorage();
        } catch {
            this.saveToLocalStorage();
        }
    }

    loadFromLocalStorage() {
        try {
            const backupData = localStorage.getItem('homepage_data_backup');
            if (backupData) {
                const backup = JSON.parse(backupData);
                this.data = { ...this.data, ...backup };
            }
        } catch {}
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('homepage_data_backup', JSON.stringify(this.data));
        } catch {}
    }

    getData(key) { return this.data[key]; }
    setData(key, value) { this.data[key] = value; this.saveToRedis(); }
    getCards() { return this.data.cards; }
    setCards(cards) { this.data.cards = cards; this.saveToRedis(); }
    getTodos() { return this.data.todos; }
    setTodos(todos) { this.data.todos = todos; this.saveToRedis(); }
    getNotepad() { return this.data.notepad; }
    setNotepad(content) { this.data.notepad = content; this.saveToRedis(); }
    getWidgetOrder() { return this.data.widgetOrder; }
    setWidgetOrder(order) { this.data.widgetOrder = order; this.saveToRedis(); }
    getWeatherConfig() { return this.data.weatherConfig; }
    setWeatherConfig(config) { this.data.weatherConfig = { ...this.data.weatherConfig, ...config }; this.saveToRedis(); }
    getWidgetVisibility() { return this.data.widgetVisibility; }
    setWidgetVisibility(widgetType, visible) { this.data.widgetVisibility[widgetType] = visible; this.saveToRedis(); }
    updateWidgetVisibility(visibility) { this.data.widgetVisibility = visibility; this.saveToRedis(); }
    exportAllData() {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `homepage-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    async importData(file) {
        try {
            const text = await file.text();
            const importedData = JSON.parse(text);
            this.data = importedData;
            await this.saveToRedis();
            return true;
        } catch {
            return false;
        }
    }
}

const dataManager = new DataManager(); 