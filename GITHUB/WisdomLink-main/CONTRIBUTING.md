# 贡献指南

感谢您对智链AI阅读助手项目的关注和贡献！

## 🤝 如何贡献

### 报告问题
- 使用 [Bug Report 模板](https://github.com/EthanChan050430/AIReader/issues/new?template=bug_report.yml) 报告错误
- 使用 [Feature Request 模板](https://github.com/EthanChan050430/AIReader/issues/new?template=feature_request.yml) 建议新功能

### 代码贡献

1. **Fork 仓库**
   ```bash
   # 在GitHub上点击Fork按钮
   git clone https://github.com/YOUR_USERNAME/AIReader.git
   cd AIReader
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-fix-name
   ```

3. **本地开发**
   ```bash
   # 安装依赖
   cd backend
   pip install -r requirements.txt
   
   # 配置环境
   cp config.py.example config.py
   # 编辑 config.py 添加API密钥
   
   # 启动开发服务器
   python app.py
   ```

4. **提交更改**
   ```bash
   git add .
   git commit -m "类型: 简短描述
   
   详细描述您的更改..."
   ```

5. **推送并创建PR**
   ```bash
   git push origin feature/your-feature-name
   # 在GitHub上创建Pull Request
   ```

## 📝 代码规范

### Python代码
- 遵循 PEP 8 规范
- 使用类型注解
- 添加适当的文档字符串

```python
def process_content(content: str) -> dict:
    """
    处理用户输入内容
    
    Args:
        content (str): 用户输入的原始内容
        
    Returns:
        dict: 处理后的结构化数据
    """
    pass
```

### JavaScript代码
- 使用 ES6+ 语法
- 保持代码简洁明了
- 添加必要的注释

```javascript
/**
 * 发送消息到AI服务
 * @param {Object} message - 消息对象
 * @param {string} endpoint - API端点
 * @returns {Promise<void>}
 */
async function sendMessage(message, endpoint) {
    // 实现逻辑
}
```

### 提交信息格式
```
类型: 简短描述（不超过50字符）

详细描述（可选）：
- 详细说明更改内容
- 解释为什么进行这些更改
- 列出任何重大变更

相关Issue: #123
```

**提交类型：**
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 添加测试
- `chore`: 构建工具或依赖更新

## 🧪 测试

### 前端测试
```javascript
// 在浏览器控制台测试语音功能
console.log('Speech Recognition:', 'webkitSpeechRecognition' in window);
console.log('Speech Synthesis:', 'speechSynthesis' in window);
```

### 后端测试
```python
# 创建测试文件
import unittest
from services.ai_service import AIService

class TestAIService(unittest.TestCase):
    def test_chat_completion(self):
        pass
```

## 🎯 开发重点

我们特别欢迎以下方面的贡献：

1. **新功能开发**
   - 新的AI模型集成
   - 更多文件格式支持
   - 新的语音服务商

2. **性能优化**
   - 响应速度提升
   - 内存使用优化
   - 缓存机制改进

3. **用户体验**
   - UI/UX改进
   - 移动端适配
   - 无障碍访问

4. **安全性**
   - 身份认证改进
   - 数据加密
   - API安全

## 🚀 发布流程

1. 版本号遵循 [语义版本控制](https://semver.org/)
2. 在 `CHANGELOG.md` 中记录更改
3. 创建发布标签
4. 更新文档

## 📞 联系我们

- 提交Issue：[GitHub Issues](https://github.com/EthanChan050430/AIReader/issues)
- 讨论：[GitHub Discussions](https://github.com/EthanChan050430/AIReader/discussions)

感谢您的贡献！ 🎉
