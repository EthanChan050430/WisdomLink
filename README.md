<center>

# 智链 - AI智能阅读助手

<p style="text-align: center; font-size: 24px;">
万卷风烟静，一链定云心
</p>
</center>

<center>
<img src="https://i0.hdslb.com/bfs/new_dyn/bc9374ed7909bd1715ea5d9fc453341b141432942.jpg" style="max-width: 50%; height: auto;">
</center>

## 项目简介

智链是一款基于大语言模型（GLM-4-Flash/GLM-4V-Flash）的智能内容分析平台，支持文本、链接、文档、图片等多种输入，适配桌面和移动端。通过流式AI分析、专家角色切换、事实核查等功能，助力高效阅读与深度理解。

## 主要特性

- 智能伴读、全面总结、大师分析、真伪鉴定四大核心模式
- 支持文本、网页链接、PDF/DOCX/TXT文档、图片（GLM-4V-Flash视觉模型）
- 实时流式AI回复，思考过程可视化
- 多专家角色切换（如鲁迅、胡适、爱因斯坦等）
- 语音输入与朗读，移动端友好，自动主题切换
- 聊天历史保存、导出与多会话管理

## 快速开始

### 环境要求
- Python 3.8+
- 现代浏览器（Chrome、Firefox、Edge等）

### 安装依赖
```bash
cd backend
pip install -r requirements.txt
```

### 配置
1. 编辑 `backend/config.py`，填写你的 GLM_API_KEY（智谱AI开放平台获取）
2. 可选：配置 TTS_API_TOKEN 以启用语音朗读

### 启动
```bash
cd backend
python app.py
```
访问 http://localhost:7000 或 http://127.0.0.1:7000

## 技术架构

- 前端：HTML5 + CSS3 + 原生JavaScript（响应式设计，支持移动端）
- 后端：Python Flask + 蓝图路由
- AI服务：智谱AI GLM-4-Flash/GLM-4V-Flash（支持图片理解）
- 文件处理：PyPDF2、python-docx、Pillow、OCR
- 语音：Web Speech API（浏览器）、TTS API（可选）

## 主要目录结构

```
backend/    # Flask后端，API与AI服务
frontend/   # 前端静态页面与资源
data/       # 用户数据、上传文件、聊天历史
```

## 常见问题

- 语音功能异常：请检查浏览器支持、麦克风权限、TTS Token
- 上传失败：请检查文件大小（≤10MB）、格式、网络
- AI回复慢：请检查API密钥、网络、配额
- 端口修改：编辑 `backend/config.py` 或环境变量 PORT

## 贡献

欢迎提交Issue和Pull Request！

---
此项目为澳门城市大学参赛作品，仅供学习交流使用。

### 环境要求
- Python 3.8+
- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 网络连接（用于AI API调用）

### 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 配置设置

1. 复制配置文件模板：
```bash
cp config.py.example config.py
```

2. 编辑 `backend/config.py`，配置您的API密钥：
```python
# GLM API配置
GLM_API_KEY = "your_glm_api_key_here"
GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/"

# TTS API配置（可选）
TTS_API_TOKEN = "your_tts_token_here"

# 服务器配置
DEBUG = True
HOST = "0.0.0.0"
PORT = 80
```

### 启动应用

```bash
cd backend
python app.py
```

应用将在 `http://localhost` 启动（默认80端口）。

## 🏗️ 架构设计

### 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (HTML/JS) │────│   后端 (Flask)  │────│   AI服务 (GLM)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     浏览器      │    │    文件系统      │    │   外部API服务    │
│ (用户界面+语音)  │    │   (数据存储)     │    │ (事实查证+TTS)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈
- **前端**: HTML5 + CSS3 + 原生JavaScript + Web Speech API
- **后端**: Python Flask + 蓝图模式
- **AI服务**: 智谱AI GLM-4-Flash/GLM-4V-Flash
- **语音服务**: 慕名API（百度+讯飞TTS）+ 浏览器Speech API
- **文件处理**: PyPDF2 + python-docx + Pillow + easyocr
- **网络爬虫**: requests + BeautifulSoup4
- **数据存储**: 文件系统（CSV + JSON）

## 📁 项目结构

```
AIReader/
├── backend/                 # 后端Flask应用
│   ├── app.py              # 主应用入口
│   ├── config.py           # 配置文件
│   ├── requirements.txt    # Python依赖
│   ├── routes/             # 路由模块
│   │   ├── auth.py         # 用户认证
│   │   ├── intelligent_reading.py    # 智能伴读
│   │   ├── comprehensive_analysis.py # 全面总结
│   │   ├── expert_analysis.py        # 大师分析
│   │   ├── fact_checking.py          # 真伪鉴定
│   │   ├── chat_history.py           # 聊天历史
│   │   └── tts.py                    # 语音合成服务 🆕
│   ├── services/           # 业务服务
│   │   ├── ai_service.py   # AI服务
│   │   ├── web_crawler.py  # 网页爬虫
│   │   └── ocr_service.py  # OCR识别
│   └── utils/              # 工具模块
│       └── file_handler.py # 文件处理
├── frontend/               # 前端静态文件
│   ├── index.html          # 主页面
│   ├── css/                # 样式文件
│   │   ├── style.css       # 主样式
│   │   ├── glassmorphism.css # 毛玻璃效果
│   │   └── animations.css  # 动画效果
│   ├── js/                 # JavaScript文件
│   │   ├── app.js          # 主应用逻辑
│   │   ├── auth.js         # 用户认证
│   │   ├── upload.js       # 文件上传
│   │   ├── chat.js         # 聊天管理（含语音功能）🆕
│   │   ├── history.js      # 历史记录
│   │   ├── theme.js        # 主题管理
│   │   └── utils.js        # 工具函数
│   └── images/             # 静态图片资源
└── data/                   # 数据存储目录
    ├── users/              # 用户数据
    ├── uploads/            # 上传文件
    └── chat_history/       # 聊天记录
```

## 📦 模块详解

### 后端API

#### 1. 路由模块 (routes/)
```python
# 认证路由 - auth.py
- POST /api/auth/register    # 用户注册
- POST /api/auth/login       # 用户登录
- POST /api/auth/logout      # 用户登出
- GET  /api/auth/check       # 检查登录状态
- GET  /api/auth/profile     # 获取用户资料

# 智能伴读 - intelligent_reading.py
- POST /api/intelligent-reading/start  # 开始智能伴读
- POST /api/intelligent-reading/chat   # 继续对话

# 全面分析 - comprehensive_analysis.py
- POST /api/comprehensive-analysis/start  # 开始全面分析

# 大师分析 - expert_analysis.py
- POST /api/expert-analysis/start  # 开始大师分析
- POST /api/expert-analysis/chat   # 继续对话

# 真伪鉴定 - fact_checking.py
- POST /api/fact-checking/start    # 开始真伪鉴定

# 聊天历史 - chat_history.py
- GET    /api/chat-history/sessions           # 获取会话列表
- POST   /api/chat-history/create             # 创建新会话
- GET    /api/chat-history/sessions/{id}      # 获取会话详情
- PUT    /api/chat-history/sessions/{id}      # 更新会话信息
- DELETE /api/chat-history/sessions/{id}      # 删除会话
- GET    /api/chat-history/sessions/{id}/messages  # 获取会话消息
- POST   /api/chat-history/sessions/{id}/messages  # 保存消息
- GET    /api/chat-history/export             # 导出所有历史
- GET    /api/chat-history/sessions/{id}/export    # 导出单个会话

# 语音合成 - tts.py 🆕
- POST /api/tts              # 文本转语音
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

// 聊天管理 - chat.js 🆕
class ChatManager:
    - 消息发送和接收
    - 流式响应处理
    - 消息历史管理
    - 复制和朗读功能
    - 语音输入集成 🆕
    - TTS语音合成 🆕

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
- 语音按钮样式 🆕

/* 毛玻璃效果 - glassmorphism.css */
- 现代透明质感设计
- 背景模糊和边框效果
- 层次感和深度表现

/* 动画效果 - animations.css */
- 过渡动画定义
- 加载和交互动效
- 动态背景动画
- 语音按钮动画 🆕
```

## 🔄 数据流设计

### 用户交互流程
```
用户输入 → 前端验证   → 上传管理  → API调用   → 后端处理 → AI服务   → 流式响应 → 前端展示
    ↓                                                                           ↑
历史保存 ← 数据持久化 ← 消息格式化 ← 响应处理 ← 结果返回 ← 模型推理 ← 内容预处理 ← 数据解析
```

### 语音交互流程 🆕
```
语音输入 → Web Speech API → 实时转换 → 文字填入 → 正常处理流程
    ↓
朗读请求 → TTS API调用 → 音频生成 → 播放控制
    ↓
降级方案 → 浏览器语音合成 → Speech Synthesis API → 本地播放
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

## 🔧 配置说明

### GLM API配置
本项目使用智谱AI的GLM-4-Flash和GLM-4V-Flash模型：

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册账号并获取API密钥
3. 在 `config.py` 中配置API密钥

### TTS API配置 🆕
本项目使用慕名API提供的语音合成服务：

1. 访问 [慕名API](http://xiaoapi.cn)
2. 获取API Token
3. 在 `backend/routes/tts.py` 中配置Token

```python
# TTS配置
TTS_API_BASE = "https://api.suol.cc/v1/zs_tts.php"
TTS_TOKEN = "your_token_here"
```

### 文件上传限制
默认配置：
- 最大文件大小：10MB
- 支持格式：TXT、PDF、DOCX、JPG、PNG、GIF等
- 上传目录：`data/uploads/`

### 用户数据存储
- 用户信息：`data/users/user.csv`（明文存储）
- 聊天记录：`data/chat_history/{username}/`
- 上传文件：`data/uploads/{username}/`

### 环境变量
```bash
# API配置
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
TTS_TOKEN=your_tts_token  🆕

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

## 🎮 使用指南

### 基本操作
1. **注册/登录**: 点击右上角登录按钮
2. **选择功能**: 点击顶部功能按钮切换模式
3. **输入内容**: 可以输入文本、上传文件、粘贴链接或使用语音输入
4. **开始分析**: 点击发送按钮或按Enter键

### 功能详解

#### 🤖 智能伴读
- 适合日常阅读理解和答疑
- 支持连续对话，保持上下文
- 可以随时提问，获得详细解释
- 支持语音输入问题和朗读回答

#### 📊 全面总结
- 自动进行四步分析：
  1. **概要**: 内容的基本信息和主题
  2. **细节**: 深入分析具体内容
  3. **思考**: 批判性思维和观点评价
  4. **总结**: 综合结论和启发

#### 👨‍🎓 大师分析
- 预设角色：鲁迅、胡适、可莉、苏格拉底、爱因斯坦、孔子
- 支持自定义角色（如马云、乔布斯等）
- 每个角色都有独特的分析视角和表达风格
- 角色匹配专属音色进行朗读

#### 🔍 真伪鉴定
- 四步验证流程：
  1. **文章解析**: 分析内容结构和关键信息
  2. **关键词提取**: 识别需要验证的关键事实
  3. **资料查阅**: 调用外部API查证信息
  4. **真伪鉴定**: 给出可信度评估和可疑点

#### 🆕 语音交互功能
- **语音输入**: 点击麦克风图标开始语音识别，支持中文优化
- **智能朗读**: 点击朗读按钮，AI会根据当前角色选择合适音色
- **播放控制**: 支持播放、暂停、停止等操作
- **降级方案**: TTS不可用时自动使用浏览器语音合成

### 快捷键
- `Ctrl + Enter` / `Enter`: 发送消息
- `Shift + Enter`: 换行
- `Ctrl + K`: 聚焦搜索框
- `Esc`: 关闭弹窗

## 🎨 主题和样式

### 主题切换
- **浅色主题**: 适合白天使用
- **深色主题**: 适合夜间使用
- **自动主题**: 根据系统设置自动切换

### 动态背景
- 自动切换的渐变背景动画
- 根据主题调整颜色方案
- 可通过设置开关控制

### 简洁模式
- 隐藏次要UI元素
- 专注于核心聊天体验
- 适合移动端使用

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

<center>
<img src='https://mumu-apk.fp.ps.netease.com/file/67c8fb5fcb38681ea1000f49urcsHD1q06' alt='维护公告' width='600' style="max-width: 50%; height: auto;"></center>

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

#### 3. 添加新的语音服务 
```python
# 在routes/tts.py中添加新的TTS提供商
def call_new_tts_provider(text, voice_config):
    """调用新的TTS服务提供商"""
    pass

# 在前端chat.js中配置新的音色
const voiceMapping = {
    'new_expert': {
        type: 'new_provider',
        id: 'voice_id',
        name: '新音色名称'
    }
};
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

// 语音功能测试
console.log('测试语音输入...');
if ('webkitSpeechRecognition' in window) {
    console.log('浏览器支持语音识别');
} else {
    console.log('浏览器不支持语音识别');
}

// TTS功能测试
console.log('测试语音合成...');
if ('speechSynthesis' in window) {
    console.log('浏览器支持语音合成');
} else {
    console.log('浏览器不支持语音合成');
}
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
ExecStart=/usr/local/bin/gunicorn -w 4 -b 127.0.0.1:80 app:app
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
      - TTS_TOKEN=your_tts_token
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

// 语音功能调试 🆕
function debugSpeechFeatures() {
    console.log('Speech Recognition:', 'webkitSpeechRecognition' in window);
    console.log('Speech Synthesis:', 'speechSynthesis' in window);
    if ('speechSynthesis' in window) {
        console.log('Available voices:', speechSynthesis.getVoices());
    }
}

// 性能监控
performance.mark('app-start');
// ... 应用逻辑
performance.mark('app-end');
performance.measure('app-load', 'app-start', 'app-end');
```

## 🔒 安全说明

⚠️ **重要提醒**: 当前版本的用户认证采用明文存储，仅供演示使用，不适合生产环境。

生产环境建议：
- 使用bcrypt等库对密码进行加密存储
- 实现JWT token认证机制
- 添加HTTPS支持
- 实现更完善的权限控制
- TTS API Token安全存储

## 🐛 常见问题

### Q: 语音功能不工作怎么办？ 🆕
A: 检查以下几点：
- 浏览器是否支持Web Speech API（推荐使用Chrome）
- 是否允许了麦克风权限
- 网络连接是否正常（用于TTS API调用）
- TTS Token是否配置正确

### Q: 上传文件失败怎么办？
A: 检查文件大小是否超过10MB，格式是否支持，以及网络连接是否正常。

### Q: AI回复很慢或失败？
A: 检查API密钥配置是否正确，网络连接是否稳定，API配额是否充足。

### Q: 如何修改端口？
A: 编辑 `backend/config.py` 中的 `PORT` 配置项。

### Q: 朗读功能提示不支持怎么办？ 🆕
A: 系统会自动降级到浏览器语音合成，如果仍不支持，建议更换现代浏览器。

## 📚 扩展开发

### 添加新的AI模型
```python
# 1. 扩展AIService类
class AIService:
    def __init__(self):
        self.models = {
            'glm-4-flash': self._glm_4_flash,
            'glm-4v-flash': self._glm_4v_flash,
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

### 添加新的语音服务商 🆕
```python
# 1. 扩展TTS服务
def call_azure_tts(text, voice_config):
    """调用Azure语音服务"""
    # Azure TTS实现
    pass

def call_google_tts(text, voice_config):
    """调用Google语音服务"""
    # Google TTS实现
    pass

# 2. 更新语音配置
TTS_PROVIDERS = {
    'baidu': call_baidu_tts,
    'xunfei': call_xunfei_tts,
    'azure': call_azure_tts,    # 新增
    'google': call_google_tts,  # 新增
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

/* 语音按钮主题适配 */
.custom-theme .btn-voice {
    background: var(--primary-color);
    border-color: var(--primary-color);
}

.custom-theme .btn-voice.listening {
    background: var(--secondary-color);
    animation: pulse-custom 1.5s infinite;
}
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建Pull Request

<br>
<br>
<footer>
<div align="center">
  <p>此项目为 cyx | lxh | cjj 参赛作品</p>
  <p>Please don't use it for commercial purposes.</p>
  <p>If you have any questions, welcome to talk with us.</p>
</div>
</footer>