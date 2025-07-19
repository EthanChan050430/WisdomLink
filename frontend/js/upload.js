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

        // 处理移动端上传选项卡的水平滚动
        this.handleUploadTabsScroll();

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
                // 同步到聊天界面的专家选择器
                const chatExpertSelect = document.getElementById('chatExpertSelect');
                if (chatExpertSelect) {
                    chatExpertSelect.value = e.target.value;
                }
            });
        }

        // 聊天界面专家选择器
        const chatExpertSelect = document.getElementById('chatExpertSelect');
        if (chatExpertSelect) {
            chatExpertSelect.addEventListener('change', (e) => {
                this.currentExpert = e.target.value;
                // 同步到上传界面的专家选择器
                const expertSelect = document.getElementById('expertSelect');
                if (expertSelect) {
                    expertSelect.value = e.target.value;
                }
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

        // 在移动端滚动到激活的选项卡
        if (window.innerWidth <= 768) {
            this.scrollToActiveUploadTab();
        }
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
        const chatExpertSelector = document.getElementById('chatExpertSelector');
        const chatModelSelector = document.getElementById('chatModelSelector');
        const welcomeModelSelector = document.getElementById('welcomeModelSelector');

        // 上传界面的专家选择器
        if (expertSelector) {
            expertSelector.style.display = this.currentFeature === 'expert-analysis' ? 'block' : 'none';
        }

        // 聊天界面的专家选择器
        if (chatExpertSelector) {
            chatExpertSelector.style.display = this.currentFeature === 'expert-analysis' ? 'block' : 'none';
        }

        // 聊天界面的模型选择器 - 智能伴读和大师分析都显示
        if (chatModelSelector) {
            chatModelSelector.style.display = (this.currentFeature === 'intelligent-reading' || this.currentFeature === 'expert-analysis') ? 'block' : 'none';
        }

        // 主页的模型选择器 - 智能伴读和大师分析都显示
        if (welcomeModelSelector) {
            welcomeModelSelector.style.display = (this.currentFeature === 'intelligent-reading' || this.currentFeature === 'expert-analysis') ? 'block' : 'none';
        }

        if (this.currentFeature === 'expert-analysis') {
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
                // 更新上传界面的专家选择器
                const expertSelect = document.getElementById('expertSelect');
                if (expertSelect) {
                    this.populateExpertSelect(expertSelect, response.personas);
                }
                
                // 更新聊天界面的专家选择器
                const chatExpertSelect = document.getElementById('chatExpertSelect');
                if (chatExpertSelect) {
                    this.populateExpertSelect(chatExpertSelect, response.personas);
                }
            }
        } catch (error) {
            console.error('Failed to load experts:', error);
        }
    }

    /**
     * 填充专家选择器选项
     */
    populateExpertSelect(selectElement, personas) {
        selectElement.innerHTML = '<option value="">选择专家角色...</option>';
        
        for (const [key, persona] of Object.entries(personas)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${persona.name} - ${persona.description}`;
            selectElement.appendChild(option);
        }
        
        selectElement.value = this.currentExpert;
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
        const fileDropZone = document.getElementById('fileUploadArea');
        const imageDropZone = document.getElementById('imageUploadArea');

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
        console.log('绑定拖拽事件到元素:', element.id);
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
            console.log('文件拖拽到元素上方:', element.id);
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            console.log('文件拖拽完成，文件数量:', files.length);
            files.forEach((file, index) => {
                console.log(`文件 ${index + 1}: ${file.name}, 类型: ${file.type}, 大小: ${file.size}`);
            });
            
            onDrop(files);
        });
    }

    /**
     * 绑定文件选择事件
     */
    bindFileSelectEvents() {
        const fileInput = document.getElementById('fileInput');
        const imageInput = document.getElementById('imageInput');
        const fileDropZone = document.getElementById('fileUploadArea');
        const imageDropZone = document.getElementById('imageUploadArea');

        console.log('绑定文件选择事件:');
        console.log('- fileInput:', fileInput ? 'found' : 'not found');
        console.log('- imageInput:', imageInput ? 'found' : 'not found');
        console.log('- fileDropZone:', fileDropZone ? 'found' : 'not found');
        console.log('- imageDropZone:', imageDropZone ? 'found' : 'not found');

        // 文件输入
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                console.log('文件输入变更，文件数量:', files.length);
                files.forEach((file, index) => {
                    console.log(`选择的文件 ${index + 1}: ${file.name}`);
                });
                this.addFiles(files);
            });
        }

        // 图片输入
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                console.log('图片输入变更，文件数量:', files.length);
                files.forEach((file, index) => {
                    console.log(`选择的图片 ${index + 1}: ${file.name}`);
                });
                this.addImages(files);
            });
        }

        // 点击拖拽区域触发文件选择
        if (fileDropZone) {
            fileDropZone.addEventListener('click', () => {
                console.log('点击文件上传区域');
                if (fileInput) {
                    fileInput.click();
                } else {
                    console.error('fileInput 元素不存在');
                }
            });
        }

        if (imageDropZone) {
            imageDropZone.addEventListener('click', () => {
                console.log('点击图片上传区域');
                if (imageInput) {
                    imageInput.click();
                } else {
                    console.error('imageInput 元素不存在');
                }
            });
        }
    }

    /**
     * 添加文件
     * @param {Array} files - 文件数组
     */
    addFiles(files) {
        const allowedTypes = ['txt', 'md', 'docx', 'pdf', 'csv', 'doc'];
        const validFiles = [];
        
        for (const file of files) {
            const isValid = utils.isFileTypeAllowed(file.name, allowedTypes);
            if (!isValid) {
                utils.showNotification(`不支持的文件类型: ${file.name}`, 'warning');
                console.log(`文件类型检查失败: ${file.name}, 类型: ${file.type}`);
            } else {
                validFiles.push(file);
                console.log(`文件添加成功: ${file.name}, 大小: ${file.size} bytes`);
            }
        }

        this.selectedFiles.push(...validFiles);
        this.updateFileList();
        
        if (validFiles.length > 0) {
            utils.showNotification(`成功添加 ${validFiles.length} 个文件`, 'success');
        }
    }

    /**
     * 添加图片
     * @param {Array} files - 图片文件数组
     */
    addImages(files) {
        const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
        const validImages = [];
        
        for (const file of files) {
            const isValid = utils.isFileTypeAllowed(file.name, allowedTypes);
            if (!isValid) {
                utils.showNotification(`不支持的图片类型: ${file.name}`, 'warning');
                console.log(`图片类型检查失败: ${file.name}, 类型: ${file.type}`);
            } else {
                validImages.push(file);
                console.log(`图片添加成功: ${file.name}, 大小: ${file.size} bytes`);
            }
        }

        this.selectedImages.push(...validImages);
        this.updateImagePreview();
        
        if (validImages.length > 0) {
            utils.showNotification(`成功添加 ${validImages.length} 张图片`, 'success');
        }
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
            
            console.log('=== FormData构造调试 ===');
            console.log('内容类型:', content.type);
            
            if (content.type === 'url' || content.type === 'text') {
                formData.append('content_data', content.data);
                console.log('添加文本数据，长度:', content.data.length);
            } else if (content.type === 'file') {
                console.log('添加文件，数量:', content.files.length);
                content.files.forEach((file, index) => {
                    formData.append('files', file);
                    console.log(`文件 ${index + 1}: ${file.name}, 大小: ${file.size}`);
                });
            } else if (content.type === 'image') {
                console.log('添加图片，数量:', content.files.length);
                content.files.forEach((file, index) => {
                    formData.append('images', file);
                    console.log(`图片 ${index + 1}: ${file.name}, 大小: ${file.size}`);
                });
            }

            // 添加功能和专家信息
            if (this.currentFeature === 'expert-analysis') {
                formData.append('persona', this.currentExpert);
                console.log('添加专家信息:', this.currentExpert);
            }

            // 添加模型选择（智能伴读和大师分析）
            if (this.currentFeature === 'intelligent-reading' || this.currentFeature === 'expert-analysis') {
                // 优先使用主页的模型选择，然后是聊天界面的模型选择器
                let selectedModel = null;
                
                // 首先从主页的按钮文本获取模型选择
                const welcomeModelButtonText = document.getElementById('welcomeModelButtonText');
                if (welcomeModelButtonText) {
                    const buttonText = welcomeModelButtonText.textContent;
                    console.log('主页模型按钮文本:', buttonText);
                    selectedModel = buttonText; // 直接使用按钮文本作为模型值
                }
                
                // 如果主页没有选择，从全局selector manager获取
                if (!selectedModel && window.selectorManager) {
                    selectedModel = window.selectorManager.getCurrentModel();
                    console.log('从selector manager获取模型:', selectedModel);
                }
                
                // 如果还是没有，使用聊天界面的选择
                if (!selectedModel) {
                    const chatModelSelect = document.getElementById('chatModelSelect');
                    selectedModel = chatModelSelect?.value;
                    console.log('从聊天界面获取模型:', selectedModel);
                }
                
                // 同步模型选择到聊天界面
                if (selectedModel) {
                    const chatModelSelect = document.getElementById('chatModelSelect');
                    if (chatModelSelect && chatModelSelect.value !== selectedModel) {
                        chatModelSelect.value = selectedModel;
                        console.log('同步模型到聊天界面:', selectedModel);
                    }
                    formData.append('model', selectedModel);
                    console.log('最终使用模型:', selectedModel);
                } else {
                    console.warn('未能获取到模型选择，使用默认模型');
                    formData.append('model', 'GLM-4-Flash');
                }
            }
            
            console.log('=== FormData构造完成 ===');
            console.log('FormData包含的键值对:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
                } else {
                    console.log(`  ${key}: ${value}`);
                }
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
                
                // 检查是否是全面分析或真伪鉴定（使用JSON响应）
                if (this.currentFeature === 'comprehensive-analysis' || this.currentFeature === 'fact-checking') {
                    console.log('处理JSON响应（全面分析/真伪鉴定）');
                    const data = await response.json();
                    if (data.success) {
                        this.handleJsonAnalysisResponse(data);
                    } else {
                        showNotification(data.message || '分析失败', 'error');
                    }
                } else if (contentType?.includes('text/plain') || contentType?.includes('text/stream')) {
                    console.log('处理流式响应');
                    await this.handleProgressStreamResponse(response);
                } else {
                    console.log('处理普通JSON响应');
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
     * 处理JSON分析响应（全面分析/真伪鉴定）
     * @param {Object} data - 响应数据
     */
    handleJsonAnalysisResponse(data) {
        console.log('处理JSON分析响应:', data);
        
        if (window.progressManager && data.analysis && data.analysis.steps) {
            // 首先设置会话ID
            if (data.session_id) {
                const sessionData = {
                    type: 'session_id',
                    session_id: data.session_id
                };
                window.progressManager.handleStreamData(sessionData);
            }

            // 处理每个步骤
            data.analysis.steps.forEach((step, index) => {
                console.log(`处理步骤 ${step.step}:`, step);
                
                // 步骤开始
                const stepStartData = {
                    type: 'step_start',
                    step: step.step,
                    name: step.name,
                    description: step.description
                };
                window.progressManager.handleStreamData(stepStartData);
                
                // 步骤内容
                const stepContentData = {
                    type: 'content',
                    step: step.step,
                    content: step.content
                };
                window.progressManager.handleStreamData(stepContentData);
                
                // 步骤完成
                const stepCompleteData = {
                    type: 'step_complete',
                    step: step.step
                };
                window.progressManager.handleStreamData(stepCompleteData);
            });
            
            // 分析完成后自动显示最终结果
            setTimeout(() => {
                if (window.progressManager.showFinalResultAndCollapseSteps) {
                    window.progressManager.showFinalResultAndCollapseSteps();
                }
            }, 1000);
            
            showNotification('分析完成', 'success');
        } else {
            console.error('无效的分析响应数据');
            showNotification('分析响应数据格式错误', 'error');
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

    /**
     * 处理移动端上传选项卡的水平滚动
     */
    handleUploadTabsScroll() {
        const uploadTabs = document.querySelector('.upload-tabs');
        if (!uploadTabs) return;

        // 检查是否需要显示滚动提示
        const checkScrollState = () => {
            const isScrolledToEnd = uploadTabs.scrollLeft + uploadTabs.clientWidth >= uploadTabs.scrollWidth - 1;
            uploadTabs.classList.toggle('scrolled-end', isScrolledToEnd);
        };

        // 监听滚动事件
        uploadTabs.addEventListener('scroll', checkScrollState);
        
        // 初始检查
        setTimeout(checkScrollState, 100);
        
        // 窗口大小改变时重新检查
        window.addEventListener('resize', () => {
            setTimeout(checkScrollState, 100);
        });
    }

    /**
     * 滚动到活动的上传选项卡
     */
    scrollToActiveUploadTab() {
        const activeTab = document.querySelector('.upload-tab.active');
        const uploadTabs = document.querySelector('.upload-tabs');

        if (activeTab && uploadTabs) {
            // 计算活动选项卡相对于容器的偏移量
            const offset = activeTab.offsetLeft - (uploadTabs.clientWidth / 2) + (activeTab.clientWidth / 2);

            // 平滑滚动到目标位置
            uploadTabs.scrollTo({
                left: Math.max(0, offset),
                behavior: 'smooth'
            });
        }
    }
}

// 创建全局上传管理器实例
window.uploadManager = new UploadManager();