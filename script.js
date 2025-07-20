// 全局变量
let cards = [];
let editingCardIndex = -1;
let todos = [];
let editingTodoIndex = -1;
let draggedCardIndex = -1;
let draggedCardElement = null;
let draggedWidgetIndex = -1;
let draggedWidgetElement = null;
const STORAGE_KEY = 'homepage_cards';
const NOTEPAD_KEY = 'homepage_notepad';
const TODO_KEY = 'homepage_todos';
const WIDGET_ORDER_KEY = 'homepage_widget_order';
const WEATHER_CONFIG_KEY = 'homepage_weather_config';

// DOM元素
const currentTimeEl = document.getElementById('current-time');
const currentDateEl = document.getElementById('current-date');
const dayNumberEl = document.getElementById('day-number');
const calendarGridEl = document.getElementById('calendar-grid');
const cardsContainerEl = document.getElementById('cards-container');
const notepadContentEl = document.getElementById('notepad-content');
const weatherContentEl = document.getElementById('weather-content');
const todoListEl = document.getElementById('todo-list');
const todoEmptyEl = document.getElementById('todo-empty');
const todoTitleInput = document.getElementById('todo-title-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const mainContentEl = document.getElementById('main-content');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeTime();
    initializeCalendar();
    initializeWeather();
    initializeCards();
    initializeNotepad();
    initializeTodos();
    initializeSearch();
    initializeModals();
    loadWidgetOrder();
    initializeWidgetDrag();
    
    // 每秒更新时间
    setInterval(updateTime, 1000);
});

// 时间相关功能
function initializeTime() {
    updateTime();
}

function updateTime() {
    const now = new Date();
    
    // 更新时间
    const timeString = now.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    currentTimeEl.textContent = timeString;
    
    // 更新日期
    const dateString = now.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'long'
    });
    
    // 农历信息（简化版）
    const lunarInfo = getLunarInfo(now);
    currentDateEl.textContent = `${dateString} ${lunarInfo}`;
    
    // 更新当前日期数字
    dayNumberEl.textContent = now.getDate();
}

function getLunarInfo(date) {
    // 简化的农历信息，实际项目中可以使用专业的农历库
    const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                       '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                       '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    
    // 这里使用简化的计算，实际应该使用专业的农历转换库
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${lunarMonths[month - 1]}月${lunarDays[day - 1] || '初一'} 丁未`;
}

// 日历功能
function initializeCalendar() {
    generateCalendar();
}

function generateCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentDay = now.getDate();
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取第一天是星期几
    const firstDayWeek = firstDay.getDay();
    
    // 获取上个月的最后几天
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();
    
    let calendarHTML = '';
    
    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
        calendarHTML += `<div class="calendar-day week-header">${day}</div>`;
    });
    
    // 上个月的日期
    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // 当月的日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const isToday = day === currentDay;
        const className = isToday ? 'calendar-day today' : 'calendar-day';
        calendarHTML += `<div class="${className}">${day}</div>`;
    }
    
    // 下个月的日期（填充到42个格子）
    const totalCells = 42; // 6行7列
    const remainingCells = totalCells - weekDays.length - firstDayWeek - lastDay.getDate();
    
    for (let day = 1; day <= remainingCells; day++) {
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    calendarGridEl.innerHTML = calendarHTML;
}

// 天气配置管理
let weatherConfig = {
    apiKey: 'e17ef733a4009a25e9e13d8d152bb6e7',
    cityCode: '445281',
    cityName: '普宁市'
};

function loadWeatherConfig() {
    const savedConfig = localStorage.getItem(WEATHER_CONFIG_KEY);
    if (savedConfig) {
        try {
            weatherConfig = { ...weatherConfig, ...JSON.parse(savedConfig) };
        } catch (error) {
            console.error('加载天气配置失败:', error);
        }
    }
}

function saveWeatherConfig() {
    localStorage.setItem(WEATHER_CONFIG_KEY, JSON.stringify(weatherConfig));
}

// 天气功能
function initializeWeather() {
    loadWeatherConfig();
    fetchWeather();
    // 每30分钟更新一次天气
    setInterval(fetchWeather, 30 * 60 * 1000);
}

async function fetchWeather() {
    try {
        const response = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=${weatherConfig.apiKey}&city=${weatherConfig.cityCode}&extensions=base`);
        const data = await response.json();
        
        if (data.status === '1' && data.lives && data.lives.length > 0) {
            const weather = data.lives[0];
            displayWeather(weather);
        } else {
            throw new Error('天气数据获取失败');
        }
    } catch (error) {
        console.error('获取天气信息失败:', error);
        displayWeatherError();
    }
}

function displayWeather(weather) {
    const weatherIcon = getWeatherIcon(weather.weather);
    const temp = weather.temperature;
    const humidity = weather.humidity;
    const windDirection = weather.winddirection;
    const windPower = weather.windpower;
    const reportTime = new Date(weather.reporttime);
    
    weatherContentEl.innerHTML = `
        <div class="weather-main">
            <div class="weather-location">${weatherConfig.cityName}</div>
            <div class="weather-icon">${weatherIcon}</div>
            <div class="weather-temp">${temp}°C</div>
            <div class="weather-desc">${weather.weather}</div>
        </div>
        <div class="weather-details">
            <div class="weather-detail">
                <span class="weather-detail-label">湿度</span>
                <span class="weather-detail-value">${humidity}%</span>
            </div>
            <div class="weather-detail">
                <span class="weather-detail-label">风向</span>
                <span class="weather-detail-value">${windDirection}</span>
            </div>
            <div class="weather-detail">
                <span class="weather-detail-label">风力</span>
                <span class="weather-detail-value">${windPower}级</span>
            </div>
            <div class="weather-detail">
                <span class="weather-detail-label">更新时间</span>
                <span class="weather-detail-value">${reportTime.getHours().toString().padStart(2, '0')}:${reportTime.getMinutes().toString().padStart(2, '0')}</span>
            </div>
        </div>
    `;
}

function displayWeatherError() {
    weatherContentEl.innerHTML = `
        <div class="weather-error">
            <div>🌧️ 天气信息获取失败</div>
            <div style="font-size: 0.8rem; margin-top: 5px;">请检查网络连接</div>
        </div>
    `;
}

function getWeatherIcon(weather) {
    const weatherMap = {
        '晴': '☀️',
        '多云': '⛅',
        '阴': '☁️',
        '小雨': '🌦️',
        '中雨': '🌧️',
        '大雨': '⛈️',
        '暴雨': '⛈️',
        '雷阵雨': '⛈️',
        '小雪': '🌨️',
        '中雪': '❄️',
        '大雪': '❄️',
        '雾': '🌫️',
        '霾': '😷',
        '沙尘暴': '🌪️'
    };
    
    return weatherMap[weather] || '🌤️';
}

// 卡片管理功能
function initializeCards() {
    loadCards();
    renderCards();
}

function loadCards() {
    const savedCards = localStorage.getItem(STORAGE_KEY);
    if (savedCards) {
        cards = JSON.parse(savedCards);
    } else {
        // 默认卡片
        cards = [
            { name: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.svg' },
            { name: '百度', url: 'https://www.baidu.com', icon: 'https://www.baidu.com/favicon.ico' },
            { name: '知乎', url: 'https://www.zhihu.com', icon: 'https://static.zhihu.com/heifetz/favicon.ico' },
            { name: '微博', url: 'https://weibo.com', icon: 'https://weibo.com/favicon.ico' }
        ];
        saveCards();
    }
}

function saveCards() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function renderCards() {
    cardsContainerEl.innerHTML = '';
    
    if (cards.length === 0) {
        cardsContainerEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 40px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📱</div>
                <div style="font-size: 1.2rem; margin-bottom: 10px;">暂无应用卡片</div>
                <div style="opacity: 0.8;">点击上方"添加卡片"按钮开始添加您常用的网站</div>
            </div>
        `;
        return;
    }
    
    cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.draggable = true;
        cardEl.dataset.index = index;
        cardEl.innerHTML = `
            <div class="card-actions">
                <button class="action-btn edit-btn" title="编辑">✏️</button>
                <button class="action-btn delete-btn" title="删除">🗑️</button>
            </div>
            <div class="card-drag-handle" title="拖拽排序">⋮⋮</div>
            <img src="${card.icon || 'icons/default-icon.svg'}" 
                 alt="${card.name}" class="card-icon" onerror="this.src='icons/default-icon.svg'">
            <div class="card-name">${card.name}</div>
        `;
        
        // 点击卡片打开链接
        cardEl.addEventListener('click', function(e) {
            if (!e.target.classList.contains('action-btn')) {
                window.open(card.url, '_blank');
            }
        });
        
        // 编辑按钮
        const editBtn = cardEl.querySelector('.edit-btn');
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openEditModal(index);
        });
        
        // 删除按钮
        const deleteBtn = cardEl.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm(`确定要删除"${card.name}"吗？`)) {
                cards.splice(index, 1);
                saveCards();
                renderCards();
            }
        });
        
        // 拖拽事件
        cardEl.addEventListener('dragstart', handleDragStart);
        cardEl.addEventListener('dragend', handleDragEnd);
        cardEl.addEventListener('dragover', handleDragOver);
        cardEl.addEventListener('drop', handleDrop);
        cardEl.addEventListener('dragenter', handleDragEnter);
        cardEl.addEventListener('dragleave', handleDragLeave);
        
        cardsContainerEl.appendChild(cardEl);
    });
}

// 小部件拖拽功能
function initializeWidgetDrag() {
    const widgets = document.querySelectorAll('.widget');
    widgets.forEach((widget, index) => {
        widget.dataset.index = index;
        
        // 绑定拖拽事件
        widget.addEventListener('dragstart', handleWidgetDragStart);
        widget.addEventListener('dragend', handleWidgetDragEnd);
        widget.addEventListener('dragover', handleWidgetDragOver);
        widget.addEventListener('drop', handleWidgetDrop);
        widget.addEventListener('dragenter', handleWidgetDragEnter);
        widget.addEventListener('dragleave', handleWidgetDragLeave);
    });
}

function handleWidgetDragStart(e) {
    // 如果点击的是输入框或按钮，不启动拖拽
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') {
        e.preventDefault();
        return;
    }
    
    draggedWidgetIndex = parseInt(e.target.closest('.widget').dataset.index);
    draggedWidgetElement = e.target.closest('.widget');
    draggedWidgetElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedWidgetElement.outerHTML);
    mainContentEl.classList.add('dragging');
    console.log('开始拖拽小部件:', draggedWidgetIndex);
}

function handleWidgetDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedWidgetIndex = -1;
    draggedWidgetElement = null;
    mainContentEl.classList.remove('dragging');
    
    // 移除所有拖拽相关的样式
    const widgets = document.querySelectorAll('.widget');
    widgets.forEach(widget => {
        widget.classList.remove('drag-over');
    });
    console.log('结束拖拽小部件');
}

function handleWidgetDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleWidgetDrop(e) {
    e.preventDefault();
    const targetWidget = e.target.closest('.widget');
    if (!targetWidget || targetWidget === draggedWidgetElement) return;
    
    const targetIndex = parseInt(targetWidget.dataset.index);
    if (draggedWidgetIndex === -1 || targetIndex === draggedWidgetIndex) return;
    
    console.log('小部件拖拽排序:', draggedWidgetIndex, '->', targetIndex);
    
    // 重新排序小部件
    const widgets = Array.from(document.querySelectorAll('.widget'));
    const draggedWidget = widgets[draggedWidgetIndex];
    
    // 从DOM中移除拖拽的小部件
    draggedWidget.remove();
    
    // 插入到目标位置
    if (targetIndex > draggedWidgetIndex) {
        targetWidget.parentNode.insertBefore(draggedWidget, targetWidget.nextSibling);
    } else {
        targetWidget.parentNode.insertBefore(draggedWidget, targetWidget);
    }
    
    // 重新绑定事件和更新索引
    initializeWidgetDrag();
    
    // 保存小部件顺序
    saveWidgetOrder();
}

function handleWidgetDragEnter(e) {
    const targetWidget = e.target.closest('.widget');
    if (targetWidget && targetWidget !== draggedWidgetElement) {
        targetWidget.classList.add('drag-over');
    }
}

function handleWidgetDragLeave(e) {
    const targetWidget = e.target.closest('.widget');
    if (targetWidget) {
        targetWidget.classList.remove('drag-over');
    }
}

function saveWidgetOrder() {
    const widgets = document.querySelectorAll('.widget');
    const widgetOrder = Array.from(widgets).map(widget => widget.dataset.widgetType);
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(widgetOrder));
}

function loadWidgetOrder() {
    const savedOrder = localStorage.getItem(WIDGET_ORDER_KEY);
    if (savedOrder) {
        try {
            const widgetOrder = JSON.parse(savedOrder);
            const widgets = document.querySelectorAll('.widget');
            const widgetArray = Array.from(widgets);
            
            // 根据保存的顺序重新排列小部件
            widgetOrder.forEach((widgetType, index) => {
                const widget = widgetArray.find(w => w.dataset.widgetType === widgetType);
                if (widget) {
                    mainContentEl.appendChild(widget);
                }
            });
        } catch (error) {
            console.error('加载小部件顺序失败:', error);
        }
    }
}

// 卡片拖拽排序功能
function handleDragStart(e) {
    draggedCardIndex = parseInt(e.target.dataset.index);
    draggedCardElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCardIndex = -1;
    draggedCardElement = null;
    
    // 移除所有拖拽相关的样式
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const targetCard = e.target.closest('.card');
    if (!targetCard || targetCard === draggedCardElement) return;
    
    const targetIndex = parseInt(targetCard.dataset.index);
    if (draggedCardIndex === -1 || targetIndex === draggedCardIndex) return;
    
    // 重新排序卡片数组
    const draggedCard = cards[draggedCardIndex];
    cards.splice(draggedCardIndex, 1);
    cards.splice(targetIndex, 0, draggedCard);
    
    // 保存并重新渲染
    saveCards();
    renderCards();
}

function handleDragEnter(e) {
    const targetCard = e.target.closest('.card');
    if (targetCard && targetCard !== draggedCardElement) {
        targetCard.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const targetCard = e.target.closest('.card');
    if (targetCard) {
        targetCard.classList.remove('drag-over');
    }
}

// 记事本功能
function initializeNotepad() {
    // 加载保存的内容
    const savedContent = localStorage.getItem(NOTEPAD_KEY);
    if (savedContent) {
        notepadContentEl.value = savedContent;
    }
    
    // 自动保存
    notepadContentEl.addEventListener('input', function() {
        localStorage.setItem(NOTEPAD_KEY, this.value);
    });
}

// 待办事项功能
function initializeTodos() {
    loadTodos();
    renderTodos();
    
    // 绑定添加待办事件
    addTodoBtn.addEventListener('click', addNewTodo);
    
    // 绑定回车键添加待办
    todoTitleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addNewTodo();
        }
    });
}

function loadTodos() {
    const savedTodos = localStorage.getItem(TODO_KEY);
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
    } else {
        // 默认待办事项
        todos = [
            {
                id: Date.now(),
                title: '欢迎使用待办功能',
                description: '点击左侧的 + 按钮添加新的待办事项',
                priority: 'medium',
                completed: false,
                createdAt: new Date().toISOString()
            }
        ];
        saveTodos();
    }
}

function saveTodos() {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

function renderTodos() {
    if (todos.length === 0) {
        todoListEl.innerHTML = '';
        todoEmptyEl.style.display = 'block';
        return;
    }
    
    todoEmptyEl.style.display = 'none';
    
    // 计算统计信息
    const totalTodos = todos.length;
    const completedTodos = todos.filter(todo => todo.completed).length;
    const progressPercentage = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
    
    let todosHTML = `
        <div class="todo-stats">
            <div class="todo-count">${completedTodos}/${totalTodos} 已完成</div>
            <div class="todo-progress">
                <span>${Math.round(progressPercentage)}%</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
        </div>
    `;
    
    // 按优先级和完成状态排序
    const sortedTodos = [...todos].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    sortedTodos.forEach((todo, index) => {
        todosHTML += `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-content">
                    <div class="todo-header">
                        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                        <div class="todo-title">${todo.title}</div>
                        <div class="todo-priority ${todo.priority}" title="点击切换优先级">${getPriorityText(todo.priority)}</div>
                    </div>
                    ${todo.description ? `<div class="todo-description">${todo.description}</div>` : ''}
                </div>
                <div class="todo-actions">
                    <button class="todo-action-btn delete-todo-btn" title="删除">🗑️</button>
                </div>
            </div>
        `;
    });
    
    todoListEl.innerHTML = todosHTML;
    
    // 重新绑定事件
    bindTodoEvents();
}

function getPriorityText(priority) {
    const priorityMap = {
        high: '高',
        medium: '中',
        low: '低'
    };
    return priorityMap[priority] || '中';
}

function toggleTodoComplete(todoId) {
    const todoIndex = todos.findIndex(todo => todo.id === todoId);
    if (todoIndex !== -1) {
        todos[todoIndex].completed = !todos[todoIndex].completed;
        saveTodos();
        renderTodos();
    }
}

function toggleTodoPriority(todoId) {
    const todoIndex = todos.findIndex(todo => todo.id === todoId);
    if (todoIndex !== -1) {
        const currentPriority = todos[todoIndex].priority;
        const priorityOrder = ['low', 'medium', 'high'];
        const currentIndex = priorityOrder.indexOf(currentPriority);
        const nextIndex = (currentIndex + 1) % priorityOrder.length;
        const newPriority = priorityOrder[nextIndex];
        todos[todoIndex].priority = newPriority;
        saveTodos();
        
        // 立即更新当前元素的显示
        const priorityElement = document.querySelector(`[data-id="${todoId}"] .todo-priority`);
        if (priorityElement) {
            priorityElement.className = `todo-priority ${newPriority}`;
            priorityElement.textContent = getPriorityText(newPriority);
        }
    }
}

function bindTodoEvents() {
    // 绑定复选框事件
    const checkboxes = todoListEl.querySelectorAll('.todo-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const todoItem = this.closest('.todo-item');
            const todoId = parseInt(todoItem.dataset.id);
            toggleTodoComplete(todoId);
        });
    });
    
    // 绑定优先级点击事件
    const priorityElements = todoListEl.querySelectorAll('.todo-priority');
    priorityElements.forEach(priorityEl => {
        priorityEl.addEventListener('click', function(e) {
            e.stopPropagation();
            const todoItem = this.closest('.todo-item');
            const todoId = parseInt(todoItem.dataset.id);
            toggleTodoPriority(todoId);
        });
    });
    
    // 绑定删除按钮事件
    const deleteBtns = todoListEl.querySelectorAll('.delete-todo-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const todoItem = this.closest('.todo-item');
            const todoId = parseInt(todoItem.dataset.id);
            deleteTodo(todoId);
        });
    });
}

function deleteTodo(todoId) {
    todos = todos.filter(todo => todo.id !== todoId);
    saveTodos();
    renderTodos();
}

function addNewTodo() {
    const title = todoTitleInput.value.trim();
    
    if (!title) {
        return;
    }
    
    const newTodo = {
        id: Date.now(),
        title: title,
        description: '',
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    todos.push(newTodo);
    saveTodos();
    renderTodos();
    
    // 清空输入框
    todoTitleInput.value = '';
    todoTitleInput.focus();
}

// 搜索功能
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            // 使用百度搜索
            window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, '_blank');
        }
    }
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// 模态框功能
function initializeModals() {
    const addCardBtn = document.getElementById('add-card-btn');
    const cardModal = document.getElementById('card-modal');
    const editModal = document.getElementById('edit-modal');
    const weatherConfigModal = document.getElementById('weather-config-modal');
    const closeModalBtns = document.querySelectorAll('.close-btn, .btn-secondary');
    
    // 打开添加卡片模态框
    addCardBtn.addEventListener('click', function() {
        cardModal.style.display = 'flex';
        clearForm('card-modal');
    });
    
    // 打开天气配置模态框
    const weatherConfigBtn = document.getElementById('weather-config-btn');
    weatherConfigBtn.addEventListener('click', function() {
        // 填充当前配置
        document.getElementById('weather-api-key').value = weatherConfig.apiKey;
        document.getElementById('weather-city-code').value = weatherConfig.cityCode;
        document.getElementById('weather-city-name').value = weatherConfig.cityName;
        weatherConfigModal.style.display = 'flex';
    });
    
    // 关闭模态框
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            cardModal.style.display = 'none';
            editModal.style.display = 'none';
            weatherConfigModal.style.display = 'none';
        });
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === cardModal) {
            cardModal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
        if (e.target === weatherConfigModal) {
            weatherConfigModal.style.display = 'none';
        }
    });
    
    // 保存新卡片
    document.getElementById('save-card-btn').addEventListener('click', function() {
        const name = document.getElementById('card-name').value.trim();
        const url = document.getElementById('card-url').value.trim();
        const icon = document.getElementById('card-icon').value.trim();
        
        if (!name || !url) {
            alert('请填写卡片名称和链接地址');
            return;
        }
        
        const newCard = {
            name: name,
            url: url,
            icon: icon || null
        };
        
        cards.push(newCard);
        saveCards();
        renderCards();
        cardModal.style.display = 'none';
    });
    
    // 更新卡片
    document.getElementById('update-card-btn').addEventListener('click', function() {
        const name = document.getElementById('edit-card-name').value.trim();
        const url = document.getElementById('edit-card-url').value.trim();
        const icon = document.getElementById('edit-card-icon').value.trim();
        
        if (!name || !url) {
            alert('请填写卡片名称和链接地址');
            return;
        }
        
        if (editingCardIndex >= 0) {
            cards[editingCardIndex] = {
                name: name,
                url: url,
                icon: icon || null
            };
            saveCards();
            renderCards();
            editModal.style.display = 'none';
            editingCardIndex = -1;
        }
    });
    
    // 删除卡片
    document.getElementById('delete-card-btn').addEventListener('click', function() {
        if (editingCardIndex >= 0) {
            if (confirm(`确定要删除"${cards[editingCardIndex].name}"吗？`)) {
                cards.splice(editingCardIndex, 1);
                saveCards();
                renderCards();
                editModal.style.display = 'none';
                editingCardIndex = -1;
            }
        }
    });
    
    // 图标预览功能
    setupIconPreview('card-icon', 'icon-preview');
    setupIconPreview('edit-card-icon', 'edit-icon-preview');
    
    // 保存天气配置
    document.getElementById('save-weather-config-btn').addEventListener('click', function() {
        const apiKey = document.getElementById('weather-api-key').value.trim();
        const cityCode = document.getElementById('weather-city-code').value.trim();
        const cityName = document.getElementById('weather-city-name').value.trim();
        
        if (!apiKey || !cityCode || !cityName) {
            alert('请填写完整的配置信息');
            return;
        }
        
        weatherConfig.apiKey = apiKey;
        weatherConfig.cityCode = cityCode;
        weatherConfig.cityName = cityName;
        
        saveWeatherConfig();
        weatherConfigModal.style.display = 'none';
        
        // 重新获取天气信息
        fetchWeather();
        
        alert('天气配置已保存！');
    });
}

function openEditModal(index) {
    editingCardIndex = index;
    const card = cards[index];
    
    document.getElementById('edit-card-name').value = card.name;
    document.getElementById('edit-card-url').value = card.url;
    document.getElementById('edit-card-icon').value = card.icon || '';
    
    // 更新图标预览
    updateIconPreview('edit-icon-preview', card.icon);
    
    document.getElementById('edit-modal').style.display = 'flex';
}

function clearForm(modalId) {
    const modal = document.getElementById(modalId);
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    
    const previews = modal.querySelectorAll('.icon-preview');
    previews.forEach(preview => preview.innerHTML = '');
}



function setupIconPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    input.addEventListener('input', function() {
        updateIconPreview(previewId, this.value);
    });
}

function updateIconPreview(previewId, iconUrl) {
    const preview = document.getElementById(previewId);
    if (iconUrl && iconUrl.trim()) {
        preview.innerHTML = `<img src="${iconUrl}" alt="图标预览" onerror="this.style.display='none'">`;
    } else {
        preview.innerHTML = '';
    }
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N 添加新卡片
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('add-card-btn').click();
    }
    
    // Escape 关闭模态框
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
});

// 导出卡片数据
function exportCards() {
    const dataStr = JSON.stringify(cards, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'homepage_cards.json';
    link.click();
    URL.revokeObjectURL(url);
}

// 导入卡片数据
function importCards(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedCards = JSON.parse(e.target.result);
            if (Array.isArray(importedCards)) {
                cards = importedCards;
                saveCards();
                renderCards();
                alert('卡片导入成功！');
            } else {
                alert('文件格式错误');
            }
        } catch (error) {
            alert('导入失败：' + error.message);
        }
    };
    reader.readAsText(file);
}

// 添加快捷键提示
console.log(`
🎉 自定义首页已加载完成！

快捷键：
- Ctrl/Cmd + N: 添加新卡片
- Enter: 在待办输入框中按回车添加待办
- Escape: 关闭模态框

功能：
- 实时时间显示
- 动态日历
- 实时天气信息
- 记事本（自动保存）
- 卡片管理（增删改）
- 待办事项管理（直接添加、删除、完成）
- 响应式设计
- 数据本地存储

开发者工具中可以使用：
- exportCards(): 导出卡片数据
- importCards(file): 导入卡片数据
`); 