# 智链 (SmartChain) - 智能全维分析平台

![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0%2B-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-14%2B-brightgreen.svg)
![AI](https://img.shields.io/badge/AI-Ollama-purple.svg)
![License](https://img.shields.io/badge/License-MIT-orange.svg)

智链是一个集成了**深度阅读**、**专家级分析**、**实时事实核查**与**多模态交互**的智能分析系统。它旨在帮助用户从海量信息中快速提取核心价值，去伪存真，实现高效的知识获取与决策支持。

## 项目背景与痛点

在信息爆炸的时代，我们面临着前所未有的挑战：

*   **信息过载**：每天面对海量文档和新闻，难以快速提炼关键信息，时间成本高昂。
*   **真伪难辨**：网络信息鱼龙混杂，谣言与误导性内容泛滥，缺乏便捷的权威查证工具。
*   **浅层阅读**：碎片化阅读使得大多数认知停留在表面，缺乏领域专家的深度见解和多维度剖析。
*   **交互单一**：传统的文本交互方式无法满足听觉、视觉等多模态的学习与获取需求。

**智链** 正是为了解决这些痛点而生。它不仅仅是一个阅读工具，更是你的私人专家顾问团，帮助你穿透信息迷雾，洞察本质。

## 核心功能

### 智能深度阅读
*   自动提取文档摘要、关键实体和核心观点。
*   结构化梳理长文本，显著提升阅读效率。

### 专家级综合分析
*   模拟多领域专家视角（经济、科技、社会等），对话题进行深度剖析。
*   提供多维度的分析报告，辅助深层思考与决策。

### 实时事实核查
*   联网检索权威信源，交叉验证内容真实性。
*   智能标注可疑信息，提供证据溯源，杜绝谣言误导。

### OCR 与多模态支持
*   内置高精度 OCR，支持图片、扫描件 PDF 等即时识别与内容分析。
*   支持语音合成 (TTS)，让资讯“听”得见，释放双眼。

### 便捷分享
*   一键生成精美、可视化的分析报告，易于团队协作传播与分享。

## 使用场景

> **学术研究**  
> 快速梳理海量文献脉络，辅助论文选题、背景调研与论证。

> **市场洞察**  
> 深度分析行业报告，敏锐捕捉市场动态、趋势与竞争情报。

> **新闻媒体**  
> 辅助新闻线索核查，提升报道的准确性、深度与公信力。

> **个人精进**  
> 构建高效的个人知识管理体系，加速新知识的内化与吸收。

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/smart-chain.git
cd smart-chain
```

### 2. 环境配置 (重要)

本项目依赖大模型能力，**必须配置 API Key 才能正常使用**。


在 `backend/config.py` 文件中，找到 AI 模型配置部分，替换为你的 API Key 和模型名称：

```python
AI_CONFIG = {
    'base_url': 'YOUR_BASE_URL',
    'api_key': 'YOUR_API_KEY',
    'simple_model': 'YOUR_SIMPLE_MODEL',  # 简单任务
    'complex_model': 'YOUR_COMPLEX_MODEL'  # 复杂任务
}
```
请确保你已经注册并获取了相应的 API Key 和模型名称。

### 3. 安装依赖

项目包含 Python 和 Node.js 部分，请分别安装依赖。

**安装 Python 依赖:**
```bash
cd backend
pip install -r requirements.txt
```

**安装 Node.js 依赖:**
```bash
# 确保在 backend 目录下
npm install
```

### 4. 启动服务

**启动 Python 后端 (主服务):**
```bash
# 在项目根目录下
python backend/app.py
```

服务默认运行在 `http://localhost:5000`。打开浏览器访问该地址即可开始使用。

## 技术栈

*   **前端**: HTML5, CSS3, JavaScript (Native), Glassmorphism UI
*   **后端**: Python (Flask), Node.js
*   **AI模型**: Ollama
*   **数据处理**: OCR (Tesseract/PaddleOCR equivalent), Web Crawler

## 贡献指南
欢迎任何形式的贡献！无论是功能建议、Bug 报告，还是代码贡献，都非常感谢。请遵循以下步骤：
1. Fork 本仓库
2. 创建你的分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证
本项目采用 MIT 许可证，详情请参阅 [LICENSE](LICENSE) 文件。

