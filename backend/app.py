from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_cors import CORS
import os
import logging
from routes.auth import auth_bp
from routes.intelligent_reading import intelligent_reading_bp
from routes.comprehensive_analysis import comprehensive_analysis_bp
from routes.expert_analysis import expert_analysis_bp
from routes.fact_checking import fact_checking_bp
from routes.chat_history import chat_history_bp
from routes.tts import tts_bp

app = Flask(__name__, static_folder='../frontend')
app.secret_key = 'your-secret-key-here'  # 在生产环境中请使用更安全的密钥

# 启用CORS
CORS(app)

# 配置日志
logging.basicConfig(level=logging.INFO)

# 注册蓝图
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(intelligent_reading_bp, url_prefix='/api/intelligent-reading')
app.register_blueprint(comprehensive_analysis_bp, url_prefix='/api/comprehensive-analysis')
app.register_blueprint(expert_analysis_bp, url_prefix='/api/expert-analysis')
app.register_blueprint(fact_checking_bp, url_prefix='/api/fact-checking')
app.register_blueprint(chat_history_bp, url_prefix='/api/chat-history')
app.register_blueprint(tts_bp, url_prefix='/api/tts')


@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../frontend', filename)

if __name__ == '__main__':
    # 确保数据目录存在
    os.makedirs('data', exist_ok=True)
    app.run(host='0.0.0.0', port=80, debug=True)
