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
                sanitize: false
            });
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 发送按钮
        document.getElementById('sendButton')?.addEventListener('click', () => {
            this.handleSendMessage();
        });

        // 开始分析按钮
        document.getElementById('startAnalysisBtn')?.addEventListener('click', () => {
            this.handleStartAnalysis();
        });

        // 输入框回车发送
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
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

        // 清空对话
        document.getElementById('clearChatBtn')?.addEventListener('click', () => {
            this.clearChat();
        });

        // 简洁模式切换
        document.getElementById('compactModeToggle')?.addEventListener('click', () => {
            this.toggleCompactMode();
        });

        // 监听功能切换
        document.addEventListener('functionChanged', (e) => {
            this.currentFunction = e.detail.function;
            this.updateInputPlaceholder();
        });
    }

    /**
     * 处理开始分析
     */
    async handleStartAnalysis() {
        const content = this.getInputContent();
        if (!content || content.trim() === '') {
            showNotification('请输入内容或上传文件', 'warning');
            return;
        }

        // 切换到聊天界面
        this.showChatScreen();

        // 发送消息
        await this.sendMessage(content);
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
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            // 添加用户消息到界面
            if (!isInitial) {
                this.addMessage('user', content);
            } else {
                // 初始分析时显示用户输入
                this.addMessage('user', this.formatInitialMessage(content));
            }

            // 滚动到底部
            this.scrollToBottom();

            // 获取当前功能对应的API端点
            const endpoint = this.getFunctionEndpoint();
            
            // 显示进度指示器（如果需要）
            if (this.shouldShowProgress()) {
                this.showProgressIndicator();
            }

            // 准备请求数据
            const requestData = await this.prepareRequestData(content, isInitial);

            // 发送请求
            await this.sendRequest(endpoint, requestData);

        } catch (error) {
            console.error('发送消息失败:', error);
            this.addMessage('assistant', '抱歉，处理您的请求时出现了错误，请重试。');
            showNotification('发送失败，请重试', 'error');
        } finally {
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
            function: this.currentFunction,
            history: this.messageHistory
        };

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

            // 添加专家角色（如果是大师分析）
            if (this.currentFunction === 'expert-analysis') {
                const role = await this.selectExpertRole();
                if (role) {
                    data.role = role;
                } else {
                    throw new Error('请选择分析角色');
                }
            }
        }

        return data;
    }

    /**
     * 获取功能端点
     */
    getFunctionEndpoint() {
        const endpoints = {
            'intelligent-reading': '/api/intelligent-reading',
            'comprehensive-analysis': '/api/comprehensive-analysis',
            'expert-analysis': '/api/expert-analysis',
            'fact-checking': '/api/fact-checking'
        };
        
        return endpoints[this.currentFunction] || endpoints['intelligent-reading'];
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
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 检查是否是流式响应
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/stream')) {
            await this.handleStreamResponse(response);
        } else {
            const result = await response.json();
            this.handleJsonResponse(result);
        }
    }

    /**
     * 处理流式响应
     */
    async handleStreamResponse(response) {
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
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') continue;

                            const data = JSON.parse(jsonStr);

                            if (data.type === 'step') {
                                // 更新进度步骤
                                this.updateProgressStep(data.step, data.message);
                            } else if (data.type === 'thinking') {
                                // 处理思考内容
                                if (!thinkingElement) {
                                    if (!assistantMessageElement) {
                                        assistantMessageElement = this.addMessage('assistant', '', true);
                                    }
                                    thinkingElement = this.addThinkingSection(assistantMessageElement);
                                }
                                this.updateThinkingContent(thinkingElement, data.content);
                                isThinking = true;
                            } else if (data.type === 'content') {
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
                            } else if (data.type === 'complete') {
                                // 响应完成
                                this.finalizeMessage(assistantMessageElement, currentContent);
                                
                                // 保存到历史记录
                                this.saveMessageToHistory('user', data.userMessage || '');
                                this.saveMessageToHistory('assistant', currentContent);
                            } else if (data.type === 'error') {
                                // 错误处理
                                if (!assistantMessageElement) {
                                    assistantMessageElement = this.addMessage('assistant', '', true);
                                }
                                this.updateMessageContent(assistantMessageElement, '抱歉，处理您的请求时出现了错误：' + data.message);
                            }

                        } catch (e) {
                            console.error('解析流数据错误:', e);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * 处理JSON响应
     */
    handleJsonResponse(data) {
        if (data.error) {
            this.addMessage('assistant', '抱歉，处理您的请求时出现了错误：' + data.error);
            return;
        }

        if (data.response) {
            this.addMessage('assistant', data.response);
            
            // 保存到历史记录
            this.saveMessageToHistory('assistant', data.response);
        }
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

        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'thinking-content';
        thinkingElement.innerHTML = `
            <div class="thinking-header">
                <i class="fas fa-chevron-down"></i>
                <span>AI正在思考...</span>
            </div>
            <div class="thinking-body">
                <div class="thinking-text"></div>
            </div>
        `;

        // 绑定折叠功能
        const header = thinkingElement.querySelector('.thinking-header');
        header.addEventListener('click', () => {
            thinkingElement.classList.toggle('collapsed');
        });

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
     * 格式化消息内容 - 支持Markdown
     */
    formatMessageContent(content) {
        if (!content) return '';

        // 使用marked进行markdown解析
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(content);
            } catch (error) {
                console.error('Markdown解析错误:', error);
                return this.escapeHtml(content).replace(/\n/g, '<br>');
            }
        }

        // 后备方案：基本的文本格式化
        return this.basicTextFormat(content);
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

        // 清空输入区域
        this.clearUploadInputs();
    }

    /**
     * 清空上传输入
     */
    clearUploadInputs() {
        document.getElementById('textInput').value = '';
        document.getElementById('urlInput').value = '';
        
        if (uploadManager) {
            uploadManager.clearUploads();
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
    }
}

// 全局聊天管理器实例
let chatManager;

// 初始化聊天管理器
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
});
