/**
 * 分享功能模块
 */

class ShareManager {
    constructor() {
        this.init();
    }

    init() {
        // 绑定事件监听器
        this.bindEvents();
    }

    bindEvents() {
        // 监听分享按钮点击事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.share-btn')) {
                e.preventDefault();
                this.handleShareClick(e.target.closest('.share-btn'));
            }
        });
    }

    /**
     * 处理分享按钮点击
     */
    async handleShareClick(button) {
        const action = button.dataset.action;
        
        try {
            // 显示加载状态
            this.setButtonLoading(button, true);
            
            // 获取当前对话数据
            const conversationData = this.getCurrentConversationData();
            
            if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
                this.showMessage('没有可分享的对话内容', 'warning');
                return;
            }

            switch (action) {
                case 'download':
                    await this.downloadImage(conversationData);
                    break;
                case 'copy':
                    await this.copyToClipboard(conversationData);
                    break;
                default:
                    console.warn('未知的分享操作:', action);
            }
        } catch (error) {
            console.error('分享失败:', error);
            this.showMessage('分享失败，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            this.setButtonLoading(button, false);
        }
    }

    /**
     * 获取当前对话数据
     */
    getCurrentConversationData() {
        // 检查是否在聊天界面
        const chatMessages = document.getElementById('chatMessages');
        const chatScreen = document.getElementById('chatScreen');
        
        if (chatMessages && chatScreen && chatScreen.style.display !== 'none') {
            // 聊天界面的数据获取
            const messages = [];
            const messageElements = chatMessages.querySelectorAll('.message');
            
            messageElements.forEach(element => {
                const isUser = element.classList.contains('user-message');
                const content = element.querySelector('.message-content')?.textContent?.trim() || '';
                
                if (content) {
                    messages.push({
                        role: isUser ? 'user' : 'assistant',
                        content: content
                    });
                }
            });

            // 获取当前功能名称
            const activeFunction = document.querySelector('.function-btn.active');
            const functionName = activeFunction ? activeFunction.textContent.trim() : '智能分析';

            return {
                messages: messages,
                function_name: functionName,
                timestamp: new Date().toISOString()
            };
        }

        // 检查是否在进度界面
        const progressScreen = document.getElementById('progressScreen');
        const resultContent = document.getElementById('resultContent');
        
        if (progressScreen && progressScreen.style.display !== 'none' && resultContent) {
            // 进度界面的数据获取
            const messages = [];
            
            // 获取分析结果内容
            const resultText = resultContent.textContent?.trim() || '';
            if (resultText) {
                messages.push({
                    role: 'assistant',
                    content: resultText
                });
            }

            // 获取当前功能名称
            const activeFunction = document.querySelector('.function-btn.active');
            const functionName = activeFunction ? activeFunction.textContent.trim() : '智能分析';

            return {
                messages: messages,
                function_name: functionName,
                timestamp: new Date().toISOString()
            };
        }

        return null;
    }



    /**
     * 下载分享图片
     */
    async downloadImage(conversationData) {
        try {
            const response = await fetch('/api/share/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(conversationData)
            });

            if (response.ok) {
                // 创建下载链接
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `智链AI分享_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showMessage('图片下载成功', 'success');
            } else {
                throw new Error('下载失败');
            }
        } catch (error) {
            console.error('下载分享图片失败:', error);
            throw error;
        }
    }

    /**
     * 复制对话内容到剪贴板
     */
    async copyToClipboard(conversationData) {
        try {
            let text = `智链AI - ${conversationData.function_name}\n`;
            text += `生成时间: ${new Date().toLocaleString()}\n\n`;
            
            conversationData.messages.forEach((message, index) => {
                const role = message.role === 'user' ? '👤 用户' : '🤖 AI助手';
                text += `${role}:\n${message.content}\n\n`;
            });
            
            text += '--- 由智链AI生成 ---';
            
            // 检查是否支持现代剪贴板API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                this.showMessage('对话内容已复制到剪贴板', 'success');
            } else {
                // 使用降级方案
                this.fallbackCopyToClipboard(conversationData);
            }
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            // 降级方案：使用传统方法
            this.fallbackCopyToClipboard(conversationData);
        }
    }

    /**
     * 降级复制方案
     */
    fallbackCopyToClipboard(conversationData) {
        try {
            let text = `智链AI - ${conversationData.function_name}\n`;
            text += `生成时间: ${new Date().toLocaleString()}\n\n`;
            
            conversationData.messages.forEach((message, index) => {
                const role = message.role === 'user' ? '👤 用户' : '🤖 AI助手';
                text += `${role}:\n${message.content}\n\n`;
            });
            
            text += '--- 由智链AI生成 ---';
            
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showMessage('对话内容已复制到剪贴板', 'success');
        } catch (error) {
            console.error('降级复制方案也失败:', error);
            this.showMessage('复制失败，请手动选择内容复制', 'error');
        }
    }



    /**
     * 设置按钮加载状态
     */
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
        } else {
            button.disabled = false;
            const icon = button.querySelector('i');
            if (icon) {
                // 恢复原始图标
                const action = button.dataset.action;
                const iconMap = {
                    'download': 'fas fa-download',
                    'copy': 'fas fa-copy'
                };
                icon.className = iconMap[action] || 'fas fa-share-alt';
            }
        }
    }

    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast ${type}`;
        messageEl.innerHTML = `
            <i class="fas ${this.getMessageIcon(type)}"></i>
            <span>${message}</span>
        `;

        // 添加到页面
        document.body.appendChild(messageEl);

        // 显示动画
        setTimeout(() => messageEl.classList.add('show'), 100);

        // 自动隐藏
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 获取消息图标
     */
    getMessageIcon(type) {
        const iconMap = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return iconMap[type] || 'fa-info-circle';
    }

    /**
     * 创建分享按钮组
     */
    createShareButtons() {
        return `
            <div class="share-buttons">
                <button class="share-btn" data-action="download" title="下载图片">
                    <i class="fas fa-download"></i>
                </button>
                <button class="share-btn" data-action="copy" title="复制内容">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;
    }
}

// 创建全局实例
const shareManager = new ShareManager();

// 导出供其他模块使用
window.shareManager = shareManager;