/**
 * 移动端输入框优化脚本
 * 专门解决移动端输入框键盘弹出和消失的问题
 */

class MobileInputFix {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        this.isMobile = this.isIOS || this.isAndroid || window.innerWidth <= 768;
        
        if (this.isMobile) {
            this.init();
        }
    }
    
    init() {
        this.setupInputFixes();
        this.setupKeyboardHandling();
        this.setupScrollFixes();
        console.log('移动端输入优化已启用');
    }
    
    /**
     * 设置输入框修复
     */
    setupInputFixes() {
        // 获取所有输入框
        const inputs = document.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            this.fixInput(input);
        });
        
        // 监听动态添加的输入框
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const newInputs = node.querySelectorAll ? node.querySelectorAll('input, textarea') : [];
                        newInputs.forEach(input => this.fixInput(input));
                        
                        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                            this.fixInput(node);
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
     * 修复单个输入框
     */
    fixInput(input) {
        // 防止iOS自动缩放
        if (this.isIOS) {
            input.style.fontSize = '16px';
            input.style.webkitAppearance = 'none';
            input.style.borderRadius = '0';
        }
        
        // 防止Android键盘问题
        if (this.isAndroid) {
            input.style.fontSize = '16px';
        }
        
        let focusTimeout;
        let blurTimeout;
        let isComposing = false;
        
        // 处理输入法组合事件
        input.addEventListener('compositionstart', () => {
            isComposing = true;
        });
        
        input.addEventListener('compositionend', () => {
            isComposing = false;
        });
        
        // 焦点事件
        input.addEventListener('focus', (e) => {
            clearTimeout(blurTimeout);
            
            // 标记输入框获得焦点
            input.setAttribute('data-mobile-focused', 'true');
            document.body.setAttribute('data-input-active', 'true');
            
            // 延迟处理，等待键盘动画
            focusTimeout = setTimeout(() => {
                this.handleInputFocus(input);
            }, 300);
        });
        
        // 失焦事件
        input.addEventListener('blur', (e) => {
            clearTimeout(focusTimeout);
            
            // 移除焦点标记
            input.removeAttribute('data-mobile-focused');
            
            // 检查是否还有其他输入框获得焦点
            blurTimeout = setTimeout(() => {
                const focusedInputs = document.querySelectorAll('[data-mobile-focused]');
                if (focusedInputs.length === 0) {
                    document.body.removeAttribute('data-input-active');
                    this.handleInputBlur(input);
                }
            }, 100);
        });
        
        // 输入事件
        input.addEventListener('input', (e) => {
            if (!isComposing) {
                this.handleInputChange(input);
            }
        });
        
        // 防止输入时失去焦点 - 改进版本
        input.addEventListener('touchstart', (e) => {
            // 如果输入框已经获得焦点，阻止事件冒泡但不阻止默认行为
            if (input === document.activeElement) {
                e.stopPropagation();
            }
        }, { passive: true });
        
        // 防止点击输入框时的焦点丢失
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            // 确保输入框获得焦点
            if (document.activeElement !== input) {
                input.focus();
            }
        });
        
        // 防止其他元素的点击事件影响输入框焦点
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        // 处理输入框的触摸事件，防止键盘消失
        let touchStartY = 0;
        input.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        input.addEventListener('touchmove', (e) => {
            // 如果是在输入框内的小幅移动，不处理
            const touchY = e.touches[0].clientY;
            const deltaY = Math.abs(touchY - touchStartY);
            if (deltaY < 10) {
                e.stopPropagation();
            }
        }, { passive: true });
    }
    
    /**
     * 处理输入框获得焦点
     */
    handleInputFocus(input) {
        // 确保输入框保持焦点
        if (document.activeElement !== input) {
            // 使用setTimeout确保焦点设置在事件循环的下一轮
            setTimeout(() => {
                input.focus();
            }, 0);
        }
        
        // 延迟滚动，等待虚拟键盘完全出现
        setTimeout(() => {
            const rect = input.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // 如果输入框被遮挡，滚动到合适位置
            if (rect.bottom > viewportHeight * 0.6 || rect.top < 0) {
                const scrollTop = window.pageYOffset;
                const targetScroll = scrollTop + rect.top - viewportHeight * 0.3;
                
                window.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
    
    /**
     * 处理输入框失去焦点
     */
    handleInputBlur(input) {
        // 不要强制滚动，让用户保持当前位置
        // 只在页面位置异常时进行调整
        setTimeout(() => {
            if (window.pageYOffset < 0) {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }, 200);
    }
    
    /**
     * 处理输入内容变化
     */
    handleInputChange(input) {
        // 自动调整textarea高度
        if (input.tagName === 'TEXTAREA') {
            input.style.height = 'auto';
            const newHeight = Math.min(input.scrollHeight, 200);
            input.style.height = newHeight + 'px';
        }
        
        // 确保输入框保持焦点
        if (document.activeElement !== input) {
            input.focus();
        }
    }
    
    /**
     * 设置键盘处理
     */
    setupKeyboardHandling() {
        let initialHeight = window.innerHeight;
        let keyboardHeight = 0;
        let isKeyboardVisible = false;
        
        const handleResize = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialHeight - currentHeight;
            
            if (heightDiff > 150 && !isKeyboardVisible) {
                // 键盘出现
                isKeyboardVisible = true;
                keyboardHeight = heightDiff;
                document.body.classList.add('mobile-keyboard-visible');
                this.adjustLayoutForKeyboard(keyboardHeight);
            } else if (heightDiff <= 50 && isKeyboardVisible) {
                // 键盘隐藏
                isKeyboardVisible = false;
                keyboardHeight = 0;
                document.body.classList.remove('mobile-keyboard-visible');
                this.restoreLayoutFromKeyboard();
            }
        };
        
        // 使用 visualViewport API（如果支持）
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
        }
        
        // 方向变化时重置
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                initialHeight = window.innerHeight;
                isKeyboardVisible = false;
                keyboardHeight = 0;
                document.body.classList.remove('mobile-keyboard-visible');
                this.restoreLayoutFromKeyboard();
            }, 500);
        });
    }
    
    /**
     * 调整键盘显示时的布局
     */
    adjustLayoutForKeyboard(keyboardHeight) {
        const chatContainer = document.querySelector('.chat-container');
        const uploadSection = document.querySelector('.upload-section');
        const mainContent = document.querySelector('.main-content');
        
        if (chatContainer) {
            const newHeight = Math.max(200, window.innerHeight - keyboardHeight - 60);
            chatContainer.style.height = `${newHeight}px`;
            chatContainer.style.transition = 'height 0.2s ease';
        }
        
        if (uploadSection) {
            uploadSection.style.maxHeight = `${Math.max(300, window.innerHeight - keyboardHeight - 100)}px`;
            uploadSection.style.overflowY = 'auto';
        }
        
        if (mainContent) {
            mainContent.style.paddingBottom = '0';
        }
    }
    
    /**
     * 恢复键盘隐藏后的布局
     */
    restoreLayoutFromKeyboard() {
        const chatContainer = document.querySelector('.chat-container');
        const uploadSection = document.querySelector('.upload-section');
        const mainContent = document.querySelector('.main-content');
        
        if (chatContainer) {
            chatContainer.style.height = '';
            chatContainer.style.transition = '';
        }
        
        if (uploadSection) {
            uploadSection.style.maxHeight = '';
            uploadSection.style.overflowY = '';
        }
        
        if (mainContent) {
            mainContent.style.paddingBottom = '';
        }
    }
    
    /**
     * 设置滚动修复
     */
    setupScrollFixes() {
        // 防止输入时页面跳动
        let lastScrollTop = 0;
        
        window.addEventListener('scroll', () => {
            const currentScrollTop = window.pageYOffset;
            
            // 如果有输入框获得焦点，限制滚动
            if (document.body.hasAttribute('data-input-active')) {
                const scrollDiff = Math.abs(currentScrollTop - lastScrollTop);
                
                // 如果滚动幅度过大，可能是键盘引起的，进行调整
                if (scrollDiff > 100) {
                    const focusedInput = document.querySelector('[data-mobile-focused]');
                    if (focusedInput) {
                        setTimeout(() => {
                            this.handleInputFocus(focusedInput);
                        }, 100);
                    }
                }
            }
            
            lastScrollTop = currentScrollTop;
        }, { passive: true });
        
        // 防止过度滚动影响输入
        document.addEventListener('touchmove', (e) => {
            const target = e.target;
            
            // 如果触摸的是输入框，不阻止滚动
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }
            
            // 如果有输入框获得焦点，限制某些滚动行为
            if (document.body.hasAttribute('data-input-active')) {
                const scrollTop = window.pageYOffset;
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = document.documentElement.clientHeight;
                
                // 在边界位置时，防止过度滚动
                if ((scrollTop <= 0 && e.touches[0].pageY > e.touches[0].startY) ||
                    (scrollTop + clientHeight >= scrollHeight && e.touches[0].pageY < e.touches[0].startY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.mobileInputFix = new MobileInputFix();
});

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileInputFix;
}