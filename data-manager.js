// 数据管理模块
class DataManager {
    constructor() {
        this.dataFile = 'homepage-data.json';
        this.data = {
            cards: [],
            todos: [],
            notepad: '',
            widgetOrder: [],
            weatherConfig: {
                apiKey: 'e17ef733a4009a25e9e13d8d152bb6e7',
                cityCode: '445281',
                cityName: '普宁市'
            },
            widgetVisibility: {
                weather: true,
                calendar: true,
                todo: true,
                notepad: true
            }
        };
        this.isInitialized = false;
    }

    // 初始化数据管理器
    async initialize() {
        if (this.isInitialized) return;
        
        // 直接从localStorage迁移数据到内存
        await this.migrateFromLocalStorage();
        
        this.isInitialized = true;
    }

    // 从JSON文件加载数据
    async loadFromFile() {
        try {
            const response = await fetch(this.dataFile);
            if (!response.ok) {
                throw new Error('文件不存在');
            }
            const fileData = await response.json();
            this.data = { ...this.data, ...fileData };
            console.log('从JSON文件加载数据成功');
        } catch (error) {
            throw error;
        }
    }

    // 保存数据到JSON文件（静默保存，不自动下载）
    async saveToFile() {
        try {
            // 将数据保存到localStorage作为备份
            localStorage.setItem('homepage_data_backup', JSON.stringify(this.data));
            console.log('数据已保存到localStorage备份');
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }

    // 从localStorage迁移数据
    async migrateFromLocalStorage() {
        try {
            // 首先尝试从备份中恢复数据
            const backupData = localStorage.getItem('homepage_data_backup');
            if (backupData) {
                const backup = JSON.parse(backupData);
                this.data = { ...this.data, ...backup };
                console.log('从备份恢复数据成功');
                return;
            }

            // 如果没有备份，则从旧的localStorage项目迁移
            // 迁移应用卡片
            const savedCards = localStorage.getItem('homepage_cards');
            if (savedCards) {
                this.data.cards = JSON.parse(savedCards);
                console.log('迁移应用卡片数据:', this.data.cards.length, '个');
            }

            // 迁移待办事项
            const savedTodos = localStorage.getItem('homepage_todos');
            if (savedTodos) {
                this.data.todos = JSON.parse(savedTodos);
                console.log('迁移待办事项数据:', this.data.todos.length, '个');
            }

            // 迁移记事本
            const savedNotepad = localStorage.getItem('homepage_notepad');
            if (savedNotepad) {
                this.data.notepad = savedNotepad;
                console.log('迁移记事本数据');
            }

            // 迁移小部件排序
            const savedWidgetOrder = localStorage.getItem('homepage_widget_order');
            if (savedWidgetOrder) {
                this.data.widgetOrder = JSON.parse(savedWidgetOrder);
                console.log('迁移小部件排序数据');
            }

            // 迁移天气配置
            const savedWeatherConfig = localStorage.getItem('homepage_weather_config');
            if (savedWeatherConfig) {
                this.data.weatherConfig = { ...this.data.weatherConfig, ...JSON.parse(savedWeatherConfig) };
                console.log('迁移天气配置数据');
            }

            console.log('数据迁移完成，已加载到内存');

            // 清理localStorage（可选）
            // this.clearLocalStorage();
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }

    // 清理localStorage（迁移完成后）
    clearLocalStorage() {
        localStorage.removeItem('homepage_cards');
        localStorage.removeItem('homepage_todos');
        localStorage.removeItem('homepage_notepad');
        localStorage.removeItem('homepage_widget_order');
        localStorage.removeItem('homepage_weather_config');
        console.log('localStorage已清理');
    }

    // 获取数据
    getData(key) {
        return this.data[key];
    }

    // 设置数据
    setData(key, value) {
        this.data[key] = value;
        // 静默保存，不自动下载文件
    }

    // 获取应用卡片
    getCards() {
        return this.data.cards;
    }

    // 设置应用卡片
    setCards(cards) {
        this.data.cards = cards;
        // 静默保存，不自动下载文件
    }

    // 获取待办事项
    getTodos() {
        return this.data.todos;
    }

    // 设置待办事项
    setTodos(todos) {
        this.data.todos = todos;
        // 静默保存，不自动下载文件
    }

    // 获取记事本内容
    getNotepad() {
        return this.data.notepad;
    }

    // 设置记事本内容
    setNotepad(content) {
        this.data.notepad = content;
        // 静默保存，不自动下载文件
    }

    // 获取小部件排序
    getWidgetOrder() {
        return this.data.widgetOrder;
    }

    // 设置小部件排序
    setWidgetOrder(order) {
        this.data.widgetOrder = order;
        this.saveToFile();
        console.log('小部件排序已保存到数据管理器:', order);
    }

    // 获取天气配置
    getWeatherConfig() {
        return this.data.weatherConfig;
    }

    // 设置天气配置
    setWeatherConfig(config) {
        this.data.weatherConfig = { ...this.data.weatherConfig, ...config };
        // 静默保存，不自动下载文件
    }

    // 获取小部件可见性
    getWidgetVisibility() {
        return this.data.widgetVisibility;
    }

    // 设置单个小部件可见性
    setWidgetVisibility(widgetType, visible) {
        this.data.widgetVisibility[widgetType] = visible;
        // 静默保存，不自动下载文件
    }

    // 更新所有小部件可见性
    updateWidgetVisibility(visibility) {
        this.data.widgetVisibility = visibility;
        this.saveToFile();
        console.log('小部件可见性已保存到数据管理器:', visibility);
    }

    // 导出所有数据
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

    // 导入数据
    async importData(file) {
        try {
            const text = await file.text();
            const importedData = JSON.parse(text);
            
            // 合并数据
            this.data = { ...this.data, ...importedData };
            
            console.log('数据导入成功');
            return true;
        } catch (error) {
            console.error('数据导入失败:', error);
            return false;
        }
    }
}

// 创建全局数据管理器实例
const dataManager = new DataManager(); 