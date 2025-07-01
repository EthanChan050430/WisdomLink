# 智链 - AI智能阅读助手

> 一个基于大模型的智能内容分析平台，支持多种输入方式和分析角度

## 📖 项目简介

智链是一个功能丰富的AI智能阅读助手，旨在帮助用户更好地理解和分析各种内容。通过集成先进的大语言模型API，提供智能伴读、全面总结、大师分析、真伪鉴定四大核心功能。

## ✨ 主要特性

### 🎯 四大核心功能
- **🤖 智能伴读**: 深入解读内容，持续对话答疑
- **📊 全面总结**: 四步分析（概要→细节→思考→总结）
- **👨‍🎓 大师分析**: 多角色视角分析（鲁迅、胡适、可莉等）
- **🔍 真伪鉴定**: 四步验证内容真实性和可信度

### 📤 多样化输入支持
- **网页链接**: 自动爬取网页内容
- **图片文件**: OCR识别图片中的文字
- **文档上传**: 支持TXT、PDF、DOCX等格式
- **直接输入**: 纯文本内容输入

### 🎨 精美UI设计
- **毛玻璃效果**: 现代化的透明质感设计
- **动态背景**: 自动切换的渐变背景动画
- **主题切换**: 支持亮色/暗色/自动主题
- **响应式布局**: 完美适配桌面端和移动端

### 💬 智能聊天体验
- **流式响应**: 实时显示AI回复过程
- **思考过程**: AI思考内容可折叠显示
- **聊天历史**: 会话保存、切换、导出功能
- **快捷操作**: 一键复制、搜索历史记录

## 🚀 快速开始

### 环境要求
- Python 3.8+
- Node.js 14+ (用于前端开发，可选)
- 现代浏览器（Chrome、Firefox、Safari、Edge）

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
│   │   └── chat_history.py           # 聊天历史
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
│   │   ├── chat.js         # 聊天管理
│   │   ├── history.js      # 历史记录
│   │   ├── theme.js        # 主题管理
│   │   └── utils.js        # 工具函数
│   └── images/             # 静态图片资源
└── data/                   # 数据存储目录
    ├── users/              # 用户数据
    ├── uploads/            # 上传文件
    └── chat_history/       # 聊天记录
```

## 🔧 配置说明

### GLM API配置
本项目使用智谱AI的GLM-4-Flash和GLM-4V-Flash模型：

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册账号并获取API密钥
3. 在 `config.py` 中配置API密钥

### 文件上传限制
默认配置：
- 最大文件大小：10MB
- 支持格式：TXT、PDF、DOCX、JPG、PNG、GIF等
- 上传目录：`data/uploads/`

### 用户数据存储
- 用户信息：`data/users/user.csv`（明文存储）
- 聊天记录：`data/chat_history/{username}/`
- 上传文件：`data/uploads/{username}/`

## 🎮 使用指南

### 基本操作
1. **注册/登录**: 点击右上角登录按钮
2. **选择功能**: 点击顶部功能按钮切换模式
3. **输入内容**: 可以输入文本、上传文件或粘贴链接
4. **开始分析**: 点击发送按钮或按Enter键

### 功能详解

#### 🤖 智能伴读
- 适合日常阅读理解和答疑
- 支持连续对话，保持上下文
- 可以随时提问，获得详细解释

#### 📊 全面总结
- 自动进行四步分析：
  1. **概要**: 内容的基本信息和主题
  2. **细节**: 深入分析具体内容
  3. **思考**: 批判性思维和观点评价
  4. **总结**: 综合结论和启发

#### 👨‍🎓 大师分析
- 预设角色：鲁迅、胡适、可莉、苏格拉底、爱因斯坦
- 支持自定义角色（如马云、乔布斯等）
- 每个角色都有独特的分析视角和表达风格

#### 🔍 真伪鉴定
- 四步验证流程：
  1. **文章解析**: 分析内容结构和关键信息
  2. **关键词提取**: 识别需要验证的关键事实
  3. **资料查阅**: 调用外部API查证信息
  4. **真伪鉴定**: 给出可信度评估和可疑点

### 快捷键
- `Ctrl + Enter`: 发送消息
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

## 🔒 安全说明

⚠️ **重要提醒**: 当前版本的用户认证采用明文存储，仅供演示使用，不适合生产环境。

生产环境建议：
- 使用bcrypt等库对密码进行加密存储
- 实现JWT token认证机制
- 添加HTTPS支持
- 实现更完善的权限控制

## 🐛 常见问题

### Q: 如何获取GLM API密钥？
A: 访问 [智谱AI开放平台](https://open.bigmodel.cn/)，注册后在控制台获取API密钥。

### Q: 上传文件失败怎么办？
A: 检查文件大小是否超过10MB，格式是否支持，以及网络连接是否正常。

### Q: AI回复很慢或失败？
A: 检查API密钥配置是否正确，网络连接是否稳定，API配额是否充足。

### Q: 如何修改端口？
A: 编辑 `backend/config.py` 中的 `PORT` 配置项。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建Pull Request

## 📄 开源协议

本项目采用 MIT 协议开源。

## 🙏 致谢

- [智谱AI](https://www.zhipuai.cn/) - 提供强大的GLM模型API
- [Flask](https://flask.palletsprojects.com/) - 轻量级Web框架
- [Bootstrap](https://getbootstrap.com/) - UI组件库
- [Font Awesome](https://fontawesome.com/) - 图标库

---

<div align="center">
  <p>如果这个项目对您有帮助，请考虑给一个 ⭐️</p>
  <p>Made with ❤️ by AI Reader Team</p>
</div>
