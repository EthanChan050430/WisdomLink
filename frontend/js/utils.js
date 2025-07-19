// 工具函数库

/**
 * API请求基础URL
 */
const API_BASE_URL = '/api';

/**
 * 发送HTTP请求的通用函数
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
async function request(url, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);
        
        // 检查响应是否成功
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 尝试解析JSON，如果失败则返回文本
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

/**
 * GET请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
function get(url, options = {}) {
    return request(url, {
        method: 'GET',
        ...options,
    });
}

/**
 * POST请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
function post(url, data = null, options = {}) {
    return request(url, {
        method: 'POST',
        body: data ? JSON.stringify(data) : null,
        ...options,
    });
}

/**
 * POST表单数据
 * @param {string} url - 请求URL
 * @param {FormData} formData - 表单数据
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
function postForm(url, formData, options = {}) {
    const config = { ...options };
    // 移除Content-Type，让浏览器自动设置
    if (config.headers && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
    }
    
    return request(url, {
        method: 'POST',
        body: formData,
        ...config,
    });
}

/**
 * DELETE请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
function del(url, options = {}) {
    return request(url, {
        method: 'DELETE',
        ...options,
    });
}

/**
 * 显示通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 (success, error, warning, info)
 * @param {number} duration - 显示时长(毫秒)
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type} glass animate-fade-in-right`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // 添加关闭事件
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });

    container.appendChild(notification);

    // 自动移除
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }
}

/**
 * 移除通知
 * @param {HTMLElement} notification - 通知元素
 */
function removeNotification(notification) {
    notification.classList.add('removing');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

/**
 * 获取通知图标
 * @param {string} type - 通知类型
 * @returns {string} - 图标类名
 */
function getNotificationIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
    };
    return icons[type] || icons.info;
}

/**
 * 显示加载状态
 * @param {string} message - 加载消息
 */
function showLoading(message = '正在处理中...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    const loadingText = overlay.querySelector('#loadingText');
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    overlay.style.display = 'flex';
    overlay.classList.add('animate-fade-in');
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    overlay.classList.remove('animate-fade-in');
    overlay.style.display = 'none';
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化后的文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 * @param {string|Date} dateTime - 时间字符串或Date对象
 * @returns {string} - 格式化后的时间
 */
function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    const now = new Date();
    const diff = now - date;
    
    // 小于1分钟
    if (diff < 60000) {
        return '刚刚';
    }
    
    // 小于1小时
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    }
    
    // 小于1天
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    }
    
    // 小于7天
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
    }
    
    // 超过7天，显示具体日期
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制
 * @returns {Function} - 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} - 是否成功复制
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    } catch (error) {
        console.error('Failed to copy text:', error);
        return false;
    }
}

/**
 * 生成唯一ID
 * @returns {string} - 唯一ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * 检查是否为移动设备
 * @returns {boolean} - 是否为移动设备
 */
function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * 平滑滚动到元素
 * @param {HTMLElement|string} element - 元素或选择器
 * @param {Object} options - 滚动选项
 */
function scrollToElement(element, options = {}) {
    const target = typeof element === 'string' ? document.querySelector(element) : element;
    if (!target) return;
    
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
        ...options
    };
    
    target.scrollIntoView(defaultOptions);
}

/**
 * 验证URL是否有效
 * @param {string} url - URL字符串
 * @returns {boolean} - 是否有效
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * 提取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} - 扩展名
 */
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 检查文件类型
 * @param {string} filename - 文件名
 * @param {Array} allowedTypes - 允许的类型数组
 * @returns {boolean} - 是否允许
 */
function isFileTypeAllowed(filename, allowedTypes) {
    const extension = getFileExtension(filename).toLowerCase();
    return allowedTypes.includes(extension);
}

/**
 * 等待指定时间
 * @param {number} ms - 毫秒数
 * @returns {Promise} - Promise对象
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建EventSource连接处理流式响应
 * @param {string} url - 请求URL
 * @param {Object} options - 配置选项
 * @returns {Object} - 包含cancel方法的对象
 */
function createStreamRequest(url, options = {}) {
    const { onMessage, onError, onComplete } = options;
    
    let cancelled = false;
    
    fetch(url, {
        method: 'POST',
        ...options
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream() {
            return reader.read().then(({ done, value }) => {
                if (cancelled) return;
                
                if (done) {
                    if (onComplete) onComplete();
                    return;
                }
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (onMessage) onMessage(data);
                        } catch (e) {
                            // 忽略JSON解析错误
                        }
                    }
                }
                
                return readStream();
            });
        }
        
        return readStream();
    })
    .catch(error => {
        if (!cancelled && onError) {
            onError(error);
        }
    });
    
    return {
        cancel: () => {
            cancelled = true;
        }
    };
}

// 导出所有函数到全局作用域
window.utils = {
    request,
    get,
    post,
    postForm,
    del,
    showNotification,
    showLoading,
    formatFileSize,
    formatDateTime,
    debounce,
    throttle,
    copyToClipboard,
    generateId,
    isMobile,
    scrollToElement,
    isValidUrl,
    getFileExtension,
    isFileTypeAllowed,
    sleep,
    createStreamRequest,
    API_BASE_URL
};
