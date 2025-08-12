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
from routes.share import share_bp

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
app.register_blueprint(share_bp, url_prefix='/api/share')


@app.route('/') 
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/home')
def home():
    return send_from_directory('../frontend', 'home.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../frontend', filename)

def check_ssl_certificates():
    """检查ssh目录中是否存在SSL证书文件"""
    # 尝试多个可能的SSL目录位置
    possible_ssl_dirs = [
        'ssh',  # 相对于当前目录
        '../ssh',  # 相对于项目根目录
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ssh')  # 绝对路径到项目根目录的ssh
    ]
    
    ssl_dir = None
    cert_file = None
    key_file = None
    
    # 查找存在的SSL目录
    for dir_path in possible_ssl_dirs:
        if os.path.exists(dir_path):
            ssl_dir = dir_path
            logging.info(f"找到SSL目录: {ssl_dir}")
            break
    
    if not ssl_dir:
        logging.info("未找到SSL目录")
        return None, None
    
    logging.info(f"扫描SSL目录: {ssl_dir}")
    
    # 查找证书文件
    for filename in os.listdir(ssl_dir):
        file_path = os.path.join(ssl_dir, filename)
        if os.path.isfile(file_path):
            logging.info(f"检查文件: {filename}")
            
            # 检查是否是私钥文件（优先检查，因为私钥文件特征更明显）
            if (filename.lower().endswith('.key') or 
                '_key.' in filename.lower() or 
                'private' in filename.lower() or
                'privkey' in filename.lower() or
                filename.lower().endswith('key.pem')):
                key_file = file_path
                logging.info(f"找到私钥文件: {key_file}")
            
            # 检查是否是证书文件
            elif (filename.lower().endswith('.pem') or 
                  filename.lower().endswith('.crt') or
                  filename.lower().endswith('.cert') or
                  'cert' in filename.lower() or
                  'certificate' in filename.lower() or
                  'fullchain' in filename.lower()):
                # 确保不是私钥文件
                if not ('key' in filename.lower() or 'private' in filename.lower()):
                    cert_file = file_path
                    logging.info(f"找到证书文件: {cert_file}")
    
    # 验证证书文件是否可读
    if cert_file and key_file:
        try:
            if os.path.isfile(cert_file) and os.path.isfile(key_file):
                logging.info(f"SSL证书验证成功: cert={cert_file}, key={key_file}")
                return cert_file, key_file
            else:
                logging.warning("SSL证书文件不完整")
                return None, None
        except Exception as e:
            logging.error(f"SSL证书验证失败: {e}")
            return None, None
    else:
        if not cert_file:
            logging.warning("未找到证书文件")
        if not key_file:
            logging.warning("未找到私钥文件")
        logging.info("未找到完整的SSL证书文件")
        return None, None

if __name__ == '__main__':
    # 确保数据目录存在
    os.makedirs('data', exist_ok=True)
    os.makedirs('backend/data', exist_ok=True)
    os.makedirs('temp', exist_ok=True)
    
    # 从环境变量获取配置
    debug_mode = os.getenv('FLASK_ENV', 'development') == 'development'
    port = int(os.getenv('PORT', 7000))
    host = os.getenv('HOST', '0.0.0.0')
    
    # 检查SSL证书
    cert_file, key_file = check_ssl_certificates()
    
    if cert_file and key_file:
        # 使用HTTPS
        logging.info("检测到SSL证书，启用HTTPS模式")
        try:
            app.run(
                host=host, 
                port=port,
                debug=debug_mode,
                ssl_context=(cert_file, key_file)
            )
        except Exception as e:
            logging.error(f"HTTPS启动失败: {e}")
            logging.info("回退到HTTP模式")
            app.run(host=host, port=port, debug=debug_mode)
    else:
        # 使用HTTP
        logging.info("未检测到SSL证书，使用HTTP模式")
        app.run(host=host, port=port, debug=debug_mode)
