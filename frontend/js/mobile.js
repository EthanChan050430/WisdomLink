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
        // 防止双击缩放 - 只在非输入元素上阻止
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            const target = e.target;
            
            // 如果是输入元素，不阻止默认行为
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                return;
            }
            
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 防止页面滚动时的橡皮筋效果 - 但允许正常滚动
        document.addEventListener('touchmove', (e) => {
            const target = e.target;
            
            // 如果是输入元素或可滚动容器，不阻止滚动
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
                target.closest('.chat-messages') || target.closest('.upload-section') ||
                target.closest('.mobile-menu-content')) {
                return;
            }
            
            // 只在缩放时阻止
            if (e.scale && e.scale !== 1) {
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
        let touchMoved = false;
        let userHasInteracted = false;
        
        // 检查用户是否已经有过交互
        const checkUserInteraction = () => {
            userHasInteracted = true;
            document.removeEventListener('touchstart', checkUserInteraction);
            document.removeEventListener('click', checkUserInteraction);
        };
        
        // 监听首次用户交互
        if (!userHasInteracted) {
            document.addEventListener('touchstart', checkUserInteraction, { once: true, passive: true });
            document.addEventListener('click', checkUserInteraction, { once: true, passive: true });
        }
        
        element.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchMoved = false;
            element.classList.add('touch-active');
            
            // 只在用户已经交互且不是输入元素时使用振动
            if (userHasInteracted && 
                navigator.vibrate && 
                !element.closest('input, textarea, select') &&
                !element.matches('input, textarea, select')) {
                try {
                    navigator.vibrate(10);
                } catch (e) {
                    // 忽略振动API错误
                    console.debug('Vibration API not available or blocked');
                }
            }
        }, { passive: true });
        
        element.addEventListener('touchmove', (e) => {
            touchMoved = true;
            // 如果用户移动了手指，移除触摸反馈
            element.classList.remove('touch-active');
        }, { passive: true });
        
        element.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            // 只有在没有移动且触摸时间合理的情况下才保持反馈
            if (!touchMoved && touchDuration < 500) {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, Math.max(0, 100 - touchDuration));
            } else {
                element.classList.remove('touch-active');
            }
        }, { passive: true });
        
        element.addEventListener('touchcancel', () => {
            element.classList.remove('touch-active');
        }, { passive: true });
    }
    
    /**
     * 设置移动端菜单
     */
    setupMobileMenu() {
        // 检查是否已经有专门的菜单管理器
        if (window.MobileMenuManager || window.mobileMenuManager) {
            console.log('检测到专门的移动端菜单管理器，跳过基础菜单设置');
            return;
        }
        
        // 优先使用新的折叠菜单
        const collapseMenuTrigger = document.getElementById('collapseMenuTrigger');
        const collapseMenuContainer = document.getElementById('collapseMenuContainer');
        
        if (collapseMenuTrigger && collapseMenuContainer) {
            console.log('使用折叠菜单设置');
            this.setupCollapseMenu();
            return;
        }
        
        // 备用：使用原有的汉堡菜单
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        
        if (!mobileMenuToggle || !mobileMenuOverlay) return;
        
        console.log('使用基础移动端菜单设置');
        
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
     * 设置折叠菜单
     */
    setupCollapseMenu() {
        const trigger = document.getElementById('collapseMenuTrigger');
        const container = document.getElementById('collapseMenuContainer');
        const overlay = document.getElementById('collapseMenuOverlay');
        const closeBtn = document.getElementById('collapseMenuClose');
        
        if (!trigger || !container) return;
        
        // 打开菜单
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            this.openCollapseMenu();
        });
        
        // 关闭菜单
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeCollapseMenu();
            });
        }
        
        // 点击遮罩关闭菜单
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeCollapseMenu();
            });
        }
        
        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && container.classList.contains('active')) {
                this.closeCollapseMenu();
            }
        });
        
        // 滑动手势关闭菜单
        this.setupCollapseMenuSwipeGesture();
    }
    
    /**
     * 打开折叠菜单
     */
    openCollapseMenu() {
        const trigger = document.getElementById('collapseMenuTrigger');
        const container = document.getElementById('collapseMenuContainer');
        const overlay = document.getElementById('collapseMenuOverlay');
        const icon = trigger.querySelector('i');
        
        trigger.classList.add('active');
        container.classList.add('active');
        if (overlay) overlay.classList.add('active');
        
        // 改变图标
        icon.className = 'fas fa-chevron-right';
        
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
        
        // 焦点管理
        const firstFocusable = container.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 300);
        }
    }
    
    /**
     * 关闭折叠菜单
     */
    closeCollapseMenu() {
        const trigger = document.getElementById('collapseMenuTrigger');
        const container = document.getElementById('collapseMenuContainer');
        const overlay = document.getElementById('collapseMenuOverlay');
        const icon = trigger.querySelector('i');
        
        trigger.classList.remove('active');
        container.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        // 恢复图标
        icon.className = 'fas fa-chevron-left';
        
        // 恢复背景滚动
        document.body.style.overflow = '';
        
        // 恢复焦点到触发按钮
        trigger.focus();
    }
    
    /**
     * 设置折叠菜单滑动手势
     */
    setupCollapseMenuSwipeGesture() {
        const container = document.getElementById('collapseMenuContainer');
        if (!container) return;
        
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isDragging = false;
        
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            isDragging = true;
        }, { passive: true });
        
        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            const deltaY = Math.abs(e.touches[0].clientY - startY);
            
            // 如果是向右滑动且垂直移动不大
            if (deltaX > 0 && deltaY < 50) {
                const progress = Math.min(deltaX / 200, 1);
                container.style.transform = `translateX(${deltaX}px)`;
                container.style.opacity = 1 - progress * 0.3;
            }
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = currentX - startX;
            const deltaY = Math.abs(e.touches[0].clientY - startY);
            
            // 重置样式
            container.style.transform = '';
            container.style.opacity = '';
            
            // 如果滑动距离足够且主要是水平滑动，关闭菜单
            if (deltaX > 100 && deltaY < 50) {
                this.closeCollapseMenu();
            }
        }, { passive: true });
    }
    
    /**
     * 打开移动端菜单
     */
    openMobileMenu() {
        // 委托给专门的菜单管理器
        if (window.mobileMenuManager) {
            window.mobileMenuManager.openMenu();
        } else {
            // 备用方案
            const overlay = document.getElementById('mobileMenuOverlay');
            if (overlay) {
                overlay.classList.add('active');
                document.body.classList.add('mobile-menu-open');
                
                // 焦点管理
                const firstFocusable = overlay.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        }
    }
    
    /**
     * 关闭移动端菜单
     */
    closeMobileMenu() {
        // 委托给专门的菜单管理器
        if (window.mobileMenuManager) {
            window.mobileMenuManager.closeMenu();
        } else {
            // 备用方案
            const overlay = document.getElementById('mobileMenuOverlay');
            if (overlay) {
                overlay.classList.remove('active');
                document.body.classList.remove('mobile-menu-open');
                
                // 确保恢复滚动
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                
                // 恢复焦点到菜单按钮
                const menuToggle = document.getElementById('mobileMenuToggle');
                if (menuToggle) {
                    menuToggle.focus();
                }
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
        
        // 全局输入框保护
        this.setupGlobalInputProtection();
    }
    
    /**
     * 设置全局输入框保护
     */
    setupGlobalInputProtection() {
        // 防止页面上的其他点击事件影响输入框焦点
        document.addEventListener('touchstart', (e) => {
            const activeElement = document.activeElement;
            const target = e.target;
            
            // 如果当前有输入框获得焦点，且点击的不是输入框或其相关元素
            if (activeElement && 
                (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
                !target.closest('input, textarea, button, .btn, .upload-tab, .function-btn')) {
                
                // 检查点击位置是否在输入框附近
                const rect = activeElement.getBoundingClientRect();
                const touch = e.touches[0];
                const distance = Math.sqrt(
                    Math.pow(touch.clientX - (rect.left + rect.width / 2), 2) +
                    Math.pow(touch.clientY - (rect.top + rect.height / 2), 2)
                );
                
                // 如果点击距离输入框较远，可能是意外点击，保持焦点
                if (distance > 100) {
                    setTimeout(() => {
                        if (document.activeElement !== activeElement) {
                            activeElement.focus();
                        }
                    }, 10);
                }
            }
        }, { passive: true });
        
        // 监听动态添加的输入框
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const newInputs = node.querySelectorAll ? 
                            node.querySelectorAll('input, textarea') : [];
                        newInputs.forEach(input => {
                            if (input.tagName === 'TEXTAREA') {
                                this.setupAutoResize(input);
                            }
                            this.optimizeInputExperience(input);
                        });
                        
                        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                            if (node.tagName === 'TEXTAREA') {
                                this.setupAutoResize(node);
                            }
                            this.optimizeInputExperience(node);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
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
        let focusTimeout;
        let blurTimeout;
        
        // 聚焦时的处理
        input.addEventListener('focus', (e) => {
            clearTimeout(blurTimeout);
            
            // 防止iOS Safari的自动缩放
            if (input.style.fontSize !== '16px') {
                input.style.fontSize = '16px';
            }
            
            // 延迟滚动，等待虚拟键盘出现
            focusTimeout = setTimeout(() => {
                // 只有当输入框不在视口中时才滚动
                const rect = input.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                if (rect.bottom > viewportHeight * 0.6) {
                    input.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 300);
        });
        
        // 失焦时的处理
        input.addEventListener('blur', (e) => {
            clearTimeout(focusTimeout);
            
            // 不要自动滚动到顶部，让用户保持当前位置
            // 只在必要时进行微调
            blurTimeout = setTimeout(() => {
                // 如果页面被推得太高，稍微调整一下
                if (window.pageYOffset < 0) {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        });
        
        // 防止输入时页面跳动
        input.addEventListener('input', (e) => {
            // 保持焦点，防止键盘消失
            if (document.activeElement !== input) {
                input.focus();
            }
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
        let startElement = null;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].pageY;
            startElement = e.target;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const y = e.touches[0].pageY;
            const target = e.target;
            
            // 如果是输入元素或在可滚动容器内，不阻止滚动
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
                target.closest('.chat-messages') || target.closest('.upload-section') ||
                target.closest('.mobile-menu-content') || target.closest('.history-panel')) {
                return;
            }
            
            const scrollTop = window.pageYOffset;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            
            // 只在真正的边界情况下阻止过度滚动
            const isAtTop = scrollTop <= 0;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
            const isPullingDown = y > startY;
            const isPullingUp = y < startY;
            
            // 在顶部向下拉或在底部向上拉时阻止默认行为
            if ((isAtTop && isPullingDown) || (isAtBottom && isPullingUp)) {
                // 只阻止过度滚动，不阻止正常滚动
                const deltaY = Math.abs(y - startY);
                if (deltaY > 10) { // 只有在明显的拉动时才阻止
                    e.preventDefault();
                }
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
        let keyboardVisible = false;
        let resizeTimeout;
        let focusedInput = null;
        let keyboardCheckTimeout;
        
        const handleViewportChange = () => {
            clearTimeout(resizeTimeout);
            
            resizeTimeout = setTimeout(() => {
                const currentHeight = window.innerHeight;
                const heightDifference = initialViewportHeight - currentHeight;
                
                // 检查是否有输入框获得焦点
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && 
                    (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
                
                // 如果高度减少超过150px且有输入框获得焦点，认为是虚拟键盘出现
                if (heightDifference > 150 && isInputFocused && !keyboardVisible) {
                    keyboardVisible = true;
                    focusedInput = activeElement;
                    document.body.classList.add('keyboard-visible');
                    document.body.setAttribute('data-input-focused', 'true');
                    this.adjustForKeyboard(heightDifference);
                } else if (heightDifference <= 50 && keyboardVisible) {
                    // 只有在没有输入框获得焦点时才认为键盘消失
                    if (!isInputFocused) {
                        keyboardVisible = false;
                        focusedInput = null;
                        document.body.classList.remove('keyboard-visible');
                        document.body.removeAttribute('data-input-focused');
                        this.restoreFromKeyboard();
                    }
                }
            }, 50); // 进一步减少延迟
        };
        
        // 使用 visualViewport API（如果支持）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
            window.addEventListener('resize', handleViewportChange);
        }
        
        // 全局监听输入框焦点变化
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                focusedInput = e.target;
                document.body.setAttribute('data-input-focused', 'true');
                
                // 防止焦点立即丢失
                clearTimeout(keyboardCheckTimeout);
                
                // 延迟检查键盘状态
                setTimeout(() => {
                    handleViewportChange();
                    
                    // 确保输入框在视口中可见
                    const rect = e.target.getBoundingClientRect();
                    if (rect.bottom > window.innerHeight * 0.7 || rect.top < 0) {
                        e.target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                }, 200);
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (e.target === focusedInput) {
                // 延迟检查，因为可能是焦点转移到其他输入框
                keyboardCheckTimeout = setTimeout(() => {
                    const newActiveElement = document.activeElement;
                    if (!newActiveElement || 
                        (newActiveElement.tagName !== 'INPUT' && newActiveElement.tagName !== 'TEXTAREA')) {
                        focusedInput = null;
                        document.body.removeAttribute('data-input-focused');
                        setTimeout(handleViewportChange, 100);
                    }
                }, 150);
            }
        });
        
        // 处理方向变化时重置初始高度
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                initialViewportHeight = window.innerHeight;
                keyboardVisible = false;
                focusedInput = null;
                document.body.classList.remove('keyboard-visible');
                document.body.removeAttribute('data-input-focused');
                this.restoreFromKeyboard();
            }, 500);
        });
    }
    
    /**
     * 调整键盘显示时的布局
     */
    adjustForKeyboard(keyboardHeight) {
        const chatContainer = document.querySelector('.chat-container');
        const uploadSection = document.querySelector('.upload-section');
        
        // 调整聊天容器高度
        if (chatContainer) {
            const newHeight = Math.max(200, window.innerHeight - keyboardHeight - 60);
            chatContainer.style.height = `${newHeight}px`;
            chatContainer.style.maxHeight = `${newHeight}px`;
        }
        
        // 调整上传区域
        if (uploadSection) {
            uploadSection.style.maxHeight = `${Math.max(300, window.innerHeight - keyboardHeight - 100)}px`;
            uploadSection.style.overflowY = 'auto';
        }
        
        // 确保聚焦的输入框可见
        const focusedElement = document.activeElement;
        if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
            setTimeout(() => {
                const rect = focusedElement.getBoundingClientRect();
                const availableHeight = window.innerHeight - keyboardHeight;
                
                // 如果输入框被键盘遮挡，滚动到合适位置
                if (rect.bottom > availableHeight * 0.8) {
                    focusedElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 150);
        }
    }
    
    /**
     * 恢复键盘隐藏后的布局
     */
    restoreFromKeyboard() {
        const chatContainer = document.querySelector('.chat-container');
        const uploadSection = document.querySelector('.upload-section');
        
        // 恢复聊天容器高度
        if (chatContainer) {
            chatContainer.style.height = 'calc(100vh - 80px)';
            chatContainer.style.maxHeight = '';
        }
        
        // 恢复上传区域
        if (uploadSection) {
            uploadSection.style.maxHeight = '';
            uploadSection.style.overflowY = '';
        }
        
        // 如果没有输入框获得焦点，可以稍微调整滚动位置
        if (!document.body.hasAttribute('data-input-focused')) {
            setTimeout(() => {
                // 平滑滚动到合理位置，但不要强制回到顶部
                const currentScroll = window.pageYOffset;
                if (currentScroll < 0) {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            }, 200);
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

// 自动初始化 - 延迟初始化以确保其他组件先加载
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保移动端菜单管理器先初始化
    setTimeout(() => {
        window.mobileOptimizer = new MobileOptimizer();
    }, 200);
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileOptimizer;
}