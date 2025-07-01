/**
 * 进度分析管理器 - 处理全面总结和真伪鉴定的步骤显示
 */

class ProgressManager {
    constructor() {
        this.currentSteps = [];
        this.currentStepData = {};
        this.activeStep = 0;
        this.analysisType = null;
        this.setupMarkdown();
        this.bindEvents();
    }

    /**
     * 配置 Markdown 渲染器
     */
    setupMarkdown() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (ex) {
                            console.warn('代码高亮失败:', ex);
                        }
                    }
                    return code;
                },
                breaks: true,
                gfm: true,
                sanitize: false
            });
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 返回按钮
        document.getElementById('backToWelcomeBtn')?.addEventListener('click', () => {
            this.returnToWelcome();
        });
    }

    /**
     * 开始分析流程
     * @param {string} type - 分析类型 ('comprehensive' 或 'fact-checking')
     */
    startAnalysis(type) {
        this.analysisType = type;
        this.currentStepData = {};
        this.activeStep = 0;

        // 显示进度界面
        this.showProgressScreen();

        // 初始化步骤
        this.initializeSteps(type);
        
        // 渲染步骤卡片
        this.renderSteps();

        // 更新标题
        const titles = {
            'comprehensive': '全面总结分析',
            'fact-checking': '真伪鉴定分析'
        };
        document.getElementById('progressTitle').textContent = titles[type] || '正在分析...';
    }

    /**
     * 初始化步骤配置
     * @param {string} type - 分析类型
     */
    initializeSteps(type) {
        const stepConfigs = {
            'comprehensive': [
                {
                    id: 1,
                    title: '问题分析',
                    description: '分析文章的主要内容和结构',
                    icon: '🔍'
                },
                {
                    id: 2,
                    title: '搜索结果',
                    description: '提取关键词和重要信息点',
                    icon: '🌐'
                },
                {
                    id: 3,
                    title: '深度分析',
                    description: '深入思考文章主旨和内涵',
                    icon: '🔬'
                },
                {
                    id: 4,
                    title: '结果汇总',
                    description: '综合前面所有分析形成总结',
                    icon: '✅'
                }
            ],
            'fact-checking': [
                {
                    id: 1,
                    title: '问题分析',
                    description: '解析文章内容和关键声明',
                    icon: '📖'
                },
                {
                    id: 2,
                    title: '搜索结果',
                    description: '提取需要验证的关键词',
                    icon: '🔑'
                },
                {
                    id: 3,
                    title: '深度分析',
                    description: '搜索相关资料进行对比验证',
                    icon: '🔍'
                },
                {
                    id: 4,
                    title: '结果汇总',
                    description: '基于搜索结果进行真伪判定',
                    icon: '⚖️'
                }
            ]
        };

        this.currentSteps = stepConfigs[type] || [];
    }

    /**
     * 渲染步骤卡片
     */
    renderSteps() {
        const container = document.getElementById('analysisSteps');
        if (!container) return;

        container.innerHTML = '';

        this.currentSteps.forEach((step, index) => {
            const stepCard = this.createStepCard(step, index);
            container.appendChild(stepCard);
        });
    }

    /**
     * 创建步骤卡片
     * @param {Object} step - 步骤配置
     * @param {number} index - 步骤索引
     */
    createStepCard(step, index) {
        const card = document.createElement('div');
        card.className = 'analysis-step-card';
        card.dataset.step = step.id;

        const status = this.getStepStatus(index);
        const iconClass = this.getIconClass(status);
        const statusText = this.getStatusText(status);

        card.innerHTML = `
            <div class="step-card-header" onclick="progressManager.toggleStepDetail(${step.id})">
                <div class="step-icon ${status}">
                    ${status === 'processing' ? '<i class="fas fa-spinner"></i>' : step.icon}
                </div>
                <div class="step-info">
                    <h3 class="step-title">${step.title}</h3>
                    <p class="step-description">${step.description}</p>
                </div>
                <div class="step-status ${status}">
                    <i class="fas ${iconClass}"></i>
                    <span>${statusText}</span>
                </div>
            </div>
            <div class="step-progress-bar">
                <div class="step-progress-fill" style="width: ${this.getStepProgress(index)}%"></div>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', () => {
            if (this.currentStepData[step.id]) {
                this.showStepDetail(step.id);
            }
        });

        // 如果步骤有数据，添加可点击样式
        if (this.currentStepData[step.id]) {
            card.style.cursor = 'pointer';
            card.title = '点击查看详细内容';
        }

        return card;
    }

    /**
     * 获取步骤状态
     * @param {number} index - 步骤索引
     */
    getStepStatus(index) {
        if (index < this.activeStep) return 'completed';
        if (index === this.activeStep) return 'processing';
        return 'pending';
    }

    /**
     * 获取状态图标
     * @param {string} status - 状态
     */
    getIconClass(status) {
        const icons = {
            'pending': 'fa-clock',
            'processing': 'fa-spinner fa-spin',
            'completed': 'fa-check'
        };
        return icons[status];
    }

    /**
     * 获取状态文本
     * @param {string} status - 状态
     */
    getStatusText(status) {
        const texts = {
            'pending': '等待中',
            'processing': '进行中',
            'completed': '完成'
        };
        return texts[status];
    }

    /**
     * 获取步骤进度百分比
     * @param {number} index - 步骤索引
     */
    getStepProgress(index) {
        if (index < this.activeStep) return 100;
        if (index === this.activeStep) return 50;
        return 0;
    }

    /**
     * 更新步骤内容
     * @param {number} stepId - 步骤ID
     * @param {string} content - 步骤内容
     * @param {string} type - 内容类型 ('content', 'thinking', 'complete')
     */
    updateStep(stepId, content, type = 'content') {
        if (!this.currentStepData[stepId]) {
            this.currentStepData[stepId] = {
                content: '',
                thinking: '',
                complete: false
            };
        }

        if (type === 'content') {
            this.currentStepData[stepId].content += content;
        } else if (type === 'thinking') {
            this.currentStepData[stepId].thinking += content;
        } else if (type === 'complete') {
            this.currentStepData[stepId].complete = true;
        }

        // 更新UI
        this.updateStepUI(stepId);
    }

    /**
     * 完成当前步骤，进入下一步
     */
    completeCurrentStep() {
        if (this.activeStep < this.currentSteps.length - 1) {
            this.activeStep++;
            this.renderSteps();
        }
    }

    /**
     * 更新步骤UI
     * @param {number} stepId - 步骤ID
     */
    updateStepUI(stepId) {
        const card = document.querySelector(`[data-step="${stepId}"]`);
        if (!card) return;

        // 如果步骤有内容，添加可点击样式
        if (this.currentStepData[stepId]?.content) {
            card.style.cursor = 'pointer';
            card.title = '点击查看详细内容';
            card.classList.add('has-content');
        }

        // 更新进度条
        const progressFill = card.querySelector('.step-progress-fill');
        const stepIndex = this.currentSteps.findIndex(step => step.id === stepId);
        if (progressFill && stepIndex !== -1) {
            progressFill.style.width = this.getStepProgress(stepIndex) + '%';
        }
    }

    /**
     * 显示步骤详情
     * @param {number} stepId - 步骤ID
     */
    showStepDetail(stepId) {
        const stepData = this.currentStepData[stepId];
        if (!stepData || !stepData.content) {
            showNotification('该步骤暂无内容', 'info');
            return;
        }

        const step = this.currentSteps.find(s => s.id === stepId);
        if (!step) return;

        // 设置模态框标题
        document.getElementById('stepDetailTitle').textContent = step.title;

        // 渲染内容
        const contentContainer = document.getElementById('stepDetailContent');
        let fullContent = '';

        // 添加思考过程（如果有）
        if (stepData.thinking) {
            fullContent += `
                <div class="thinking-section">
                    <h4>💭 思考过程</h4>
                    <div class="thinking-content">
                        ${this.renderMarkdown(stepData.thinking)}
                    </div>
                </div>
                <hr style="margin: 2rem 0; border: 1px solid var(--border-color);">
            `;
        }

        // 添加主要内容
        fullContent += `
            <div class="main-content">
                ${this.renderMarkdown(stepData.content)}
            </div>
        `;

        contentContainer.innerHTML = fullContent;

        // 显示模态框
        document.getElementById('stepDetailModal').style.display = 'flex';
    }

    /**
     * 切换步骤详情显示
     * @param {number} stepId - 步骤ID
     */
    toggleStepDetail(stepId) {
        event.stopPropagation();
        this.showStepDetail(stepId);
    }

    /**
     * 渲染 Markdown 内容
     * @param {string} content - 原始内容
     */
    renderMarkdown(content) {
        if (typeof marked !== 'undefined') {
            return marked.parse(content);
        }
        return content.replace(/\n/g, '<br>');
    }

    /**
     * 显示进度界面
     */
    showProgressScreen() {
        // 隐藏其他界面
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('chatScreen').style.display = 'none';
        
        // 显示进度界面
        const progressScreen = document.getElementById('progressScreen');
        progressScreen.style.display = 'block';
        progressScreen.classList.add('animate-fade-in');
    }

    /**
     * 返回欢迎界面
     */
    returnToWelcome() {
        document.getElementById('progressScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
        
        // 重置状态
        this.currentSteps = [];
        this.currentStepData = {};
        this.activeStep = 0;
        this.analysisType = null;
    }

    /**
     * 处理流式响应
     * @param {Object} data - 响应数据
     */
    handleStreamData(data) {
        switch (data.type) {
            case 'step_start':
                this.activeStep = data.step - 1;
                this.renderSteps();
                break;
                
            case 'content':
                this.updateStep(data.step || this.activeStep + 1, data.content, 'content');
                break;
                
            case 'thinking':
                this.updateStep(data.step || this.activeStep + 1, data.content, 'thinking');
                break;
                
            case 'step_complete':
                this.updateStep(data.step || this.activeStep + 1, '', 'complete');
                this.completeCurrentStep();
                break;
                
            case 'analysis_complete':
            case 'verification_complete':
                // 分析完成
                showNotification('分析完成！点击步骤查看详细结果', 'success');
                break;
                
            case 'error':
                showNotification(data.message || '分析过程中出现错误', 'error');
                break;
        }
    }
}

// 关闭步骤详情模态框的全局函数
function closeStepDetail() {
    document.getElementById('stepDetailModal').style.display = 'none';
}

// 全局进度管理器实例
window.progressManager = new ProgressManager();
