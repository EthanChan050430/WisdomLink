/**
 * 主题演示脚本
 * 用于展示亮色主题优化效果
 */

class ThemeDemo {
    constructor() {
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        this.bindEvents();
        this.showWelcomeMessage();
    }

    bindEvents() {
        // 主题切换按钮
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // 功能按钮演示
        document.querySelectorAll('.function-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchFunction(btn);
            });
        });

        // 上传标签演示
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchUploadTab(tab);
            });
        });

        // 模型选择器演示
        this.initModelSelector();

        // 自动演示
        this.startAutoDemo();
    }

    toggleTheme() {
        const body = document.body;
        const themeIcon = document.querySelector('#themeToggle i');
        
        if (this.currentTheme === 'light') {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            themeIcon.className = 'fas fa-moon';
            this.currentTheme = 'dark';
            this.showNotification('已切换到暗色主题', 'info');
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            themeIcon.className = 'fas fa-sun';
            this.currentTheme = 'light';
            this.showNotification('已切换到亮色主题', 'success');
        }
    }

    switchFunction(activeBtn) {
        // 移除所有激活状态
        document.querySelectorAll('.function-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 激活当前按钮
        activeBtn.classList.add('active');
        
        const functionName = activeBtn.querySelector('span').textContent;
        this.showNotification(`已切换到${functionName}模式`, 'info');
    }

    switchUploadTab(activeTab) {
        // 移除所有激活状态
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 激活当前标签
        activeTab.classList.add('active');
        
        const tabName = activeTab.querySelector('span').textContent;
        this.showNotification(`已切换到${tabName}输入`, 'info');
    }

    initModelSelector() {
        const selectorBtn = document.getElementById('welcomeModelSelectorBtn');
        const dropdown = document.getElementById('welcomeModelDropdown');
        
        if (selectorBtn && dropdown) {
            selectorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });

            // 选项点击
            dropdown.querySelectorAll('.dropdown-option').forEach(option => {
                option.addEventListener('click', () => {
                    this.selectModel(option);
                });
            });

            // 点击外部关闭
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
        }
    }

    selectModel(option) {
        // 移除所有选中状态
        document.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // 选中当前选项
        option.classList.add('selected');
        
        // 更新按钮文本
        const buttonText = document.getElementById('welcomeModelButtonText');
        if (buttonText) {
            buttonText.textContent = option.dataset.value;
        }
        
        // 隐藏下拉菜单
        document.getElementById('welcomeModelDropdown').style.display = 'none';
        
        const modelName = option.querySelector('.option-name').textContent;
        this.showNotification(`已选择模型: ${modelName}`, 'success');
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // 设置背景色
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)'
        };
        notification.style.background = colors[type] || colors.info;

        notification.textContent = message;
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.showNotification('欢迎使用智链AI智能阅读助手！', 'success');
        }, 1000);

        setTimeout(() => {
            this.showNotification('当前为亮色主题优化版本', 'info');
        }, 2500);

        setTimeout(() => {
            this.showNotification('点击右上角按钮可切换主题', 'info');
        }, 4000);
    }

    startAutoDemo() {
        let demoStep = 0;
        const demoSteps = [
            () => {
                // 切换功能按钮
                const buttons = document.querySelectorAll('.function-btn');
                const randomBtn = buttons[Math.floor(Math.random() * buttons.length)];
                randomBtn.click();
            },
            () => {
                // 切换上传标签
                const tabs = document.querySelectorAll('.upload-tab');
                const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
                randomTab.click();
            },
            () => {
                // 打开模型选择器
                const selectorBtn = document.getElementById('welcomeModelSelectorBtn');
                if (selectorBtn) {
                    selectorBtn.click();
                    setTimeout(() => {
                        const options = document.querySelectorAll('.dropdown-option');
                        const randomOption = options[Math.floor(Math.random() * options.length)];
                        randomOption.click();
                    }, 1000);
                }
            }
        ];

        // 每8秒执行一个演示步骤
        setInterval(() => {
            if (demoSteps[demoStep]) {
                demoSteps[demoStep]();
                demoStep = (demoStep + 1) % demoSteps.length;
            }
        }, 8000);
    }

    // 添加一些测试消息
    addTestMessages() {
        const messagesContainer = document.querySelector('.test-messages');
        if (!messagesContainer) return;

        const messages = [
            {
                type: 'user',
                content: '请帮我分析这篇文章的主要观点。',
                time: '2分钟前'
            },
            {
                type: 'assistant',
                content: '我已经仔细阅读了您提供的文章。这篇文章主要讨论了人工智能在教育领域的应用前景，包括个性化学习、智能评估和教学辅助等方面。',
                time: '2分钟前'
            },
            {
                type: 'user',
                content: '能详细说明一下个性化学习的实现方式吗？',
                time: '1分钟前'
            },
            {
                type: 'assistant',
                content: '个性化学习主要通过以下几种方式实现：\n\n1. **学习路径定制**：根据学生的知识基础和学习能力，AI系统可以为每个学生制定独特的学习路径。\n\n2. **内容推荐**：基于学生的学习历史和偏好，推荐最适合的学习材料。\n\n3. **难度调节**：实时调整题目难度，确保学生在适当的挑战水平下学习。',
                time: '刚刚'
            }
        ];

        messages.forEach(msg => {
            const messageEl = this.createMessageElement(msg);
            messagesContainer.appendChild(messageEl);
        });
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${message.type === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${message.content.replace(/\n/g, '<br>')}
                </div>
                <div class="message-time">${message.time}</div>
            </div>
        `;
        
        return messageDiv;
    }
}

// 页面加载完成后初始化演示
document.addEventListener('DOMContentLoaded', () => {
    new ThemeDemo();
});