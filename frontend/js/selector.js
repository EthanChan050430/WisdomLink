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
        
        // 更新按钮文本
        const buttonText = button.querySelector('span');
        buttonText.textContent = name;

        // 更新隐藏的select
        const select = dropdown.querySelector('select');
        select.value = value;

        // 触发change事件
        select.dispatchEvent(new Event('change'));

        // 更新选中状态
        dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');

        // 关闭下拉框
        this.closeAllDropdowns();

        // 同步其他选择器
        this.syncSelectors();
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

        // 更新隐藏的select
        document.querySelectorAll('select[id*="ModelSelect"]').forEach(select => {
            select.value = defaultModel;
        });

        // 更新选中状态
        document.querySelectorAll('.dropdown-option[data-value="GLM-4-Flash"]').forEach(option => {
            option.classList.add('selected');
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
        // 同步模型选择器
        const modelSelects = document.querySelectorAll('select[id*="ModelSelect"]');
        if (modelSelects.length > 0) {
            const firstValue = modelSelects[0].value;
            modelSelects.forEach(select => {
                if (select.value !== firstValue) {
                    select.value = firstValue;
                }
            });

            // 同步按钮文本
            document.querySelectorAll('.selector-button.model-button').forEach(button => {
                const buttonText = button.querySelector('span');
                const selectedOption = document.querySelector(`.dropdown-option[data-value="${firstValue}"]`);
                if (buttonText && selectedOption) {
                    buttonText.textContent = selectedOption.querySelector('.option-name').textContent;
                }
            });
        }

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
            }
        }
    }

    // 获取当前选中的模型
    getCurrentModel() {
        const select = document.querySelector('select[id*="ModelSelect"]');
        return select ? select.value : 'GLM-4-Flash';
    }

    // 获取当前选中的专家
    getCurrentExpert() {
        const select = document.querySelector('select[id*="ExpertSelect"]');
        return select ? select.value : '';
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
