/**
 * 选择器管理模块
 * 处理模型选择器和专家选择器的交互
 */

class SelectorManager {
    constructor() {
        this.activeDropdown = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeSelectors();
    }

    bindEvents() {
        // 绑定所有选择器按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.selector-button')) {
                const button = e.target.closest('.selector-button');
                this.toggleDropdown(button);
            } else {
                // 点击其他地方关闭下拉框
                this.closeAllDropdowns();
            }
        });

        // 绑定下拉选项点击
        document.addEventListener('click', (e) => {
            if (e.target.closest('.dropdown-option')) {
                const option = e.target.closest('.dropdown-option');
                this.selectOption(option);
            }
        });

        // 监听功能切换，同步选择器状态
        document.addEventListener('functionChanged', (e) => {
            this.syncSelectors();
        });
    }

    initializeSelectors() {
        // 初始化专家选择器选项
        this.loadExpertOptions();
        
        // 设置默认模型选择
        this.setDefaultModel();
    }

    toggleDropdown(button) {
        const dropdown = button.nextElementSibling;
        const isActive = button.classList.contains('active');

        // 关闭其他所有下拉框
        this.closeAllDropdowns();

        if (!isActive) {
            // 打开当前下拉框
            button.classList.add('active');
            dropdown.style.display = 'block';
            this.activeDropdown = { button, dropdown };
        }
    }

    closeAllDropdowns() {
        document.querySelectorAll('.selector-button.active').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelectorAll('.selector-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        this.activeDropdown = null;
    }

    selectOption(option) {
        const dropdown = option.closest('.selector-dropdown');
        const button = dropdown.previousElementSibling;
        const value = option.dataset.value;
        const name = option.querySelector('.option-name').textContent;
        
        console.log('选择选项:', value, name);
        
        // 更新按钮文本
        const buttonText = button.querySelector('span');
        if (buttonText) {
            buttonText.textContent = name;
        }

        // 更新隐藏的select
        const select = dropdown.querySelector('select');
        if (select) {
            select.value = value;
            // 触发change事件
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 更新当前下拉框的选中状态
        dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');

        // 如果这是模型选择器，同步到所有其他模型选择器
        if (button.classList.contains('model-button')) {
            this.syncModelSelectors(value, name);
        }

        // 关闭下拉框
        this.closeAllDropdowns();

        // 强制同步其他选择器
        this.forceSyncSelectors();
    }

    // 同步所有模型选择器
    syncModelSelectors(modelValue, modelName) {
        console.log('同步所有模型选择器到:', modelValue, modelName);
        
        // 更新所有模型选择按钮的文本
        document.querySelectorAll('.selector-button.model-button').forEach(button => {
            const buttonText = button.querySelector('span');
            if (buttonText) {
                buttonText.textContent = modelName;
            }
        });
        
        // 更新所有模型select元素
        document.querySelectorAll('select[id*="ModelSelect"]').forEach(select => {
            if (select.value !== modelValue) {
                select.value = modelValue;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // 更新所有下拉选项的选中状态
        document.querySelectorAll('.dropdown-option').forEach(opt => {
            const optDropdown = opt.closest('.selector-dropdown');
            const optButton = optDropdown ? optDropdown.previousElementSibling : null;
            
            if (optButton && optButton.classList.contains('model-button')) {
                if (opt.dataset.value === modelValue) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            }
        });
    }

    setDefaultModel() {
        // 设置默认模型选择为GLM-4-Flash
        const defaultModel = 'GLM-4-Flash';
        
        // 更新所有模型选择器
        document.querySelectorAll('.selector-button.model-button').forEach(button => {
            const buttonText = button.querySelector('span');
            if (buttonText) {
                buttonText.textContent = 'GLM-4-Flash';
            }
        });

        // 更新隐藏的select，确保所有模型选择器都设置默认值
        document.querySelectorAll('select[id*="ModelSelect"]').forEach(select => {
            select.value = defaultModel;
            // 手动触发change事件以确保其他组件知道值已更改
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // 更新选中状态 - 移除所有选中状态，然后添加到默认模型
        document.querySelectorAll('.dropdown-option').forEach(option => {
            if (option.closest('.selector-dropdown').querySelector('select[id*="ModelSelect"]')) {
                option.classList.remove('selected');
            }
        });
        
        // 添加默认模型的选中状态
        document.querySelectorAll('.dropdown-option[data-value="GLM-4-Flash"]').forEach(option => {
            if (option.closest('.selector-dropdown').querySelector('select[id*="ModelSelect"]')) {
                option.classList.add('selected');
            }
        });
    }

    async loadExpertOptions() {
        try {
            const response = await fetch('/api/expert-analysis/get-personas');
            const data = await response.json();
            
            if (data.success) {
                this.updateExpertOptions(data.personas);
            }
        } catch (error) {
            console.error('加载专家选项失败:', error);
        }
    }

    updateExpertOptions(personas) {
        const expertDropdowns = document.querySelectorAll('#expertOptions');
        
        expertDropdowns.forEach(dropdown => {
            dropdown.innerHTML = '';
            
            Object.entries(personas).forEach(([key, persona]) => {
                const option = document.createElement('div');
                option.className = 'dropdown-option';
                option.dataset.value = key;
                option.innerHTML = `
                    <span class="option-name">${persona.name}</span>
                    <span class="option-desc">${persona.description}</span>
                `;
                dropdown.appendChild(option);
            });
        });

        // 更新隐藏的select
        document.querySelectorAll('select[id*="ExpertSelect"]').forEach(select => {
            select.innerHTML = '<option value="">选择专家角色...</option>';
            Object.entries(personas).forEach(([key, persona]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${persona.name} - ${persona.description}`;
                select.appendChild(option);
            });
        });
    }

    syncSelectors() {
        // 获取聊天模式的模型选择器
        const chatModelSelect = document.getElementById('chatModelSelect');
        
        // 确定当前活跃的选择器和值
        let activeValue = null;
        const chatModelSelector = document.getElementById('chatModelSelector');
        const isChartModeActive = chatModelSelector && 
            window.getComputedStyle(chatModelSelector).display !== 'none';
        
        if (isChartModeActive && chatModelSelect && chatModelSelect.value) {
            // 聊天模式且有选择值，使用聊天界面的值
            activeValue = chatModelSelect.value;
        } else {
            // 从欢迎界面的选择器按钮获取当前值
            const welcomeModelButtonText = document.getElementById('welcomeModelButtonText');
            if (welcomeModelButtonText) {
                activeValue = this.getModelValueFromText(welcomeModelButtonText.textContent);
            } else {
                activeValue = 'GLM-4-Flash';
            }
        }

        // 同步所有模型选择器的值
        const allModelSelects = document.querySelectorAll('select[id*="ModelSelect"]');
        allModelSelects.forEach(select => {
            if (select.value !== activeValue) {
                select.value = activeValue;
            }
        });

        // 同步按钮文本
        document.querySelectorAll('.selector-button.model-button').forEach(button => {
            const buttonText = button.querySelector('span');
            const selectedOption = document.querySelector(`.dropdown-option[data-value="${activeValue}"]`);
            if (buttonText && selectedOption) {
                buttonText.textContent = selectedOption.querySelector('.option-name').textContent;
            }
        });

        // 同步所有模型选择器的选中状态
        document.querySelectorAll('.dropdown-option').forEach(option => {
            if (option.dataset.value === activeValue && option.closest('.selector-dropdown').querySelector('select[id*="ModelSelect"]')) {
                option.classList.add('selected');
            } else if (option.closest('.selector-dropdown').querySelector('select[id*="ModelSelect"]')) {
                option.classList.remove('selected');
            }
        });

        // 同步专家选择器
        const expertSelects = document.querySelectorAll('select[id*="ExpertSelect"]');
        if (expertSelects.length > 0) {
            const firstValue = expertSelects[0].value;
            expertSelects.forEach(select => {
                if (select.value !== firstValue) {
                    select.value = firstValue;
                }
            });

            // 同步按钮文本
            if (firstValue) {
                document.querySelectorAll('.selector-button.expert-button').forEach(button => {
                    const buttonText = button.querySelector('span');
                    const selectedOption = document.querySelector(`#expertOptions .dropdown-option[data-value="${firstValue}"]`);
                    if (buttonText && selectedOption) {
                        buttonText.textContent = selectedOption.querySelector('.option-name').textContent;
                    }
                });

                // 同步所有专家选择器的选中状态
                document.querySelectorAll('#expertOptions .dropdown-option').forEach(option => {
                    if (option.dataset.value === firstValue) {
                        option.classList.add('selected');
                    } else {
                        option.classList.remove('selected');
                    }
                });
            }
        }
    }

    // 获取当前选中的模型
    getCurrentModel() {
        // 优先使用聊天界面的模型选择器
        const chatModelSelect = document.getElementById('chatModelSelect');
        
        // 如果聊天界面的选择器存在且可见，优先使用它
        const chatModelSelector = document.getElementById('chatModelSelector');
        if (chatModelSelect && chatModelSelector && 
            window.getComputedStyle(chatModelSelector).display !== 'none') {
            return chatModelSelect.value || 'GLM-4-Flash';
        }
        
        // 否则从欢迎界面的按钮文本获取当前模型
        const welcomeModelButtonText = document.getElementById('welcomeModelButtonText');
        if (welcomeModelButtonText) {
            return this.getModelValueFromText(welcomeModelButtonText.textContent);
        }
        
        // 兜底方案
        const anySelect = document.querySelector('select[id*="ModelSelect"]');
        return anySelect ? anySelect.value : 'GLM-4-Flash';
    }

    // 从按钮文本获取模型值
    getModelValueFromText(text) {
        const modelMapping = {
            'GLM-4-Flash': 'GLM-4-Flash',
            'GLM-Z1-Flash': 'GLM-Z1-Flash',
            'DeepSeek-R1-Distill-Qwen-7B': 'DeepSeek-R1-Distill-Qwen-7B'
        };
        return modelMapping[text] || 'GLM-4-Flash';
    }

    // 获取当前选中的专家
    getCurrentExpert() {
        const select = document.querySelector('select[id*="ExpertSelect"]');
        return select ? select.value : '';
    }

    // 强制同步所有选择器（用于解决同步问题）
    forceSyncSelectors() {
        console.log('强制同步选择器...');
        
        // 延迟执行以确保DOM已更新
        setTimeout(() => {
            this.syncSelectors();
        }, 100);
    }

    // 手动设置模型选择
    setModel(modelValue) {
        console.log('手动设置模型:', modelValue);
        
        // 更新所有select元素
        document.querySelectorAll('select[id*="ModelSelect"]').forEach(select => {
            select.value = modelValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        // 更新按钮文本
        const selectedOption = document.querySelector(`.dropdown-option[data-value="${modelValue}"]`);
        if (selectedOption) {
            const optionName = selectedOption.querySelector('.option-name').textContent;
            document.querySelectorAll('.selector-button.model-button').forEach(button => {
                const buttonText = button.querySelector('span');
                if (buttonText) {
                    buttonText.textContent = optionName;
                }
            });
        }
        
        // 更新选中状态
        document.querySelectorAll('.dropdown-option').forEach(option => {
            if (option.closest('.selector-dropdown').querySelector('select[id*="ModelSelect"]')) {
                if (option.dataset.value === modelValue) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            }
        });
    }
}

// 全局初始化
let selectorManager;

// 确保在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        selectorManager = new SelectorManager();
        window.selectorManager = selectorManager;
    });
} else {
    // DOM已经加载完成
    selectorManager = new SelectorManager();
    window.selectorManager = selectorManager;
}
