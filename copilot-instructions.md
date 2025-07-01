# 智链AI阅读助手 - 开发者文档

## 🏗️ 架构设计

### 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (HTML/JS) │────│   后端 (Flask)   │────│   AI服务 (GLM)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     浏览器        │    │    文件系统      │    │   外部API服务    │
│   (用户界面)       │    │   (数据存储)     │    │  (事实查证等)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈
- **前端**: HTML5 + CSS3 + 原生JavaScript
- **后端**: Python Flask + 蓝图模式
- **AI服务**: 智谱AI GLM-4-Flash/GLM-4V-Flash
- **文件处理**: PyPDF2 + python-docx + Pillow + easyocr
- **网络爬虫**: requests + BeautifulSoup4
- **数据存储**: 文件系统（CSV + JSON）

## 📦 模块详解

### 后端模块

#### 1. 路由模块 (routes/)
```python
# 认证路由 - auth.py
- POST /api/auth/register    # 用户注册
- POST /api/auth/login       # 用户登录
- POST /api/auth/logout      # 用户登出
- GET  /api/auth/check       # 检查登录状态
- GET  /api/auth/profile     # 获取用户资料

# 智能伴读 - intelligent_reading.py
- POST /api/intelligent-reading  # 智能伴读处理

# 全面分析 - comprehensive_analysis.py
- POST /api/comprehensive-analysis  # 全面分析处理

# 大师分析 - expert_analysis.py
- POST /api/expert-analysis  # 大师分析处理

# 真伪鉴定 - fact_checking.py
- POST /api/fact-checking    # 真伪鉴定处理

# 聊天历史 - chat_history.py
- GET    /api/chat/sessions           # 获取会话列表
- POST   /api/chat/sessions           # 创建新会话
- GET    /api/chat/sessions/{id}      # 获取会话详情
- PUT    /api/chat/sessions/{id}      # 更新会话信息
- DELETE /api/chat/sessions/{id}      # 删除会话
- GET    /api/chat/sessions/{id}/messages  # 获取会话消息
- POST   /api/chat/sessions/{id}/messages  # 保存消息
- GET    /api/chat/export             # 导出所有历史
- GET    /api/chat/sessions/{id}/export    # 导出单个会话
```

#### 2. 服务模块 (services/)
```python
# AI服务 - ai_service.py
class AIService:
    def chat_completion()        # 文本对话
    def chat_completion_vision() # 图像理解
    def stream_response()        # 流式响应处理
    
# 网页爬虫 - web_crawler.py
class WebCrawler:
    def crawl_url()             # 爬取网页内容
    def extract_text()          # 提取纯文本
    def get_page_title()        # 获取页面标题
    
# OCR服务 - ocr_service.py
class OCRService:
    def extract_text_from_image()  # 图片文字识别
    def process_batch_images()     # 批量处理图片
```

#### 3. 工具模块 (utils/)
```python
# 文件处理 - file_handler.py
class FileHandler:
    def save_uploaded_file()    # 保存上传文件
    def extract_text_from_pdf() # PDF文本提取
    def extract_text_from_docx() # Word文档提取
    def get_file_info()         # 获取文件信息
```

### 前端模块

#### 1. 核心管理类
```javascript
// 主应用 - app.js
class AIReaderApp:
    - 应用初始化和全局状态管理
    - 功能模块切换协调
    - 用户认证状态管理
    - 响应式布局控制

// 用户认证 - auth.js
class AuthManager:
    - 登录/注册表单管理
    - 用户状态维护
    - 认证API调用

// 上传管理 - upload.js
class UploadManager:
    - 文件拖拽上传
    - 多种文件格式支持
    - 上传进度显示
    - 链接内容处理

// 聊天管理 - chat.js
class ChatManager:
    - 消息发送和接收
    - 流式响应处理
    - 消息历史管理
    - 复制和交互功能

// 历史记录 - history.js
class HistoryManager:
    - 会话列表管理
    - 历史记录搜索
    - 会话导出功能
    - 历史数据展示

// 主题管理 - theme.js
class ThemeManager:
    - 主题切换控制
    - 动态背景管理
    - 用户偏好保存
    - 响应系统设置
```

#### 2. 样式模块
```css
/* 主样式 - style.css */
- 基础布局和组件样式
- 响应式设计规则
- 功能模块特定样式

/* 毛玻璃效果 - glassmorphism.css */
- 现代透明质感设计
- 背景模糊和边框效果
- 层次感和深度表现

/* 动画效果 - animations.css */
- 过渡动画定义
- 加载和交互动效
- 动态背景动画
```

## 🔄 数据流设计

### 用户交互流程
```
用户输入 → 前端验证 → 上传管理 → API调用 → 后端处理 → AI服务 → 流式响应 → 前端展示
    ↓                                                                           ↑
历史保存 ← 数据持久化 ← 消息格式化 ← 响应处理 ← 结果返回 ← 模型推理 ← 内容预处理 ← 数据解析
```

### 文件处理流程
```
文件上传 → 格式检测 → 内容提取 → 文本预处理 → AI分析 → 结果展示
    ↓
存储管理 → 路径记录 → 访问控制
```

### 聊天会话流程
```
创建会话 → 消息发送 → 实时响应 → 历史保存 → 会话管理
    ↓                                      ↑
会话列表 ← 数据查询 ← 消息存储 ← 格式化处理 ← 内容分析
```

## 🛠️ 开发指南

### 环境搭建
```bash
# 1. 克隆项目
git clone <repository-url>
cd AIReader

# 2. 安装Python依赖
cd backend
pip install -r requirements.txt

# 3. 配置环境变量
cp config.py.example config.py
# 编辑config.py，添加API密钥

# 4. 启动开发服务器
python app.py
```

### 开发规范

#### 代码风格
- **Python**: 遵循PEP 8规范
- **JavaScript**: 使用ES6+语法，遵循Airbnb风格指南
- **HTML/CSS**: 语义化标签，BEM命名规范

#### 文件命名
- **Python文件**: snake_case（如：ai_service.py）
- **JavaScript文件**: camelCase（如：chatManager.js）
- **CSS文件**: kebab-case（如：glassmorphism.css）

#### 注释规范
```python
# Python注释示例
def process_content(content: str) -> dict:
    """
    处理用户输入内容
    
    Args:
        content (str): 用户输入的原始内容
        
    Returns:
        dict: 处理后的结构化数据
        
    Raises:
        ValueError: 当内容格式不正确时
    """
    pass
```

```javascript
// JavaScript注释示例
/**
 * 发送消息到AI服务
 * @param {Object} message - 消息对象
 * @param {string} message.content - 消息内容
 * @param {string} endpoint - API端点
 * @returns {Promise<void>} 无返回值的Promise
 */
async function sendMessage(message, endpoint) {
    // 实现逻辑
}
```

### 新功能开发

#### 1. 添加新的AI功能
```python
# 1. 创建新的路由文件
# backend/routes/new_feature.py
from flask import Blueprint, request, jsonify
from services.ai_service import AIService

new_feature_bp = Blueprint('new_feature', __name__)

@new_feature_bp.route('/api/new-feature', methods=['POST'])
def handle_new_feature():
    # 处理逻辑
    pass

# 2. 在app.py中注册蓝图
from routes.new_feature import new_feature_bp
app.register_blueprint(new_feature_bp)

# 3. 添加前端交互逻辑
# frontend/js/newFeature.js
class NewFeatureManager {
    // 实现新功能的前端逻辑
}
```

#### 2. 添加新的文件类型支持
```python
# 在utils/file_handler.py中添加新的处理函数
def extract_text_from_new_format(file_path):
    """处理新文件格式的函数"""
    pass

# 在前端upload.js中添加新的文件类型
const supportedTypes = [
    ...existing_types,
    '.new_extension'
];
```

### 测试指南

#### 单元测试
```python
# 创建测试文件 tests/test_ai_service.py
import unittest
from services.ai_service import AIService

class TestAIService(unittest.TestCase):
    def setUp(self):
        self.ai_service = AIService()
    
    def test_chat_completion(self):
        # 测试聊天完成功能
        pass
```

#### 前端测试
```javascript
// 使用浏览器开发者工具进行测试
// 检查网络请求、控制台错误、性能指标

// 测试示例
console.log('测试聊天功能...');
chatManager.sendMessage({content: '测试消息'}, '/api/test');
```

## 🚀 部署指南

### 生产环境部署

#### 1. 服务器配置
```bash
# 安装依赖
sudo apt update
sudo apt install python3 python3-pip nginx

# 安装Python包
pip3 install -r requirements.txt
pip3 install gunicorn
```

#### 2. Nginx配置
```nginx
# /etc/nginx/sites-available/aireader
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /static/ {
        alias /path/to/AIReader/frontend/;
        expires 1y;
    }
}
```

#### 3. 系统服务配置
```ini
# /etc/systemd/system/aireader.service
[Unit]
Description=AI Reader Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/AIReader/backend
ExecStart=/usr/local/bin/gunicorn -w 4 -b 127.0.0.1:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker部署
```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 80

CMD ["python", "backend/app.py"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  aireader:
    build: .
    ports:
      - "80:80"
    volumes:
      - ./data:/app/data
    environment:
      - GLM_API_KEY=your_api_key
```

## 🔧 配置参考

### 环境变量
```bash
# API配置
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/

# 服务器配置
HOST=0.0.0.0
PORT=80
DEBUG=False

# 文件上传配置
MAX_CONTENT_LENGTH=10485760  # 10MB
UPLOAD_FOLDER=data/uploads

# 会话配置
SESSION_TIMEOUT=3600  # 1小时
MAX_CHAT_HISTORY=100
```

### 性能优化
```python
# 1. 启用文件缓存
from werkzeug.middleware.shared_data import SharedDataMiddleware
app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
    '/static': 'frontend'
})

# 2. 启用gzip压缩
from flask_compress import Compress
Compress(app)

# 3. 配置缓存头
@app.after_request
def after_request(response):
    response.headers['Cache-Control'] = 'public, max-age=300'
    return response
```

## 🐞 调试技巧

### 后端调试
```python
# 启用详细日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 使用Flask调试模式
app.run(debug=True, host='0.0.0.0', port=80)

# API响应调试
@app.after_request
def log_response(response):
    app.logger.info(f'Response: {response.status_code}')
    return response
```

### 前端调试
```javascript
// 启用详细控制台日志
window.DEBUG = true;

// 网络请求监控
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('Fetch:', args);
    return originalFetch.apply(this, args);
};

// 性能监控
performance.mark('app-start');
// ... 应用逻辑
performance.mark('app-end');
performance.measure('app-load', 'app-start', 'app-end');
```

## 📚 扩展开发

### 添加新的AI模型
```python
# 1. 扩展AIService类
class AIService:
    def __init__(self):
        self.models = {
            'glm-4-flash': self._glm_4_flash,
            'new-model': self._new_model  # 新模型
        }
    
    def _new_model(self, messages, **kwargs):
        # 新模型的实现
        pass
```

### 添加新的文件格式
```python
# 1. 扩展文件处理器
def extract_text_from_pptx(file_path):
    """处理PowerPoint文件"""
    from pptx import Presentation
    prs = Presentation(file_path)
    text_content = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                text_content.append(shape.text)
    return '\n'.join(text_content)

# 2. 注册新处理器
FILE_PROCESSORS = {
    '.pdf': extract_text_from_pdf,
    '.docx': extract_text_from_docx,
    '.pptx': extract_text_from_pptx,  # 新增
}
```

### 添加新的主题
```css
/* 新主题样式 */
.custom-theme {
    --primary-color: #ff6b6b;
    --secondary-color: #4ecdc4;
    --background-color: #ffe8e8;
    /* 其他变量定义... */
}
```

---

## 📞 技术支持

如有开发问题，请：
1. 查看本文档和README
2. 检查Issue列表
3. 提交新Issue或Pull Request
4. 联系开发团队

Happy Coding! 🎉
