/**
 * 智链 - 移动端交互优化
 * 专为移动设备优化的JavaScript功能
 */

class MobileOptimizer {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTouch = 'ontouchstart' in window;
        this.viewport = this.getViewport();
        
        this.init();
    }
    
    /**
     * 检测是否为移动设备
     */
    detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) || window.innerWidth <= 768;
    }
    
    /**
     * 获取视口信息
     */
    getViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        };
    }
    
    /**
     * 初始化移动端优化
     */
    init() {
        if (!this.isMobile) return;
        
        this.setupViewport();
        this.setupTouchHandlers();
        this.setupMobileMenu();
        this.setupInputOptimization();
        this.setupScrollOptimization();
        this.setupOrientationHandler();
        this.setupVirtualKeyboardHandler();
        this.setupSwipeGestures();
        
        // 添加移动端标识类
        document.body.classList.add('mobile-device');
        if (this.isTouch) {
            document.body.classList.add('touch-device');
        }
        
        console.log('移动端优化已启用');
    }
    
    /**
     * 设置视口
     */
    setupViewport() {
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 防止页面滚动时的橡皮筋效果
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * 设置触摸处理器
     */
    setupTouchHandlers() {
        // 为所有按钮添加触摸反馈
        const buttons = document.querySelectorAll('button, .btn, .upload-tab, .function-btn');
        buttons.forEach(button => {
            this.addTouchFeedback(button);
        });
        
        // 为链接添加触摸反馈
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            this.addTouchFeedback(link);
        });
    }
    
    /**
     * 添加触摸反馈
     */
    addTouchFeedback(element) {
        let touchStartTime = 0;
        
        element.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            element.classList.add('touch-active');
            
            // 添加触觉反馈（如果支持）
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        }, { passive: true });
        
        element.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            // 短暂延迟移除active状态，确保用户能看到反馈
            setTimeout(() => {
                element.classList.remove('touch-active');
            }, Math.max(0, 150 - touchDuration));
        }, { passive: true });
        
        element.addEventListener('touchcancel', () => {
            element.classList.remove('touch-active');
        }, { passive: true });
    }
    
    /**
     * 设置移动端菜单
     */
    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        
        if (!mobileMenuToggle || !mobileMenuOverlay) return;
        
        // 打开菜单
        mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.openMobileMenu();
        });
        
        // 关闭菜单
        if (mobileMenuClose) {
            mobileMenuClose.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeMobileMenu();
            });
        }
        
        // 点击遮罩关闭菜单
        mobileMenuOverlay.addEventListener('click', (e) => {
            if (e.target === mobileMenuOverlay) {
                this.closeMobileMenu();
            }
        });
        
        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenuOverlay.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
        
        // 滑动手势关闭菜单
        this.setupMenuSwipeGesture();
    }
    
    /**
     * 打开移动端菜单
     */
    openMobileMenu() {
        const overlay = document.getElementById('mobileMenuOverlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // 焦点管理
            const firstFocusable = overlay.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }
    
    /**
     * 关闭移动端菜单
     */
    closeMobileMenu() {
        const overlay = document.getElementById('mobileMenuOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // 恢复焦点到菜单按钮
            const menuToggle = document.getElementById('mobileMenuToggle');
            if (menuToggle) {
                menuToggle.focus();
            }
        }
    }
    
    /**
     * 设置菜单滑动手势
     */
    setupMenuSwipeGesture() {
        const menuContent = document.querySelector('.mobile-menu-content');
        if (!menuContent) return;
        
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        
        menuContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            currentY = startY;
            isDragging = true;
        }, { passive: true });
        
        menuContent.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            
            const deltaX = currentX - startX;
            const deltaY = Math.abs(currentY - startY);
            
            // 如果是向右滑动且垂直移动不大
            if (deltaX > 0 && deltaY < 50) {
                const progress = Math.min(deltaX / 200, 1);
                menuContent.style.transform = `translateX(${deltaX}px)`;
                menuContent.style.opacity = 1 - progress * 0.3;
            }
        }, { passive: true });
        
        menuContent.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = currentX - startX;
            const deltaY = Math.abs(currentY - startY);
            
            // 重置样式
            menuContent.style.transform = '';
            menuContent.style.opacity = '';
            
            // 如果滑动距离足够且主要是水平滑动，关闭菜单
            if (deltaX > 100 && deltaY < 50) {
                this.closeMobileMenu();
            }
        }, { passive: true });
    }
    
    /**
     * 设置输入优化
     */
    setupInputOptimization() {
        const textareas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
        
        [...textareas, ...inputs].forEach(input => {
            // 自动调整textarea高度
            if (input.tagName === 'TEXTAREA') {
                this.setupAutoResize(input);
            }
            
            // 优化输入体验
            this.optimizeInputExperience(input);
        });
    }
    
    /**
     * 设置自动调整大小
     */
    setupAutoResize(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 120); // 最大高度120px
            textarea.style.height = newHeight + 'px';
        };
        
        textarea.addEventListener('input', resize);
        textarea.addEventListener('focus', resize);
        
        // 初始调整
        setTimeout(resize, 0);
    }
    
    /**
     * 优化输入体验
     */
    optimizeInputExperience(input) {
        // 聚焦时滚动到视图中
        input.addEventListener('focus', () => {
            setTimeout(() => {
                input.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300); // 等待虚拟键盘出现
        });
        
        // 失焦时恢复滚动
        input.addEventListener('blur', () => {
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }, 100);
        });
    }
    
    /**
     * 设置滚动优化
     */
    setupScrollOptimization() {
        // 平滑滚动到顶部按钮
        this.createScrollToTopButton();
        
        // 优化聊天消息滚动
        this.optimizeChatScroll();
        
        // 防止过度滚动
        this.preventOverscroll();
    }
    
    /**
     * 创建回到顶部按钮
     */
    createScrollToTopButton() {
        const scrollButton = document.createElement('button');
        scrollButton.className = 'scroll-to-top-mobile';
        scrollButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        scrollButton.setAttribute('aria-label', '回到顶部');
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .scroll-to-top-mobile {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 48px;
                height: 48px;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }
            
            .scroll-to-top-mobile.visible {
                opacity: 1;
                visibility: visible;
            }
            
            .scroll-to-top-mobile:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(scrollButton);
        
        // 滚动监听
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (window.pageYOffset > 300) {
                    scrollButton.classList.add('visible');
                } else {
                    scrollButton.classList.remove('visible');
                }
            }, 100);
        }, { passive: true });
        
        // 点击事件
        scrollButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    /**
     * 优化聊天滚动
     */
    optimizeChatScroll() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // 平滑滚动到底部
        const scrollToBottom = () => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        };
        
        // 监听新消息
        const observer = new MutationObserver(() => {
            scrollToBottom();
        });
        
        observer.observe(chatMessages, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 防止过度滚动
     */
    preventOverscroll() {
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].pageY;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const y = e.touches[0].pageY;
            const scrollTop = window.pageYOffset;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            
            // 在顶部向下拉或在底部向上拉时阻止默认行为
            if ((scrollTop === 0 && y > startY) || 
                (scrollTop + clientHeight >= scrollHeight && y < startY)) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * 设置方向变化处理
     */
    setupOrientationHandler() {
        const handleOrientationChange = () => {
            // 更新视口信息
            this.viewport = this.getViewport();
            
            // 重新计算布局
            setTimeout(() => {
                this.recalculateLayout();
            }, 100);
            
            // 关闭移动菜单（如果打开）
            this.closeMobileMenu();
        };
        
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
    }
    
    /**
     * 重新计算布局
     */
    recalculateLayout() {
        // 重新调整聊天容器高度
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 60;
            const newHeight = window.innerHeight - headerHeight - 20;
            chatContainer.style.height = `${newHeight}px`;
        }
        
        // 重新调整textarea高度
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            if (textarea.style.height) {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            }
        });
    }
    
    /**
     * 设置虚拟键盘处理
     */
    setupVirtualKeyboardHandler() {
        let initialViewportHeight = window.innerHeight;
        
        const handleViewportChange = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // 如果高度减少超过150px，认为是虚拟键盘出现
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-visible');
                this.adjustForKeyboard(heightDifference);
            } else {
                document.body.classList.remove('keyboard-visible');
                this.restoreFromKeyboard();
            }
        };
        
        window.addEventListener('resize', handleViewportChange);
        
        // 监听输入框焦点
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(handleViewportChange, 300);
            });
            
            input.addEventListener('blur', () => {
                setTimeout(handleViewportChange, 300);
            });
        });
    }
    
    /**
     * 调整键盘显示时的布局
     */
    adjustForKeyboard(keyboardHeight) {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.height = `calc(100vh - 60px - ${keyboardHeight}px)`;
        }
        
        // 滚动到聚焦的输入框
        const focusedElement = document.activeElement;
        if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
            setTimeout(() => {
                focusedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }
    
    /**
     * 恢复键盘隐藏后的布局
     */
    restoreFromKeyboard() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.height = 'calc(100vh - 80px)';
        }
    }
    
    /**
     * 设置滑动手势
     */
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            this.handleSwipe(startX, startY, endX, endY);
        }, { passive: true });
    }
    
    /**
     * 处理滑动手势
     */
    handleSwipe(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;
        
        // 确保是有效的滑动
        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
            return;
        }
        
        // 水平滑动
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                this.handleSwipeRight();
            } else {
                this.handleSwipeLeft();
            }
        }
        // 垂直滑动
        else {
            if (deltaY > 0) {
                this.handleSwipeDown();
            } else {
                this.handleSwipeUp();
            }
        }
    }
    
    /**
     * 处理向右滑动
     */
    handleSwipeRight() {
        // 如果在聊天界面，显示历史面板
        const historyPanel = document.getElementById('historyPanel');
        if (historyPanel && !historyPanel.classList.contains('show')) {
            const historyToggle = document.getElementById('historyToggle');
            if (historyToggle) {
                historyToggle.click();
            }
        }
    }
    
    /**
     * 处理向左滑动
     */
    handleSwipeLeft() {
        // 关闭历史面板
        const historyPanel = document.getElementById('historyPanel');
        if (historyPanel && historyPanel.classList.contains('show')) {
            const historyToggle = document.getElementById('historyToggle');
            if (historyToggle) {
                historyToggle.click();
            }
        }
        
        // 关闭移动菜单
        const mobileMenu = document.getElementById('mobileMenuOverlay');
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            this.closeMobileMenu();
        }
    }
    
    /**
     * 处理向下滑动
     */
    handleSwipeDown() {
        // 在页面顶部时刷新页面
        if (window.pageYOffset === 0) {
            // 可以添加下拉刷新功能
            console.log('下拉刷新');
        }
    }
    
    /**
     * 处理向上滑动
     */
    handleSwipeUp() {
        // 可以添加向上滑动的功能
        console.log('向上滑动');
    }
    
    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTouch: this.isTouch,
            viewport: this.viewport,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        };
    }
    
    /**
     * 销毁移动端优化
     */
    destroy() {
        // 移除事件监听器和样式
        document.body.classList.remove('mobile-device', 'touch-device', 'keyboard-visible');
        
        // 移除回到顶部按钮
        const scrollButton = document.querySelector('.scroll-to-top-mobile');
        if (scrollButton) {
            scrollButton.remove();
        }
        
        console.log('移动端优化已禁用');
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimizer = new MobileOptimizer();
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileOptimizer;
}