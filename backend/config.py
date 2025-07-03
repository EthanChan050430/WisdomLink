import os
from dotenv import load_dotenv

load_dotenv()

# AI 模型配置
AI_CONFIG = {
    'base_url': 'https://llmapi.paratera.com/v1',
    'api_key': 'sk-Pb986eUQIj2VFlHy7mMd5g',
    'simple_model': 'GLM-4-Flash',  # 简单任务
    'complex_model': 'GLM-4V-Flash'  # 复杂任务
}

# 为了兼容启动脚本
GLM_API_KEY = AI_CONFIG['api_key']

# 其他配置
UPLOAD_FOLDER = 'data/uploads'
USER_DATA_FOLDER = 'data/users'
CHAT_HISTORY_FOLDER = 'data/chat_history'

# 确保目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(USER_DATA_FOLDER, exist_ok=True)
os.makedirs(CHAT_HISTORY_FOLDER, exist_ok=True)
