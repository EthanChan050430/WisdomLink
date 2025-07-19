@echo off
chcp 65001 >nul
echo.
echo ================================================================
echo                    智链 - AI智能阅读助手
echo ================================================================
echo.

:: 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Python，请先安装Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python版本检查:
python --version

:: 进入后端目录
cd /d "%~dp0backend"

:: 检查配置文件
if not exist "config.py" (
    echo.
    echo ⚠️  未找到配置文件 config.py
    if exist "config.py.example" (
        echo 请复制 config.py.example 为 config.py 并配置您的API密钥
        echo.
        echo 运行以下命令:
        echo copy config.py.example config.py
        echo 然后编辑 config.py 文件
    ) else (
        echo ❌ 错误: 配置文件模板不存在
    )
    pause
    exit /b 1
)

:: 创建必要目录
if not exist "..\data" mkdir "..\data"
if not exist "..\data\users" mkdir "..\data\users"
if not exist "..\data\uploads" mkdir "..\data\uploads"
if not exist "..\data\chat_history" mkdir "..\data\chat_history"
if not exist "..\data\logs" mkdir "..\data\logs"

echo ✅ 目录结构检查完成

:: 检查并安装依赖
echo.
echo 🔍 检查Python依赖...
pip list | findstr "flask" >nul 2>&1
if errorlevel 1 (
    echo 📦 正在安装依赖项...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ 依赖安装失败，请检查网络连接或Python环境
        pause
        exit /b 1
    )
) else (
    echo ✅ 依赖项检查通过
)

:: 检查playwright是否安装
echo.
echo 🔍 检查Playwright依赖...
playwright --version >nul 2>&1
if errorlevel 1 (
    echo 📦 正在安装Playwright依赖...
    playwright install
    if errorlevel 1 (
        echo ❌ Playwright依赖安装失败，请检查网络连接或Python环境
        pause
        exit /b 1
    )
) else (
    echo ✅ Playwright依赖检查通过
)

:: 启动服务器
echo.
echo 🚀 启动智链AI阅读助手...
echo.
echo 服务器地址: http://localhost
echo 按 Ctrl+C 停止服务器
echo.
echo ================================================================
echo.

python app.py

if errorlevel 1 (
    echo.
    echo ❌ 服务器启动失败
    echo 可能的原因:
    echo 1. 端口80被占用（可以修改config.py中的PORT配置）
    echo 2. API密钥配置错误
    echo 3. 缺少必要的依赖
    echo.
    pause
)

echo.
echo 👋 服务器已停止
pause
