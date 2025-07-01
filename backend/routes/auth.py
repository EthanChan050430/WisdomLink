from flask import Blueprint, request, jsonify, session
import csv
import os
import hashlib
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

USER_CSV_PATH = 'data/users.csv'

def init_user_csv():
    """初始化用户CSV文件"""
    os.makedirs('data', exist_ok=True)
    if not os.path.exists(USER_CSV_PATH):
        with open(USER_CSV_PATH, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['username', 'password', 'user_folder', 'created_at'])

def get_user_folder(username):
    """获取用户文件夹路径"""
    return f"data/users/{username}"

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'})
        
        init_user_csv()
        
        # 检查用户是否已存在
        with open(USER_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # 跳过标题行
            for row in reader:
                if row and row[0] == username:
                    return jsonify({'success': False, 'message': '用户名已存在'})
        
        # 创建用户文件夹
        user_folder = get_user_folder(username)
        os.makedirs(user_folder, exist_ok=True)
        os.makedirs(f"{user_folder}/chat_history", exist_ok=True)
        
        # 添加新用户（明文存储密码，如您要求）
        with open(USER_CSV_PATH, 'a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([username, password, user_folder, datetime.now().isoformat()])
        
        return jsonify({'success': True, 'message': '注册成功'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'注册失败：{str(e)}'})

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'})
        
        init_user_csv()
        
        # 验证用户登录
        with open(USER_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # 跳过标题行
            for row in reader:
                if row and len(row) >= 3 and row[0] == username and row[1] == password:
                    # 登录成功，设置session
                    session['user'] = {
                        'username': username,
                        'user_folder': row[2]
                    }
                    return jsonify({
                        'success': True, 
                        'message': '登录成功',
                        'user': {
                            'username': username,
                            'user_folder': row[2]
                        }
                    })
        
        return jsonify({'success': False, 'message': '用户名或密码错误'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'登录失败：{str(e)}'})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """用户登出"""
    session.pop('user', None)
    return jsonify({'success': True, 'message': '已登出'})

@auth_bp.route('/check', methods=['GET'])
def check_login():
    """检查登录状态"""
    user = session.get('user')
    if user:
        return jsonify({'success': True, 'user': user})
    else:
        return jsonify({'success': False, 'message': '未登录'})

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    """获取用户资料"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        # 读取用户信息
        with open(USER_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # 跳过标题行
            for row in reader:
                if row and row[0] == user['username']:
                    return jsonify({
                        'success': True,
                        'profile': {
                            'username': row[0],
                            'user_folder': row[2],
                            'created_at': row[3] if len(row) > 3 else 'Unknown'
                        }
                    })
        
        return jsonify({'success': False, 'message': '用户信息不存在'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取用户信息失败：{str(e)}'})
