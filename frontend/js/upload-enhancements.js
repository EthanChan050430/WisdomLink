/**
 * 智链AI智能阅读助手 - 上传功能增强脚本
 * 提供拖拽上传、文件预览、进度显示等功能
 */

class UploadEnhancements {
    constructor() {
        this.fileTypes = {
            document: ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv'],
            image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        };
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.uploadedFiles = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
        this.initializeUploadAreas();
    }

    bindEvents() {
        // 文件上传区域点击事件
        const fileUploadArea = document.getElementById('fileUploadArea');
        const imageUploadArea = document.getElementById('imageUploadArea');
        const fileInput = document.getElementById('fileInput');
        const imageInput = document.getElementById('imageInput');

        if (fileUploadArea && fileInput) {
            fileUploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'document'));
        }

        if (imageUploadArea && imageInput) {
            imageUploadArea.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => this.handleFileSelect(e, 'image'));
        }

        // 上传标签切换事件
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchUploadTab(e.target.closest('.upload-tab')));
        });

        // 开始分析按钮事件
        const startAnalysisBtn = document.getElementById('startAnalysisBtn');
        if (startAnalysisBtn) {
            startAnalysisBtn.addEventListener('click', () => this.startAnalysis());
        }
    }

    setupDragAndDrop() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const imageUploadArea = document.getElementById('imageUploadArea');

        [fileUploadArea, imageUploadArea].forEach(area => {
            if (!area) return;

            const type = area.id === 'fileUploadArea' ? 'document' : 'image';

            area.addEventListener('dragover', (e) => this.handleDragOver(e, area));
            area.addEventListener('dragleave', (e) => this.handleDragLeave(e, area));
            area.addEventListener('drop', (e) => this.handleDrop(e, area, type));
        });
    }

    initializeUploadAreas() {
        // 为上传区域添加初始状态
        const fileUploadArea = document.getElementById('fileUploadArea');
        const imageUploadArea = document.getElementById('imageUploadArea');

        if (fileUploadArea) {
            this.addUploadAreaEnhancements(fileUploadArea, 'document');
        }

        if (imageUploadArea) {
            this.addUploadAreaEnhancements(imageUploadArea, 'image');
        }
    }

    addUploadAreaEnhancements(area, type) {
        // 添加文件类型提示
        const hint = area.querySelector('.upload-hint');
        if (hint) {
            const supportedFormats = this.fileTypes[type].join(', ').toUpperCase();
            hint.textContent = `支持 ${supportedFormats.replace(/\./g, '')} 格式，最大 10MB`;
        }

        // 添加动态效果
        area.addEventListener('mouseenter', () => {
            area.style.transform = 'translateY(-2px) scale(1.01)';
        });

        area.addEventListener('mouseleave', () => {
            if (!area.classList.contains('drag-over')) {
                area.style.transform = '';
            }
        });
    }

    switchUploadTab(activeTab) {
        if (!activeTab) return;

        // 移除所有激活状态
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // 隐藏所有面板
        document.querySelectorAll('.upload-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // 激活当前标签和面板
        activeTab.classList.add('active');
        const targetType = activeTab.dataset.type;
        const targetPanel = document.querySelector(`.upload-panel[data-type="${targetType}"]`);
        
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // 显示通知
        const tabName = activeTab.querySelector('span').textContent;
        this.showNotification(`已切换到${tabName}模式`, 'info');

        // 添加切换动画
        activeTab.style.transform = 'scale(1.05)';
        setTimeout(() => {
            activeTab.style.transform = '';
        }, 200);
    }

    handleDragOver(e, area) {
        e.preventDefault();
        e.stopPropagation();
        area.classList.add('drag-over');
        
        // 添加拖拽提示
        const uploadText = area.querySelector('.upload-text');
        if (uploadText && !uploadText.dataset.originalText) {
            uploadText.dataset.originalText = uploadText.textContent;
            uploadText.innerHTML = '<strong>松开鼠标释放文件</strong>';
        }
    }

    handleDragLeave(e, area) {
        e.preventDefault();
        e.stopPropagation();
        
        // 检查是否真的离开了区域
        const rect = area.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            area.classList.remove('drag-over');
            area.style.transform = '';
            
            // 恢复原始文本
            const uploadText = area.querySelector('.upload-text');
            if (uploadText && uploadText.dataset.originalText) {
                uploadText.innerHTML = uploadText.dataset.originalText;
                delete uploadText.dataset.originalText;
            }
        }
    }

    handleDrop(e, area, type) {
        e.preventDefault();
        e.stopPropagation();
        
        area.classList.remove('drag-over');
        area.style.transform = '';
        
        // 恢复原始文本
        const uploadText = area.querySelector('.upload-text');
        if (uploadText && uploadText.dataset.originalText) {
            uploadText.innerHTML = uploadText.dataset.originalText;
            delete uploadText.dataset.originalText;
        }

        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files, type);
    }

    handleFileSelect(e, type) {
        const files = Array.from(e.target.files);
        this.processFiles(files, type);
    }

    processFiles(files, type) {
        const validFiles = [];
        const errors = [];

        files.forEach(file => {
            const validation = this.validateFile(file, type);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        });

        // 显示错误信息
        if (errors.length > 0) {
            this.showNotification(`文件验证失败:\n${errors.join('\n')}`, 'error');
        }

        // 处理有效文件
        if (validFiles.length > 0) {
            this.addFilesToList(validFiles, type);
            this.showNotification(`成功添加 ${validFiles.length} 个文件`, 'success');
        }
    }

    validateFile(file, type) {
        // 检查文件类型
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!this.fileTypes[type].includes(extension)) {
            return {
                valid: false,
                error: `不支持的文件格式 (${extension})`
            };
        }

        // 检查文件大小
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `文件过大 (${this.formatFileSize(file.size)} > 10MB)`
            };
        }

        return { valid: true };
    }

    addFilesToList(files, type) {
        const listContainer = type === 'document' ? 
            document.getElementById('fileList') : 
            document.getElementById('imagePreview');

        if (!listContainer) return;

        files.forEach(file => {
            const fileId = Date.now() + Math.random();
            this.uploadedFiles.push({ id: fileId, file, type });

            if (type === 'document') {
                this.createFileItem(file, fileId, listContainer);
            } else {
                this.createImagePreview(file, fileId, listContainer);
            }
        });
    }

    createFileItem(file, fileId, container) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = fileId;

        const icon = this.getFileIcon(file.name);
        const fileName = file.name.length > 30 ? 
            file.name.substring(0, 27) + '...' : file.name;

        fileItem.innerHTML = `
            <i class="file-icon ${icon}"></i>
            <span class="file-name" title="${file.name}">${fileName}</span>
            <span class="file-size">${this.formatFileSize(file.size)}</span>
            <i class="file-remove fas fa-times" onclick="uploadEnhancements.removeFile('${fileId}')"></i>
        `;

        container.appendChild(fileItem);

        // 添加入场动画
        setTimeout(() => {
            fileItem.style.opacity = '0';
            fileItem.style.transform = 'translateX(-20px)';
            fileItem.style.transition = 'all 0.3s ease';
            
            requestAnimationFrame(() => {
                fileItem.style.opacity = '1';
                fileItem.style.transform = 'translateX(0)';
            });
        }, 10);
    }

    createImagePreview(file, fileId, container) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-preview-item';
            imageItem.dataset.fileId = fileId;

            imageItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}" title="${file.name}">
                <button class="image-remove" onclick="uploadEnhancements.removeFile('${fileId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;

            container.appendChild(imageItem);

            // 添加入场动画
            setTimeout(() => {
                imageItem.style.opacity = '0';
                imageItem.style.transform = 'scale(0.8)';
                imageItem.style.transition = 'all 0.3s ease';
                
                requestAnimationFrame(() => {
                    imageItem.style.opacity = '1';
                    imageItem.style.transform = 'scale(1)';
                });
            }, 10);
        };
        reader.readAsDataURL(file);
    }

    removeFile(fileId) {
        // 从数组中移除文件
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);

        // 从DOM中移除元素
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.style.transition = 'all 0.3s ease';
            fileElement.style.opacity = '0';
            fileElement.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                fileElement.remove();
            }, 300);
        }

        this.showNotification('文件已移除', 'info');
    }

    getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'txt': 'fas fa-file-alt',
            'md': 'fas fa-file-code',
            'csv': 'fas fa-file-csv'
        };
        return iconMap[extension] || 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    startAnalysis() {
        const activeTab = document.querySelector('.upload-tab.active');
        if (!activeTab) return;

        const tabType = activeTab.dataset.type;
        let content = '';
        let hasContent = false;

        switch (tabType) {
            case 'text':
                const textInput = document.getElementById('textInput');
                content = textInput ? textInput.value.trim() : '';
                hasContent = content.length > 0;
                break;

            case 'url':
                const urlInput = document.getElementById('urlInput');
                content = urlInput ? urlInput.value.trim() : '';
                hasContent = content.length > 0;
                break;

            case 'file':
            case 'image':
                hasContent = this.uploadedFiles.filter(f => f.type === (tabType === 'file' ? 'document' : 'image')).length > 0;
                break;
        }

        if (!hasContent) {
            this.showNotification('请先添加要分析的内容', 'warning');
            this.highlightEmptyInput(tabType);
            return;
        }

        // 显示加载状态
        this.showAnalysisLoading();
        
        // 模拟分析过程
        setTimeout(() => {
            this.showNotification('分析完成！正在跳转到结果页面...', 'success');
            // 这里可以添加实际的分析逻辑
        }, 2000);
    }

    highlightEmptyInput(tabType) {
        let targetElement;
        
        switch (tabType) {
            case 'text':
                targetElement = document.getElementById('textInput');
                break;
            case 'url':
                targetElement = document.getElementById('urlInput');
                break;
            case 'file':
                targetElement = document.getElementById('fileUploadArea');
                break;
            case 'image':
                targetElement = document.getElementById('imageUploadArea');
                break;
        }

        if (targetElement) {
            targetElement.classList.add('upload-error');
            setTimeout(() => {
                targetElement.classList.remove('upload-error');
            }, 2000);
        }
    }

    showAnalysisLoading() {
        const startBtn = document.getElementById('startAnalysisBtn');
        if (!startBtn) return;

        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';
        startBtn.disabled = true;
        startBtn.classList.add('upload-loading');

        // 模拟加载完成
        setTimeout(() => {
            startBtn.innerHTML = originalText;
            startBtn.disabled = false;
            startBtn.classList.remove('upload-loading');
        }, 2000);
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `upload-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            white-space: pre-line;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        // 设置背景色
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)'
        };
        notification.style.background = colors[type] || colors.info;

        notification.textContent = message;
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 获取当前上传的文件信息
    getUploadedFiles() {
        return this.uploadedFiles;
    }

    // 清空所有上传的文件
    clearAllFiles() {
        this.uploadedFiles = [];
        
        const fileList = document.getElementById('fileList');
        const imagePreview = document.getElementById('imagePreview');
        
        if (fileList) fileList.innerHTML = '';
        if (imagePreview) imagePreview.innerHTML = '';
        
        this.showNotification('已清空所有文件', 'info');
    }

    // 获取当前输入的文本内容
    getCurrentContent() {
        const activeTab = document.querySelector('.upload-tab.active');
        if (!activeTab) return null;

        const tabType = activeTab.dataset.type;
        
        switch (tabType) {
            case 'text':
                const textInput = document.getElementById('textInput');
                return { type: 'text', content: textInput ? textInput.value.trim() : '' };
                
            case 'url':
                const urlInput = document.getElementById('urlInput');
                return { type: 'url', content: urlInput ? urlInput.value.trim() : '' };
                
            case 'file':
                return { 
                    type: 'file', 
                    files: this.uploadedFiles.filter(f => f.type === 'document') 
                };
                
            case 'image':
                return { 
                    type: 'image', 
                    files: this.uploadedFiles.filter(f => f.type === 'image') 
                };
                
            default:
                return null;
        }
    }
}

// 全局实例
let uploadEnhancements;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    uploadEnhancements = new UploadEnhancements();
});

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UploadEnhancements;
}