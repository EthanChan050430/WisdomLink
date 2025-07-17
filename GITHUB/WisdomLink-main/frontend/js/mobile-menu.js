/**
 * 移动端菜单控制
 */
class MobileMenuManager {
    constructor() {
        this.menuToggle = document.getElementById('mobileMenuToggle');
        this.menuOverlay = document.getElementById('mobileMenuOverlay');
        this.menuClose = document.getElementById('mobileMenuClose');
        this.isOpen = false;
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        console.log('MobileMenuManager 初始化开始');
        
        // 确保菜单初始状态正确
        if (this.menuOverlay) {
            this.menuOverlay.classList.remove('active');
            this.isOpen = false;
        }
        
        // 移除body上可能残留的类
        document.body.classList.remove('mobile-menu-open');
        
        // 绑定事件监听器（只绑定一次）
        this.bindEvents();
        
        // 绑定移动端功能按钮
        this.bindMobileFunctionButtons();
        
        // 绑定移动端操作按钮
        this.bindMobileActionButtons();
        
        this.isInitialized = true;
        console.log('MobileMenuManager 初始化完成');
    }
    
    bindEvents() {
        // 汉堡菜单按钮点击事件
        if (this.menuToggle && !this.menuToggle.hasAttribute('data-mobile-menu-bound')) {
            this.handleToggleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('汉堡菜单按钮被点击，当前状态:', this.isOpen);
                this.toggleMenu();
            };
            this.menuToggle.addEventListener('click', this.handleToggleClick);
            this.menuToggle.setAttribute('data-mobile-menu-bound', 'true');
            console.log('汉堡菜单按钮事件绑定完成');
        }
        
        // 关闭按钮事件
        if (this.menuClose) {
            this.menuClose.addEventListener('click', () => {
                console.log('关闭按钮被点击');
                this.closeMenu();
            });
        }
        
        // 覆盖层点击关闭事件
        if (this.menuOverlay) {
            this.menuOverlay.addEventListener('click', (e) => {
                if (e.target === this.menuOverlay) {
                    console.log('覆盖层被点击，关闭菜单');
                    this.closeMenu();
                }
            });
        }
        
        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                console.log('ESC键被按下，关闭菜单');
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        console.log('toggleMenu 被调用，当前状态:', this.isOpen);
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        console.log('openMenu 被调用');
        if (this.menuOverlay) {
            // 强制重新布局以确保动画正确触发
            this.menuOverlay.offsetHeight;
            
            this.menuOverlay.classList.add('active');
            this.isOpen = true;
            document.body.classList.add('mobile-menu-open');
            
            console.log('菜单已打开，DOM状态:');
            console.log('- overlay active:', this.menuOverlay.classList.contains('active'));
            console.log('- body mobile-menu-open:', document.body.classList.contains('mobile-menu-open'));
        } else {
            console.error('menuOverlay 不存在，无法打开菜单');
        }
    }
    
    closeMenu() {
        console.log('closeMenu 被调用');
        if (this.menuOverlay) {
            this.menuOverlay.classList.remove('active');
            this.isOpen = false;
            document.body.classList.remove('mobile-menu-open');
            
            console.log('菜单已关闭，DOM状态:');
            console.log('- overlay active:', this.menuOverlay.classList.contains('active'));
            console.log('- body mobile-menu-open:', document.body.classList.contains('mobile-menu-open'));
        } else {
            console.error('menuOverlay 不存在，无法关闭菜单');
        }
    }
    
    bindMobileFunctionButtons() {
        // 移动端功能按钮与桌面端同步
        const mobileFunctionButtons = document.querySelectorAll('.mobile-function-btn');
        const desktopFunctionButtons = document.querySelectorAll('.function-btn');
        
        mobileFunctionButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const functionType = btn.dataset.function;
                
                // 移除所有按钮的active状态
                mobileFunctionButtons.forEach(b => b.classList.remove('active'));
                desktopFunctionButtons.forEach(b => b.classList.remove('active'));
                
                // 添加当前按钮的active状态
                btn.classList.add('active');
                
                // 找到对应的桌面端按钮并激活
                const correspondingDesktopBtn = document.querySelector(`.function-btn[data-function="${functionType}"]`);
                if (correspondingDesktopBtn) {
                    correspondingDesktopBtn.classList.add('active');
                    correspondingDesktopBtn.click();
                }
                
                // 关闭菜单
                this.closeMenu();
            });
        });
        
        // 桌面端按钮变化时同步移动端
        desktopFunctionButtons.forEach((btn) => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isActive = btn.classList.contains('active');
                        const functionType = btn.dataset.function;
                        const mobileBtn = document.querySelector(`.mobile-function-btn[data-function="${functionType}"]`);
                        
                        if (mobileBtn) {
                            if (isActive) {
                                mobileBtn.classList.add('active');
                            } else {
                                mobileBtn.classList.remove('active');
                            }
                        }
                    }
                });
            });
            
            observer.observe(btn, { attributes: true });
        });
    }
    
    bindMobileActionButtons() {
        // 聊天历史
        const mobileHistoryBtn = document.getElementById('mobileHistoryToggle');
        const desktopHistoryBtn = document.getElementById('historyToggle');
        if (mobileHistoryBtn && desktopHistoryBtn) {
            mobileHistoryBtn.addEventListener('click', () => {
                desktopHistoryBtn.click();
                this.closeMenu();
            });
        }
        
        // 主题切换
        const mobileThemeBtn = document.getElementById('mobileThemeToggle');
        const desktopThemeBtn = document.getElementById('themeToggle');
        if (mobileThemeBtn && desktopThemeBtn) {
            mobileThemeBtn.addEventListener('click', () => {
                desktopThemeBtn.click();
                this.closeMenu();
            });
        }
        
        // 背景切换
        const mobileBackgroundBtn = document.getElementById('mobileBackgroundToggle');
        const desktopBackgroundBtn = document.getElementById('backgroundToggle');
        if (mobileBackgroundBtn && desktopBackgroundBtn) {
            mobileBackgroundBtn.addEventListener('click', () => {
                desktopBackgroundBtn.click();
                this.closeMenu();
            });
        }
        
        // 登录按钮
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const desktopLoginBtn = document.getElementById('loginBtn');
        if (mobileLoginBtn && desktopLoginBtn) {
            mobileLoginBtn.addEventListener('click', () => {
                desktopLoginBtn.click();
                this.closeMenu();
            });
        }
        
        // 登出按钮
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        const desktopLogoutBtn = document.getElementById('logoutBtn');
        if (mobileLogoutBtn && desktopLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', () => {
                desktopLogoutBtn.click();
                this.closeMenu();
            });
        }
    }
    
    // 同步用户状态
    syncUserState(isLoggedIn, username = '') {
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const mobileUserInfo = document.getElementById('mobileUserInfo');
        const mobileUsername = document.getElementById('mobileUsername');
        
        if (isLoggedIn) {
            if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
            if (mobileUserInfo) mobileUserInfo.style.display = 'block';
            if (mobileUsername) mobileUsername.textContent = username;
        } else {
            if (mobileLoginBtn) mobileLoginBtn.style.display = 'block';
            if (mobileUserInfo) mobileUserInfo.style.display = 'none';
        }
    }
    
    // 测试菜单功能
    testMenu() {
        console.log('=== 移动端菜单测试 ===');
        console.log('isInitialized:', this.isInitialized);
        console.log('isOpen:', this.isOpen);
        console.log('menuToggle元素:', this.menuToggle);
        console.log('menuOverlay元素:', this.menuOverlay);
        console.log('事件已绑定:', this.menuToggle ? this.menuToggle.hasAttribute('data-mobile-menu-bound') : false);
        
        if (this.menuToggle) {
            console.log('手动触发菜单切换...');
            this.toggleMenu();
        }
    }
}

// 初始化移动端菜单管理器
let mobileMenuManager = null;

// 暴露类到全局，以便其他模块使用
window.MobileMenuManager = MobileMenuManager;

// 确保在所有脚本加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他组件已经加载
    setTimeout(() => {
        if (!mobileMenuManager) {
            console.log('初始化移动端菜单管理器...');
            mobileMenuManager = new MobileMenuManager();
            window.mobileMenuManager = mobileMenuManager;
            console.log('移动端菜单管理器初始化完成');
            
            // 添加测试函数到全局，方便调试
            window.testMobileMenu = () => {
                if (window.mobileMenuManager) {
                    window.mobileMenuManager.testMenu();
                } else {
                    console.log('移动端菜单管理器未初始化');
                }
            };
            
            console.log('可以在控制台输入 testMobileMenu() 来测试菜单功能');
        }
    }, 100);
});