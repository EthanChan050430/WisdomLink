/**
 * 移动端滚动修复脚本
 * 专门解决移动端菜单操作后无法滚动的问题
 */

class MobileScrollFix {
    constructor() {
        this.isEnabled = this.isMobileDevice();
        this.scrollCheckInterval = null;
        this.lastScrollCheck = 0;
        this.lastFixTime = 0;
        this.fixCount = 0;
        this.maxFixesPerMinute = 3; // 每分钟最多修复3次
        
        if (this.isEnabled) {
            this.init();
        }
    }
    
    /**
     * 检测是否为移动设备
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    /**
     * 初始化滚动修复
     */
    init() {
        this.setupScrollMonitoring();
        this.setupEventListeners();
        this.setupPeriodicCheck();
        console.log('移动端滚动修复已启用');
    }
    
    /**
     * 设置滚动监控
     */
    setupScrollMonitoring() {
        // 监控body和html的样式变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    const attributeName = mutation.attributeName;
                    
                    // 监控可能影响滚动的属性变化
                    if ((target === document.body || target === document.documentElement) &&
                        (attributeName === 'style' || attributeName === 'class')) {
                        
                        // 延迟检查，避免在正常菜单操作时误触发
                        setTimeout(() => {
                            this.checkAndFixScroll();
                        }, 500);
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    this.checkAndFixScroll();
                }, 100);
            }
        });
        
        // 监听窗口焦点变化
        window.addEventListener('focus', () => {
            setTimeout(() => {
                this.checkAndFixScroll();
            }, 100);
        });
        
        // 监听触摸事件，检测用户尝试滚动
        let touchStartY = 0;
        let scrollAttempts = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            scrollAttempts = 0;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const deltaY = Math.abs(touchY - touchStartY);
            
            // 如果用户尝试滚动但页面没有响应
            if (deltaY > 10) {
                scrollAttempts++;
                
                // 如果多次尝试滚动但页面位置没变化，可能是滚动被禁用了
                if (scrollAttempts > 3 && this.isScrollDisabled()) {
                    console.warn('检测到用户尝试滚动但滚动被禁用，正在修复...');
                    this.forceRestoreScroll();
                }
            }
        }, { passive: true });
        
        // 监听滚动事件，更新最后滚动时间
        window.addEventListener('scroll', () => {
            this.lastScrollCheck = Date.now();
        }, { passive: true });
    }
    
    /**
     * 设置定期检查
     */
    setupPeriodicCheck() {
        // 降低检查频率，每10秒检查一次滚动状态
        this.scrollCheckInterval = setInterval(() => {
            this.checkAndFixScroll();
        }, 10000);
    }
    
    /**
     * 检查并修复滚动
     */
    checkAndFixScroll() {
        // 如果菜单正在打开，不要修复
        if (this.isMenuOpen()) {
            return;
        }
        
        const now = Date.now();
        
        // 防止频繁检查，至少间隔5秒
        if (now - this.lastScrollCheck < 5000) {
            return;
        }
        
        // 防止频繁修复，检查修复频率限制
        if (now - this.lastFixTime < 60000) {
            // 在一分钟内
            if (this.fixCount >= this.maxFixesPerMinute) {
                console.warn('滚动修复频率过高，暂停修复以避免无限循环');
                return;
            }
        } else {
            // 超过一分钟，重置计数
            this.fixCount = 0;
        }
        
        // 如果滚动被禁用，修复它
        if (this.isScrollDisabled()) {
            console.log('检测到滚动被禁用，正在修复...');
            this.forceRestoreScroll();
            this.lastScrollCheck = now;
            this.lastFixTime = now;
            this.fixCount++;
        }
    }
    
    /**
     * 检查菜单是否打开
     */
    isMenuOpen() {
        // 检查多种可能的菜单状态
        const hasMenuClass = document.body.classList.contains('mobile-menu-open');
        const hasOverlayActive = document.querySelector('.mobile-menu-overlay.active') !== null;
        const managerOpen = window.mobileMenuManager && window.mobileMenuManager.isOpen;
        const hasKeyboardClass = document.body.classList.contains('keyboard-visible') || 
                                 document.body.classList.contains('mobile-keyboard-active');
        
        // 如果有任何一个条件为真，认为菜单或相关界面正在打开
        return hasMenuClass || hasOverlayActive || managerOpen || hasKeyboardClass;
    }
    
    /**
     * 检查滚动是否被禁用
     */
    isScrollDisabled() {
        const bodyStyle = window.getComputedStyle(document.body);
        const htmlStyle = window.getComputedStyle(document.documentElement);
        
        // 检查各种可能禁用滚动的情况
        const bodyOverflowHidden = bodyStyle.overflow === 'hidden';
        const bodyPositionFixed = bodyStyle.position === 'fixed';
        const htmlOverflowHidden = htmlStyle.overflow === 'hidden';
        const hasMenuClass = document.body.classList.contains('mobile-menu-open');
        
        // 更严格的检查条件：只有在没有菜单打开的情况下，且确实有禁用滚动的样式时才认为需要修复
        const menuIsOpen = this.isMenuOpen();
        
        // 如果菜单打开，滚动被禁用是正常的
        if (menuIsOpen) {
            return false;
        }
        
        // 如果body有position: fixed但没有菜单类，且top值不为空，可能是遗留状态
        const suspiciousState = bodyPositionFixed && !hasMenuClass && bodyStyle.top !== '' && bodyStyle.top !== 'auto';
        
        // 只有在明确的异常情况下才认为滚动被禁用
        return suspiciousState || (bodyOverflowHidden && !hasMenuClass) || (htmlOverflowHidden && !hasMenuClass);
    }
    
    /**
     * 强制恢复滚动
     */
    forceRestoreScroll() {
        // 再次确认菜单确实没有打开
        if (this.isMenuOpen()) {
            console.log('菜单正在打开，跳过滚动恢复');
            return;
        }
        
        // 清除所有可能影响滚动的样式
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.height = '';
        
        document.documentElement.style.overflow = '';
        document.documentElement.style.position = '';
        document.documentElement.style.top = '';
        document.documentElement.style.left = '';
        document.documentElement.style.right = '';
        document.documentElement.style.width = '';
        document.documentElement.style.height = '';
        
        // 移除可能的菜单类（但要小心，不要在菜单真正打开时移除）
        if (!this.isMenuOpen()) {
            document.body.classList.remove('mobile-menu-open');
            document.body.classList.remove('keyboard-visible');
            document.body.classList.remove('mobile-keyboard-active');
        }
        
        // 强制重新计算布局
        document.body.offsetHeight;
        
        console.log('滚动已强制恢复');
        
        // 触发滚动事件以确保其他组件知道滚动已恢复
        window.dispatchEvent(new Event('scroll'));
    }
    
    /**
     * 获取滚动状态信息
     */
    getScrollStatus() {
        const bodyStyle = window.getComputedStyle(document.body);
        const htmlStyle = window.getComputedStyle(document.documentElement);
        
        return {
            bodyOverflow: bodyStyle.overflow,
            bodyPosition: bodyStyle.position,
            bodyTop: bodyStyle.top,
            htmlOverflow: htmlStyle.overflow,
            hasMenuClass: document.body.classList.contains('mobile-menu-open'),
            menuOpen: this.isMenuOpen(),
            scrollDisabled: this.isScrollDisabled(),
            canScroll: !this.isScrollDisabled() && !this.isMenuOpen()
        };
    }
    
    /**
     * 销毁滚动修复
     */
    destroy() {
        if (this.scrollCheckInterval) {
            clearInterval(this.scrollCheckInterval);
            this.scrollCheckInterval = null;
        }
        
        // 最后一次恢复滚动
        this.forceRestoreScroll();
        
        console.log('移动端滚动修复已禁用');
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否禁用滚动修复
    const disableScrollFix = localStorage.getItem('disableScrollFix') === 'true';
    
    if (!disableScrollFix) {
        window.mobileScrollFix = new MobileScrollFix();
    } else {
        console.log('移动端滚动修复已被禁用');
    }
    
    // 添加全局调试函数
    window.checkScrollStatus = () => {
        if (window.mobileScrollFix) {
            const status = window.mobileScrollFix.getScrollStatus();
            console.table(status);
            return status;
        }
        return null;
    };
    
    window.fixScroll = () => {
        if (window.mobileScrollFix) {
            window.mobileScrollFix.forceRestoreScroll();
        }
    };
    
    // 添加禁用/启用滚动修复的函数
    window.disableScrollFix = () => {
        localStorage.setItem('disableScrollFix', 'true');
        if (window.mobileScrollFix) {
            window.mobileScrollFix.destroy();
            window.mobileScrollFix = null;
        }
        console.log('滚动修复已禁用，刷新页面生效');
    };
    
    window.enableScrollFix = () => {
        localStorage.removeItem('disableScrollFix');
        console.log('滚动修复已启用，刷新页面生效');
    };
    
    console.log('可以使用以下命令:');
    console.log('- checkScrollStatus(): 检查滚动状态');
    console.log('- fixScroll(): 手动修复滚动');
    console.log('- disableScrollFix(): 禁用滚动修复');
    console.log('- enableScrollFix(): 启用滚动修复');
});

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileScrollFix;
}