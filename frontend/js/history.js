/**
 * 聊天历史管理模块
 * 负责聊天记录的展示、管理、导出等功能
 */

class HistoryManager {
    constructor() {
        this.currentSessionId = null;
        this.sessions = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadChatSessions();
    }

    bindEvents() {
        // 历史面板切换
        document.getElementById('historyToggle')?.addEventListener('click', () => {
            this.toggleHistoryPanel();
        });

        // 新建会话
        document.getElementById('newChatBtn')?.addEventListener('click', () => {
            this.createNewSession();
        });

        // 清空历史
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
            this.clearAllHistory();
        });

        // 搜索历史
        document.getElementById('historySearch')?.addEventListener('input', (e) => {
            this.searchHistory(e.target.value);
        });

        // 导出历史
        document.getElementById('exportHistoryBtn')?.addEventListener('click', () => {
            this.exportHistory();
        });
    }

    /**
     * 切换历史面板显示状态
     */
    toggleHistoryPanel() {
        const historyPanel = document.getElementById('historyPanel');
        const isVisible = historyPanel.classList.contains('show');
        
        if (isVisible) {
            historyPanel.classList.remove('show');
        } else {
            historyPanel.classList.add('show');
            this.loadChatSessions();
        }
    }

    /**
     * 加载聊天会话列表
     */
    async loadChatSessions() {
        try {
            showLoading('加载历史记录...');
            
            const response = await fetch('/api/chat-history/list', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.sessions = data.chats || [];
                    this.renderSessionList();
                } else {
                    // 处理未登录等情况
                    this.sessions = [];
                    this.renderSessionList();
                    if (data.message && data.message.includes('未登录')) {
                        console.log('未登录状态，显示空历史列表');
                    } else {
                        showNotification(data.message || '加载历史记录失败', 'warning');
                    }
                }
            } else {
                showNotification('加载历史记录失败', 'error');
                this.sessions = [];
                this.renderSessionList();
            }
        } catch (error) {
            console.error('加载历史记录错误:', error);
            this.sessions = [];
            this.renderSessionList();
            showNotification('加载历史记录失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * 渲染会话列表
     */
    renderSessionList() {
        const sessionList = document.getElementById('sessionList');
        if (!sessionList) return;

        if (this.sessions.length === 0) {
            // 检查是否为未登录状态
            const isLoggedIn = window.authManager && window.authManager.isLoggedIn();
            
            sessionList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>${isLoggedIn ? '暂无聊天记录' : '登录后可查看聊天历史'}</p>
                    ${!isLoggedIn ? '<p class="hint">当前为访客模式，对话不会保存</p>' : ''}
                </div>
            `;
            return;
        }

        sessionList.innerHTML = this.sessions.map(session => `
            <div class="session-item ${session.chat_id === this.currentSessionId ? 'active' : ''}" 
                 data-session-id="${session.chat_id}">
                <div class="session-info">
                    <div class="session-title">${this.truncateText(session.title || '新对话', 30)}</div>
                    <div class="session-time">${this.formatTime(session.created_at)}</div>
                    <div class="session-preview">${this.truncateText(session.preview || '', 50)}</div>
                </div>
                <div class="session-actions">
                    <button class="btn-icon" onclick="window.historyManager.loadSession('${session.chat_id}')" title="加载对话">
                        <i class="fas fa-comments"></i>
                    </button>
                    <button class="btn-icon" onclick="window.historyManager.renameSession('${session.chat_id}')" title="重命名">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="window.historyManager.exportSession('${session.chat_id}')" title="导出">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="window.historyManager.deleteSession('${session.chat_id}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 创建新会话
     * @param {boolean} clearChat - 是否清空当前聊天内容，默认为true
     */
    async createNewSession(clearChat = true) {
        try {
            const response = await fetch('/api/chat-history/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: '新对话'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentSessionId = data.chat_id;
                    
                    // 只有在明确要求时才清空当前聊天内容
                    if (clearChat) {
                        const chatMessages = document.getElementById('chatMessages');
                        if (chatMessages) {
                            chatMessages.innerHTML = '';
                        }
                    }

                    // 重新加载会话列表
                    await this.loadChatSessions();
                    
                    // 只有在清空聊天时才显示创建成功的通知
                    if (clearChat) {
                        const message = data.message || '新对话已创建';
                        showNotification(message, data.message && data.message.includes('未登录') ? 'info' : 'success');
                    }
                } else {
                    showNotification(data.message || '创建新对话失败', 'error');
                }
            } else {
                showNotification('创建新对话失败', 'error');
            }
        } catch (error) {
            console.error('创建新会话错误:', error);
            showNotification('创建新对话失败', 'error');
        }
    }

    /**
     * 加载指定会话
     */
    async loadSession(sessionId) {
        try {
            showLoading('加载对话...');
            
            const response = await fetch(`/api/chat-history/get/${sessionId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentSessionId = sessionId;
                
                // 渲染聊天消息
                this.renderChatMessages(data.messages || []);
                
                // 更新会话列表活跃状态
                this.renderSessionList();
                
                // 关闭历史面板
                document.getElementById('historyPanel')?.classList.remove('show');
                
                showNotification('对话已加载', 'success');
            } else {
                showNotification('加载对话失败', 'error');
            }
        } catch (error) {
            console.error('加载会话错误:', error);
            showNotification('加载对话失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * 渲染聊天消息
     */
    renderChatMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        chatMessages.innerHTML = messages.map(message => {
            const isUser = message.role === 'user';
            
            // 获取头像内容
            let avatarContent = '';
            let avatarClass = 'message-avatar';
            
            if (isUser) {
                avatarContent = '<i class="fas fa-user"></i>';
            } else {
                // 对于assistant消息
                if (message.expert) {
                    // 如果消息中有专家信息，使用对应头像
                    const nameToIdMap = {
                        '鲁迅': 'luxun',
                        '胡适': 'hushi', 
                        '可莉': 'keli',
                        '星野': 'hoshino',
                        '莎士比亚': 'shakespeare',
                        '爱因斯坦': 'einstein'
                    };
                    
                    const expertId = nameToIdMap[message.expert];
                    const avatarMap = {
                        'luxun': 'headshots_鲁迅.jpg',
                        'hushi': 'headshots_胡适.jpg',
                        'keli': 'headshots_可莉.jpg',
                        'hoshino': 'headshot_星野.png',
                        'shakespeare': 'headshots_莎士比亚.jpg',
                        'einstein': 'headshots_爱因斯坦.jpg'
                    };
                    
                    const avatarFile = avatarMap[expertId];
                    if (avatarFile) {
                        avatarContent = `<img src="images/${avatarFile}" alt="${expertId}" class="expert-avatar" />`;
                        avatarClass += ' has-expert-avatar';
                    } else {
                        avatarContent = '<i class="fas fa-robot"></i>';
                    }
                } else if (this.currentChat && this.currentChat.feature === 'expert-analysis') {
                    // 如果是大师分析功能但没有专家信息，使用默认大师头像
                    avatarContent = '<img src="images/headshots_鲁迅.jpg" alt="master" class="expert-avatar" />';
                    avatarClass += ' has-expert-avatar';
                } else {
                    avatarContent = '<i class="fas fa-robot"></i>';
                }
            }
            
            return `
                <div class="message ${isUser ? 'user' : 'assistant'}">
                    <div class="${avatarClass}">
                        ${avatarContent}
                    </div>
                    <div class="message-content">
                        <div class="message-text">${this.formatMessageContent(message.content)}</div>
                        <div class="message-time">${this.formatTime(message.timestamp)}</div>
                    </div>
                    ${!isUser ? `
                        <div class="message-actions">
                            <button class="btn-icon" onclick="copyToClipboard(this)" title="复制">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * 重命名会话
     */
    async renameSession(sessionId) {
        const session = this.sessions.find(s => s.chat_id === sessionId);
        if (!session) return;

        const newTitle = prompt('请输入新的对话名称:', session.title);
        if (!newTitle || newTitle === session.title) return;

        try {
            const response = await fetch('/api/chat-history/update-title', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    chat_id: sessionId,
                    title: newTitle
                })
            });

            if (response.ok) {
                await this.loadChatSessions();
                showNotification('对话已重命名', 'success');
            } else {
                showNotification('重命名失败', 'error');
            }
        } catch (error) {
            console.error('重命名会话错误:', error);
            showNotification('重命名失败', 'error');
        }
    }

    /**
     * 删除会话
     */
    async deleteSession(sessionId) {
        if (!confirm('确定要删除这个对话吗？此操作不可恢复。')) return;

        try {
            const response = await fetch(`/api/chat-history/delete/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                // 如果删除的是当前会话，清空聊天界面
                if (sessionId === this.currentSessionId) {
                    this.currentSessionId = null;
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                    }
                }

                await this.loadChatSessions();
                showNotification('对话已删除', 'success');
            } else {
                showNotification('删除失败', 'error');
            }
        } catch (error) {
            console.error('删除会话错误:', error);
            showNotification('删除失败', 'error');
        }
    }

    /**
     * 导出单个会话
     */
    async exportSession(sessionId) {
        try {
            showLoading('导出对话...');
            
            const response = await fetch(`/api/chat-history/export/${sessionId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_${sessionId}_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                showNotification('对话已导出', 'success');
            } else {
                showNotification('导出失败', 'error');
            }
        } catch (error) {
            console.error('导出会话错误:', error);
            showNotification('导出失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * 导出所有历史记录
     */
    async exportHistory() {
        try {
            showLoading('导出历史记录...');
            
            const response = await fetch('/api/chat/export', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_history_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                showNotification('历史记录已导出', 'success');
            } else {
                showNotification('导出失败', 'error');
            }
        } catch (error) {
            console.error('导出历史记录错误:', error);
            showNotification('导出失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * 清空所有历史记录
     */
    async clearAllHistory() {
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) return;

        try {
            showLoading('清空历史记录...');
            
            const response = await fetch('/api/chat/sessions', {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.sessions = [];
                this.currentSessionId = null;
                this.renderSessionList();
                
                // 清空当前聊天内容
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                }
                
                showNotification('历史记录已清空', 'success');
            } else {
                showNotification('清空失败', 'error');
            }
        } catch (error) {
            console.error('清空历史记录错误:', error);
            showNotification('清空失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * 搜索历史记录
     */
    searchHistory(keyword) {
        const sessionItems = document.querySelectorAll('.session-item');
        
        sessionItems.forEach(item => {
            const title = item.querySelector('.session-title')?.textContent || '';
            const preview = item.querySelector('.session-preview')?.textContent || '';
            
            if (keyword === '' || 
                title.toLowerCase().includes(keyword.toLowerCase()) ||
                preview.toLowerCase().includes(keyword.toLowerCase())) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * 保存消息到当前会话
     */
    async saveMessage(message) {
        if (!this.currentSessionId) {
            console.log('警告：没有当前会话ID，跳过保存消息');
            return;
        }

        try {
            const response = await fetch(`/api/chat-history/save-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    session_id: this.currentSessionId,
                    message: message
                })
            });

            if (!response.ok) {
                console.error('保存消息失败');
            }
        } catch (error) {
            console.error('保存消息错误:', error);
        }
    }

    /**
     * 格式化消息内容
     */
    formatMessageContent(content) {
        // 基本的markdown渲染
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * 截断文本
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // 小于1分钟
        if (diff < 60000) {
            return '刚刚';
        }
        
        // 小于1小时
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        }
        
        // 小于1天
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        }
        
        // 大于1天
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }
}

// 全局历史管理器实例
window.historyManager = null;

// 初始化历史管理器
document.addEventListener('DOMContentLoaded', () => {
    window.historyManager = new HistoryManager();
});
