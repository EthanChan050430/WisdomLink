// 上传管理

class UploadManager {
    constructor() {
        this.currentContentType = 'text'; // 改为与HTML默认一致
        this.selectedFiles = [];
        this.selectedImages = [];
        this.currentFeature = 'intelligent-reading';
        this.currentExpert = 'luxun';
        this.initializeUpload();
        this.bindEvents();
    }

    /**
     * 初始化上传组件
     */
    initializeUpload() {
        this.updateFeatureSelector();
        this.updateExpertSelector();
        // 初始化默认的上传类型
        this.switchContentType(this.currentContentType);
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听功能切换事件
        document.addEventListener('functionChanged', (e) => {
            this.currentFeature = e.detail.function;
            this.updateFeatureSelector();
            this.updateExpertSelector();
            this.updateNavFeatures();
            console.log('UploadManager 接收到功能切换:', this.currentFeature);
        });

        // 上传类型切换
        const uploadTabs = document.querySelectorAll('.upload-tab');
        uploadTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const type = tab.dataset.type;
                this.switchContentType(type);
            });
        });

        // 功能选择器
        const featureSelect = document.getElementById('featureSelect');
        if (featureSelect) {
            featureSelect.addEventListener('change', (e) => {
                this.currentFeature = e.target.value;
                this.updateExpertSelector();
                this.updateNavFeatures();
            });
        }

        // 专家选择器
        const expertSelect = document.getElementById('expertSelect');
        if (expertSelect) {
            expertSelect.addEventListener('change', (e) => {
                this.currentExpert = e.target.value;
            });
        }

        // 开始按钮
        const startBtn = document.getElementById('startAnalysisBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startAnalysis();
            });
        }

        // 文件拖拽
        this.bindFileDropEvents();

        // 文件选择
        this.bindFileSelectEvents();

        // 导航功能按钮
        this.bindNavFeatureEvents();
    }

    /**
     * 切换内容类型
     * @param {string} type - 内容类型
     */
    switchContentType(type) {
        if (this.currentContentType === type) return;

        this.currentContentType = type;

        // 更新选项卡状态
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        // 更新面板显示
        document.querySelectorAll('.upload-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.type === type);
        });
    }

    /**
     * 更新功能选择器
     */
    updateFeatureSelector() {
        const featureSelect = document.getElementById('featureSelect');
        if (featureSelect) {
            featureSelect.value = this.currentFeature;
        }
    }

    /**
     * 更新专家选择器
     */
    updateExpertSelector() {
        const expertSelector = document.getElementById('expertSelector');
        const expertSelect = document.getElementById('expertSelect');

        if (expertSelector) {
            expertSelector.style.display = this.currentFeature === 'expert-analysis' ? 'block' : 'none';
        }

        if (expertSelect && this.currentFeature === 'expert-analysis') {
            this.loadExperts();
        }
    }

    /**
     * 加载专家列表
     */
    async loadExperts() {
        try {
            const response = await utils.get(`${utils.API_BASE_URL}/expert-analysis/get-personas`);
            if (response.success) {
                const expertSelect = document.getElementById('expertSelect');
                expertSelect.innerHTML = '';
                
                for (const [key, persona] of Object.entries(response.personas)) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = `${persona.name} - ${persona.description}`;
                    expertSelect.appendChild(option);
                }
                
                expertSelect.value = this.currentExpert;
            }
        } catch (error) {
            console.error('Failed to load experts:', error);
        }
    }

    /**
     * 更新导航功能按钮状态
     */
    updateNavFeatures() {
        document.querySelectorAll('.nav-feature-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.feature === this.currentFeature);
        });
    }

    /**
     * 绑定导航功能按钮事件
     */
    bindNavFeatureEvents() {
        document.querySelectorAll('.nav-feature-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const feature = btn.dataset.feature;
                this.currentFeature = feature;
                this.updateFeatureSelector();
                this.updateExpertSelector();
                this.updateNavFeatures();
            });
        });
    }

    /**
     * 绑定文件拖拽事件
     */
    bindFileDropEvents() {
        const fileDropZone = document.getElementById('fileDropZone');
        const imageDropZone = document.getElementById('imageDropZone');

        // 文件拖拽
        if (fileDropZone) {
            this.bindDropEvents(fileDropZone, (files) => {
                this.addFiles(files);
            });
        }

        // 图片拖拽
        if (imageDropZone) {
            this.bindDropEvents(imageDropZone, (files) => {
                this.addImages(files);
            });
        }
    }

    /**
     * 绑定拖拽事件到元素
     * @param {HTMLElement} element - 拖拽区域元素
     * @param {Function} onDrop - 拖拽完成回调
     */
    bindDropEvents(element, onDrop) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            onDrop(files);
        });
    }

    /**
     * 绑定文件选择事件
     */
    bindFileSelectEvents() {
        const fileInput = document.getElementById('fileInput');
        const imageInput = document.getElementById('imageInput');
        const fileDropZone = document.getElementById('fileDropZone');
        const imageDropZone = document.getElementById('imageDropZone');

        // 文件输入
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.addFiles(files);
            });
        }

        // 图片输入
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.addImages(files);
            });
        }

        // 点击拖拽区域触发文件选择
        if (fileDropZone) {
            fileDropZone.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (imageDropZone) {
            imageDropZone.addEventListener('click', () => {
                imageInput.click();
            });
        }
    }

    /**
     * 添加文件
     * @param {Array} files - 文件数组
     */
    addFiles(files) {
        const allowedTypes = ['txt', 'md', 'docx', 'pdf', 'csv', 'doc'];
        const validFiles = files.filter(file => {
            const isValid = utils.isFileTypeAllowed(file.name, allowedTypes);
            if (!isValid) {
                utils.showNotification(`不支持的文件类型: ${file.name}`, 'warning');
            }
            return isValid;
        });

        this.selectedFiles.push(...validFiles);
        this.updateFileList();
    }

    /**
     * 添加图片
     * @param {Array} files - 图片文件数组
     */
    addImages(files) {
        const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
        const validImages = files.filter(file => {
            const isValid = utils.isFileTypeAllowed(file.name, allowedTypes);
            if (!isValid) {
                utils.showNotification(`不支持的图片类型: ${file.name}`, 'warning');
            }
            return isValid;
        });

        this.selectedImages.push(...validImages);
        this.updateImagePreview();
    }

    /**
     * 更新文件列表显示
     */
    updateFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        fileList.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item animate-fade-in-up';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="file-icon fas fa-file-alt"></i>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${utils.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            const removeBtn = fileItem.querySelector('.remove-file');
            removeBtn.addEventListener('click', () => {
                this.removeFile(index);
            });

            fileList.appendChild(fileItem);
        });
    }

    /**
     * 更新图片预览
     */
    updateImagePreview() {
        const imagePreview = document.getElementById('imagePreview');
        if (!imagePreview) return;

        imagePreview.innerHTML = '';

        this.selectedImages.forEach((file, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item animate-scale-in';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                imageItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button class="remove-image" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                const removeBtn = imageItem.querySelector('.remove-image');
                removeBtn.addEventListener('click', () => {
                    this.removeImage(index);
                });
            };
            reader.readAsDataURL(file);

            imagePreview.appendChild(imageItem);
        });
    }

    /**
     * 移除文件
     * @param {number} index - 文件索引
     */
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileList();
    }

    /**
     * 移除图片
     * @param {number} index - 图片索引
     */
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
    }

    /**
     * 获取输入内容
     * @returns {Object} - 输入内容对象
     */
    getInputContent() {
        switch (this.currentContentType) {
            case 'url':
                const urlInput = document.getElementById('urlInput');
                return {
                    type: 'url',
                    data: urlInput ? urlInput.value.trim() : ''
                };
            
            case 'text':
                const textInput = document.getElementById('textInput');
                return {
                    type: 'text',
                    data: textInput ? textInput.value.trim() : ''
                };
            
            case 'file':
                return {
                    type: 'file',
                    files: this.selectedFiles
                };
            
            case 'image':
                return {
                    type: 'image',
                    files: this.selectedImages
                };
            
            default:
                return null;
        }
    }

    /**
     * 验证输入内容
     * @returns {boolean} - 是否有效
     */
    validateInput() {
        const content = this.getInputContent();
        
        switch (content.type) {
            case 'url':
                if (!content.data) {
                    utils.showNotification('请输入URL链接', 'warning');
                    return false;
                }
                
                const urls = content.data.split('\n').filter(url => url.trim());
                const invalidUrls = urls.filter(url => !utils.isValidUrl(url.trim()));
                
                if (invalidUrls.length > 0) {
                    utils.showNotification(`无效的URL: ${invalidUrls[0]}`, 'warning');
                    return false;
                }
                break;
            
            case 'text':
                if (!content.data) {
                    utils.showNotification('请输入文本内容', 'warning');
                    return false;
                }
                break;
            
            case 'file':
                if (content.files.length === 0) {
                    utils.showNotification('请选择要分析的文件', 'warning');
                    return false;
                }
                break;
            
            case 'image':
                if (content.files.length === 0) {
                    utils.showNotification('请选择要分析的图片', 'warning');
                    return false;
                }
                break;
            
            default:
                utils.showNotification('请选择要分析的内容', 'warning');
                return false;
        }
        
        return true;
    }

    /**
     * 开始分析
     */
    async startAnalysis() {
        if (!this.validateInput()) {
            return;
        }

        const content = this.getInputContent();
        const startBtn = document.getElementById('startAnalysisBtn');
        
        // 禁用开始按钮
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner animate-spin"></i><span>处理中...</span>';
        }

        try {
            // 创建FormData
            const formData = new FormData();
            formData.append('content_type', content.type);
            
            if (content.type === 'url' || content.type === 'text') {
                formData.append('content_data', content.data);
            } else if (content.type === 'file') {
                content.files.forEach(file => {
                    formData.append('files', file);
                });
            } else if (content.type === 'image') {
                content.files.forEach(file => {
                    formData.append('images', file);
                });
            }

            // 添加功能和专家信息
            if (this.currentFeature === 'expert-analysis') {
                formData.append('persona', this.currentExpert);
            }

            // 根据功能类型选择不同的处理方式
            if (this.currentFeature === 'comprehensive-analysis' || this.currentFeature === 'fact-checking') {
                // 进度界面功能
                this.startProgressAnalysis(formData);
            } else {
                // 聊天界面功能
                this.startChatAnalysis(formData);
            }

        } catch (error) {
            console.error('Start analysis error:', error);
            utils.showNotification('启动分析失败', 'error');
        } finally {
            // 恢复开始按钮
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>开始分析</span>';
            }
        }
    }

    /**
     * 获取分析端点
     */
    getAnalysisEndpoint() {
        const endpoints = {
            'intelligent-reading': '/api/intelligent-reading/start',
            'comprehensive-analysis': '/api/comprehensive-analysis/start',
            'expert-analysis': '/api/expert-analysis/start',
            'fact-checking': '/api/fact-checking/start'
        };
        
        return endpoints[this.currentFeature] || endpoints['intelligent-reading'];
    }

    /**
     * 启动聊天式分析
     * @param {FormData} formData - 表单数据
     */
    startChatAnalysis(formData) {
        console.log('=== UploadManager startChatAnalysis ===');
        console.log('当前功能:', this.currentFeature);
        console.log('FormData 内容:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }
        
        // 切换到聊天界面
        console.log('切换到聊天界面...');
        this.switchToInterface('chat');
        
        // 检查chatManager是否存在
        if (window.chatManager) {
            console.log('找到 window.chatManager，开始分析...');
            const endpoint = this.getAnalysisEndpoint();
            console.log('使用端点:', endpoint);
            window.chatManager.startAnalysis(endpoint, formData, this.currentFeature);
        } else {
            console.error('window.chatManager 不存在！');
            showNotification('聊天管理器未初始化', 'error');
        }
    }

    /**
     * 启动进度式分析
     * @param {FormData} formData - 表单数据
     */
    startProgressAnalysis(formData) {
        console.log('=== UploadManager startProgressAnalysis ===');
        console.log('当前功能:', this.currentFeature);
        
        // 确定分析类型
        const analysisType = this.currentFeature === 'comprehensive-analysis' ? 'comprehensive' : 'fact-checking';
        
        // 使用进度管理器开始分析
        if (window.progressManager) {
            console.log('使用进度管理器开始分析...');
            window.progressManager.startAnalysis(analysisType);
            
            // 发送请求
            this.sendProgressRequest(formData);
        } else {
            console.error('进度管理器未初始化！');
            showNotification('进度管理器未初始化', 'error');
        }
    }

    /**
     * 发送进度式分析请求
     * @param {FormData} formData - 表单数据
     */
    async sendProgressRequest(formData) {
        try {
            const endpoint = this.getAnalysisEndpoint();
            console.log('发送请求到:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                
                if (contentType?.includes('text/plain') || contentType?.includes('text/stream')) {
                    console.log('处理流式响应');
                    await this.handleProgressStreamResponse(response);
                } else {
                    console.log('处理非流式响应');
                    const data = await response.json();
                    showNotification(data.message || '分析完成', data.success ? 'success' : 'error');
                }
            } else {
                console.error('请求失败:', response.status);
                const errorData = await response.json();
                showNotification(errorData.message || '分析失败', 'error');
            }
        } catch (error) {
            console.error('发送请求失败:', error);
            showNotification('发送请求失败', 'error');
        }
    }

    /**
     * 处理进度式流响应
     * @param {Response} response - 响应对象
     */
    async handleProgressStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            console.log('收到流数据:', data);
                            
                            // 传递给进度管理器处理
                            if (window.progressManager) {
                                window.progressManager.handleStreamData(data);
                            }
                        } catch (e) {
                            console.warn('解析流数据失败:', e, dataStr);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('处理流响应失败:', error);
            showNotification('处理响应失败', 'error');
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * 启动进度流
     * @param {string} endpoint - API端点
     * @param {FormData} formData - 表单数据
     */
    startProgressStream(endpoint, formData) {
        const progressInterface = document.getElementById('progressInterface');
        const progressTitle = document.getElementById('progressTitle');
        const progressSteps = document.getElementById('progressSteps');
        const progressContent = document.getElementById('progressContent');

        // 设置标题
        const titles = {
            'comprehensive-analysis': '全面分析',
            'fact-checking': '真伪鉴定'
        };
        
        if (progressTitle) {
            progressTitle.textContent = titles[this.currentFeature] || '正在分析...';
        }

        // 清空内容
        if (progressSteps) progressSteps.innerHTML = '';
        if (progressContent) progressContent.innerHTML = '';

        // 创建流请求
        utils.createStreamRequest(`${utils.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            headers: {}, // 移除Content-Type让浏览器自动设置
            onMessage: (data) => {
                this.handleProgressMessage(data);
            },
            onError: (error) => {
                console.error('Progress stream error:', error);
                utils.showNotification('分析过程中出现错误', 'error');
            },
            onComplete: () => {
                console.log('Progress analysis completed');
            }
        });
    }

    /**
     * 处理进度消息
     * @param {Object} data - 消息数据
     */
    handleProgressMessage(data) {
        const progressSteps = document.getElementById('progressSteps');
        const progressContent = document.getElementById('progressContent');

        switch (data.type) {
            case 'step_start':
                this.createProgressStep(data);
                break;
            
            case 'content':
                this.updateProgressContent(data);
                break;
            
            case 'step_complete':
                this.completeProgressStep(data.step);
                break;
            
            case 'thinking':
                this.showProgressThinking(data);
                break;
            
            case 'error':
                utils.showNotification(data.message, 'error');
                break;
        }
    }

    /**
     * 创建进度步骤
     * @param {Object} data - 步骤数据
     */
    createProgressStep(data) {
        const progressSteps = document.getElementById('progressSteps');
        if (!progressSteps) return;

        const stepElement = document.createElement('div');
        stepElement.className = 'progress-step glass animate-fade-in-up';
        stepElement.dataset.step = data.step;
        stepElement.innerHTML = `
            <div class="step-number">${data.step}</div>
            <div class="step-info">
                <div class="step-name">${data.name}</div>
                <div class="step-description">${data.description}</div>
            </div>
            <div class="step-status">
                <i class="fas fa-spinner animate-spin"></i>
            </div>
        `;

        stepElement.addEventListener('click', () => {
            this.toggleStepContent(data.step);
        });

        progressSteps.appendChild(stepElement);
        
        // 激活当前步骤
        stepElement.classList.add('active', 'activating');
    }

    /**
     * 更新进度内容
     * @param {Object} data - 内容数据
     */
    updateProgressContent(data) {
        const progressContent = document.getElementById('progressContent');
        if (!progressContent) return;

        // 查找或创建步骤内容容器
        let stepContent = progressContent.querySelector(`[data-step="${data.step}"]`);
        if (!stepContent) {
            stepContent = document.createElement('div');
            stepContent.className = 'step-content glass animate-fade-in';
            stepContent.dataset.step = data.step;
            stepContent.innerHTML = '<div class="content-text"></div>';
            progressContent.appendChild(stepContent);
        }

        const contentText = stepContent.querySelector('.content-text');
        if (contentText) {
            contentText.innerHTML += marked.parse(data.content || '');
        }

        // 滚动到最新内容
        utils.scrollToElement(stepContent);
    }

    /**
     * 完成进度步骤
     * @param {number} step - 步骤编号
     */
    completeProgressStep(step) {
        const stepElement = document.querySelector(`[data-step="${step}"]`);
        if (stepElement) {
            stepElement.classList.remove('active', 'activating');
            stepElement.classList.add('completed');
            
            const statusIcon = stepElement.querySelector('.step-status i');
            if (statusIcon) {
                statusIcon.className = 'fas fa-check';
            }
        }
    }

    /**
     * 显示进度思考内容
     * @param {Object} data - 思考数据
     */
    showProgressThinking(data) {
        // 这里可以添加思考内容的显示逻辑
        console.log('Thinking:', data.content);
    }

    /**
     * 切换界面
     * @param {string} interfaceType - 界面类型 ('welcome', 'chat', 'progress')
     */
    switchToInterface(interfaceType) {
        const interfaces = {
            welcome: document.getElementById('welcomeScreen'),
            chat: document.getElementById('chatScreen'),
            progress: document.getElementById('progressScreen')
        };

        // 隐藏所有界面
        Object.values(interfaces).forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });

        // 显示目标界面
        const targetInterface = interfaces[interfaceType];
        if (targetInterface) {
            targetInterface.style.display = 'block';
            targetInterface.classList.add('animate-fade-in');
        }
    }

    /**
     * 切换步骤内容显示
     * @param {number} step - 步骤编号
     */
    toggleStepContent(step) {
        const stepContent = document.querySelector(`[data-step="${step}"]`);
        if (stepContent) {
            const isVisible = stepContent.style.display !== 'none';
            stepContent.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * 检查是否有上传的内容
     */
    hasUploadedContent() {
        // 检查是否有选中的文件或图片
        if (this.selectedFiles.length > 0 || this.selectedImages.length > 0) {
            return true;
        }
        
        // 检查文本或URL输入框是否有内容
        const textInput = document.getElementById('textInput');
        const urlInput = document.getElementById('urlInput');
        
        if (textInput && textInput.value.trim()) {
            return true;
        }
        
        if (urlInput && urlInput.value.trim()) {
            return true;
        }
        
        return false;
    }

    /**
     * 清空上传内容（reset方法的别名）
     */
    clearUploads() {
        this.reset();
    }

    /**
     * 重置上传状态
     */
    reset() {
        this.selectedFiles = [];
        this.selectedImages = [];
        this.updateFileList();
        this.updateImagePreview();
        
        // 清空文本输入
        const inputs = ['urlInput', 'textInput'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
    }
}

// 创建全局上传管理器实例
window.uploadManager = new UploadManager();