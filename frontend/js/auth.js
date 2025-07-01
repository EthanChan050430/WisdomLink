// 用户认证管理

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthModalOpen = false;
        this.isProcessingSwitch = false; // 添加处理状态标志
        // 延迟初始化，确保DOM已加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeAuth();
                this.bindEvents();
                this.bindModalEvents();
            });
        } else {
            this.initializeAuth();
            this.bindEvents();
            this.bindModalEvents();
        }
    }

    /**
     * 初始化认证状态
     */
    async initializeAuth() {
        try {
            const response = await utils.get(`${utils.API_BASE_URL}/auth/check`);
            if (response.success && response.user) {
                this.setUser(response.user);
            } else {
                this.setUser(null);
            }
        } catch (error) {
            console.error('认证状态检查失败:', error);
            // 确保在错误情况下显示登录按钮
            this.setUser(null);
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 用户按钮点击
        const userBtn = document.getElementById('userBtn');
        if (userBtn) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserDropdown();
            });
        }

        // 登录/注册相关按钮
        const loginBtn = document.getElementById('loginBtn');
        const loginItem = document.getElementById('loginItem');
        const registerItem = document.getElementById('registerItem');
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutItem = document.getElementById('logoutItem');
        const profileItem = document.getElementById('profileItem');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('登录按钮被点击');
                this.showAuthModal('login');
            });
        }

        if (loginItem) {
            loginItem.addEventListener('click', () => this.showAuthModal('login'));
        }

        if (registerItem) {
            registerItem.addEventListener('click', () => this.showAuthModal('register'));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        if (logoutItem) {
            logoutItem.addEventListener('click', () => this.logout());
        }

        if (profileItem) {
            profileItem.addEventListener('click', () => this.showProfile());
        }

        // 模态框相关事件
        this.bindModalEvents();

        // 点击外部关闭下拉菜单
        document.addEventListener('click', () => {
            this.hideUserDropdown();
        });
    }

    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        const authModal = document.getElementById('authModal');
        const closeAuthModal = document.getElementById('closeAuthModal');
        const authForm = document.getElementById('authForm');
        const authSwitchLink = document.getElementById('authSwitchLink');

        if (closeAuthModal) {
            // 移除可能存在的旧事件监听器
            closeAuthModal.removeEventListener('click', this.hideAuthModal);
            closeAuthModal.addEventListener('click', () => this.hideAuthModal());
        }

        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    this.hideAuthModal();
                }
            });
        }

        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthSubmit();
            });
        }

        if (authSwitchLink) {
            // 使用事件委托避免重复绑定
            authSwitchLink.removeEventListener('click', this.handleSwitchClick);
            this.handleSwitchClick = (e) => {
                console.log('切换链接被点击');
                e.preventDefault();
                e.stopPropagation();
                this.switchAuthMode();
            };
            authSwitchLink.addEventListener('click', this.handleSwitchClick);
        }

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isAuthModalOpen) {
                this.hideAuthModal();
            }
        });
    }

    /**
     * 显示认证模态框
     * @param {string} mode - 模式 ('login' | 'register')
     */
    showAuthModal(mode = 'login') {
        console.log('showAuthModal 被调用，模式:', mode);
        const modal = document.getElementById('authModal');
        const title = document.getElementById('authTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchText = document.getElementById('authSwitchText');
        const switchLink = document.getElementById('authSwitchLink');

        if (!modal) {
            console.error('未找到认证模态框元素');
            return;
        }

        // 检查是否需要更新内容（避免不必要的DOM操作）
        const currentMode = modal.dataset.mode;
        if (currentMode !== mode) {
            // 设置模态框内容
            if (mode === 'login') {
                if (title) title.textContent = '登录';
                if (submitBtn) submitBtn.textContent = '登录';
                if (switchText) switchText.textContent = '还没有账号？';
                if (switchLink) switchLink.textContent = '立即注册';
                
                // 隐藏邮箱字段
                const emailGroup = document.getElementById('authEmailGroup');
                if (emailGroup) {
                    emailGroup.style.display = 'none';
                }
            } else {
                if (title) title.textContent = '注册';
                if (submitBtn) submitBtn.textContent = '注册';
                if (switchText) switchText.textContent = '已有账号？';
                if (switchLink) switchLink.textContent = '立即登录';
                
                // 显示邮箱字段（可选）
                const emailGroup = document.getElementById('authEmailGroup');
                if (emailGroup) {
                    emailGroup.style.display = 'block';
                }
            }
            
            modal.dataset.mode = mode;
        }

        // 显示模态框
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        this.isAuthModalOpen = true;

        // 聚焦用户名输入框
        const usernameInput = document.getElementById('authUsername');
        if (usernameInput) {
            setTimeout(() => usernameInput.focus(), 100);
        }
    }

    /**
     * 隐藏认证模态框
     */
    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (!modal) return;

        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        this.isAuthModalOpen = false;
        this.isProcessingSwitch = false; // 重置处理状态

        // 清空表单
        const form = document.getElementById('authForm');
        if (form) {
            form.reset();
        }
    }

    /**
     * 切换认证模式
     */
    switchAuthMode() {
        console.log('switchAuthMode 被调用');
        
        // 防止重复快速点击
        if (this.isProcessingSwitch) {
            console.log('正在处理切换，跳过');
            return;
        }
        
        this.isProcessingSwitch = true;
        
        const modal = document.getElementById('authModal');
        const currentMode = modal.dataset.mode;
        const newMode = currentMode === 'login' ? 'register' : 'login';
        
        console.log('当前模式:', currentMode, '新模式:', newMode);
        
        // 直接切换模式，不隐藏模态框
        this.showAuthModal(newMode);
        
        // 延迟重置处理状态
        setTimeout(() => {
            this.isProcessingSwitch = false;
        }, 300);
    }

    /**
     * 处理认证表单提交
     */
    async handleAuthSubmit() {
        const modal = document.getElementById('authModal');
        const mode = modal.dataset.mode;
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        const submitBtn = document.getElementById('authSubmitBtn');

        if (!username || !password) {
            utils.showNotification('请填写完整信息', 'warning');
            return;
        }

        // 禁用提交按钮
        submitBtn.disabled = true;
        submitBtn.textContent = mode === 'login' ? '登录中...' : '注册中...';

        try {
            const endpoint = mode === 'login' ? 'login' : 'register';
            const response = await utils.post(`${utils.API_BASE_URL}/auth/${endpoint}`, {
                username,
                password
            });

            if (response.success) {
                utils.showNotification(response.message, 'success');
                
                if (mode === 'login' && response.user) {
                    this.setUser(response.user);
                }
                
                this.hideAuthModal();
                
                // 如果是注册成功，自动切换到登录
                if (mode === 'register') {
                    setTimeout(() => this.showAuthModal('login'), 500);
                }
            } else {
                utils.showNotification(response.message, 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            utils.showNotification('网络错误，请重试', 'error');
        } finally {
            // 恢复提交按钮
            submitBtn.disabled = false;
            submitBtn.textContent = mode === 'login' ? '登录' : '注册';
        }
    }

    /**
     * 登出
     */
    async logout() {
        try {
            const response = await utils.post(`${utils.API_BASE_URL}/auth/logout`);
            if (response.success) {
                this.setUser(null);
                utils.showNotification('已成功登出', 'success');
                
                // 刷新聊天历史（清空）
                if (window.historyManager) {
                    window.historyManager.loadChatHistory();
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
            utils.showNotification('登出失败', 'error');
        }
    }

    /**
     * 设置当前用户
     * @param {Object|null} user - 用户信息
     */
    setUser(user) {
        this.currentUser = user;
        this.updateUI();
        
        // 触发用户状态变化事件
        const event = new CustomEvent('userStateChanged', { 
            detail: { user: this.currentUser } 
        });
        document.dispatchEvent(event);
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const username = document.getElementById('username');
        const userStatus = document.getElementById('userStatus');
        const loginItem = document.getElementById('loginItem');
        const registerItem = document.getElementById('registerItem');
        const profileItem = document.getElementById('profileItem');
        const logoutItem = document.getElementById('logoutItem');

        if (this.currentUser) {
            // 已登录状态
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (username) username.textContent = this.currentUser.username;
            
            if (userStatus) {
                userStatus.textContent = this.currentUser.username;
            }
            
            if (loginItem) loginItem.style.display = 'none';
            if (registerItem) registerItem.style.display = 'none';
            if (profileItem) profileItem.style.display = 'block';
            if (logoutItem) logoutItem.style.display = 'block';
        } else {
            // 未登录状态
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
            if (username) username.textContent = '';
            
            if (userStatus) {
                userStatus.textContent = '登录';
            }
            
            if (loginItem) loginItem.style.display = 'block';
            if (registerItem) registerItem.style.display = 'block';
            if (profileItem) profileItem.style.display = 'none';
            if (logoutItem) logoutItem.style.display = 'none';
        }
    }

    /**
     * 切换用户下拉菜单
     */
    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (!dropdown) return;

        const isVisible = dropdown.style.opacity === '1';
        if (isVisible) {
            this.hideUserDropdown();
        } else {
            this.showUserDropdown();
        }
    }

    /**
     * 显示用户下拉菜单
     */
    showUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.style.opacity = '1';
            dropdown.style.visibility = 'visible';
            dropdown.style.transform = 'translateY(0)';
        }
    }

    /**
     * 隐藏用户下拉菜单
     */
    hideUserDropdown() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            dropdown.style.transform = 'translateY(-10px)';
        }
    }

    /**
     * 显示用户资料
     */
    async showProfile() {
        if (!this.currentUser) return;

        try {
            const response = await utils.get(`${utils.API_BASE_URL}/auth/profile`);
            if (response.success) {
                const profile = response.profile;
                const message = `
                    用户名: ${profile.username}
                    注册时间: ${utils.formatDateTime(profile.created_at)}
                    用户文件夹: ${profile.user_folder}
                `;
                
                utils.showNotification(message, 'info', 8000);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            utils.showNotification('获取用户信息失败', 'error');
        }
    }

    /**
     * 检查是否已登录
     * @returns {boolean} - 是否已登录
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * 获取当前用户信息
     * @returns {Object|null} - 用户信息
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 验证用户权限（预留接口）
     * @param {string} permission - 权限名称
     * @returns {boolean} - 是否有权限
     */
    hasPermission(permission) {
        // 目前所有已登录用户都有全部权限
        return this.isLoggedIn();
    }
}

// 创建全局认证管理器实例
window.authManager = new AuthManager();
