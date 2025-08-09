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
        // 新增：获取聊天容器元素
        this.chatMessagesContainer = document.getElementById('chatMessages');
        // 新增：用户滚动状态开关
        this.isUserScrolling = false;
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

            // ========== 新增：展开/收起输入框按钮的逻辑 ==========
            const expandToggleBtn = document.getElementById('expandToggleBtn');
            if (expandToggleBtn && searchInput) {
                // 监听输入框的输入事件，来决定是否显示展开按钮
                searchInput.addEventListener('input', () => {
                    // 当输入框的滚动高度（内容高度）大于其可见高度时，才显示展开按钮
                    if (searchInput.scrollHeight > searchInput.clientHeight && !searchInput.classList.contains('expanded')) {
                        expandToggleBtn.style.display = 'flex';
                    } else if (searchInput.scrollHeight <= searchInput.clientHeight) {
                        // 如果内容变少，按钮重新隐藏
                        expandToggleBtn.style.display = 'none';
                    }
                });

                // 为展开/收起按钮添加点击事件
                expandToggleBtn.addEventListener('click', () => {
                    // 切换 .expanded 类
                    const isExpanded = searchInput.classList.toggle('expanded');
                    const icon = expandToggleBtn.querySelector('i');
                    
                    if (isExpanded) {
                        // 如果刚刚展开了
                        icon.className = 'fas fa-compress-alt'; // 切换为收起图标
                        expandToggleBtn.title = '收起输入框';
                        expandToggleBtn.style.display = 'flex'; // 确保展开后按钮总是可见
                    } else {
                        // 如果刚刚收起了
                        icon.className = 'fas fa-expand-alt'; // 切换回展开图标
                        expandToggleBtn.title = '展开输入框';
                        // 收起时，让高度自动适应当前内容
                        this.adjustTextareaHeight(searchInput);
                    }
                });
            }
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

        if (this.chatMessagesContainer) {
            this.chatMessagesContainer.addEventListener('scroll', () => {
                // 判断滚动条是否非常接近底部（留出10px的容差）
                const isAtBottom = this.chatMessagesContainer.scrollHeight - this.chatMessagesContainer.scrollTop - this.chatMessagesContainer.clientHeight < 10;
                
                // 如果用户滚动到了底部，就关闭“用户手动滚动”的开关
                // 否则，只要不在底部，就认为是用户在手动滚动，打开开关
                this.isUserScrolling = !isAtBottom;
            });
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
            let selectedModel = null;
            
            // 优先从聊天界面的隐藏选择器获取（这里存储了从首页同步的模型）
            const chatModelSelect = document.getElementById('chatModelSelect');
            if (chatModelSelect && chatModelSelect.value) {
                selectedModel = chatModelSelect.value;
                console.log('从聊天界面选择器获取模型:', selectedModel);
            }
            
            // 如果没有，从聊天功能菜单获取
            if (!selectedModel && window.chatFunctionMenu) {
                selectedModel = window.chatFunctionMenu.getCurrentModel();
                console.log('从聊天功能菜单获取模型:', selectedModel);
            }
            
            // 如果还没有，从全局selector manager获取
            if (!selectedModel && window.selectorManager) {
                selectedModel = window.selectorManager.getCurrentModel();
                console.log('从全局选择器管理器获取模型:', selectedModel);
            }
            
            // 如果还是没有，从首页按钮文本获取
            if (!selectedModel) {
                const welcomeModelButtonText = document.getElementById('welcomeModelButtonText');
                if (welcomeModelButtonText) {
                    selectedModel = welcomeModelButtonText.textContent.trim();
                    console.log('从首页按钮文本获取模型:', selectedModel);
                }
            }
            
            // 最后使用默认模型
            if (!selectedModel) {
                selectedModel = 'GLM-4-Flash';
                console.log('使用默认模型:', selectedModel);
            }
            
            data.model = selectedModel;
            console.log('最终使用的模型:', selectedModel);
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
            { value: 'Hoshino', name: '星野', icon: '⚔️', description: '强大的战斗人员' }
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
     * 判断是否是基于进度的功能
     * @param {string} feature - 功能类型
     */
    isProgressBasedFeature(feature) {
        const progressFeatures = ['comprehensive-analysis', 'fact-checking'];
        return progressFeatures.includes(feature);
    }

    /**
     * 处理基于进度的流式响应
     * @param {Response} response - 响应对象
     * @param {string} feature - 功能类型
     */
    async handleProgressStreamResponse(response, feature) {
        console.log('=== 开始处理进度流式响应 ===');
        
        // 启动进度管理器
        const analysisType = feature === 'comprehensive-analysis' ? 'comprehensive' : 'fact-checking';
        if (window.progressManager) {
            window.progressManager.startAnalysis(analysisType);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('进度流读取完成');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                console.log('收到进度数据块:', chunk);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6).trim();
                            if (jsonStr === '[DONE]' || jsonStr === '') continue;

                            console.log('解析进度JSON:', jsonStr);
                            const data = JSON.parse(jsonStr);
                            console.log('解析后的进度数据:', data);

                            // 将数据传递给进度管理器
                            if (window.progressManager) {
                                window.progressManager.handleStreamData(data);
                            }

                        } catch (e) {
                            console.error('解析进度流数据错误:', e, '原始数据:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('进度流处理错误:', error);
            hideLoading();
            showNotification('分析过程中出现错误', 'error');
        } finally {
            hideLoading();
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

                                case 'persona':
                                    console.log('收到专家角色信息:', data);
                                    // 保存当前专家角色信息，用于头像显示
                                    this.currentExpertInfo = {
                                        name: data.name,
                                        description: data.description
                                    };
                                    break;

                                case 'expert_name':
                                    console.log('收到专家名称:', data.name);
                                    // 保存专家名称信息，用于继续聊天时的头像显示
                                    this.currentExpertInfo = {
                                        name: data.name
                                    };
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
     * 获取专家角色头像
     */
    getExpertAvatar(expertId) {
        const avatarMap = {
            'luxun': 'headshots_鲁迅.jpg',
            'hushi': 'headshots_胡适.jpg',
            'keli': 'headshots_可莉.jpg',
            'hoshino': 'headshot_星野.png',
            'shakespeare': 'headshots_莎士比亚.jpg',
            'einstein': 'headshots_爱因斯坦.jpg'
        };
        return avatarMap[expertId] || null;
    }

    /**
     * 获取当前选择的专家角色ID
     */
    getCurrentExpertId() {
        if (this.currentFunction !== 'expert-analysis') {
            return null;
        }
        
        let selectedExpert = null;
        
        // 如果有保存的专家信息，根据名字反推ID
        if (this.currentExpertInfo && this.currentExpertInfo.name) {
            const nameToIdMap = {
                '鲁迅': 'luxun',
                '胡适': 'hushi',
                '可莉': 'keli',
                '星野': 'hoshino',
                '莎士比亚': 'shakespeare',
                '爱因斯坦': 'einstein'
            };
            selectedExpert = nameToIdMap[this.currentExpertInfo.name];
        }
        
        // 如果没有，尝试从功能菜单获取
        if (!selectedExpert && window.chatFunctionMenu) {
            selectedExpert = window.chatFunctionMenu.getCurrentExpert();
        }
        
        // 如果还没有，从选择器获取
        if (!selectedExpert) {
            const chatExpertSelect = document.getElementById('chatExpertSelect');
            selectedExpert = chatExpertSelect?.value;
        }
        
        return selectedExpert;
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

        // 获取头像内容
        let avatarContent = '';
        let avatarClass = 'message-avatar';
        if (role === 'user') {
            avatarContent = '<i class="fas fa-user"></i>';
        } else {
            // assistant角色
            const expertId = this.getCurrentExpertId();
            const avatarFile = this.getExpertAvatar(expertId);
            
            if (avatarFile) {
                avatarContent = `<img src="images/${avatarFile}" alt="${expertId}" class="expert-avatar" />`;
                avatarClass += ' has-expert-avatar';
            } else {
                avatarContent = '<i class="fas fa-robot"></i>';
            }
        }

        // 格式化内容并检查是否需要特殊容器
        const formattedContent = this.formatMessageContent(content);
        const needsAnalysisContainer = this.needsAnalysisContainer(content);
        
        // 根据内容类型选择合适的容器类
        const contentContainerClass = needsAnalysisContainer ? 'analysis-container' : 'message-bubble markdown-container';

        messageElement.innerHTML = `
            <div class="${avatarClass}">
                ${avatarContent}
            </div>
            <div class="message-content">
                <div class="${contentContainerClass}" data-message-content>
                    ${formattedContent}
                </div>
                <div class="message-time">${timestamp}</div>
                ${role === 'assistant' ? `
                    <div class="message-actions">
                        <button class="btn-icon copy-btn" title="复制">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn-icon read-btn" title="朗读">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        ${window.shareManager ? window.shareManager.createShareButtons() : ''}
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

        // 绑定朗读按钮
        const readBtn = messageElement.querySelector('.read-btn');
        if (readBtn) {
            readBtn.addEventListener('click', () => {
                this.readMessageContent(messageElement);
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
            // 检查是否需要更新容器类型
            const needsAnalysisContainer = this.needsAnalysisContainer(content);
            const currentClasses = contentElement.className;
            
            if (needsAnalysisContainer && !currentClasses.includes('analysis-container')) {
                // 需要分析容器但当前不是，切换到分析容器
                contentElement.className = 'analysis-container';
            } else if (!needsAnalysisContainer && currentClasses.includes('analysis-container')) {
                // 不需要分析容器但当前是，切换到普通容器
                contentElement.className = 'message-bubble markdown-container';
            }
            
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
            // 最终确定容器类型
            const needsAnalysisContainer = this.needsAnalysisContainer(content);
            contentElement.className = needsAnalysisContainer ? 'analysis-container' : 'message-bubble markdown-container';
            
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
     * 增强分析内容的markdown格式
     */
    enhanceMarkdownForAnalysis(content) {
        if (!content) return '';
        
        // 预处理：修复常见的格式问题
        let enhanced = content
            // 1. 处理数字列表项，确保每个列表项前有换行
            .replace(/(\d+\.\s*\*\*[^*]+\*\*)/g, '\n\n### $1')
            
            // 2. 处理破折号列表，确保格式正确
            .replace(/([：:])\s*<br>\s*-/g, '$1\n\n-')
            .replace(/(-\s*\*\*[^*]+\*\*[：:])/g, '\n\n**$1**')
            .replace(/(-\s*[^-\n]+?)(?=\s*-|\s*\d+\.|\s*$)/g, '\n- $1')
            
            // 3. 处理段落分隔，确保主要段落间有适当间距
            .replace(/([。！？])\s*([1-9]\d*\.)/g, '$1\n\n$2')
            .replace(/([。！？])\s*(\*\*[^*]+\*\*)/g, '$1\n\n$2')
            
            // 4. 处理强调文本的格式
            .replace(/(\*\*[^*]+\*\*)\s*([：:])/g, '$1$2')
            .replace(/([：:])\s*<br>/g, '$1\n\n')
            
            // 5. 处理数据印证等特殊段落
            .replace(/(\*\*数据印证\*\*[：:]?)/g, '\n\n## $1\n')
            
            // 6. 清理多余的HTML标签和空行
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\s+|\s+$/g, '')
            
            // 7. 确保列表项格式正确
            .replace(/\n\s*-\s*/g, '\n- ')
            .replace(/\n\s*\d+\.\s*/g, '\n\n$&');
            
        return enhanced;
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
     * 判断内容是否需要分析容器
     * @param {string} content - 原始内容
     * @returns {boolean} 是否需要分析容器
     */
    needsAnalysisContainer(content) {
        if (!content) return false;
        
        return content.includes('真伪') || content.includes('鉴定') || content.includes('事实核查') ||
               (content.includes('全面') && content.includes('总结')) ||
               content.includes('专家') || content.includes('大师') ||
               content.includes('分析') || content.includes('解读');
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

        // 修复破损的列表格式
        html = this.fixListFormatting(html);
        
        // 修复段落间距
        html = this.fixParagraphSpacing(html);

        // 注意：analysis-container 现在在 addMessage 方法中根据内容类型添加
        // 这里不再重复添加容器，避免双重嵌套

        return html;
    }

    /**
     * 修复列表格式
     */
    fixListFormatting(html) {
        // 1. 处理破折号列表
        html = html.replace(/<p>(-\s*[^<]+?)<\/p>/g, '<ul><li>$1</li></ul>');
        
        // 2. 合并连续的列表
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        
        // 3. 处理列表项中的强调文本
        html = html.replace(/<li>-\s*<strong>([^<]+)<\/strong>([^<]*)<\/li>/g, '<li><strong>$1</strong>$2</li>');
        
        // 4. 清理列表项中多余的破折号
        html = html.replace(/<li>-\s*/g, '<li>');
        
        // 5. 处理嵌套内容
        html = html.replace(/<li>([^<]+)<br>([^<]+)<\/li>/g, '<li>$1<br>$2</li>');
        
        return html;
    }

    /**
     * 修复段落间距
     */
    fixParagraphSpacing(html) {
        // 1. 处理数字标题（如 "1.**技术整合的核心理念**"）
        html = html.replace(/<p>(\d+\.\s*<strong>[^<]+<\/strong>)<br>/g, '<h3>$1</h3><div class="analysis-section">');
        html = html.replace(/<p>(\d+\.\s*<strong>[^<]+<\/strong>)<\/p>/g, '<h3>$1</h3><div class="analysis-section">');
        
        // 2. 处理段落结束标记
        html = html.replace(/(<h3>[^<]+<\/h3><div class="analysis-section">.*?)(<h3>|$)/gs, '$1</div>$2');
        
        // 3. 确保段落间有适当间距
        html = html.replace(/(<\/p>)\s*(<p>)/g, '$1\n$2');
        
        // 4. 处理强调文本后的内容
        html = html.replace(/<strong>([^<]+)<\/strong>\s*<br>/g, '<strong>$1</strong><br>');
        
        // 5. 清理多余的<br>标签
        html = html.replace(/<br>\s*<br>/g, '<br>');
        
        // 6. 处理数据印证等特殊段落
        html = html.replace(/<p><strong>数据印证<\/strong>[：:]?<br>/g, '<h4><strong>数据印证</strong></h4><div class="data-evidence">');
        html = html.replace(/(<div class="data-evidence">.*?)(<h[1-6]>|<\/div>|$)/gs, '$1</div>$2');
        
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
        
        // 检查是否支持现代剪贴板API
        if (navigator.clipboard && navigator.clipboard.writeText) {
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
                // 降级到传统方法
                this.fallbackCopyToClipboard(textContent, messageElement);
            });
        } else {
            // 使用传统的复制方法
            this.fallbackCopyToClipboard(textContent, messageElement);
        }
    }

    /**
     * 传统的复制到剪贴板方法（降级方案）
     */
    fallbackCopyToClipboard(text, messageElement) {
        try {
            // 创建临时文本区域
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            // 选择并复制
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
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
            } else {
                throw new Error('复制命令执行失败');
            }
        } catch (err) {
            console.error('传统复制方法也失败:', err);
            // 最后的降级方案：提示用户手动复制
            this.showManualCopyDialog(text);
        }
    }

    /**
     * 显示手动复制对话框
     */
    showManualCopyDialog(text) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>复制内容</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>请手动选择并复制以下内容：</p>
                    <textarea readonly style="width: 100%; height: 200px; margin-top: 10px; padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-family: inherit;">${text}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove();">确定</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 自动选择文本
        const textarea = modal.querySelector('textarea');
        if (textarea) {
            setTimeout(() => {
                textarea.focus();
                textarea.select();
            }, 100);
        }
    }

    /**
     * 朗读消息内容
     */
    async readMessageContent(messageElement) {
        const contentElement = messageElement.querySelector('[data-message-content]');
        if (!contentElement) return;

        // 获取纯文本内容，过滤掉思考过程
        let textContent = this.extractReadableContent(contentElement);
        
        if (!textContent || textContent.trim().length === 0) {
            showNotification('没有可朗读的内容', 'warning');
            return;
        }

        const readBtn = messageElement.querySelector('.read-btn');
        const readIcon = readBtn?.querySelector('i');
        if (!readBtn || !readIcon) return;

        // 保存原始图标类名
        const originalClass = readIcon.className;

        try {
            // 获取音色配置
            const voiceConfig = this.getVoiceConfigForCurrentFunction();
            
            // 更新按钮状态为加载中
            readIcon.className = 'fas fa-spinner fa-spin';
            readBtn.classList.add('loading');
            readBtn.disabled = true;
            
            // 首先尝试后端TTS服务
            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        text: textContent,
                        voice_type: voiceConfig.type,
                        voice_id: voiceConfig.id
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.audio_url) {
                    // 后端TTS成功，使用音频播放
                    await this.playAudioFromUrl(data.audio_url, readBtn, readIcon, originalClass, data.voice_name || voiceConfig.name);
                    return;
                } else {
                    // 后端TTS失败，使用浏览器语音合成作为降级方案
                    console.log('后端TTS不可用，使用浏览器语音合成');
                    await this.useBrowserSpeechSynthesis(textContent, readBtn, readIcon, originalClass);
                    return;
                }
            } catch (error) {
                console.log('后端TTS请求失败，使用浏览器语音合成:', error);
                // 后端请求失败，使用浏览器语音合成作为降级方案
                await this.useBrowserSpeechSynthesis(textContent, readBtn, readIcon, originalClass);
                return;
            }
            
        } catch (error) {
            console.error('朗读失败:', error);
            readIcon.className = originalClass;
            readBtn.classList.remove('playing', 'loading');
            readBtn.disabled = false;
            showNotification('朗读失败: ' + error.message, 'error');
        }
    }

    /**
     * 使用浏览器语音合成API朗读
     */
    async useBrowserSpeechSynthesis(textContent, readBtn, readIcon, originalClass) {
        // 检查浏览器是否支持语音合成
        if (!('speechSynthesis' in window)) {
            readIcon.className = originalClass;
            readBtn.classList.remove('playing', 'loading');
            readBtn.disabled = false;
            showNotification('浏览器不支持语音合成功能', 'error');
            return;
        }

        try {
            // 停止任何正在进行的语音合成
            speechSynthesis.cancel();

            // 创建语音合成实例
            const utterance = new SpeechSynthesisUtterance(textContent);
            
            // 设置语音参数
            utterance.lang = 'zh-CN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // 尝试使用中文语音
            const voices = speechSynthesis.getVoices();
            const chineseVoice = voices.find(voice => 
                voice.lang.includes('zh') || voice.lang.includes('Chinese')
            );
            if (chineseVoice) {
                utterance.voice = chineseVoice;
            }

            // 更新按钮为播放状态
            readIcon.className = 'fas fa-pause';
            readBtn.classList.remove('loading');
            readBtn.classList.add('playing');
            readBtn.disabled = false;
            showNotification('开始朗读（浏览器语音）...', 'info', 2000);

            // 绑定事件
            utterance.onend = () => {
                readIcon.className = originalClass;
                readBtn.classList.remove('playing', 'loading');
                readBtn.disabled = false;
                showNotification('朗读完成', 'success', 2000);
            };

            utterance.onerror = (event) => {
                console.error('语音合成错误:', event);
                readIcon.className = originalClass;
                readBtn.classList.remove('playing', 'loading');
                readBtn.disabled = false;
                showNotification('语音合成失败', 'error');
            };

            // 如果用户点击暂停按钮
            const pauseHandler = () => {
                speechSynthesis.cancel();
                readIcon.className = originalClass;
                readBtn.classList.remove('playing', 'loading');
                readBtn.disabled = false;
                showNotification('朗读已停止', 'info', 2000);
            };

            readBtn.addEventListener('click', pauseHandler, { once: true });

            // 开始语音合成
            speechSynthesis.speak(utterance);

        } catch (error) {
            console.error('浏览器语音合成失败:', error);
            readIcon.className = originalClass;
            readBtn.classList.remove('playing', 'loading');
            readBtn.disabled = false;
            showNotification('语音合成失败: ' + error.message, 'error');
        }
    }

    /**
     * 播放来自URL的音频
     */
    async playAudioFromUrl(audioUrl, readBtn, readIcon, originalClass, voiceName) {
        try {
            // 创建音频元素并播放
            const audio = new Audio(audioUrl);
            
            // 更新按钮为播放状态
            readIcon.className = 'fas fa-pause';
            readBtn.classList.remove('loading');
            readBtn.classList.add('playing');
            readBtn.disabled = false;
            showNotification(`开始朗读... (${voiceName})`, 'info', 2000);
            
            // 播放音频
            await audio.play();
            
            // 监听播放结束
            audio.addEventListener('ended', () => {
                readIcon.className = originalClass;
                readBtn.classList.remove('playing', 'loading');
                readBtn.disabled = false;
                showNotification('朗读完成', 'success', 2000);
            });
            
            // 监听播放错误
            audio.addEventListener('error', (e) => {
                console.error('音频播放错误:', e);
                readIcon.className = originalClass;
                readBtn.classList.remove('playing', 'loading');
                readBtn.disabled = false;
                showNotification('音频播放失败', 'error');
            });
            
            // 如果用户点击暂停
            const pauseHandler = () => {
                audio.pause();
                readIcon.className = originalClass;
                readBtn.classList.remove('playing', 'loading');
                readBtn.disabled = false;
                showNotification('朗读已停止', 'info', 2000);
            };
            
            readBtn.addEventListener('click', pauseHandler, { once: true });
            
        } catch (error) {
            console.error('音频播放失败:', error);
            throw error;
        }
    }

    /**
     * 提取可朗读的内容，过滤掉思考过程
     */
    extractReadableContent(contentElement) {
        // 克隆元素避免影响原始内容
        const clonedElement = contentElement.cloneNode(true);
        
        // 移除思考过程相关的元素
        const thinkingElements = clonedElement.querySelectorAll('.thinking-content, .think-container, [class*="think"]');
        thinkingElements.forEach(el => el.remove());
        
        // 移除HTML标签，获取纯文本
        let textContent = clonedElement.innerText || clonedElement.textContent || '';
        
        // 清理文本
        textContent = textContent
            .replace(/\n{3,}/g, '\n\n') // 将3个以上的换行符替换为2个
            .replace(/\s{2,}/g, ' ') // 将多个连续空格替换为单个空格
            .trim();
        
        return textContent;
    }

    /**
     * 根据当前功能获取合适的音色配置
     */
    getVoiceConfigForCurrentFunction() {
        if (this.currentFunction === 'intelligent-reading') {
            // 智能伴读使用讯飞-小媛
            return {
                type: 'xunfei',
                id: 9,
                name: '讯飞-小媛（女声）'
            };
        } else if (this.currentFunction === 'expert-analysis') {
            // 大师分析根据角色选择音色
            const expertId = this.getCurrentExpertId();
            return this.getVoiceConfigForExpert(expertId);
        }
        
        // 默认音色：讯飞-小媛
        return {
            type: 'xunfei',
            id: 9,
            name: '讯飞-小媛（女声）'
        };
    }

    /**
     * 根据专家角色获取对应音色配置
     */
    getVoiceConfigForExpert(expertId) {
        const voiceMapping = {
            'luxun': {
                type: 'baidu',
                id: 6748, // 度书严-沉稳男声
                name: '度书严-沉稳男声'
            },
            'hushi': {
                type: 'baidu',
                id: 6205, // 度悠然-旁白男声
                name: '度悠然-旁白男声'
            },
            'keli': {
                type: 'xunfei',
                id: 17, // 讯飞-芳芳（儿童-女）
                name: '讯飞-芳芳（儿童-女）'
            },
            'hoshino': {
                type: 'baidu',
                id: 6562, // 度雨楠-元气少女
                name: '度雨楠-元气少女'
            },
            'shakespeare': {
                type: 'baidu',
                id: 6747, // 度书古-情感男声
                name: '度书古-情感男声'
            },
            'einstein': {
                type: 'baidu',
                id: 6746, // 度书道-沉稳男声
                name: '度书道-沉稳男声'
            },
            'socrates': {
                type: 'baidu',
                id: 4176, // 度有为-磁性男声
                name: '度有为-磁性男声'
            },
            'confucius': {
                type: 'baidu',
                id: 6205, // 度悠然-旁白男声
                name: '度悠然-旁白男声'
            }
        };
        
        return voiceMapping[expertId] || {
            type: 'xunfei',
            id: 9,
            name: '讯飞-小媛（女声）'
        };
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
        if (this.isUserScrolling) {
            // 如果用户正在向上滚动查看历史记录，则不强制滚动到底部
            return;
        }

        // 检查聊天消息容器是否存在
        if (this.chatMessagesContainer) {
            // 使用现代浏览器支持的平滑滚动API
            this.chatMessagesContainer.scrollTo({
                top: this.chatMessagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    /**
     * 调整文本框高度
     */
    adjustTextareaHeight(textarea) {
        // 如果输入框当前是展开状态，则不进行任何自动高度调整
        if (textarea.classList.contains('expanded')) {
            return;
        }
        textarea.style.height = 'auto';
        // 将自动增高的最大值改回一个较小的值，比如150px
        const newHeight = Math.min(textarea.scrollHeight, 150); 
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
                    
                    // 根据功能类型决定使用哪种显示方式
                    if (this.isProgressBasedFeature(feature)) {
                        console.log('使用进度界面处理:', feature);
                        await this.handleProgressStreamResponse(response, feature);
                    } else {
                        console.log('使用聊天界面处理:', feature);
                        await this.handleStreamResponse(response);
                    }
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

    /**
     * 保存消息到历史记录
     */
    saveMessageToHistory(role, content) {
        if (!content || !role) return;
        
        const message = {
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        this.messageHistory.push(message);
        
        // 限制历史记录长度，避免内存过多占用
        if (this.messageHistory.length > 100) {
            this.messageHistory = this.messageHistory.slice(-50); // 保留最近50条
        }
    }

    /**
     * 清空聊天
     */
    clearChat() {
        // 清空消息历史
        this.messageHistory = [];
        
        // 清空界面消息
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // 创建新会话
        this.createNewSession();
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
