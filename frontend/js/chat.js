/**
 * 聊天管理模块 - 重构版
 * 支持markdown、连续对话、步骤展示等功能
 */

class ChatManager {
    constructor() {
        this.currentSessionId = null;
        this.isProcessing = false;
        this.currentFunction = 'intelligent-reading';
        this.messageHistory = [];
        this.init();
        this.setupMarkdown();
    }

    init() {
        this.bindEvents();
        this.createNewSession();
    }

    /**
     * 配置markdown渲染器
     */
    setupMarkdown() {
        if (typeof marked !== 'undefined') {
            // 配置marked选项
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (ex) {}
                    }
                    return code;
                },
                breaks: true,
                gfm: true,
                sanitize: false,
                headerIds: true,
                mangle: false
            });
        }
    }

    /**
     * 增强markdown渲染，特别是分析内容
     */
    enhanceMarkdownForAnalysis(content) {
        // 预处理：为特定模式添加样式标记
        let processed = content;

        // 处理深度分析标题
        processed = processed.replace(
            /^#\s*([^#]*深度分析[^#]*)/gim,
            '# <span class="analysis-title-marker">$1</span>'
        );

        // 处理编号分析点
        processed = processed.replace(
            /^##\s*(\d+\..*)/gim,
            '## <span class="analysis-section-marker">$1</span>'
        );

        // 处理破折号要点
        processed = processed.replace(
            /^-\s*([^:]+):\s*(.*)/gim,
            '<div class="analysis-point"><strong>$1:</strong> $2</div>'
        );

        return processed;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 发送按钮 - 只在聊天界面生效
        document.getElementById('sendButton')?.addEventListener('click', (e) => {
            console.log('=== Chat.js 发送按钮被点击 ===');
            const welcomeScreen = document.getElementById('welcomeScreen');
            const chatScreen = document.getElementById('chatScreen');
            
            console.log('Chat.js - 欢迎界面元素:', welcomeScreen);
            console.log('Chat.js - 聊天界面元素:', chatScreen);
            
            if (welcomeScreen) {
                console.log('Chat.js - 欢迎界面样式:', welcomeScreen.style.display);
            }
            
            if (chatScreen) {
                console.log('Chat.js - 聊天界面样式:', chatScreen.style.display);
            }
            
            // 检查是否在聊天界面
            if (welcomeScreen && chatScreen) {
                const welcomeDisplayStyle = window.getComputedStyle(welcomeScreen).display;
                const chatDisplayStyle = window.getComputedStyle(chatScreen).display;
                
                const isWelcomeHidden = welcomeDisplayStyle === 'none';
                const isChatVisible = chatDisplayStyle !== 'none';
                
                console.log('Chat.js - 欢迎界面隐藏:', isWelcomeHidden);
                console.log('Chat.js - 聊天界面可见:', isChatVisible);
                
                if (isWelcomeHidden && isChatVisible) {
                    console.log('Chat.js - 在聊天界面，处理发送消息');
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleSendMessage();
                } else {
                    console.log('Chat.js - 不在聊天界面，跳过处理');
                }
            } else {
                console.log('Chat.js - 界面元素缺失');
            }
        });

        // 输入框回车发送 - 只在聊天界面生效
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const welcomeScreen = document.getElementById('welcomeScreen');
                    const chatScreen = document.getElementById('chatScreen');
                    
                    // 检查是否在聊天界面
                    if (welcomeScreen && chatScreen) {
                        const welcomeDisplayStyle = window.getComputedStyle(welcomeScreen).display;
                        const chatDisplayStyle = window.getComputedStyle(chatScreen).display;
                        
                        const isWelcomeHidden = welcomeDisplayStyle === 'none';
                        const isChatVisible = chatDisplayStyle !== 'none';
                        
                        if (isWelcomeHidden && isChatVisible) {
                            e.preventDefault();
                            this.handleSendMessage();
                        }
                    }
                } else if (e.key === 'Enter' && e.shiftKey) {
                    // 允许Shift+Enter换行
                    return;
                }
            });

            // 自动调整高度
            searchInput.addEventListener('input', () => {
                this.adjustTextareaHeight(searchInput);
            });
        }

        // 清空对话和简洁模式现在由功能菜单处理
        // document.getElementById('clearChatBtn')?.addEventListener('click', () => {
        //     this.clearChat();
        // });

        // document.getElementById('compactModeToggle')?.addEventListener('click', () => {
        //     this.toggleCompactMode();
        // });

        // 监听功能切换
        document.addEventListener('functionChanged', (e) => {
            this.currentFunction = e.detail.function;
            this.updateInputPlaceholder();
        });

        // 调试发送按钮的存在性
        console.log('=== Chat.js 检查发送按钮 ===');
        const sendBtn = document.getElementById('sendButton');
        console.log('Chat.js - sendButton 元素:', sendBtn);
        if (sendBtn) {
            console.log('Chat.js - 发送按钮存在，已添加事件监听器');
        } else {
            console.log('Chat.js - 警告：发送按钮不存在！');
        }
    }

    /**
     * 处理发送消息
     */
    async handleSendMessage() {
        const input = document.getElementById('searchInput');
        const content = input?.value?.trim();
        
        if (!content || this.isProcessing) {
            return;
        }

        // 清空输入框
        input.value = '';
        this.adjustTextareaHeight(input);

        await this.sendMessage(content);
    }

    /**
     * 获取输入内容
     */
    getInputContent() {
        // 检查当前激活的上传面板
        const activePanel = document.querySelector('.upload-panel.active');
        if (!activePanel) return '';

        const type = activePanel.dataset.type;
        
        switch (type) {
            case 'text':
                return document.getElementById('textInput')?.value?.trim() || '';
            case 'url':
                return document.getElementById('urlInput')?.value?.trim() || '';
            case 'file':
                // 文件上传内容由uploadManager处理
                return uploadManager?.getUploadedText() || '';
            case 'image':
                // 图片上传内容由uploadManager处理
                return uploadManager?.getUploadedImages() || '';
            default:
                return '';
        }
    }

    /**
     * 发送消息
     */
    async sendMessage(content, isInitial = false) {
        console.log('=== ChatManager.sendMessage 被调用 ===');
        console.log('content:', content);
        console.log('isInitial:', isInitial);
        console.log('当前处理状态:', this.isProcessing);
        
        if (this.isProcessing) {
            console.log('正在处理中，跳过本次请求');
            return;
        }

        this.isProcessing = true;
        console.log('设置处理状态为 true');

        try {
            console.log('=== 添加用户消息到界面 ===');
            // 添加用户消息到界面和历史记录
            if (!isInitial) {
                console.log('添加普通用户消息');
                this.addMessage('user', content);
                // 保存用户消息到历史记录
                this.saveMessageToHistory('user', content);
            } else {
                console.log('添加初始分析消息');
                // 初始分析时显示用户输入
                const formattedMessage = this.formatInitialMessage(content);
                this.addMessage('user', formattedMessage);
                // 保存用户消息到历史记录
                this.saveMessageToHistory('user', formattedMessage);
            }

            console.log('=== 滚动到底部 ===');
            // 滚动到底部
            this.scrollToBottom();

            console.log('=== 获取API端点 ===');
            // 获取当前功能对应的API端点
            const endpoint = this.getFunctionEndpoint(isInitial);
            console.log('API端点:', endpoint);
            
            console.log('=== 检查是否显示进度指示器 ===');
            // 显示进度指示器（如果需要）
            if (this.shouldShowProgress()) {
                console.log('显示进度指示器');
                this.showProgressIndicator();
            }

            console.log('=== 准备请求数据 ===');
            // 准备请求数据
            const requestData = await this.prepareRequestData(content, isInitial);
            console.log('请求数据:', requestData);

            console.log('=== 发送请求 ===');
            // 发送请求
            await this.sendRequest(endpoint, requestData);
            console.log('请求发送完成');

        } catch (error) {
            console.error('发送消息失败:', error);
            this.addMessage('assistant', '抱歉，处理您的请求时出现了错误，请重试。');
            showNotification('发送失败，请重试', 'error');
        } finally {
            console.log('=== 重置处理状态 ===');
            this.isProcessing = false;
            this.hideProgressIndicator();
        }
    }

    /**
     * 格式化初始消息
     */
    formatInitialMessage(content) {
        const activePanel = document.querySelector('.upload-panel.active');
        const type = activePanel?.dataset.type || 'text';
        
        switch (type) {
            case 'url':
                return `请分析以下链接内容：\n${content}`;
            case 'file':
                return `请分析上传的文件内容`;
            case 'image':
                return `请分析上传的图片内容`;
            default:
                return content;
        }
    }

    /**
     * 准备请求数据
     */
    async prepareRequestData(content, isInitial) {
        const data = {
            message: content,
            session_id: this.currentSessionId,
            function: this.currentFunction
        };

        // 只在继续聊天时添加历史记录
        if (!isInitial && this.messageHistory.length > 0) {
            // 过滤出有效的聊天历史（去除空消息和重复消息）
            const validHistory = this.messageHistory.filter(msg => 
                msg.content && msg.content.trim() && 
                msg.role && (msg.role === 'user' || msg.role === 'assistant')
            );
            
            // 转换为API期望的格式
            data.chat_history = validHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
        }

        // 如果是初始分析，添加上传内容
        if (isInitial) {
            const activePanel = document.querySelector('.upload-panel.active');
            const type = activePanel?.dataset.type;

            switch (type) {
                case 'url':
                    data.url = content;
                    break;
                case 'file':
                    if (uploadManager) {
                        const files = uploadManager.getUploadedFiles();
                        data.files = files;
                    }
                    break;
                case 'image':
                    if (uploadManager) {
                        const images = uploadManager.getUploadedImages();
                        data.images = images;
                    }
                    break;
            }
        }

        // 添加专家角色（如果是大师分析）
        if (this.currentFunction === 'expert-analysis') {
            let role;
            if (isInitial) {
                // 初始分析时弹出角色选择模态框
                role = await this.selectExpertRole();
                if (!role) {
                    throw new Error('请选择分析角色');
                }
            } else {
                // 继续聊天时从聊天界面的专家选择器获取当前角色
                const chatExpertSelect = document.getElementById('chatExpertSelect');
                role = chatExpertSelect?.value;
                if (!role) {
                    throw new Error('请先选择分析专家角色');
                }
            }
            data.role = role;
        }

        // 添加模型选择（智能伴读和大师分析）
        if (this.currentFunction === 'intelligent-reading' || this.currentFunction === 'expert-analysis') {
            // 优先从功能菜单获取，否则使用传统选择器
            let selectedModel = null;
            
            if (window.chatFunctionMenu) {
                selectedModel = window.chatFunctionMenu.getCurrentModel();
            }
            
            if (!selectedModel) {
                const chatModelSelect = document.getElementById('chatModelSelect');
                selectedModel = chatModelSelect?.value;
                
                // 如果聊天模式没有选择，从全局selector manager获取
                if (!selectedModel && window.selectorManager) {
                    selectedModel = window.selectorManager.getCurrentModel();
                }
            }
            
            if (selectedModel) {
                data.model = selectedModel;
            }
        }

        // 添加专家选择（大师分析）
        if (this.currentFunction === 'expert-analysis') {
            let selectedExpert = null;
            
            if (window.chatFunctionMenu) {
                selectedExpert = window.chatFunctionMenu.getCurrentExpert();
            }
            
            if (!selectedExpert) {
                const chatExpertSelect = document.getElementById('chatExpertSelect');
                selectedExpert = chatExpertSelect?.value;
            }
            
            if (selectedExpert) {
                data.persona = selectedExpert;
            }
        }

        // 添加内容上下文（如果是智能伴读且有解析过的内容）
        if (this.currentFunction === 'intelligent-reading' && !isInitial && this.currentContentContext) {
            data.content_context = this.currentContentContext;
        }

        return data;
    }

    /**
     * 获取功能端点
     */
    getFunctionEndpoint(isInitial = false) {
        const baseEndpoints = {
            'intelligent-reading': '/api/intelligent-reading',
            'comprehensive-analysis': '/api/comprehensive-analysis',
            'expert-analysis': '/api/expert-analysis',
            'fact-checking': '/api/fact-checking'
        };
        
        const baseEndpoint = baseEndpoints[this.currentFunction] || baseEndpoints['intelligent-reading'];
        
        // 如果是初始分析或没有会话ID，使用start端点
        if (isInitial || !this.currentSessionId) {
            return `${baseEndpoint}/start`;
        } else {
            // 继续聊天使用chat端点
            return `${baseEndpoint}/chat`;
        }
    }

    /**
     * 是否显示进度指示器
     */
    shouldShowProgress() {
        return ['comprehensive-analysis', 'fact-checking'].includes(this.currentFunction);
    }

    /**
     * 选择专家角色
     */
    selectExpertRole() {
        return new Promise((resolve) => {
            const modal = this.createRoleSelectionModal(resolve);
            document.body.appendChild(modal);
        });
    }

    /**
     * 创建角色选择模态框
     */
    createRoleSelectionModal(resolve) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>选择分析角色</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove(); resolve(null);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="role-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        ${this.getRoleOptions().map(role => `
                            <div class="role-card" data-role="${role.value}" style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; text-align: center; transition: all 0.2s ease;">
                                <div class="role-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">${role.icon}</div>
                                <div class="role-name" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${role.name}</div>
                                <div class="role-desc" style="font-size: 0.875rem; color: var(--text-secondary);">${role.description}</div>
                            </div>
                        `).join('')}
                        <div class="role-card" data-role="custom" style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; text-align: center; transition: all 0.2s ease;">
                            <div class="role-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">✨</div>
                            <div class="role-name" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">自定义</div>
                            <div class="role-desc" style="font-size: 0.875rem; color: var(--text-secondary);">创建专属角色</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 绑定点击事件
        modal.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                const role = card.dataset.role;
                if (role === 'custom') {
                    const customRole = prompt('请输入自定义角色名称（如：马云、乔布斯等）:');
                    if (customRole) {
                        modal.remove();
                        resolve(customRole);
                    }
                } else {
                    const roleData = this.getRoleOptions().find(r => r.value === role);
                    modal.remove();
                    resolve(roleData ? roleData.name : role);
                }
            });

            // 悬停效果
            card.addEventListener('mouseenter', () => {
                card.style.borderColor = 'var(--primary-color)';
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = 'var(--shadow-md)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.borderColor = 'var(--border-color)';
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
        });

        return modal;
    }

    /**
     * 获取角色选项
     */
    getRoleOptions() {
        return [
            { value: 'luxun', name: '鲁迅', icon: '🖋️', description: '犀利的文学批判家' },
            { value: 'hushi', name: '胡适', icon: '📚', description: '理性的学者思辨' },
            { value: 'keli', name: '可莉', icon: '💥', description: '活泼的元素使者' },
            { value: 'socrates', name: '苏格拉底', icon: '🤔', description: '哲学的启发者' },
            { value: 'einstein', name: '爱因斯坦', icon: '🧮', description: '科学的探索者' },
            { value: 'confucius', name: '孔子', icon: '📜', description: '智慧的教育家' }
        ];
    }

    /**
     * 发送请求
     */
    async sendRequest(endpoint, data) {
        console.log('=== 发送HTTP请求 ===');
        console.log('请求端点:', endpoint);
        console.log('请求数据:', data);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        console.log('HTTP响应状态:', response.status);
        console.log('HTTP响应头:', response.headers);

        if (!response.ok) {
            console.error('HTTP请求失败，状态码:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 检查是否是流式响应
        const contentType = response.headers.get('content-type');
        console.log('响应内容类型:', contentType);
        
        if (contentType && (contentType.includes('text/stream') || contentType.includes('text/plain'))) {
            console.log('处理流式响应');
            await this.handleStreamResponse(response);
        } else {
            console.log('处理JSON响应');
            const result = await response.json();
            console.log('JSON响应结果:', result);
            this.handleJsonResponse(result);
        }
    }

    /**
     * 处理流式响应
     */
    async handleStreamResponse(response) {
        console.log('=== 开始处理流式响应 ===');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let assistantMessageElement = null;
        let currentContent = '';
        let isThinking = false;
        let thinkingElement = null;
        let currentStep = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('流读取完成');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                console.log('收到数据块:', chunk);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6).trim();
                            if (jsonStr === '[DONE]' || jsonStr === '') continue;

                            console.log('解析JSON:', jsonStr);
                            const data = JSON.parse(jsonStr);
                            console.log('解析后的数据:', data);

                            switch (data.type) {
                                case 'session_id':
                                    console.log('收到会话ID:', data.session_id);
                                    this.currentSessionId = data.session_id;
                                    // 同步设置历史管理器的会话ID
                                    if (window.historyManager) {
                                        window.historyManager.currentSessionId = data.session_id;
                                    }
                                    break;

                                case 'crawler_results':
                                    console.log('收到爬虫结果:', data.results);
                                    this.addCrawlerResultsCollapse(data.results);
                                    break;

                                case 'content_parsed':
                                    console.log('收到内容解析结果:', data.result);
                                    this.handleContentParsed(data.result);
                                    break;

                                case 'status':
                                    console.log('收到状态消息:', data.message);
                                    showLoading(data.message);
                                    break;

                                case 'thinking':
                                    console.log('收到思考内容:', data.content);
                                    // 处理思考内容
                                    if (!thinkingElement) {
                                        if (!assistantMessageElement) {
                                            assistantMessageElement = this.addMessage('assistant', '', true);
                                        }
                                        thinkingElement = this.addThinkingSection(assistantMessageElement);
                                    }
                                    this.updateThinkingContent(thinkingElement, data.content);
                                    isThinking = true;
                                    break;

                                case 'content':
                                    console.log('收到内容:', data.content);
                                    // 处理回复内容
                                    if (isThinking) {
                                        isThinking = false;
                                        // 思考结束，开始正式回复
                                    }
                                    
                                    if (!assistantMessageElement) {
                                        assistantMessageElement = this.addMessage('assistant', '', true);
                                    }
                                    
                                    currentContent += data.content;
                                    this.updateMessageContent(assistantMessageElement, currentContent);
                                    break;

                                case 'done':
                                    console.log('收到完成信号');
                                    // 响应完成
                                    hideLoading();
                                    this.finalizeMessage(assistantMessageElement, currentContent);
                                    
                                    // 保存AI回复到历史记录
                                    if (currentContent) {
                                        console.log('保存AI回复到历史记录...');
                                        this.saveMessageToHistory('assistant', currentContent);
                                    }
                                    break;

                                case 'error':
                                    console.log('收到错误:', data.message);
                                    // 错误处理
                                    hideLoading();
                                    if (!assistantMessageElement) {
                                        assistantMessageElement = this.addMessage('assistant', '', true);
                                    }
                                    
                                    let errorMessage = data.message || '处理请求时出现错误';
                                    
                                    // 如果是内容提取失败，显示友好的错误信息
                                    if (errorMessage.includes('没有提取到任何内容')) {
                                        errorMessage = `❌ ${errorMessage}\n\n💡 **可能的原因：**\n• 页面内容需要JavaScript动态加载\n• 网站有反爬虫保护\n• 网络连接问题\n\n🔧 **建议尝试：**\n• 复制页面主要文字内容进行直接分析\n• 等待片刻后重试\n• 检查链接是否正确`;
                                    }
                                    
                                    this.updateMessageContent(assistantMessageElement, errorMessage);
                                    showNotification('内容提取失败', 'error');
                                    break;

                                case 'step':
                                    // 更新进度步骤
                                    this.updateProgressStep(data.step, data.message);
                                    break;

                                default:
                                    console.log('未知数据类型:', data.type);
                                    break;
                            }

                        } catch (e) {
                            console.error('解析流数据错误:', e, '原始数据:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            hideLoading();
            if (!assistantMessageElement) {
                this.addMessage('assistant', '抱歉，处理您的请求时出现了错误，请稍后重试。');
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * 处理JSON响应
     */
    handleJsonResponse(data) {
        console.log('处理JSON响应:', data);
        
        // 处理错误响应
        if (data.success === false) {
            console.log('检测到错误响应:', data.message);
            let errorMessage = data.message || '处理请求时出现错误';
            
            // 如果是内容提取失败，给出更友好的提示
            if (errorMessage.includes('没有提取到任何内容')) {
                errorMessage = `❌ ${errorMessage}\n\n💡 可能的原因：\n• 页面内容需要JavaScript动态加载\n• 网站有反爬虫保护\n• 网络连接问题\n\n🔧 建议尝试：\n• 复制页面主要文字内容进行直接分析\n• 等待片刻后重试\n• 检查链接是否正确`;
            }
            
            this.addMessage('assistant', errorMessage);
            showNotification('内容提取失败', 'error');
            return;
        }
        
        // 处理通用错误
        if (data.error) {
            console.log('检测到通用错误:', data.error);
            this.addMessage('assistant', '抱歉，处理您的请求时出现了错误：' + data.error);
            showNotification('处理失败', 'error');
            return;
        }

        // 处理成功响应
        if (data.response) {
            console.log('处理成功响应');
            this.addMessage('assistant', data.response);
            
            // 保存到历史记录
            this.saveMessageToHistory('assistant', data.response);
        }
    }

    /**
     * 处理内容解析完成
     */
    handleContentParsed(result) {
        console.log('处理内容解析结果:', result);
        
        // 存储解析结果供后续聊天使用
        this.currentContentContext = result.full_content;
        
        // 添加内容解析结果卡片
        this.addContentParseCard(result);
        
        // 滚动到底部
        this.scrollToBottom();
    }

    /**
     * 添加内容解析结果卡片
     */
    addContentParseCard(result) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'content-parse-card';
        cardContainer.innerHTML = `
            <div class="parse-card-header">
                <div class="parse-icon">
                    <i class="fas fa-file-text"></i>
                </div>
                <div class="parse-title">
                    <span>内容解析完成</span>
                    <div class="parse-type">${this.getContentTypeLabel(result.content_type)}</div>
                </div>
            </div>
            <div class="parse-card-content">
                <div class="parse-stats">
                    <div class="stat-item">
                        <span class="stat-label">字符数</span>
                        <span class="stat-value">${result.char_count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">词数</span>
                        <span class="stat-value">${result.word_count.toLocaleString()}</span>
                    </div>
                </div>
                <div class="content-preview">
                    <div class="preview-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <span>内容预览</span>
                        <button class="preview-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="preview-text">${result.content_preview}</div>
                    <div class="preview-full" style="display: none;">
                        <div class="full-content">${result.full_content}</div>
                    </div>
                </div>
            </div>
        `;
        
        // 将卡片添加到聊天容器中
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.appendChild(cardContainer);
        }
    }

    /**
     * 获取内容类型标签
     */
    getContentTypeLabel(contentType) {
        const labels = {
            'url': '网页链接',
            'text': '文本内容',
            'file': '文件上传',
            'image': '图片OCR'
        };
        return labels[contentType] || '未知类型';
    }

    /**
     * 添加消息到界面
     */
    addMessage(role, content, isStreaming = false) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return null;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble" data-message-content>
                    ${this.formatMessageContent(content)}
                </div>
                <div class="message-time">${timestamp}</div>
                ${role === 'assistant' ? `
                    <div class="message-actions">
                        <button class="btn-icon copy-btn" title="复制">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        // 绑定复制按钮
        const copyBtn = messageElement.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyMessageContent(messageElement);
            });
        }

        messagesContainer.appendChild(messageElement);
        
        if (!isStreaming) {
            this.scrollToBottom();
        }

        return messageElement;
    }

    /**
     * 添加思考区域
     */
    addThinkingSection(messageElement) {
        const messageBubble = messageElement.querySelector('.message-bubble');
        if (!messageBubble) return null;

        const thinkingId = `thinking-chat-${Date.now()}`;
        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'thinking-content collapsed'; // 默认折叠
        thinkingElement.id = thinkingId;
        thinkingElement.innerHTML = `
            <div class="thinking-header" onclick="toggleThinkingChat('${thinkingId}')">
                AI思考过程
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="thinking-body">
                <div class="thinking-text"></div>
            </div>
        `;

        messageBubble.appendChild(thinkingElement);
        return thinkingElement;
    }

    /**
     * 更新思考内容
     */
    updateThinkingContent(thinkingElement, content) {
        const textElement = thinkingElement.querySelector('.thinking-text');
        if (textElement) {
            textElement.textContent = content;
        }
    }

    /**
     * 更新消息内容
     */
    updateMessageContent(messageElement, content) {
        const contentElement = messageElement.querySelector('[data-message-content]');
        if (contentElement) {
            contentElement.innerHTML = this.formatMessageContent(content);
            
            // 实时高亮代码块
            if (typeof hljs !== 'undefined') {
                contentElement.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }
            
            this.scrollToBottom();
        }
    }

    /**
     * 完成消息
     */
    finalizeMessage(messageElement, content) {
        const contentElement = messageElement.querySelector('[data-message-content]');
        if (contentElement) {
            contentElement.innerHTML = this.formatMessageContent(content);
            
            // 高亮代码块
            if (typeof hljs !== 'undefined') {
                contentElement.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }
        }
    }

    /**
     * 格式化消息内容 - 支持Markdown和think标签处理
     */
    formatMessageContent(content) {
        if (!content) return '';

        // 预处理：增强分析内容的markdown
        let processedContent = this.enhanceMarkdownForAnalysis(content);

        // 如果有markdown解析器，先进行markdown解析
        if (typeof marked !== 'undefined') {
            try {
                processedContent = marked.parse(processedContent);
                
                // 后处理：为渲染后的HTML添加样式类
                processedContent = this.postProcessAnalysisHTML(processedContent);
                
            } catch (error) {
                console.error('Markdown解析错误:', error);
                processedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
            }
        } else {
            // 后备方案：基本的文本格式化
            processedContent = this.basicTextFormat(processedContent);
        }

        // 最后处理think标签，直接在最终HTML中替换
        processedContent = this.processThinkTagsInHtml(processedContent);

        return processedContent;
    }

    /**
     * 后处理分析HTML，添加样式类
     */
    postProcessAnalysisHTML(html) {
        // 为分析标题添加样式
        html = html.replace(
            /<h1[^>]*><span class="analysis-title-marker">([^<]+)<\/span><\/h1>/gi,
            '<h1 class="analysis-main-title">$1</h1>'
        );

        // 为分析段落添加样式
        html = html.replace(
            /<h2[^>]*><span class="analysis-section-marker">([^<]+)<\/span><\/h2>/gi,
            '<div class="analysis-section"><h2>$1</h2>'
        );

        // 为真伪鉴定结果添加整体容器
        if (html.includes('真伪') || html.includes('鉴定') || html.includes('事实核查')) {
            html = `<div class="fact-check-container">${html}</div>`;
        }

        // 为全面总结添加容器
        if (html.includes('全面') && html.includes('总结')) {
            html = `<div class="comprehensive-container">${html}</div>`;
        }

        // 为专家分析添加容器
        if (html.includes('专家') || html.includes('大师')) {
            html = `<div class="expert-container">${html}</div>`;
        }

        return html;
    }

    /**
     * 在HTML中处理think标签，将其转换为折叠组件
     */
    processThinkTagsInHtml(htmlContent) {
        // 匹配HTML中的<think>标签内容，考虑可能被<p>标签包装的情况
        const thinkRegex = /<p[^>]*>.*?<think>([\s\S]*?)<\/think>.*?<\/p>|<think>([\s\S]*?)<\/think>/gi;
        
        return htmlContent.replace(thinkRegex, (match, thinkContent1, thinkContent2) => {
            const thinkContent = thinkContent1 || thinkContent2;
            
            // 生成唯一ID
            const thinkId = 'think-' + Math.random().toString(36).substr(2, 9);
            
            // 清理思考内容，移除HTML标签，保持纯文本格式
            const cleanContent = this.stripHtmlTags(thinkContent.trim());
            
            // 返回折叠组件的HTML结构（默认折叠状态）
            return `<div class="think-container">
                <div class="think-header" onclick="toggleThinkContent('${thinkId}')">
                    <div class="think-title">
                        <i class="fas fa-brain think-icon"></i>
                        <span>AI思考过程</span>
                    </div>
                    <button class="think-toggle" id="toggle-${thinkId}">
                        <i class="fas fa-chevron-down"></i>
                        <span>展开</span>
                    </button>
                </div>
                <div class="think-content collapsed" id="${thinkId}" style="display: none;">
                    <pre>${this.escapeHtml(cleanContent)}</pre>
                </div>
            </div>`;
        });
    }

    /**
     * 移除HTML标签，保留纯文本内容
     */
    stripHtmlTags(html) {
        // 创建临时元素来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 获取纯文本内容，保持换行
        let textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // 处理多余的空行，但保留段落间的换行
        textContent = textContent
            .replace(/\n\s*\n\s*\n/g, '\n\n') // 将多个空行合并为双换行
            .trim();
        
        return textContent;
    }


    /**
     * 基本文本格式化
     */
    basicTextFormat(text) {
        return this.escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示进度指示器
     */
    showProgressIndicator() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            this.resetProgress();
        }
    }

    /**
     * 隐藏进度指示器
     */
    hideProgressIndicator() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    /**
     * 重置进度
     */
    resetProgress() {
        // 重置所有步骤
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) {
                step.classList.add('active');
            }
        });

        // 重置进度条
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
    }

    /**
     * 更新进度步骤
     */
    updateProgressStep(step, message) {
        const stepElement = document.querySelector(`[data-step="${step}"]`);
        const prevStepElement = document.querySelector(`[data-step="${step - 1}"]`);
        
        if (prevStepElement) {
            prevStepElement.classList.remove('active');
            prevStepElement.classList.add('completed');
        }
        
        if (stepElement) {
            stepElement.classList.add('active');
        }

        // 更新进度条
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const progress = (step / 4) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // 如果有消息，显示在进度下方
        if (message) {
            showNotification(message, 'info', 2000);
        }
    }

    /**
     * 复制消息内容
     */
    copyMessageContent(messageElement) {
        const contentElement = messageElement.querySelector('[data-message-content]');
        if (!contentElement) return;

        // 获取纯文本内容
        const textContent = contentElement.innerText || contentElement.textContent;
        
        navigator.clipboard.writeText(textContent).then(() => {
            showNotification('内容已复制到剪贴板', 'success', 2000);
            
            // 视觉反馈
            const copyBtn = messageElement.querySelector('.copy-btn i');
            if (copyBtn) {
                const originalClass = copyBtn.className;
                copyBtn.className = 'fas fa-check';
                setTimeout(() => {
                    copyBtn.className = originalClass;
                }, 1000);
            }
        }).catch(err => {
            console.error('复制失败:', err);
            showNotification('复制失败', 'error');
        });
    }

    /**
     * 保存消息到历史记录
     */
    saveMessageToHistory(role, content) {
        this.messageHistory.push({
            role: role,
            content: content,
            timestamp: Date.now()
        });

        // 限制历史记录长度
        if (this.messageHistory.length > 50) {
            this.messageHistory = this.messageHistory.slice(-50);
        }

        // 保存到服务器（如果有会话ID）
        if (this.currentSessionId && historyManager) {
            historyManager.saveMessage({
                role: role,
                content: content,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 显示聊天界面
     */
    showChatScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const chatScreen = document.getElementById('chatScreen');
        
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        
        if (chatScreen) {
            chatScreen.style.display = 'block';
            chatScreen.classList.add('fade-in');
        }

        // 更新选择器状态
        this.updateChatSelectors();

        // 清空输入
        this.clearUploadInputs();
    }

    /**
     * 清空上传输入
     */
    clearUploadInputs() {
        const textInput = document.getElementById('textInput');
        const urlInput = document.getElementById('urlInput');
        
        if (textInput) textInput.value = '';
        if (urlInput) urlInput.value = '';
        
        if (window.uploadManager && typeof window.uploadManager.clearUploads === 'function') {
            window.uploadManager.clearUploads();
        }
    }

    /**
     * 清空聊天
     */
    clearChat() {
        if (!confirm('确定要清空当前对话吗？')) return;

        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }

        this.messageHistory = [];
        this.createNewSession();
        
        showNotification('对话已清空', 'success');
    }

    /**
     * 切换简洁模式
     */
    toggleCompactMode() {
        document.body.classList.toggle('compact-mode');
        
        const isCompact = document.body.classList.contains('compact-mode');
        localStorage.setItem('compactMode', isCompact.toString());
        
        const icon = document.querySelector('#compactModeToggle i');
        if (icon) {
            icon.className = `fas ${isCompact ? 'fa-expand' : 'fa-compress'}`;
        }
        
        showNotification(`已${isCompact ? '开启' : '关闭'}简洁模式`, 'info');
    }

    /**
     * 创建新会话
     */
    createNewSession() {
        this.currentSessionId = 'session_' + Date.now();
        this.messageHistory = [];
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    /**
     * 调整文本框高度
     */
    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
    }

    /**
     * 更新输入占位符
     */
    updateInputPlaceholder() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const placeholders = {
            'intelligent-reading': '继续对话，提出您的问题...',
            'comprehensive-analysis': '请描述您需要分析的内容...',
            'expert-analysis': '请输入要让大师分析的内容...',
            'fact-checking': '请输入需要验证的内容...'
        };

        searchInput.placeholder = placeholders[this.currentFunction] || '请输入您的消息...';
    }

    /**
     * 更新聊天界面的选择器显示
     */
    updateChatSelectors() {
        // 新的菜单系统不需要显示/隐藏选择器容器
        // 只需要通知功能菜单当前功能状态
        if (window.chatFunctionMenu) {
            window.chatFunctionMenu.setCurrentFunction(this.currentFunction);
        }
        
        // 保持隐藏选择器的数据同步
        const chatModelSelector = document.getElementById('chatModelSelector');
        const chatExpertSelector = document.getElementById('chatExpertSelector');

        if (chatModelSelector) {
            // 确保模型选择器数据可用
            const chatModelSelect = document.getElementById('chatModelSelect');
            if (chatModelSelect && !chatModelSelect.value) {
                chatModelSelect.value = 'GLM-4-Flash';
            }
        }

        if (chatExpertSelector) {
            // 专家选择器数据处理
            const chatExpertSelect = document.getElementById('chatExpertSelect');
            if (chatExpertSelect && this.currentFunction !== 'expert-analysis') {
                chatExpertSelect.value = '';
            }
        }
    }

    /**
     * 获取当前会话ID
     */
    getCurrentSessionId() {
        return this.currentSessionId;
    }

    /**
     * 获取消息历史
     */
    getMessageHistory() {
        return this.messageHistory;
    }

    /**
     * 设置当前功能
     */
    setCurrentFunction(functionName) {
        this.currentFunction = functionName;
        this.updateInputPlaceholder();
        this.updateChatSelectors();
    }

    /**
     * 开始分析（从upload.js调用）
     * @param {string} endpoint - API端点
     * @param {FormData} formData - 表单数据
     * @param {string} feature - 功能类型
     */
    async startAnalysis(endpoint, formData, feature) {
        try {
            this.currentFunction = feature;
            this.isProcessing = true;
            
            console.log('=== ChatManager startAnalysis ===');
            console.log('Endpoint:', endpoint);
            console.log('Feature:', feature);
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value);
            }
            
            // 在开始分析前，先创建一个新会话
            if (window.historyManager) {
                console.log('创建新的聊天会话...');
                try {
                    await this.createAnalysisSession(feature);
                } catch (error) {
                    console.error('创建分析会话失败:', error);
                    // 即使创建会话失败，也继续分析过程
                }
            }
            
            // 显示处理状态
            showLoading('正在分析...');
            
            // 发送请求
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Content-Type:', response.headers.get('content-type'));

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                
                // 检查是否是流式响应
                if (contentType?.includes('text/plain') || contentType?.includes('text/stream')) {
                    console.log('处理流式响应');
                    await this.handleStreamResponse(response);
                } else if (contentType?.includes('application/json')) {
                    console.log('处理JSON响应');
                    const data = await response.json();
                    this.addMessage('assistant', data.response || '分析完成');
                } else {
                    console.log('处理文本响应');
                    const text = await response.text();
                    this.addMessage('assistant', text || '分析完成');
                }
            } else {
                console.error('响应错误:', response.status);
                try {
                    const errorData = await response.json();
                    this.addMessage('assistant', `分析失败: ${errorData.message || '未知错误'}`);
                } catch (e) {
                    const errorText = await response.text();
                    this.addMessage('assistant', `分析失败: ${errorText || '未知错误'}`);
                }
                showNotification('分析失败', 'error');
            }
        } catch (error) {
            console.error('分析错误:', error);
            this.addMessage('assistant', '分析过程中发生错误，请稍后重试。');
            showNotification('分析失败', 'error');
        } finally {
            this.isProcessing = false;
            hideLoading();
        }
    }

    /**
     * 为分析创建新会话
     */
    async createAnalysisSession(feature) {
        const featureNames = {
            'intelligent-reading': '智能伴读',
            'comprehensive-analysis': '全面分析',
            'expert-analysis': '大师分析',
            'fact-checking': '真伪鉴定'
        };
        
        const title = featureNames[feature] || '新对话';
        
        try {
            const response = await fetch('/api/chat-history/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: title,
                    feature: feature
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentSessionId = data.chat_id;
                
                // 同步设置历史管理器的会话ID
                if (window.historyManager) {
                    window.historyManager.currentSessionId = data.chat_id;
                }
                
                console.log('分析会话创建成功:', data.chat_id);
            } else {
                console.error('创建分析会话失败');
            }
        } catch (error) {
            console.error('创建分析会话错误:', error);
        }
    }

    /**
     * 添加爬虫结果折叠框
     */
    addCrawlerResultsCollapse(results) {
        console.log('添加爬虫结果折叠框:', results);
        
        // 创建折叠框容器
        const collapseContainer = document.createElement('div');
        collapseContainer.className = 'crawler-results-collapse';
        collapseContainer.innerHTML = `
            <div class="collapse-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="collapse-title">
                    <i class="fas fa-spider"></i>
                    <span>网页抓取结果详情</span>
                    <span class="collapse-count">(${results.length} 个链接)</span>
                </div>
                <i class="fas fa-chevron-down collapse-icon"></i>
            </div>
            <div class="collapse-content">
                ${results.map((result, index) => `
                    <div class="crawler-result-item">
                        <div class="result-header">
                            <div class="result-status ${result.success ? 'success' : 'error'}">
                                <i class="fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                <span>${result.success ? '成功' : '失败'}</span>
                            </div>
                            <div class="result-url">
                                <a href="${result.url}" target="_blank" rel="noopener">${result.url}</a>
                            </div>
                        </div>
                        <div class="result-details">
                            ${result.success ? `
                                <div class="result-title">
                                    <strong>标题:</strong> ${result.title || '无标题'}
                                </div>
                                <div class="result-content">
                                    <strong>内容长度:</strong> ${result.content ? result.content.length : 0} 字符
                                    ${result.content ? `
                                        <div class="content-preview">
                                            <strong>内容预览:</strong>
                                            <div class="content-text">${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}</div>
                                        </div>
                                    ` : ''}
                                </div>
                                ${result.images && result.images.length > 0 ? `
                                    <div class="result-images">
                                        <strong>图片:</strong> ${result.images.length} 张
                                    </div>
                                ` : ''}
                            ` : `
                                <div class="result-error">
                                    <strong>错误:</strong> ${result.error || '未知错误'}
                                </div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // 将折叠框添加到聊天容器中
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.appendChild(collapseContainer);
            this.scrollToBottom();
        }
    }

}

// 全局聊天管理器实例
window.chatManager = null;

// 初始化聊天管理器
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});

/**
 * 全局函数：切换思考内容的显示/隐藏
 */
window.toggleThinkContent = function(thinkId) {
    const thinkContent = document.getElementById(thinkId);
    const toggleBtn = document.getElementById('toggle-' + thinkId);
    
    if (!thinkContent || !toggleBtn) return;
    
    const isCollapsed = thinkContent.classList.contains('collapsed');
    
    if (isCollapsed) {
        // 展开
        thinkContent.style.display = 'block';
        thinkContent.classList.remove('collapsed');
        thinkContent.classList.add('expanded');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i><span>折叠</span>';
    } else {
        // 折叠
        thinkContent.classList.remove('expanded');
        thinkContent.classList.add('collapsed');
        setTimeout(() => {
            thinkContent.style.display = 'none';
        }, 300); // 等待CSS过渡动画完成
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i><span>展开</span>';
    }
};

// 切换聊天中AI思考过程折叠状态的全局函数
function toggleThinkingChat(thinkingId) {
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
