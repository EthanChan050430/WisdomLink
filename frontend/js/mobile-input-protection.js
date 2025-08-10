/**
 * 移动端输入框保护脚本
 * 专门解决移动端输入框焦点丢失和键盘消失的问题
 */

class MobileInputProtection {
    constructor() {
        this.activeInput = null;
        this.keyboardVisible = false;
        this.focusTimeout = null;
        this.blurTimeout = null;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        
        if (this.isIOS || this.isAndroid) {
            this.init();
        }
    }
    
    init() {
        this.setupInputProtection();
        this.setupKeyboardDetection();
        this.setupGlobalEventHandlers();
        console.log('移动端输入框保护已启用');
    }
    
    /**
     * 设置输入框保护
     */
    setupInputProtection() {
        // 监听所有输入框的焦点事件
        document.addEventListener('focusin', (e) => {
            if (this.isInputElement(e.target)) {
                this.handleInputFocus(e.target);
            }
        }, true);
        
        document.addEventListener('focusout', (e) => {
            if (this.isInputElement(e.target)) {
                this.handleInputBlur(e.target);
            }
        }, true);
        
        // 防止意外的焦点丢失
        document.addEventListener('touchstart', (e) => {
            if (this.activeInput && !this.isInputRelated(e.target)) {
                this.protectInputFocus(e);
            }
        }, { passive: false });
        
        // 防止滚动时焦点丢失
        document.addEventListener('touchmove', (e) => {
            if (this.activeInput && this.keyboardVisible) {
                // 如果触摸的是输入框本身，允许正常行为
                if (e.target === this.activeInput) {
                    return;
                }
                
                // 如果是在输入框容器内的滚动，允许
                if (e.target.closest('.chat-messages, .upload-section')) {
                    return;
                }
                
                // 其他情况下，如果移动距离较大，可能会影响输入框
                const touch = e.touches[0];
                if (this.lastTouchY && Math.abs(touch.clientY - this.lastTouchY) > 50) {
                    this.ensureInputFocus();
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (this.activeInput) {
                // 延迟检查焦点状态
                setTimeout(() => {
                    this.ensureInputFocus();
                }, 50);
            }
        }, { passive: true });
    }
    
    /**
     * 设置键盘检测
     */
    setupKeyboardDetection() {
        let initialHeight = window.innerHeight;
        
        const checkKeyboard = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialHeight - currentHeight;
            
            const wasVisible = this.keyboardVisible;
            this.keyboardVisible = heightDiff > 150 && this.activeInput;
            
            if (this.keyboardVisible && !wasVisible) {
                this.onKeyboardShow();
            } else if (!this.keyboardVisible && wasVisible) {
                this.onKeyboardHide();
            }
        };
        
        // 使用 visualViewport API 如果可用
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', checkKeyboard);
        } else {
            window.addEventListener('resize', checkKeyboard);
        }
        
        // 方向变化时重置
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                initialHeight = window.innerHeight;
                this.keyboardVisible = false;
            }, 500);
        });
    }
    
    /**
     * 设置全局事件处理器
     */
    setupGlobalEventHandlers() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.activeInput) {
                // 页面隐藏时保存输入框状态
                this.savedInputState = {
                    element: this.activeInput,
                    value: this.activeInput.value,
                    selectionStart: this.activeInput.selectionStart,
                    selectionEnd: this.activeInput.selectionEnd
                };
            } else if (!document.hidden && this.savedInputState) {
                // 页面显示时恢复输入框状态
                setTimeout(() => {
                    if (this.savedInputState.element) {
                        this.savedInputState.element.focus();
                        this.savedInputState.element.setSelectionRange(
                            this.savedInputState.selectionStart,
                            this.savedInputState.selectionEnd
                        );
                    }
                    this.savedInputState = null;
                }, 100);
            }
        });
        
        // 监听页面滚动
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (this.activeInput && this.keyboardVisible) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.ensureInputVisible();
                }, 100);
            }
        }, { passive: true });
    }
    
    /**
     * 处理输入框获得焦点
     */
    handleInputFocus(input) {
        clearTimeout(this.blurTimeout);
        
        this.activeInput = input;
        input.setAttribute('data-mobile-protected', 'true');
        
        // iOS特殊处理
        if (this.isIOS) {
            // 防止iOS自动缩放
            if (input.style.fontSize !== '16px') {
                input.style.fontSize = '16px';
            }
            
            // 设置输入框为只读然后立即取消，防止键盘闪烁
            input.setAttribute('readonly', 'readonly');
            setTimeout(() => {
                input.removeAttribute('readonly');
                input.focus();
            }, 10);
        }
        
        // 延迟处理，确保键盘完全显示
        this.focusTimeout = setTimeout(() => {
            this.ensureInputVisible();
        }, 300);
        
        console.log('输入框获得焦点保护:', input.tagName);
    }
    
    /**
     * 处理输入框失去焦点
     */
    handleInputBlur(input) {
        clearTimeout(this.focusTimeout);
        
        // 延迟处理，检查是否是真正的失焦
        this.blurTimeout = setTimeout(() => {
            const currentActive = document.activeElement;
            
            // 如果焦点转移到了其他输入框，更新activeInput
            if (this.isInputElement(currentActive)) {
                this.activeInput = currentActive;
            } else {
                // 真正失去焦点
                if (this.activeInput === input) {
                    this.activeInput = null;
                    input.removeAttribute('data-mobile-protected');
                    console.log('输入框失去焦点保护:', input.tagName);
                }
            }
        }, 100);
    }
    
    /**
     * 保护输入框焦点
     */
    protectInputFocus(e) {
        const touch = e.touches[0];
        const inputRect = this.activeInput.getBoundingClientRect();
        
        // 计算点击位置与输入框的距离
        const distance = Math.sqrt(
            Math.pow(touch.clientX - (inputRect.left + inputRect.width / 2), 2) +
            Math.pow(touch.clientY - (inputRect.top + inputRect.height / 2), 2)
        );
        
        // 如果点击距离输入框很远，可能是意外点击
        if (distance > 80) {
            // 记录触摸位置用于后续判断
            this.lastTouchY = touch.clientY;
            
            // 延迟检查焦点状态
            setTimeout(() => {
                this.ensureInputFocus();
            }, 50);
        }
    }
    
    /**
     * 确保输入框保持焦点
     */
    ensureInputFocus() {
        if (this.activeInput && document.activeElement !== this.activeInput) {
            console.log('恢复输入框焦点');
            this.activeInput.focus();
        }
    }
    
    /**
     * 确保输入框在视口中可见
     */
    ensureInputVisible() {
        if (!this.activeInput) return;
        
        const rect = this.activeInput.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // 如果输入框被遮挡或不在视口中
        if (rect.bottom > viewportHeight * 0.7 || rect.top < 0) {
            this.activeInput.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }
    
    /**
     * 键盘显示时的处理
     */
    onKeyboardShow() {
        console.log('虚拟键盘显示');
        document.body.classList.add('mobile-keyboard-active');
        
        // 确保输入框可见
        setTimeout(() => {
            this.ensureInputVisible();
        }, 100);
    }
    
    /**
     * 键盘隐藏时的处理
     */
    onKeyboardHide() {
        console.log('虚拟键盘隐藏');
        document.body.classList.remove('mobile-keyboard-active');
    }
    
    /**
     * 检查是否是输入元素
     */
    isInputElement(element) {
        return element && (
            element.tagName === 'INPUT' || 
            element.tagName === 'TEXTAREA' ||
            element.contentEditable === 'true'
        );
    }
    
    /**
     * 检查是否是输入相关元素
     */
    isInputRelated(element) {
        return element && (
            this.isInputElement(element) ||
            element.closest('input, textarea, .input-wrapper, button, .btn') ||
            element.classList.contains('btn') ||
            element.classList.contains('upload-tab') ||
            element.classList.contains('function-btn')
        );
    }
    
    /**
     * 获取当前活动的输入框
     */
    getActiveInput() {
        return this.activeInput;
    }
    
    /**
     * 手动设置活动输入框
     */
    setActiveInput(input) {
        if (this.isInputElement(input)) {
            this.activeInput = input;
            input.focus();
        }
    }
    
    /**
     * 销毁保护机制
     */
    destroy() {
        this.activeInput = null;
        this.keyboardVisible = false;
        clearTimeout(this.focusTimeout);
        clearTimeout(this.blurTimeout);
        
        // 移除所有保护标记
        document.querySelectorAll('[data-mobile-protected]').forEach(input => {
            input.removeAttribute('data-mobile-protected');
        });
        
        document.body.classList.remove('mobile-keyboard-active');
        console.log('移动端输入框保护已禁用');
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.mobileInputProtection = new MobileInputProtection();
});

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileInputProtection;
}