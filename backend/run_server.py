#!/usr/bin/env python3
"""
启动智链AI阅读助手后端服务
"""

import os
import sys

# 确保当前目录在Python路径中
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from app import app
    
    if __name__ == '__main__':
        # 确保数据目录存在
        os.makedirs('data', exist_ok=True)
        
        print("🚀 启动智链AI阅读助手后端服务...")
        print("📍 访问地址: http://localhost:5000")
        print("🔄 调试模式: 开启")
        print("-" * 50)
        
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            threaded=True
        )
        
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("请检查依赖是否正确安装")
    sys.exit(1)
except Exception as e:
    print(f"❌ 启动失败: {e}")
    sys.exit(1)
