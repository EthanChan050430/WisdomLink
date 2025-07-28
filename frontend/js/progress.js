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
     * 【修改】绑定所有事件监听
     */
    bindEvents() {
        // 返回按钮
        document.getElementById('backToWelcomeBtn')?.addEventListener('click', () => {
            localStorage.removeItem('progressState');
            this.returnToWelcome();
        });

        // --- 【新增代码块开始】---
        const modal = document.getElementById('stepDetailModal');
        if (modal) {
            // 找到模态框自带的关闭按钮并绑定事件
            modal.querySelector('.step-detail-close')?.addEventListener('click', () => this.closeModal());
            
            // 【新增功能 #2】点击模态框外部 (遮罩层) 关闭
            modal.addEventListener('click', (event) => {
                // 只有当点击目标是遮罩层本身时才关闭
                if (event.target === modal) {
                    this.closeModal();
                }
            });
        }

        // 【新增功能 #2】监听键盘 "Esc" 键关闭模态框
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && document.getElementById('stepDetailModal')?.classList.contains('active')) {
                this.closeModal();
            }
        });
        // --- 【新增代码块结束】---
    }

    // --- 【新增方法】---
    /**
     * 封装的关闭模态框方法
     */
    closeModal() {
        const modalElement = document.getElementById('stepDetailModal');
        if (!modalElement) return; // 如果找不到模态框，直接返回

        // 关键1：从模态框获取当前是哪个步骤的ID
        const stepId = modalElement.dataset.currentStepId;
        const scrollableContent = modalElement.querySelector('#stepDetailContent');

        // 问题2：如果ID存在，将滚动位置保存到对应的步骤数据中
        if (stepId && scrollableContent && this.currentStepData[stepId]) {
            this.currentStepData[stepId].scrollTop = scrollableContent.scrollTop;
        }

        // 问题1：解除背景滚动锁定
        document.body.classList.remove('modal-open');
        
        // 关闭模态框
        modalElement.classList.remove('active');
    }

    //添加保存状态、功能需求//
    saveState() {
        const state = {
            analysisType: this.analysisType,
            currentStepData: this.currentStepData,
            activeStep: this.activeStep,
            currentSteps: this.currentSteps
        };
        localStorage.setItem('progressState', JSON.stringify(state));
    }

    loadState() {
        const savedState = localStorage.getItem('progressState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.analysisType && state.currentSteps && state.currentSteps.length > 0) {
                    this.analysisType = state.analysisType;
                    this.currentStepData = state.currentStepData;
                    this.activeStep = state.activeStep;
                    this.currentSteps = state.currentSteps;

                    this.showProgressScreen();
                    this.renderSteps();
                    
                    const titles = {
                        'comprehensive': '全面总结分析',
                        'fact-checking': '真伪鉴定分析'
                    };
                    document.getElementById('progressTitle').textContent = titles[this.analysisType] || '正在分析...';

                    // 当恢复进度时，主动更新顶部功能栏的状态
                    if (window.app && typeof window.app.updateFunctionButtons === 'function') {
                        // 建立分析类型到功能名的映射
                        const functionNameMap = {
                            'comprehensive': 'comprehensive-analysis',
                            'fact-checking': 'fact-checking'
                            // 您可以根据需要添加更多映射
                        };
                        const functionName = functionNameMap[this.analysisType];
                        if (functionName) {
                            // 调用 app.js 中的方法来更新按钮UI
                            window.app.updateFunctionButtons(functionName);
                            // 同时也将状态保存到 localStorage，确保万无一失
                            localStorage.setItem('activeFunctionTab', window.app.getFunctionButtonId(functionName));
                        }
                    }
                    // --- 【新增代码块结束】---
                    
                    console.log('已从 localStorage 恢复进度状态。');
                    return true; // 表示成功加载
                }
            } catch (e) {
                console.error('加载进度状态失败:', e);
                localStorage.removeItem('progressState');
            }
        }
        return false; // 表示没有可加载的状态
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

        this.saveState(); // 保存状态
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
        const container = document.getElementById('progressSteps');
        if (!container) return;

        // 创建外层毛玻璃容器
        container.innerHTML = `
            <div class="analysis-steps-wrapper glass">
                <div class="analysis-steps-header">
                    <h3 class="steps-title">
                        <i class="fas fa-cogs"></i>
                        分析过程
                    </h3>
                    <button class="toggle-steps-btn" id="toggleStepsBtn">
                        <i class="fas fa-chevron-up"></i>
                        <span>折叠过程</span>
                    </button>
                </div>
                <div class="analysis-steps-content" id="analysisStepsContent">
                    <div class="steps-grid" id="stepsGrid">
                        <!-- 步骤卡片将在这里生成 -->
                    </div>
                </div>
            </div>
            <div class="analysis-result-wrapper glass" id="analysisResultWrapper" style="display: none;">
                <div class="result-header">
                    <h3 class="result-title">
                        <i class="fas fa-chart-line"></i>
                        分析结果
                    </h3>
                </div>
                <div class="result-content" id="resultContent">
                    <!-- 最终结果将在这里显示 -->
                </div>
            </div>
        `;

        // 绑定折叠/展开事件
        const toggleBtn = document.getElementById('toggleStepsBtn');
        const stepsContent = document.getElementById('analysisStepsContent');
        
        toggleBtn?.addEventListener('click', () => {
            const isCollapsed = stepsContent.style.display === 'none';
            stepsContent.style.display = isCollapsed ? 'block' : 'none';
            
            const icon = toggleBtn.querySelector('i');
            const text = toggleBtn.querySelector('span');
            
            if (isCollapsed) {
                icon.className = 'fas fa-chevron-up';
                text.textContent = '折叠过程';
            } else {
                icon.className = 'fas fa-chevron-down';
                text.textContent = '展开过程';
            }
        });

        // 生成步骤卡片
        const stepsGrid = document.getElementById('stepsGrid');
        this.currentSteps.forEach((step, index) => {
            const stepCard = this.createStepCard(step, index);
            stepsGrid.appendChild(stepCard);
        });
    }

    /**
     * 【已修改】创建步骤卡片 - 新的毛玻璃卡片式设计
     * @param {Object} step - 步骤配置
     * @param {number} index - 步骤索引
     */
    createStepCard(step, index) {
        const card = document.createElement('div');
        card.className = 'progress-step-card glass-light';
        card.dataset.step = step.id;

        const status = this.getStepStatus(index);
        card.classList.add(status);

        // 使用毛玻璃效果的步骤卡片设计
        card.innerHTML = `
            <div class="step-card-header">
                <div class="step-icon-wrapper">
                    <div class="step-icon-circle ${status}">
                        ${this.getStepIcon(step, status)} 
                    </div>
                </div>
                <div class="step-info">
                    <h4 class="step-card-title">${step.title}</h4>
                    <p class="step-card-description">${step.description}</p>
                </div>
            </div>
            <div class="step-card-status">
                <div class="status-indicator ${status}">
                    <i class="fas ${this.getStatusIcon(status)}"></i>
                    <span>${this.getStatusText(status)}</span>
                </div>
            </div>
            <div class="step-card-content" id="stepContent_${step.id}" style="display: none;">
                <!-- 步骤内容将动态添加 -->
            </div>
        `;

        card.addEventListener('click', () => {
            if (status === 'completed' || this.currentStepData[step.id]?.content) {
                this.showStepDetail(step.id);
            }
        });

        return card;
    }

    /**
     * 获取步骤图标
     * @param {Object} step - 步骤配置
     * @param {string} status - 步骤状态
     */
    getStepIcon(step, status) {
        if (status === 'processing') {
            // 返回我们自定义的7个小点的加载器HTML结构
            return `
                <div class="custom-spinner">
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                    <div class="spinner-dot"></div>
                </div>
            `;
        } 
        if (status === 'completed') {
            return '<i class="fas fa-check step-checkmark"></i>';
        }
        return `<span class="step-number">${step.id}</span>`;
    }

    /**
     * 获取状态图标
     * @param {string} status - 状态
     */
    getStatusIcon(status) {
        const icons = {
            'pending': 'fa-clock',
            'processing': 'fa-spinner',
            'completed': 'fa-check',
            'active': 'fa-play'
        };
        return icons[status] || 'fa-circle';
    }

    /**
     * 获取步骤状态
     * @param {number} index - 步骤索引
     */
    getStepStatus(index) {
        const stepId = index + 1;
        
        // 如果步骤数据中标记为完成，则显示完成状态
        if (this.currentStepData[stepId]?.complete) {
            console.log(`步骤 ${stepId} (索引 ${index}) 状态: completed (数据标记)`);
            return 'completed';
        }
        
        // 如果是当前正在处理的步骤
        if (index === this.activeStep) {
            console.log(`步骤 ${stepId} (索引 ${index}) 状态: processing (活跃步骤)`);
            return 'processing';
        }
        
        // 如果步骤索引小于当前活跃步骤，则为完成状态
        if (index < this.activeStep) {
            console.log(`步骤 ${stepId} (索引 ${index}) 状态: completed (小于活跃步骤)`);
            return 'completed';
        }
        
        // 其他情况为等待状态
        console.log(`步骤 ${stepId} (索引 ${index}) 状态: pending`);
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
            'completed': '完成' // ✓ 由图标显示，这里只显示文本
        };
        return texts[status] || '等待中';
    }

    /**
     * 获取步骤进度百分比
     * @param {number} index - 步骤索引
     */
    getStepProgress(index) {
        const stepId = index + 1;
        
        // 如果步骤数据中标记为完成，则100%
        if (this.currentStepData[stepId]?.complete) {
            return 100;
        }
        
        // 如果是当前正在处理的步骤且有内容，则显示50%
        if (index === this.activeStep && this.currentStepData[stepId]?.content) {
            return 75;
        }
        
        // 如果是当前正在处理的步骤但没有内容，则显示25%
        if (index === this.activeStep) {
            return 25;
        }
        
        // 如果步骤索引小于当前活跃步骤，则为100%
        if (index < this.activeStep) {
            return 100;
        }
        
        // 其他情况为0%
        return 0;
    }

    /**
     * 更新步骤内容
     * @param {number} stepId - 步骤ID
     * @param {string} content - 步骤内容
     * @param {string} type - 内容类型 ('content', 'thinking', 'complete')
     */
    updateStep(stepId, content, type = 'content') {
        console.log(`更新步骤 ${stepId}, 类型: ${type}, 内容长度: ${content.length}`);
        console.log(`接收到的内容预览: "${content.substring(0, 100)}"`);
        
        if (!this.currentStepData[stepId]) {
            this.currentStepData[stepId] = {
                content: '',
                thinking: '',
                complete: false
            };
        }

        if (type === 'content') {
            // 直接累积内容，不进行激进的换行处理
            // 让AI服务端和markdown渲染器来处理格式
            this.currentStepData[stepId].content += content;
            console.log(`步骤 ${stepId} 累积内容长度: ${this.currentStepData[stepId].content.length}`);
        } else if (type === 'thinking') {
            this.currentStepData[stepId].thinking += content;
        } else if (type === 'complete') {
            this.currentStepData[stepId].complete = true;
            console.log(`步骤 ${stepId} 标记为完成，当前步骤数据:`, this.currentStepData[stepId]);
            
            // 在完成时，进行轻微的内容清理
            if (this.currentStepData[stepId].content) {
                this.currentStepData[stepId].content = this.cleanupContent(this.currentStepData[stepId].content);
            }
        }

        // 更新UI
        this.updateStepUI(stepId);

        this.saveState();//保存状态
    }

    /**
     * 清理内容格式
     * @param {string} content - 原始内容
     */
    /**
     * 清理内容，修复格式问题（保守处理）
     * @param {string} content - 需要清理的内容
     */
    cleanupContent(content) {
        if (!content) return '';
        
        console.log('开始清理内容，原始长度:', content.length);
        
        // 只进行最基本的清理，避免破坏内容结构
        content = content
            // 清理过多的连续空行（超过3个）
            .replace(/\n{4,}/g, '\n\n\n')
            // 移除行尾的多余空格
            .replace(/[ \t]+$/gm, '')
            // 移除文档开头和结尾的多余空行
            .replace(/^\n+/, '')
            .replace(/\n+$/, '\n')
            
        console.log('内容清理完成，最终长度:', content.length);
        return content;
    }

    /**
     * 完成当前步骤，进入下一步
     */
    completeCurrentStep() {
        // 标记当前步骤为完成状态
        const currentStepId = this.activeStep + 1;
        console.log(`完成当前步骤: ${currentStepId}, 总步骤数: ${this.currentSteps.length}, 当前活跃步骤: ${this.activeStep}`);
        
        if (this.currentStepData[currentStepId]) {
            this.currentStepData[currentStepId].complete = true;
        }
        
        // 只有当不是最后一步时才推进到下一步
        if (this.activeStep < this.currentSteps.length - 1) {
            this.activeStep++;
            console.log(`推进到下一步: ${this.activeStep + 1}`);
        } else {
            console.log(`已到达最后一步，不再推进`);
        }
        
        // 重新渲染步骤
        this.renderSteps();

        this.saveState();//保存状态
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
            
            // 在新的步骤卡片中显示内容预览
            const stepContentContainer = card.querySelector('.step-card-content');
            if (stepContentContainer && this.currentStepData[stepId].content) {
                const cleanedContent = this.cleanupContent(this.currentStepData[stepId].content);
                // 显示内容的前200个字符作为预览
                const preview = cleanedContent.length > 200 
                    ? cleanedContent.substring(0, 200) + '...'
                    : cleanedContent;
                
                stepContentContainer.innerHTML = `
                    <div class="step-content-preview">
                        <p class="preview-text">${preview}</p>
                        <button class="view-full-btn" onclick="progressManager.showStepDetail(${stepId})">
                            <i class="fas fa-expand-alt"></i>
                            查看完整内容
                        </button>
                    </div>
                `;
                stepContentContainer.style.display = 'block';
            }
        }

        // 更新进度条（如果存在）
        const progressFill = card.querySelector('.step-progress-fill');
        const stepIndex = this.currentSteps.findIndex(step => step.id === stepId);
        if (progressFill && stepIndex !== -1) {
            progressFill.style.width = this.getStepProgress(stepIndex) + '%';
        }
        
        // 重新渲染步骤以更新状态
        this.renderSteps();
    }

    /**
     * 显示步骤详情
     * @param {number} stepId - 步骤ID
     */
    showStepDetail(stepId) {
        const stepData = this.currentStepData[stepId];
        if (!stepData || !stepData.content) {
            if (window.showNotification) window.showNotification('该步骤暂无内容', 'info');
            return;
        }

        const step = this.currentSteps.find(s => s.id === stepId);
        if (!step) return;

        // --- 填充标题和图标 ---
        document.getElementById('stepDetailIcon').innerHTML = step.icon ? `<span>${step.icon}</span>` : `<i class="fas fa-tasks"></i>`;
        document.getElementById('stepDetailMainTitle').textContent = step.title;
        document.getElementById('stepDetailSubTitle').textContent = step.description;

        const contentContainer = document.getElementById('stepDetailContent');
        let fullContent = '';

        if (stepData.thinking) {
            fullContent += `
                <details class="step-thinking">
                    <summary class="step-thinking-header">AI思考过程 <i class="fas fa-chevron-down"></i></summary>
                    <div class="step-thinking-content">${this.renderMarkdown(stepData.thinking)}</div>
                </details>`;
        }
        fullContent += this.renderMarkdown(stepData.content);
        contentContainer.innerHTML = fullContent;
        
        // === 【最终修正代码】 ===
        const modalElement = document.getElementById('stepDetailModal');

        // 关键1：告诉模态框它当前正在显示哪个步骤
        modalElement.dataset.currentStepId = stepId;

        // 问题1：锁定背景滚动
        document.body.classList.add('modal-open');
        
        // 显示模态框
        modalElement.classList.add('active');
        
        // 问题2：从数据对象中恢复独立的滚动位置
        if (stepData.scrollTop) {
            contentContainer.scrollTop = stepData.scrollTop;
        } else {
            // 如果这个步骤之前没被打开过，确保滚动条在顶部
            contentContainer.scrollTop = 0; 
        }
        
        // 如果使用了代码高亮库 (您已有的代码)
        if (typeof hljs !== 'undefined') {
            contentContainer.querySelectorAll('pre code').forEach(hljs.highlightElement);
        }
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
     * 将换行符转换为 HTML <br> 标签，用于纯文本展示
     * @param {string} text
     * @returns {string}
     */
    formatSnippetContent(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    /**
     * 渲染 Markdown 内容 - 增强版本，适配大模型输出格式
     * @param {string} content - 原始内容
     */
    renderMarkdown(content) {
        console.log('=== Markdown渲染开始 ===');
        console.log('原始内容长度:', content.length);
        console.log('原始内容完整文本:', content);
        console.log('原始内容前500字符:', content.substring(0, 500));
        
        if (!content) {
            console.log('内容为空，返回空字符串');
            return '';
        }
        
        // 预处理内容：修复markdown格式问题
        const preprocessed = this.preprocessMarkdownContent(content);
        
        console.log('预处理后内容长度:', preprocessed.length);
        console.log('预处理后内容完整文本:', preprocessed);
        console.log('预处理后内容前500字符:', preprocessed.substring(0, 500));
        console.log('marked库可用:', typeof marked !== 'undefined');
        
        if (typeof marked !== 'undefined') {
            try {
                // 配置marked选项，针对大模型输出优化
                marked.setOptions({
                    breaks: true,           // 支持单换行符转换为<br>
                    gfm: true,             // 启用GitHub风格Markdown
                    sanitize: false,       // 不清理HTML（需要显示样式）
                    pedantic: false,       // 不严格遵循原始markdown.pl的怪异行为
                    smartLists: true,      // 使用更智能的列表行为
                    smartypants: false,    // 不转换引号等字符
                    highlight: function(code, lang) {
                        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                            try {
                                return hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('代码高亮失败:', err);
                            }
                        }
                        return code;
                    }
                });

                // 使用正确的API方法渲染
                let rendered = marked.parse ? marked.parse(preprocessed) : marked(preprocessed);
                
                console.log('Marked渲染成功');
                console.log('渲染后HTML长度:', rendered.length);
                console.log('渲染后HTML完整内容:', rendered);
                console.log('渲染后HTML前1000字符:', rendered.substring(0, 1000));
                
                // 后处理：为特定内容添加样式类和修复格式
                rendered = this.enhanceRenderedContent(rendered);
                
                console.log('后处理完成，最终HTML长度:', rendered.length);
                console.log('=== Markdown渲染完成 ===');
                return rendered;
                
            } catch (error) {
                console.error('Marked渲染失败:', error);
                console.log('回退到增强Markdown解析器');
                return this.enhancedMarkdownParse(preprocessed);
            }
        }
        
        console.log('Marked不可用，使用增强Markdown解析器');
        return this.enhancedMarkdownParse(preprocessed);
    }

    /**
     * 预处理Markdown内容 -【最终修正版】
     * 目标：只修复最核心的格式问题，确保Markdown解析器能工作。
     * @param {string} content - 原始内容
     */
    preprocessMarkdownContent(content) {
        // 优化：更智能地处理多级标题、列表、代码块等
        if (!content) return '';
        let processed = content.replace(/\\n/g, '\n').trim();

        // 移除 markdown 代码块包裹（如```markdown ... ```）
        processed = processed.replace(/^```(?:markdown)?\s*\n/, '');
        processed = processed.replace(/\n```\s*$/, '');

        // 标题处理：确保#后有空格，且标题前后有空行
        processed = processed.replace(/(#{1,6})([^ \n#])/g, '$1 $2');
        processed = processed.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');
        processed = processed.replace(/(#{1,6}\s[^\n]+)\n([^#\n])/g, '$1\n\n$2');

        // 列表处理：统一无序列表符号为“-”，有序列表为“1. ”格式
        processed = processed.replace(/^(\s*)[-*•–—]\s+/gm, '$1- ');
        processed = processed.replace(/^(\s*)(\d+)[\.\)]\s+/gm, '$1$2. ');

        // 代码块处理：确保```前后有空行
        processed = processed.replace(/([^\n])(```)/g, '$1\n$2');
        processed = processed.replace(/(```[a-zA-Z]*\n[^`]+)\n([^`])/g, '$1\n\n$2');

        // AI常见格式修复：如“## 标题：”变为“## 标题”
        processed = processed.replace(/(#{1,6})\s*([^:]+)：\s*/g, '$1 $2\n\n');

        // 段落间距优化
        processed = processed.replace(/\n{3,}/g, '\n\n');
        processed = processed.replace(/^\n+/, '').replace(/\n+$/, '');

        return processed;
    }

    /**
     * 增强的Markdown解析器（后备方案）
     * @param {string} content - 原始内容
     */
    enhancedMarkdownParse(content) {
        if (!content) return '';
        // 优化：支持多级标题、嵌套列表、代码块、引用等
        let html = '';
        let lines = content.split(/\r?\n/);
        let inCodeBlock = false;
        let codeLang = '';
        let codeBuffer = [];
        let listType = null;
        let listBuffer = [];
        let lastLineEmpty = true;

        function flushList() {
            if (listBuffer.length > 0) {
                if (listType === 'ul') {
                    html += '<ul>' + listBuffer.map(item => `<li>${item}</li>`).join('') + '</ul>';
                } else if (listType === 'ol') {
                    html += '<ol>' + listBuffer.map(item => `<li>${item}</li>`).join('') + '</ol>';
                }
                listBuffer = [];
                listType = null;
            }
        }

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (inCodeBlock) {
                if (/^```/.test(line)) {
                    html += `<pre><code${codeLang ? ' class="language-' + codeLang + '"' : ''}>${codeBuffer.join('\n')}</code></pre>`;
                    inCodeBlock = false;
                    codeLang = '';
                    codeBuffer = [];
                    continue;
                } else {
                    codeBuffer.push(line);
                    continue;
                }
            }
            let codeBlockMatch = line.match(/^```([a-zA-Z0-9]*)/);
            if (codeBlockMatch) {
                flushList();
                inCodeBlock = true;
                codeLang = codeBlockMatch[1] || '';
                codeBuffer = [];
                continue;
            }
            // 标题
            let headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                flushList();
                let level = headingMatch[1].length;
                let text = headingMatch[2].trim();
                html += `<h${level}>${text}</h${level}>`;
                lastLineEmpty = false;
                continue;
            }
            // 有序列表
            let olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
            if (olMatch) {
                if (listType !== 'ol') flushList();
                listType = 'ol';
                listBuffer.push(olMatch[2].trim());
                lastLineEmpty = false;
                continue;
            }
            // 无序列表
            let ulMatch = line.match(/^\s*[-*•]\s+(.*)$/);
            if (ulMatch) {
                if (listType !== 'ul') flushList();
                listType = 'ul';
                listBuffer.push(ulMatch[1].trim());
                lastLineEmpty = false;
                continue;
            }
            // 引用
            let blockquoteMatch = line.match(/^>\s?(.*)$/);
            if (blockquoteMatch) {
                flushList();
                html += `<blockquote>${blockquoteMatch[1]}</blockquote>`;
                lastLineEmpty = false;
                continue;
            }
            // 水平线
            if (/^---+$/.test(line.trim())) {
                flushList();
                html += '<hr>';
                lastLineEmpty = false;
                continue;
            }
            // 空行
            if (/^\s*$/.test(line)) {
                flushList();
                lastLineEmpty = true;
                continue;
            }
            // 普通段落
            flushList();
            let processedText = line
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
            if (lastLineEmpty) {
                html += `<p>${processedText}</p>`;
            } else {
                html += processedText;
            }
            lastLineEmpty = false;
        }
        flushList();
        if (inCodeBlock && codeBuffer.length > 0) {
            html += `<pre><code${codeLang ? ' class="language-' + codeLang + '"' : ''}>${codeBuffer.join('\n')}</code></pre>`;
        }
        return html;
    }

    /**
     * 智能段落分割
     * @param {string} content - 原始内容
     */
    intelligentParagraphSplit(content) {
        console.log('开始智能段落分割');
        
        // 先处理标题和列表的分割
        content = content
            // 确保标题前后有空行
            .replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')
            .replace(/(#{1,6}[^\n]+)\n([^#\n\s])/g, '$1\n\n$2')
            // 确保列表前有空行
            .replace(/([^\n])\n(\d+\.\s|[-*•]\s)/g, '$1\n\n$2')
        
        // 处理长段落的分割
        const sentences = content.split(/([。！？；])/);
        let result = '';
        let currentLength = 0;
        
        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i] || '';
            const punctuation = sentences[i + 1] || '';
            const fullSentence = sentence + punctuation;
            
            if (!fullSentence.trim()) continue;
            
            // 如果当前句子包含标题或列表标记，直接添加
            if (fullSentence.match(/#{1,6}\s|^\d+\.\s|^[-*•]\s/)) {
                if (result && !result.endsWith('\n\n')) {
                    result += '\n\n';
                }
                result += fullSentence;
                currentLength = 0;
                continue;
            }
            
            // 累计长度，决定是否需要分段
            currentLength += fullSentence.length;
            
            if (currentLength > 200 && punctuation && result) {
                // 长度超过200字符且有标点，分段
                result += fullSentence + '\n\n';
                currentLength = 0;
            } else {
                result += fullSentence;
            }
        }
        
        console.log('智能分割完成');
        return result;
        
        console.log('智能分割完成');
        return result;
    }

    /**
     * 增强渲染内容，添加特定样式
     * @param {string} html - 渲染后的HTML
     */
    /**
     * 增强渲染后的内容 - 针对大模型输出优化
     * @param {string} html - 渲染后的HTML内容
     */
    enhanceRenderedContent(html) {
        console.log('=== 增强渲染内容开始 ===');
        console.log('原始HTML长度:', html.length);
        
        // 1. 为深度分析相关标题添加特殊样式
        html = html.replace(
            /<h([1-6])[^>]*>([^<]*(?:深度分析|深入分析|分析报告)[^<]*)<\/h\1>/gi,
            '<h$1 class="analysis-title glass-card">$2</h$1>'
        );

        // 2. 为关键信息点添加样式
        html = html.replace(
            /<h([1-6])[^>]*>([^<]*(?:关键信息|重要信息|核心要点)[^<]*)<\/h\1>/gi,
            '<h$1 class="key-info-title glass-card">$2</h$1>'
        );

        // 3. 为结构性标题添加样式
        html = html.replace(
            /<h([1-6])[^>]*>([^<]*(?:文章结构|内容结构|组织结构)[^<]*)<\/h\1>/gi,
            '<h$1 class="structure-title glass-card">$2</h$1>'
        );

        // 4. 为总结性标题添加样式
        html = html.replace(
            /<h([1-6])[^>]*>([^<]*(?:总结|结论|结果汇总|最终结果)[^<]*)<\/h\1>/gi,
            '<h$1 class="summary-title glass-card">$2</h$1>'
        );

        // 5. 为数据统计段落添加特殊样式
        html = html.replace(
            /<p>([^<]*(?:数据统计|统计数据|统计信息)[^<]*)<\/p>/gi,
            '<p class="data-statistics glass-card">$1</p>'
        );

        // 6. 为关键词和分类信息添加样式
        html = html.replace(
            /<p>([^<]*(?:类型|分类|关键词)[：:][^<]*)<\/p>/gi,
            '<p class="category-info glass-card">$1</p>'
        );

        // 7. 为重要提示添加样式
        html = html.replace(
            /<p>([^<]*(?:注意|提示|重要)[：:]?[^<]*)<\/p>/gi,
            '<p class="important-note glass-card">$1</p>'
        );

        // 8. 为列表项添加更好的样式
        html = html.replace(/<ul>/gi, '<ul class="enhanced-list">');
        html = html.replace(/<ol>/gi, '<ol class="enhanced-list">');

        // 9. 为代码块添加样式
        html = html.replace(/<pre>/gi, '<pre class="code-block glass-card">');

        // 10. 为表格添加样式
        html = html.replace(/<table>/gi, '<table class="data-table glass-card">');

        // 11. 为强调文本添加更好的样式
        html = html.replace(/<strong>/gi, '<strong class="highlight-text">');

        console.log('增强后HTML长度:', html.length);
        console.log('=== 增强渲染内容完成 ===');
        
        return html;
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
        console.log('进度管理器收到数据:', data);
        
        switch (data.type) {
            case 'step_start':
                console.log(`开始步骤 ${data.step}`);
                this.activeStep = data.step - 1;
                this.renderSteps();
                break;
                
            case 'content':
                console.log(`步骤 ${data.step || this.activeStep + 1} 收到内容`);
                this.updateStep(data.step || this.activeStep + 1, data.content, 'content');
                break;
                
            case 'thinking':
                console.log(`步骤 ${data.step || this.activeStep + 1} 收到思考内容`);
                this.updateStep(data.step || this.activeStep + 1, data.content, 'thinking');
                break;
                
            case 'step_complete':
                console.log(`步骤 ${data.step || this.activeStep + 1} 完成`);
                const completedStepId = data.step || this.activeStep + 1;
                this.updateStep(completedStepId, '', 'complete'); // ✅ 正确推进
                
                // 推进到下一步（如果不是最后一步）
                this.completeCurrentStep();
                break;
                
            case 'analysis_complete':
            case 'verification_complete':
                console.log('分析完成');
                // 确保最后一步也标记为完成
                const lastStepId = this.currentSteps.length;
                if (!this.currentStepData[lastStepId]?.complete) {
                    this.updateStep(lastStepId, '', 'complete');
                    this.renderSteps();
                }
                
                // 自动显示最终结果并折叠过程
                this.showFinalResultAndCollapseSteps();
                
                showNotification('分析完成！', 'success');
                break;
                
            case 'error':
                console.error('分析过程中出现错误:', data.message);
                showNotification(data.message || '分析过程中出现错误', 'error');
                break;
                
            default:
                console.log('未处理的数据类型:', data.type);
        }
    }

    /**
     * 渲染搜索结果
     * @param {Array} searchResults - 搜索结果数组
     */
    renderSearchResults(searchResults) {
        if (!searchResults || !Array.isArray(searchResults)) {
            return '<p class="no-results">未找到相关搜索结果</p>';
        }

        const resultsHtml = searchResults.map((result, index) => {
            return this.createSearchResultItem(result, index);
        }).join('');

        return `
            <div class="search-results-container">
                <div class="search-results-header">
                    <h3><i class="fas fa-search"></i> 搜索结果 (${searchResults.length})</h3>
                </div>
                <div class="search-results-list">
                    ${resultsHtml}
                </div>
            </div>
        `;
    }

    /**
     * 创建单个搜索结果项
     * @param {Object} result - 搜索结果对象
     * @param {number} index - 索引
     */
    createSearchResultItem(result, index) {
        const {
            title = '未知标题',
            url = '#',
            snippet = '暂无描述',
            source = '未知来源',
            publishDate = '',
            relevanceScore = 0
        } = result;

        // ✅ 标题可以截断
        const truncatedTitle = this.truncateText(title, 80);

        // ✅ Snippet 不建议截断，保持markdown语义和换行完整
        const formattedSnippet = this.renderMarkdown(this.preprocessMarkdownContent(snippet));
        const displayUrl = this.formatDisplayUrl(url);
        const starRating = this.getStarRating(relevanceScore);

        return `
            <div class="search-result-item" data-index="${index}">
                <div class="search-result-header">
                    <h4 class="search-result-title" title="${title}">
                        <a href="${url}" target="_blank" rel="noopener noreferrer">
                            ${truncatedTitle}
                        </a>
                    </h4>
                    <div class="search-result-rating">
                        ${starRating}
                    </div>
                </div>
                
                <div class="search-result-url">
                    <i class="fas fa-link"></i>
                    <span title="${url}">${displayUrl}</span>
                </div>
                
                <div class="search-result-snippet markdown-container">
                    ${formattedSnippet}
                </div>
                
                <div class="search-result-meta">
                    <div class="result-source">
                        <i class="fas fa-globe"></i>
                        <span>${source}</span>
                    </div>
                    
                    <div class="result-actions">
                        <button class="search-result-btn" onclick="progressManager.viewResultDetail(${index})">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="search-result-btn secondary" onclick="progressManager.analyzeResult(${index})">
                            <i class="fas fa-chart-line"></i> 分析
                        </button>
                    </div>
                </div>
                
                ${publishDate ? `
                    <div class="result-date">
                        <i class="fas fa-calendar"></i>
                        <span>${publishDate}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * 截断文本
     * @param {string} text - 原始文本
     * @param {number} maxLength - 最大长度
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * 格式化显示URL
     * @param {string} url - 原始URL
     */
    formatDisplayUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            const path = urlObj.pathname.length > 30 
                ? urlObj.pathname.substring(0, 30) + '...' 
                : urlObj.pathname;
            return domain + path;
        } catch {
            return url.length > 50 ? url.substring(0, 50) + '...' : url;
        }
    }

    /**
     * 获取星级评分HTML
     * @param {number} score - 评分(0-1)
     */
    getStarRating(score) {
        const stars = Math.round(score * 5);
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= stars) {
                html += '<i class="fas fa-star star-filled"></i>';
            } else {
                html += '<i class="fas fa-star star-empty"></i>';
            }
        }
        return html;
    }

    /**
     * 查看搜索结果详情
     * @param {number} index - 结果索引
     */
    viewResultDetail(index) {
        console.log('查看搜索结果详情:', index);
        // 可以在这里实现预览功能
    }

    /**
     * 分析搜索结果
     * @param {number} index - 结果索引
     */
    analyzeResult(index) {
        console.log('分析搜索结果:', index);
        // 可以在这里实现进一步分析功能
    }

    /**
     * 显示最终结果并自动折叠步骤过程
     */
    showFinalResultAndCollapseSteps() {
        // 获取最后一步（结果汇总）的内容
        const lastStepId = this.currentSteps.length;
        const finalResult = this.currentStepData[lastStepId]?.content;
        
        if (!finalResult) {
            console.warn('没有找到最终结果内容');
            return;
        }

        // 显示结果容器
        const resultWrapper = document.getElementById('analysisResultWrapper');
        const resultContent = document.getElementById('resultContent');
        
        if (resultWrapper && resultContent) {
            // 清理和渲染最终结果
            const cleanedContent = this.cleanupContent(finalResult);
            resultContent.innerHTML = this.renderMarkdown(cleanedContent);
            
            // 显示结果容器
            resultWrapper.style.display = 'block';
            
            // 自动折叠步骤过程
            setTimeout(() => {
                const toggleBtn = document.getElementById('toggleStepsBtn');
                const stepsContent = document.getElementById('analysisStepsContent');
                
                if (toggleBtn && stepsContent) {
                    stepsContent.style.display = 'none';
                    
                    const icon = toggleBtn.querySelector('i');
                    const text = toggleBtn.querySelector('span');
                    
                    if (icon && text) {
                        icon.className = 'fas fa-chevron-down';
                        text.textContent = '展开过程';
                    }
                }
                
                // 滚动到结果区域
                resultWrapper.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 500);
        }
    }
}

// 切换AI思考过程折叠状态的全局函数
function toggleThinking(thinkingId) {
    const thinkingElement = document.getElementById(thinkingId);
    if (thinkingElement) {
        thinkingElement.classList.toggle('collapsed');
        
        // 更新箭头图标
        const icon = thinkingElement.querySelector('.thinking-header i');
        if (icon) {
            const isCollapsed = thinkingElement.classList.contains('collapsed');
            icon.className = `fas fa-chevron-${isCollapsed ? 'down' : 'up'}`;
        }
    }
}

// 全局进度管理器实例
window.progressManager = new ProgressManager();

//页面加载逻辑//
document.addEventListener('DOMContentLoaded', () => {
    // 尝试从 localStorage 加载进度
    const stateLoaded = window.progressManager.loadState();

    // 如果没有恢复任何状态，则正常显示欢迎界面
    if (!stateLoaded) {
        // 确保欢迎界面是可见的，其他界面是隐藏的
        document.getElementById('welcomeScreen').style.display = 'block';
        document.getElementById('chatScreen').style.display = 'none';
        document.getElementById('progressScreen').style.display = 'none';
    }
});