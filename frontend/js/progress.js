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
        const container = document.getElementById('progressSteps');
        if (!container) return;

        container.innerHTML = '';

        this.currentSteps.forEach((step, index) => {
            const stepCard = this.createStepCard(step, index);
            container.appendChild(stepCard);
        });
    }

    /**
     * 创建步骤卡片 - 新的卡片式设计
     * @param {Object} step - 步骤配置
     * @param {number} index - 步骤索引
     */
    createStepCard(step, index) {
        const card = document.createElement('div');
        card.className = 'progress-step';
        card.dataset.step = step.id;

        const status = this.getStepStatus(index);
        card.classList.add(status);

        // 创建卡片内容
        card.innerHTML = `
            <div class="step-circle">
                ${this.getStepIcon(step, status)}
            </div>
            <div class="step-info">
                <h3 class="step-title">${step.title}</h3>
                <p class="step-description">${step.description}</p>
            </div>
            <div class="step-status ${status}">
                <i class="fas ${this.getStatusIcon(status)}"></i>
                <span>${this.getStatusText(status)}</span>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', () => {
            if (this.currentStepData[step.id] || status === 'completed') {
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
            return '<i class="fas fa-spinner"></i>';
        } else if (status === 'completed') {
            return '<i class="fas fa-check"></i>';
        } else {
            // 根据步骤类型和ID返回对应图标
            const iconMap = {
                'comprehensive-analysis': {
                    1: '<i class="fas fa-search"></i>',      // 问题分析
                    2: '<i class="fas fa-globe"></i>',       // 搜索结果  
                    3: '<i class="fas fa-cog"></i>',         // 深度分析
                    4: '<i class="fas fa-check-circle"></i>' // 结果汇总
                },
                'intelligent-reading': {
                    1: '<i class="fas fa-search"></i>',
                    2: '<i class="fas fa-globe"></i>',
                    3: '<i class="fas fa-cog"></i>',
                    4: '<i class="fas fa-check-circle"></i>'
                },
                'expert-analysis': {
                    1: '<i class="fas fa-search"></i>',
                    2: '<i class="fas fa-globe"></i>',
                    3: '<i class="fas fa-cog"></i>',
                    4: '<i class="fas fa-check-circle"></i>'
                },
                'fact-checking': {
                    1: '<i class="fas fa-search"></i>',
                    2: '<i class="fas fa-globe"></i>',
                    3: '<i class="fas fa-cog"></i>',
                    4: '<i class="fas fa-check-circle"></i>'
                }
            };
            
            if (this.analysisType && iconMap[this.analysisType] && iconMap[this.analysisType][step.id]) {
                return iconMap[this.analysisType][step.id];
            }
            
            return '<i class="fas fa-circle"></i>';
        }
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
            'active': '进行中',
            'completed': '✓ 完成'
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
            const thinkingId = `thinking-${Date.now()}`;
            fullContent += `
                <div class="thinking-section">
                    <div class="thinking-content collapsed" id="${thinkingId}">
                        <div class="thinking-header" onclick="toggleThinking('${thinkingId}')">
                            AI思考过程
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        <div class="thinking-body">
                            ${this.renderMarkdown(stepData.thinking)}
                        </div>
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
        
        // 重新初始化代码高亮
        if (typeof hljs !== 'undefined') {
            setTimeout(() => {
                contentContainer.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }, 100);
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
     * 渲染 Markdown 内容
     * @param {string} content - 原始内容
     */
    renderMarkdown(content) {
        console.log('渲染Markdown内容，原始长度:', content.length);
        console.log('原始内容预览:', content.substring(0, 200));
        
        // 预处理内容：修复markdown格式问题
        content = this.preprocessMarkdownContent(content);
        
        console.log('marked可用:', typeof marked !== 'undefined');
        
        if (typeof marked !== 'undefined') {
            try {
                // 配置marked选项
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                    highlight: function(code, lang) {
                        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                            try {
                                return hljs.highlight(code, { language: lang }).value;
                            } catch (err) {}
                        }
                        return code;
                    }
                });

                let rendered = marked.parse ? marked.parse(content) : marked(content);
                
                // 后处理：为特定内容添加样式类
                rendered = this.enhanceRenderedContent(rendered);
                
                console.log('Markdown渲染成功，HTML长度:', rendered.length);
                return rendered;
            } catch (error) {
                console.error('Markdown渲染失败:', error);
                return this.enhancedMarkdownParse(content);
            }
        }
        console.log('marked不可用，使用增强Markdown解析');
        return this.enhancedMarkdownParse(content);
    }

    /**
     * 预处理Markdown内容，修复格式问题
     * @param {string} content - 原始内容
     */
    /**
     * 预处理Markdown内容，修复格式问题（智能处理）
     * @param {string} content - 原始内容
     */
    preprocessMarkdownContent(content) {
        if (!content) return '';
        
        console.log('开始预处理内容，原始长度:', content.length);
        console.log('原始内容前200字符:', content.substring(0, 200));
        
        // 第一步：标准化换行符和基本清理
        content = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[ \t]+$/gm, '') // 移除行尾空格
            
        // 第二步：修复标题格式
        content = content
            // 确保标题有正确的空格
            .replace(/(#{1,6})([^\s#\n])/g, '$1 $2')
            // 确保标题前有空行（除非在开头）
            .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
            // 确保标题后有空行
            .replace(/(#{1,6}[^\n]+)\n([^#\n\s])/g, '$1\n\n$2')
            
        // 第三步：修复段落分隔问题
        content = content
            // 中文句号后如果紧跟文字，添加段落分隔
            .replace(/([。！？；])([^\s\n。！？；#\-\*\d])/g, '$1\n\n$2')
            // 冒号后如果是长段落，添加分隔
            .replace(/([：:])\s*([^\n]{50,})/g, '$1\n\n$2')
            
        // 第四步：修复列表格式
        content = content
            // 确保列表项前有空行
            .replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2')
            .replace(/([^\n])\n([-*•]\s)/g, '$1\n\n$2')
            
        // 第五步：清理过多空行
        content = content
            .replace(/\n{4,}/g, '\n\n\n')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '\n')
            
        console.log('预处理完成，处理后长度:', content.length);
        console.log('处理后内容前200字符:', content.substring(0, 200));
        
        return content;
    }

    /**
     * 增强的Markdown解析器（后备方案）
     * @param {string} content - 原始内容
     */
    enhancedMarkdownParse(content) {
        if (!content) return '';
        
        console.log('使用增强Markdown解析器');
        console.log('原始内容长度:', content.length);
        console.log('原始内容前200字符:', content.substring(0, 200));
        
        // 先进行段落分割和修复
        content = this.intelligentParagraphSplit(content);
        
        // 按段落分割内容
        let paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
        
        console.log('分割后段落数量:', paragraphs.length);
        paragraphs.forEach((p, i) => {
            console.log(`段落 ${i + 1}: ${p.substring(0, 50)}...`);
        });
        
        let html = '';
        
        for (let paragraph of paragraphs) {
            paragraph = paragraph.trim();
            if (!paragraph) continue;
            
            // 处理标题
            if (paragraph.startsWith('#')) {
                const match = paragraph.match(/^(#{1,6})\s*(.+)$/);
                if (match) {
                    const level = match[1].length;
                    const text = match[2];
                    html += `<h${level}>${text}</h${level}>`;
                    continue;
                }
            }
            
            // 处理有序列表
            if (/^\d+\.\s/.test(paragraph)) {
                const items = paragraph.split(/(?=\d+\.\s)/).filter(item => item.trim());
                html += '<ol>';
                for (let item of items) {
                    if (/^\d+\.\s/.test(item.trim())) {
                        const text = item.replace(/^\d+\.\s*/, '').trim();
                        const processedText = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                        html += `<li>${processedText}</li>`;
                    }
                }
                html += '</ol>';
                continue;
            }
            
            // 处理无序列表
            if (/^[-*•]\s/.test(paragraph)) {
                const items = paragraph.split(/(?=[-*•]\s)/).filter(item => item.trim());
                html += '<ul>';
                for (let item of items) {
                    if (/^[-*•]\s/.test(item.trim())) {
                        const text = item.replace(/^[-*•]\s*/, '').trim();
                        const processedText = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                        html += `<li>${processedText}</li>`;
                    }
                }
                html += '</ul>';
                continue;
            }
            
            // 处理引用
            if (paragraph.startsWith('>')) {
                const text = paragraph.replace(/^>\s*/gm, '');
                html += `<blockquote>${text}</blockquote>`;
                continue;
            }
            
            // 处理水平线
            if (/^---+$/.test(paragraph)) {
                html += '<hr>';
                continue;
            }
            
            // 处理普通段落
            let processedText = paragraph
                // 处理粗体
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                // 处理斜体
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                // 处理行内代码
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                // 处理链接
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                // 处理内部换行
                .replace(/\n/g, '<br>');
            
            html += `<p>${processedText}</p>`;
        }
        
        console.log('增强Markdown解析完成，HTML长度:', html.length);
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
    enhanceRenderedContent(html) {
        // 为深度分析标题添加特殊样式
        html = html.replace(
            /<h1[^>]*>([^<]*深度分析[^<]*)<\/h1>/gi,
            '<h1 class="analysis-title">$1</h1>'
        );

        // 为关键信息点添加样式
        html = html.replace(
            /<h1[^>]*>([^<]*关键信息[^<]*)<\/h1>/gi,
            '<h1 class="key-info-title">$1</h1>'
        );

        // 为文章结构添加样式
        html = html.replace(
            /<h1[^>]*>([^<]*文章结构[^<]*)<\/h1>/gi,
            '<h1 class="structure-title">$1</h1>'
        );

        // 为数据统计段落添加特殊样式
        html = html.replace(
            /<p>([^<]*数据统计[^<]*)<\/p>/gi,
            '<p class="data-statistics">$1</p>'
        );

        // 为关键词列表添加样式
        html = html.replace(
            /<p>([^<]*类型[：:][^<]*)<\/p>/gi,
            '<p class="category-info">$1</p>'
        );

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
                this.updateStep(completedStepId, '', 'complete');
                
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
                showNotification('分析完成！点击步骤查看详细结果', 'success');
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

        // 截断标题和描述
        const truncatedTitle = this.truncateText(title, 80);
        const truncatedSnippet = this.truncateText(snippet, 200);
        const displayUrl = this.formatDisplayUrl(url);

        // 计算相关性评分的星级
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
                
                <div class="search-result-snippet">
                    ${truncatedSnippet}
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
}

// 关闭步骤详情模态框的全局函数
function closeStepDetail() {
    document.getElementById('stepDetailModal').style.display = 'none';
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
