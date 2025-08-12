#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智链AI阅读助手启动脚本
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ 错误: 需要Python 3.8或更高版本")
        print(f"当前版本: {sys.version}")
        sys.exit(1)
    print(f"✅ Python版本检查通过: {sys.version}")

def check_dependencies():
    """检查依赖项"""
    requirements_file = Path(__file__).parent / "backend" / "requirements.txt"
    if not requirements_file.exists():
        print("❌ 错误: 找不到requirements.txt文件")
        
    
    print("🔍 检查依赖项...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "check"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 依赖项检查通过")
        else:
            print("⚠️  警告: 依赖项可能有问题")
            print(result.stdout)
    except Exception as e:
        print(f"⚠️  无法检查依赖项: {e}")

def install_dependencies():
    """安装依赖项"""
    requirements_file = Path(__file__).parent / "backend" / "requirements.txt"
    print("📦 安装依赖项...")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], check=True)
        print("✅ 依赖项安装完成")
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖项安装失败: {e}")
        sys.exit(1)

def check_config():
    """检查配置文件"""
    config_file = Path(__file__).parent / "backend" / "config.py"
    config_example = Path(__file__).parent / "backend" / "config.py.example"
    
    if not config_file.exists():
        if config_example.exists():
            print("⚠️  未找到config.py，请复制config.py.example并配置")
            print(f"运行: cp {config_example} {config_file}")
        else:
            print("❌ 错误: 配置文件不存在")
        return False
    
    # 检查关键配置项
    try:
        sys.path.insert(0, str(Path(__file__).parent / "backend"))
        import backend.config

        if not hasattr(backend.config, 'GLM_API_KEY') or backend.config.GLM_API_KEY == "your_glm_api_key_here":
            print("⚠️  警告: 请在config.py中配置您的GLM_API_KEY")
            return False
            
        print("✅ 配置文件检查通过")
        return True
    except ImportError as e:
        print(f"❌ 配置文件导入失败: {e}")
        return False

def create_directories():
    """创建必要的目录"""
    directories = [
        "data",
        "data/users", 
        "data/uploads",
        "data/chat_history",
        "data/logs"
    ]
    
    base_path = Path(__file__).parent
    for directory in directories:
        dir_path = base_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"📁 创建目录: {dir_path}")

def start_server(dev_mode=True):
    """启动服务器"""
    backend_path = Path(__file__).parent / "backend"
    os.chdir(backend_path)
    
    print("🚀 启动智链AI阅读助手...")
    print("=" * 50)
    
    try:
        if dev_mode:
            # 开发模式
            subprocess.run([sys.executable, "app.py"], check=True)
        else:
            # 生产模式
            subprocess.run([
                sys.executable, "-m", "gunicorn", 
                "-w", "4", 
                "-b", "0.0.0.0:80",
                "app:app"
            ], check=True)
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
    except subprocess.CalledProcessError as e:
        print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="智链AI阅读助手启动脚本")
    parser.add_argument("--install", action="store_true", help="安装依赖项")
    parser.add_argument("--prod", action="store_true", help="生产模式启动")
    parser.add_argument("--check", action="store_true", help="仅检查环境")
    
    args = parser.parse_args()
    
    print("🔗 智链AI阅读助手")
    print("=" * 50)
    
    # 检查Python版本
    check_python_version()
    
    # 创建必要目录
    create_directories()
    
    # 安装依赖项
    if args.install:
        install_dependencies()
    
    # 检查依赖项
    check_dependencies()
    #检查playwright依赖
    try:
        subprocess.run([sys.executable, "-m", "playwright", "install"], check=True)
        print("✅ Playwright依赖安装完成")
    except subprocess.CalledProcessError as e:
        print(f"❌ Playwright依赖安装失败: {e}")
        sys.exit(1)
    
    # 检查配置
    config_ok = check_config()
    
    if args.check:
        print("\n📋 环境检查完成")
        if config_ok:
            print("✅ 环境配置正常，可以启动服务器")
        else:
            print("❌ 环境配置有问题，请检查配置文件")
        return
    
    if not config_ok:
        print("\n❌ 配置检查失败，无法启动服务器")
        print("请检查config.py配置文件")
        sys.exit(1)
    
    # 启动服务器
    start_server(dev_mode=not args.prod)

if __name__ == "__main__":
    main()
