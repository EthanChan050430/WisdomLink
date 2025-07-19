/**
 * 主题管理模块
 * 负责亮暗主题切换、动态背景管理等功能
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.backgroundInterval = null;
        this.backgroundIndex = 0;
        this.init();
    }

    init() {
        this.loadTheme();
        this.bindEvents();
        this.initDynamicBackground();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 主题切换按钮
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // 监听系统主题变化
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }

        // 背景控制
        document.getElementById('backgroundToggle')?.addEventListener('click', () => {
            this.toggleDynamicBackground();
        });
    }

    /**
     * 加载保存的主题设置
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        
        this.setTheme(newTheme);
    }

    /**
     * 设置主题
     */
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        if (theme === 'auto') {
            // 根据系统设置自动选择
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(prefersDark ? 'dark' : 'light');
        } else {
            this.applyTheme(theme);
        }
        
        this.updateThemeButton();
        showNotification(`已切换到${this.getThemeName(theme)}主题`, 'success');
    }

    /**
     * 应用主题
     */
    applyTheme(theme) {
        const root = document.documentElement;
        const body = document.body;
        
        // 移除所有主题类
        body.classList.remove('light-theme', 'dark-theme');
        
        // 添加新主题类
        body.classList.add(`${theme}-theme`);
        
        // 设置CSS变量
        if (theme === 'light') {
            root.style.setProperty('--primary-color', '#007bff');
            root.style.setProperty('--secondary-color', '#6c757d');
            root.style.setProperty('--background-color', '#ffffff');
            root.style.setProperty('--surface-color', '#f8f9fa');
            root.style.setProperty('--text-primary', '#212529');
            root.style.setProperty('--text-secondary', '#6c757d');
            root.style.setProperty('--border-color', '#dee2e6');
            root.style.setProperty('--glass-background', 'rgba(255, 255, 255, 0.1)');
            root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.2)');
            root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
        } else {
            root.style.setProperty('--primary-color', '#0d6efd');
            root.style.setProperty('--secondary-color', '#6c757d');
            root.style.setProperty('--background-color', '#0d1117');
            root.style.setProperty('--surface-color', '#161b22');
            root.style.setProperty('--text-primary', '#f0f6fc');
            root.style.setProperty('--text-secondary', '#8b949e');
            root.style.setProperty('--border-color', '#30363d');
            root.style.setProperty('--glass-background', 'rgba(255, 255, 255, 0.05)');
            root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
            root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
        }

        // 更新动态背景
        this.updateDynamicBackground();
    }

    /**
     * 更新主题按钮
     */
    updateThemeButton() {
        const themeButton = document.getElementById('themeToggle');
        if (!themeButton) return;

        const icons = {
            light: 'fa-sun',
            dark: 'fa-moon', 
            auto: 'fa-adjust'
        };

        const icon = themeButton.querySelector('i');
        if (icon) {
            icon.className = `fas ${icons[this.currentTheme]}`;
        }

        themeButton.title = `当前主题: ${this.getThemeName(this.currentTheme)}`;
    }

    /**
     * 获取主题名称
     */
    getThemeName(theme) {
        const names = {
            light: '浅色',
            dark: '深色',
            auto: '自动'
        };
        return names[theme] || theme;
    }

    /**
     * 初始化动态背景
     */
    initDynamicBackground() {
        this.createBackgroundElements();
        this.startDynamicBackground();
    }

    /**
     * 创建背景元素
     */
    createBackgroundElements() {
        // 检查是否已存在背景容器
        let backgroundContainer = document.getElementById('dynamicBackground');
        if (!backgroundContainer) {
            backgroundContainer = document.createElement('div');
            backgroundContainer.id = 'dynamicBackground';
            backgroundContainer.className = 'dynamic-background';
            document.body.appendChild(backgroundContainer);
        }

        // 创建粒子效果
        this.createParticles(backgroundContainer);
        
        // 创建渐变背景
        this.createGradientBackground(backgroundContainer);
    }

    /**
     * 创建粒子效果
     */
    createParticles(container) {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles-container';
        
        // 创建30个粒子
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // 随机位置和动画延迟
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            
            particlesContainer.appendChild(particle);
        }
        
        container.appendChild(particlesContainer);
    }

    /**
     * 创建渐变背景
     */
    createGradientBackground(container) {
        const gradientContainer = document.createElement('div');
        gradientContainer.className = 'gradient-background';
        gradientContainer.id = 'gradientBackground';
        
        container.appendChild(gradientContainer);
    }

    /**
     * 启动动态背景
     */
    startDynamicBackground() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
        }

        this.updateDynamicBackground();
        
        // 每10秒更换背景
        this.backgroundInterval = setInterval(() => {
            this.updateDynamicBackground();
        }, 10000);
    }

    /**
     * 停止动态背景
     */
    stopDynamicBackground() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }
    }

    /**
     * 更新动态背景
     */
    updateDynamicBackground() {
        const gradientBackground = document.getElementById('gradientBackground');
        if (!gradientBackground) return;

        const isDark = document.body.classList.contains('dark-theme');
        
        // 定义渐变色组合
        const lightGradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'
        ];

        const darkGradients = [
            'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
            'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
            'linear-gradient(135deg, #667db6 0%, #0082c8 100%)',
            'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
            'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
            'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)',
            'linear-gradient(135deg, #2c3e50 0%, #4a6741 100%)'
        ];

        const gradients = isDark ? darkGradients : lightGradients;
        const currentGradient = gradients[this.backgroundIndex];
        
        gradientBackground.style.background = currentGradient;
        
        // 下一个渐变
        this.backgroundIndex = (this.backgroundIndex + 1) % gradients.length;
    }

    /**
     * 切换动态背景开关
     */
    toggleDynamicBackground() {
        const backgroundContainer = document.getElementById('dynamicBackground');
        if (!backgroundContainer) return;

        const isEnabled = backgroundContainer.style.display !== 'none';
        
        if (isEnabled) {
            backgroundContainer.style.display = 'none';
            this.stopDynamicBackground();
            localStorage.setItem('dynamicBackground', 'false');
            showNotification('动态背景已关闭', 'info');
        } else {
            backgroundContainer.style.display = 'block';
            this.startDynamicBackground();
            localStorage.setItem('dynamicBackground', 'true');
            showNotification('动态背景已开启', 'info');
        }

        this.updateBackgroundButton();
    }

    /**
     * 更新背景按钮
     */
    updateBackgroundButton() {
        const backgroundButton = document.getElementById('backgroundToggle');
        if (!backgroundButton) return;

        const backgroundContainer = document.getElementById('dynamicBackground');
        const isEnabled = backgroundContainer && backgroundContainer.style.display !== 'none';

        const icon = backgroundButton.querySelector('i');
        if (icon) {
            icon.className = `fas ${isEnabled ? 'fa-eye' : 'fa-eye-slash'}`;
        }

        backgroundButton.title = `动态背景: ${isEnabled ? '开启' : '关闭'}`;
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 是否为暗色主题
     */
    isDarkTheme() {
        return document.body.classList.contains('dark-theme');
    }

    /**
     * 添加主题变化监听器
     */
    onThemeChange(callback) {
        if (typeof callback === 'function') {
            // 创建自定义事件
            document.addEventListener('themeChanged', callback);
        }
    }

    /**
     * 触发主题变化事件
     */
    triggerThemeChange() {
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: this.currentTheme,
                isDark: this.isDarkTheme()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 恢复设置
     */
    restoreSettings() {
        // 恢复动态背景设置
        const backgroundEnabled = localStorage.getItem('dynamicBackground') !== 'false';
        const backgroundContainer = document.getElementById('dynamicBackground');
        
        if (backgroundContainer) {
            backgroundContainer.style.display = backgroundEnabled ? 'block' : 'none';
        }

        if (backgroundEnabled) {
            this.startDynamicBackground();
        } else {
            this.stopDynamicBackground();
        }

        this.updateBackgroundButton();
    }

    /**
     * 销毁
     */
    destroy() {
        this.stopDynamicBackground();
        
        // 移除事件监听器
        const themeToggle = document.getElementById('themeToggle');
        const backgroundToggle = document.getElementById('backgroundToggle');
        
        if (themeToggle) {
            themeToggle.removeEventListener('click', this.toggleTheme);
        }
        
        if (backgroundToggle) {
            backgroundToggle.removeEventListener('click', this.toggleDynamicBackground);
        }
    }
}

// 全局主题管理器实例
let themeManager;

// 初始化主题管理器
document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
    
    // 恢复设置
    setTimeout(() => {
        themeManager.restoreSettings();
    }, 100);
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (themeManager) {
        themeManager.destroy();
    }
});
