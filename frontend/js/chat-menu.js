/**
 * 聊天功能菜单管理器
 * 处理聊天界面的功能菜单交互
 */

class ChatFunctionMenu {
    constructor() {
        this.isOpen = false;
        this.currentModel = 'GLM-4-Flash';
        this.currentExpert = '';
        this.currentFunction = 'intelligent-reading';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadExpertOptions();
        this.updateMenuDisplay();
    }

    bindEvents() {
        // 功能菜单按钮点击
        const menuBtn = document.getElementById('functionMenuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }

        // 菜单选项点击
        document.addEventListener('click', (e) => {
            const menuOption = e.target.closest('.menu-option');
            if (menuOption) {
                this.handleMenuOption(menuOption);
            } else if (!e.target.closest('.function-menu-container')) {
                // 点击外部关闭菜单
                this.closeMenu();
            }
        });

        // 监听功能切换事件
        document.addEventListener('functionChanged', (e) => {
            this.currentFunction = e.detail.function;
            this.updateMenuDisplay();
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        const dropdown = document.getElementById('functionMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            this.isOpen = true;
            this.updateMenuSelections();
        }
    }

    closeMenu() {
        const dropdown = document.getElementById('functionMenuDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            this.isOpen = false;
        }
    }

    handleMenuOption(option) {
        const type = option.dataset.type;
        const value = option.dataset.value;

        console.log('菜单选项点击:', type, value);

        switch (type) {
            case 'model':
                this.selectModel(value);
                break;
            case 'expert':
                this.selectExpert(value);
                break;
            case 'function':
                this.handleFunctionSwitch(value);
                break;
            case 'action':
                this.handleAction(value);
                break;
        }

        // 如果是动作类型或功能切换，点击后关闭菜单
        if (type === 'action' || type === 'function') {
            this.closeMenu();
        }
    }

    selectModel(modelValue) {
        console.log('选择模型:', modelValue);
        this.currentModel = modelValue;
        
        // 更新隐藏的select元素
        const chatModelSelect = document.getElementById('chatModelSelect');
        
        if (chatModelSelect) {
            chatModelSelect.value = modelValue;
            chatModelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 使用selector manager同步到主页
        if (window.selectorManager) {
            window.selectorManager.setModel(modelValue);
        }

        // 手动同步主页的模型选择器按钮文本
        const welcomeModelButtonText = document.getElementById('welcomeModelButtonText');
        if (welcomeModelButtonText) {
            const modelNames = {
                'GLM-4-Flash': 'GLM-4-Flash',
                'GLM-Z1-Flash': 'GLM-Z1-Flash',
                'DeepSeek-R1-Distill-Qwen-7B': 'DeepSeek-R1-Distill-Qwen-7B'
            };
            welcomeModelButtonText.textContent = modelNames[modelValue] || modelValue;
        }

        this.updateMenuSelections();
    }

    selectExpert(expertValue) {
        console.log('选择专家:', expertValue);
        this.currentExpert = expertValue;
        
        // 更新隐藏的select元素
        const chatExpertSelect = document.getElementById('chatExpertSelect');
        if (chatExpertSelect) {
            chatExpertSelect.value = expertValue;
            chatExpertSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        this.updateMenuSelections();
    }

    handleAction(action) {
        switch (action) {
            case 'clear':
                this.clearChat();
                break;
            case 'compact':
                this.toggleCompactMode();
                break;
        }
    }

    handleFunctionSwitch(functionName) {
        console.log('切换功能模式:', functionName);
        
        // 清除当前聊天内容
        this.clearChatForModeSwitch();
        
        // 隐藏聊天界面
        const chatScreen = document.getElementById('chatScreen');
        const welcomeScreen = document.getElementById('welcomeScreen');
        
        if (chatScreen) {
            chatScreen.style.display = 'none';
        }
        
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }
        
        // 触发功能切换到主应用
        if (window.app && typeof window.app.switchFunction === 'function') {
            window.app.switchFunction(functionName);
        }
        
        // 更新导航按钮状态
        document.querySelectorAll('.function-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const targetBtn = document.getElementById(this.getFunctionButtonId(functionName));
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // 重置到初始选择状态
        this.resetToInitialState();
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearChatForModeSwitch() {
        // 清除聊天消息
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // 重置输入框
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = '请输入您的问题或上传文件...';
        }
        
        // 清除当前聊天状态
        if (window.chatManager && typeof window.chatManager.clearChat === 'function') {
            window.chatManager.clearChat();
        }
    }

    resetToInitialState() {
        // 显示上传区域
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) {
            uploadSection.style.display = 'block';
        }
        
        // 重置专家选择器显示状态
        const expertSelector = document.getElementById('expertSelector');
        if (expertSelector) {
            expertSelector.style.display = 'none';
        }
        
        // 清除任何进度状态
        const progressScreen = document.getElementById('progressScreen');
        if (progressScreen) {
            progressScreen.style.display = 'none';
        }
        
        // 重置文件上传状态
        if (window.fileUploadManager && typeof window.fileUploadManager.resetState === 'function') {
            window.fileUploadManager.resetState();
        }
    }

    getFunctionButtonId(functionName) {
        const mapping = {
            'intelligent-reading': 'intelligentReading',
            'comprehensive-analysis': 'comprehensiveAnalysis',
            'expert-analysis': 'expertAnalysis',
            'fact-checking': 'factChecking'
        };
        return mapping[functionName];
    }

    clearChat() {
        console.log('清空聊天并退出聊天模式');
        
        // 清空聊天内容
        if (window.chatManager && typeof window.chatManager.clearChat === 'function') {
            window.chatManager.clearChat();
        }
        
        // 退出聊天模式，返回主页
        this.exitChatMode();
    }

    exitChatMode() {
        console.log('退出聊天模式，返回主页');
        
        // 隐藏聊天界面
        const chatScreen = document.getElementById('chatScreen');
        const welcomeScreen = document.getElementById('welcomeScreen');
        
        if (chatScreen) {
            chatScreen.style.display = 'none';
        }
        
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        }
        
        // 重置到初始状态
        this.resetToWelcomeState();
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetToWelcomeState() {
        // 确保欢迎界面正确显示
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex';
            // 清除任何可能的内联样式覆盖
            welcomeScreen.style.maxWidth = '';
            welcomeScreen.style.margin = '';
            welcomeScreen.style.padding = '';
        }
        
        // 清除聊天消息
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // 重置输入框
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            // 使用当前功能更新占位符
            if (window.app && typeof window.app.updateSearchPlaceholder === 'function') {
                window.app.updateSearchPlaceholder(window.app.currentFunction || 'intelligent-reading');
            } else {
                searchInput.placeholder = '请输入您的问题或上传文件...';
            }
        }
        
        // 显示上传区域
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) {
            uploadSection.style.display = 'block';
        }
        
        // 重置专家选择器显示状态
        const expertSelector = document.getElementById('expertSelector');
        if (expertSelector) {
            expertSelector.style.display = 'none';
        }
        
        // 清除任何进度状态
        const progressScreen = document.getElementById('progressScreen');
        if (progressScreen) {
            progressScreen.style.display = 'none';
        }
        
        // 重置文件上传状态
        if (window.fileUploadManager && typeof window.fileUploadManager.resetState === 'function') {
            window.fileUploadManager.resetState();
        }
    }

    toggleCompactMode() {
        console.log('切换简洁模式');
        document.body.classList.toggle('compact-mode');
        
        // 保存设置
        const isCompact = document.body.classList.contains('compact-mode');
        localStorage.setItem('compactMode', isCompact);
    }

    updateMenuDisplay() {
        // 根据当前功能显示/隐藏专家选择部分
        const expertSection = document.getElementById('expertMenuSection');
        if (expertSection) {
            expertSection.style.display = 
                (this.currentFunction === 'expert-analysis') ? 'block' : 'none';
        }
    }

    updateMenuSelections() {
        // 更新模型选择状态
        document.querySelectorAll('.menu-option[data-type="model"]').forEach(option => {
            const check = option.querySelector('.option-check');
            if (option.dataset.value === this.currentModel) {
                option.classList.add('selected');
                if (check) check.style.display = 'inline';
            } else {
                option.classList.remove('selected');
                if (check) check.style.display = 'none';
            }
        });

        // 更新专家选择状态
        document.querySelectorAll('.menu-option[data-type="expert"]').forEach(option => {
            const check = option.querySelector('.option-check');
            if (option.dataset.value === this.currentExpert) {
                option.classList.add('selected');
                if (check) check.style.display = 'inline';
            } else {
                option.classList.remove('selected');
                if (check) check.style.display = 'none';
            }
        });
    }

    async loadExpertOptions() {
        try {
            const response = await fetch('/api/expert-analysis/get-personas');
            const data = await response.json();
            
            if (data.success) {
                this.updateExpertMenuOptions(data.personas);
            }
        } catch (error) {
            console.error('加载专家选项失败:', error);
        }
    }

    updateExpertMenuOptions(personas) {
        const expertMenuOptions = document.getElementById('expertMenuOptions');
        if (!expertMenuOptions) return;

        expertMenuOptions.innerHTML = '';
        
        Object.entries(personas).forEach(([key, persona]) => {
            const option = document.createElement('div');
            option.className = 'menu-option';
            option.dataset.type = 'expert';
            option.dataset.value = key;
            option.innerHTML = `
                <div>
                    <div class="option-name">${persona.name}</div>
                    <div class="option-desc">${persona.description}</div>
                </div>
                <i class="fas fa-check option-check" style="display: none;"></i>
            `;
            expertMenuOptions.appendChild(option);
        });

        // 同时更新隐藏的expert select
        const chatExpertSelect = document.getElementById('chatExpertSelect');
        if (chatExpertSelect) {
            // 保留默认选项
            const defaultOption = chatExpertSelect.querySelector('option[value=""]');
            chatExpertSelect.innerHTML = '';
            if (defaultOption) {
                chatExpertSelect.appendChild(defaultOption);
            }

            Object.entries(personas).forEach(([key, persona]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${persona.name} - ${persona.description}`;
                chatExpertSelect.appendChild(option);
            });
        }
    }

    // 获取当前选中的模型
    getCurrentModel() {
        return this.currentModel;
    }

    // 获取当前选中的专家
    getCurrentExpert() {
        return this.currentExpert;
    }

    // 设置当前功能
    setCurrentFunction(functionName) {
        this.currentFunction = functionName;
        this.updateMenuDisplay();
    }
}

// 全局初始化
let chatFunctionMenu;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        chatFunctionMenu = new ChatFunctionMenu();
        window.chatFunctionMenu = chatFunctionMenu;
    });
} else {
    // DOM已经加载完成
    chatFunctionMenu = new ChatFunctionMenu();
    window.chatFunctionMenu = chatFunctionMenu;
}
