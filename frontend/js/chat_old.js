// 聊天管理

class ChatManager {
    constructor() {
        this.currentSessionId = null;
        this.currentFeature = null;
        this.isStreaming = false;
        this.streamRequest = null;
        this.messageHistory = [];
        this.bindEvents();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 返回主页按钮
        const backToHomeBtn = document.getElementById('backToHomeBtn');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                this.returnToHome();
            });
        }

        // 进度界面返回按钮
        const progressBackBtn = document.getElementById('progressBackBtn');
        if (progressBackBtn) {
            progressBackBtn.addEventListener('click', () => {
                this.returnToHome();
            });
        }

        // 发送按钮
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // 聊天输入框
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            // 自动调整高度
            chatInput.addEventListener('input', () => {
                this.adjustInputHeight();
            });

            // 回车发送消息
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    /**
     * 开始分析
     * @param {string} endpoint - API端点
     * @param {FormData} formData - 表单数据
     * @param {string} feature - 功能类型
     */
    startAnalysis(endpoint, formData, feature) {
        this.currentFeature = feature;
        this.messageHistory = [];
        
        // 设置聊天标题
        this.setChatTitle(feature);
        
        // 清空消息容器
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }

        // 添加系统消息
        this.addSystemMessage('正在分析您的内容，请稍候...');

        // 开始流式请求
        this.startStream(endpoint, formData);
    }

    /**
     * 设置聊天标题
     * @param {string} feature - 功能类型
     */
    setChatTitle(feature) {
        const chatTitle = document.getElementById('chatTitle');
        const titles = {
            'intelligent-reading': '智能伴读',
            'expert-analysis': '大师分析'
        };
        
        if (chatTitle) {
            chatTitle.textContent = titles[feature] || '智能分析';
        }
    }

    /**
     * 开始流式请求
     * @param {string} endpoint - API端点
     * @param {FormData} formData - 表单数据
     */
    startStream(endpoint, formData) {
        this.isStreaming = true;
        this.updateChatStatus('正在分析...');

        this.streamRequest = utils.createStreamRequest(`${utils.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            headers: {}, // 让浏览器自动设置Content-Type
            onMessage: (data) => {
                this.handleStreamMessage(data);
            },
            onError: (error) => {
                console.error('Stream error:', error);
                this.addErrorMessage('分析过程中出现错误，请重试');
                this.isStreaming = false;
                this.updateChatStatus('准备就绪');
            },
            onComplete: () => {
                this.isStreaming = false;
                this.updateChatStatus('分析完成');
                this.enableChatInput();
            }
        });
    }

    /**
     * 处理流消息
     * @param {Object} data - 消息数据
     */
    handleStreamMessage(data) {
        switch (data.type) {
            case 'session_id':
                this.currentSessionId = data.session_id;
                break;
            
            case 'status':
                this.updateChatStatus(data.message);
                break;
            
            case 'content':
                this.appendAIContent(data.content);
                break;
            
            case 'thinking':
                this.showThinkingContent(data.content);
                break;
            
            case 'persona':
                this.showPersonaInfo(data);
                break;
            
            case 'done':
                this.isStreaming = false;
                this.updateChatStatus('准备就绪');
                this.enableChatInput();
                this.finalizeAIMessage();
                break;
            
            case 'error':
                this.addErrorMessage(data.message);
                this.isStreaming = false;
                this.updateChatStatus('准备就绪');
                break;
        }
    }

    /**
     * 更新聊天状态
     * @param {string} status - 状态文本
     */
    updateChatStatus(status) {
        const chatStatus = document.getElementById('chatStatus');
        if (chatStatus) {
            chatStatus.textContent = status;
        }
    }

    /**
     * 添加系统消息
     * @param {string} content - 消息内容
     */
    addSystemMessage(content) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message system animate-fade-in-up';
        messageElement.innerHTML = `
            <div class="message-content glass">
                <div class="message-text">${content}</div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    /**
     * 添加错误消息
     * @param {string} content - 错误内容
     */
    addErrorMessage(content) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message error animate-fade-in-up';
        messageElement.innerHTML = `
            <div class="message-content glass">
                <div class="message-text">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${content}
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    /**
     * 添加用户消息
     * @param {string} content - 消息内容
     */
    addUserMessage(content) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message user animate-fade-in-up';
        messageElement.innerHTML = `
            <div class="message-content glass">
                <div class="message-text">${this.formatMessage(content)}</div>
                <div class="message-actions">
                    <button class="copy-btn" title="复制消息">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;

        // 绑定复制按钮
        const copyBtn = messageElement.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            this.copyMessage(content);
        });

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        // 保存到历史记录
        this.messageHistory.push({
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 创建AI消息元素
     */
    createAIMessage() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return null;

        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant animate-fade-in-up';
        messageElement.innerHTML = `
            <div class="message-content glass">
                <div class="message-text"></div>
                <div class="thinking-section" style="display: none;">
                    <div class="thinking-toggle">
                        <i class="fas fa-brain"></i>
                        <span>思考过程</span>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="thinking-content glass-light" style="display: none;"></div>
                </div>
                <div class="message-actions">
                    <button class="copy-btn" title="复制消息">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;

        // 绑定思考内容切换
        const thinkingToggle = messageElement.querySelector('.thinking-toggle');
        const thinkingContent = messageElement.querySelector('.thinking-content');
        const toggleIcon = messageElement.querySelector('.toggle-icon');

        thinkingToggle.addEventListener('click', () => {
            const isVisible = thinkingContent.style.display !== 'none';
            thinkingContent.style.display = isVisible ? 'none' : 'block';
            toggleIcon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        return messageElement;
    }

    /**
     * 开始AI响应
     */
    startAIResponse() {
        this.currentAIMessage = this.createAIMessage();
    }

    /**
     * 追加AI内容
     * @param {string} content - 内容
     */
    appendAIContent(content) {
        if (!this.currentAIMessage) {
            this.startAIResponse();
        }

        const messageText = this.currentAIMessage.querySelector('.message-text');
        if (messageText) {
            const currentContent = messageText.getAttribute('data-content') || '';
            const newContent = currentContent + content;
            messageText.setAttribute('data-content', newContent);
            messageText.innerHTML = marked.parse(newContent);
        }

        this.scrollToBottom();
    }

    /**
     * 显示思考内容
     * @param {string} content - 思考内容
     */
    showThinkingContent(content) {
        if (!this.currentAIMessage) return;

        const thinkingSection = this.currentAIMessage.querySelector('.thinking-section');
        const thinkingContent = this.currentAIMessage.querySelector('.thinking-content');

        if (thinkingSection && thinkingContent) {
            thinkingSection.style.display = 'block';
            
            const currentThinking = thinkingContent.getAttribute('data-thinking') || '';
            const newThinking = currentThinking + content;
            thinkingContent.setAttribute('data-thinking', newThinking);
            thinkingContent.innerHTML = marked.parse(newThinking);
        }
    }

    /**
     * 显示专家信息
     * @param {Object} data - 专家数据
     */
    showPersonaInfo(data) {
        this.addSystemMessage(`正在请 ${data.name} 为您分析...`);
    }

    /**
     * 完成AI消息
     */
    finalizeAIMessage() {
        if (!this.currentAIMessage) return;

        const messageText = this.currentAIMessage.querySelector('.message-text');
        const content = messageText ? messageText.getAttribute('data-content') || '' : '';

        // 绑定复制按钮
        const copyBtn = this.currentAIMessage.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyMessage(content);
            });
        }

        // 保存到历史记录
        this.messageHistory.push({
            role: 'assistant',
            content: content,
            timestamp: new Date().toISOString()
        });

        // 保存聊天记录
        this.saveChatHistory();

        this.currentAIMessage = null;
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        if (!chatInput) return;

        const message = chatInput.value.trim();
        if (!message || this.isStreaming) return;

        // 添加用户消息
        this.addUserMessage(message);
        
        // 清空输入框
        chatInput.value = '';
        this.adjustInputHeight();

        // 禁用输入
        this.disableChatInput();

        try {
            // 确定API端点
            const endpoint = this.currentFeature === 'expert-analysis' ? 
                '/expert-analysis/chat' : '/intelligent-reading/chat';

            // 发送聊天请求
            this.isStreaming = true;
            this.updateChatStatus('正在思考...');

            const requestData = {
                session_id: this.currentSessionId,
                message: message,
                chat_history: this.messageHistory.slice(-10) // 只发送最近10条消息
            };

            // 如果是专家分析，添加专家信息
            if (this.currentFeature === 'expert-analysis' && window.uploadManager) {
                requestData.persona = window.uploadManager.currentExpert;
            }

            this.streamRequest = utils.createStreamRequest(`${utils.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json'
                },
                onMessage: (data) => {
                    this.handleStreamMessage(data);
                },
                onError: (error) => {
                    console.error('Chat stream error:', error);
                    this.addErrorMessage('发送消息失败，请重试');
                    this.isStreaming = false;
                    this.updateChatStatus('准备就绪');
                    this.enableChatInput();
                },
                onComplete: () => {
                    this.isStreaming = false;
                    this.updateChatStatus('准备就绪');
                    this.enableChatInput();
                }
            });

        } catch (error) {
            console.error('Send message error:', error);
            this.addErrorMessage('发送消息失败，请重试');
            this.enableChatInput();
        }
    }

    /**
     * 启用聊天输入
     */
    enableChatInput() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');

        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = '输入您的问题...';
        }

        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }

    /**
     * 禁用聊天输入
     */
    disableChatInput() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');

        if (chatInput) {
            chatInput.disabled = true;
            chatInput.placeholder = 'AI正在思考中...';
        }

        if (sendBtn) {
            sendBtn.disabled = true;
        }
    }

    /**
     * 调整输入框高度
     */
    adjustInputHeight() {
        const chatInput = document.getElementById('chatInput');
        if (!chatInput) return;

        chatInput.style.height = 'auto';
        const newHeight = Math.min(chatInput.scrollHeight, 120); // 最大120px
        chatInput.style.height = newHeight + 'px';
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    /**
     * 格式化消息
     * @param {string} content - 消息内容
     * @returns {string} - 格式化后的内容
     */
    formatMessage(content) {
        // 简单的HTML转义
        const div = document.createElement('div');
        div.textContent = content;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    /**
     * 复制消息
     * @param {string} content - 消息内容
     */
    async copyMessage(content) {
        const success = await utils.copyToClipboard(content);
        if (success) {
            utils.showNotification('消息已复制到剪贴板', 'success', 2000);
        } else {
            utils.showNotification('复制失败', 'error', 2000);
        }
    }

    /**
     * 保存聊天记录
     */
    async saveChatHistory() {
        if (!window.authManager.isLoggedIn() || !this.currentSessionId) {
            return;
        }

        try {
            // 只保存最新的消息
            const latestMessage = this.messageHistory[this.messageHistory.length - 1];
            if (latestMessage) {
                await utils.post(`${utils.API_BASE_URL}/chat-history/save`, {
                    chat_id: this.currentSessionId,
                    message: latestMessage
                });
            }
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    }

    /**
     * 返回主页
     */
    returnToHome() {
        // 停止流式请求
        if (this.streamRequest) {
            this.streamRequest.cancel();
            this.streamRequest = null;
        }

        // 重置状态
        this.isStreaming = false;
        this.currentSessionId = null;
        this.currentFeature = null;
        this.messageHistory = [];
        this.currentAIMessage = null;

        // 切换界面
        if (window.uploadManager) {
            window.uploadManager.switchToInterface('welcome');
            window.uploadManager.reset();
        }

        // 启用聊天输入
        this.enableChatInput();
    }

    /**
     * 加载历史聊天
     * @param {string} chatId - 聊天ID
     */
    async loadHistoryChat(chatId) {
        try {
            const response = await utils.get(`${utils.API_BASE_URL}/chat-history/get/${chatId}`);
            if (response.success) {
                const chat = response.chat;
                
                // 设置聊天信息
                this.currentSessionId = chat.chat_id;
                this.currentFeature = chat.feature;
                this.messageHistory = chat.messages || [];
                
                // 切换到聊天界面
                if (window.uploadManager) {
                    window.uploadManager.switchToInterface('chat');
                }
                
                // 设置标题
                this.setChatTitle(this.currentFeature);
                
                // 显示历史消息
                this.displayHistoryMessages();
                
                utils.showNotification('聊天记录加载成功', 'success', 2000);
            } else {
                utils.showNotification('加载聊天记录失败', 'error');
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            utils.showNotification('加载聊天记录失败', 'error');
        }
    }

    /**
     * 显示历史消息
     */
    displayHistoryMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        this.messageHistory.forEach(message => {
            if (message.role === 'user') {
                this.addUserMessage(message.content);
            } else if (message.role === 'assistant') {
                this.startAIResponse();
                this.appendAIContent(message.content);
                this.finalizeAIMessage();
            }
        });

        this.enableChatInput();
    }
}

// 创建全局聊天管理器实例
window.chatManager = new ChatManager();
