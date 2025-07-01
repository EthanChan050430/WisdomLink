from flask import Blueprint, request, jsonify, session
import json
import os
import uuid
from datetime import datetime

chat_history_bp = Blueprint('chat_history', __name__)

def get_user_chat_folder(username):
    """获取用户聊天记录文件夹"""
    return f"data/users/{username}/chat_history"

def get_chat_file_path(username, chat_id):
    """获取聊天记录文件路径"""
    chat_folder = get_user_chat_folder(username)
    return os.path.join(chat_folder, f"{chat_id}.json")

@chat_history_bp.route('/list', methods=['GET'])
def list_chat_history():
    """获取用户的聊天记录列表"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        chat_folder = get_user_chat_folder(user['username'])
        os.makedirs(chat_folder, exist_ok=True)
        
        chat_list = []
        
        # 遍历聊天记录文件
        for filename in os.listdir(chat_folder):
            if filename.endswith('.json'):
                chat_id = filename[:-5]  # 移除.json扩展名
                file_path = os.path.join(chat_folder, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        chat_data = json.load(f)
                        
                    chat_list.append({
                        'chat_id': chat_id,
                        'title': chat_data.get('title', '未命名对话'),
                        'feature': chat_data.get('feature', 'intelligent_reading'),
                        'created_at': chat_data.get('created_at', ''),
                        'updated_at': chat_data.get('updated_at', ''),
                        'message_count': len(chat_data.get('messages', []))
                    })
                except:
                    # 如果文件损坏，跳过
                    continue
        
        # 按更新时间排序
        chat_list.sort(key=lambda x: x['updated_at'], reverse=True)
        
        return jsonify({'success': True, 'chats': chat_list})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取聊天记录失败：{str(e)}'})

@chat_history_bp.route('/create', methods=['POST'])
def create_new_chat():
    """创建新的聊天记录"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        data = request.get_json()
        title = data.get('title', '新对话')
        feature = data.get('feature', 'intelligent_reading')
        
        # 生成新的聊天ID
        chat_id = str(uuid.uuid4())
        
        # 创建聊天记录数据
        chat_data = {
            'chat_id': chat_id,
            'title': title,
            'feature': feature,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'messages': []
        }
        
        # 保存聊天记录
        chat_folder = get_user_chat_folder(user['username'])
        os.makedirs(chat_folder, exist_ok=True)
        
        file_path = get_chat_file_path(user['username'], chat_id)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'chat_id': chat_id, 'message': '新对话创建成功'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'创建对话失败：{str(e)}'})

@chat_history_bp.route('/get/<chat_id>', methods=['GET'])
def get_chat_history(chat_id):
    """获取特定聊天记录的详细内容"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        file_path = get_chat_file_path(user['username'], chat_id)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': '聊天记录不存在'})
        
        with open(file_path, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
        
        return jsonify({'success': True, 'chat': chat_data})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取聊天记录失败：{str(e)}'})

@chat_history_bp.route('/save', methods=['POST'])
def save_chat_message():
    """保存聊天消息"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        message = data.get('message')
        
        if not chat_id or not message:
            return jsonify({'success': False, 'message': '参数不完整'})
        
        file_path = get_chat_file_path(user['username'], chat_id)
        
        # 读取现有聊天记录
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
        else:
            # 如果文件不存在，创建新的聊天记录
            chat_data = {
                'chat_id': chat_id,
                'title': '未命名对话',
                'feature': 'intelligent_reading',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'messages': []
            }
        
        # 添加新消息
        message['timestamp'] = datetime.now().isoformat()
        chat_data['messages'].append(message)
        chat_data['updated_at'] = datetime.now().isoformat()
        
        # 如果是第一条用户消息，可以用它作为标题
        if len(chat_data['messages']) == 1 and message.get('role') == 'user':
            title = message.get('content', '')[:30]  # 取前30个字符作为标题
            if title:
                chat_data['title'] = title + ('...' if len(message.get('content', '')) > 30 else '')
        
        # 保存更新的聊天记录
        chat_folder = get_user_chat_folder(user['username'])
        os.makedirs(chat_folder, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'message': '消息保存成功'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'保存消息失败：{str(e)}'})

@chat_history_bp.route('/delete/<chat_id>', methods=['DELETE'])
def delete_chat_history(chat_id):
    """删除聊天记录"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        file_path = get_chat_file_path(user['username'], chat_id)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'success': True, 'message': '聊天记录删除成功'})
        else:
            return jsonify({'success': False, 'message': '聊天记录不存在'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'删除聊天记录失败：{str(e)}'})

@chat_history_bp.route('/update-title', methods=['POST'])
def update_chat_title():
    """更新聊天记录标题"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        new_title = data.get('title', '').strip()
        
        if not chat_id or not new_title:
            return jsonify({'success': False, 'message': '参数不完整'})
        
        file_path = get_chat_file_path(user['username'], chat_id)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': '聊天记录不存在'})
        
        # 读取并更新聊天记录
        with open(file_path, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
        
        chat_data['title'] = new_title
        chat_data['updated_at'] = datetime.now().isoformat()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'message': '标题更新成功'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'更新标题失败：{str(e)}'})

@chat_history_bp.route('/export/<chat_id>', methods=['GET'])
def export_chat_history(chat_id):
    """导出聊天记录"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        file_path = get_chat_file_path(user['username'], chat_id)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': '聊天记录不存在'})
        
        with open(file_path, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
        
        # 生成导出格式
        export_content = f"# {chat_data.get('title', '未命名对话')}\n\n"
        export_content += f"**功能**: {chat_data.get('feature', 'unknown')}\n"
        export_content += f"**创建时间**: {chat_data.get('created_at', '')}\n"
        export_content += f"**最后更新**: {chat_data.get('updated_at', '')}\n\n"
        export_content += "---\n\n"
        
        for msg in chat_data.get('messages', []):
            role = "用户" if msg.get('role') == 'user' else "AI助手"
            timestamp = msg.get('timestamp', '')
            content = msg.get('content', '')
            
            export_content += f"## {role}\n"
            if timestamp:
                export_content += f"*时间: {timestamp}*\n\n"
            export_content += f"{content}\n\n---\n\n"
        
        return jsonify({
            'success': True, 
            'content': export_content,
            'title': chat_data.get('title', '未命名对话')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'导出聊天记录失败：{str(e)}'})

@chat_history_bp.route('/save-message', methods=['POST'])
def save_message():
    """保存消息到指定会话"""
    user = session.get('user')
    if not user:
        return jsonify({'success': False, 'message': '请先登录'})
    
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        message = data.get('message')
        
        if not session_id or not message:
            return jsonify({'success': False, 'message': '缺少必要参数'})
        
        # 获取聊天记录文件路径
        file_path = get_chat_file_path(user['username'], session_id)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'message': '会话不存在'})
        
        # 读取现有聊天记录
        with open(file_path, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
        
        # 添加新消息
        chat_data['messages'].append({
            'role': message.get('role', 'user'),
            'content': message.get('content', ''),
            'timestamp': message.get('timestamp', datetime.now().isoformat())
        })
        
        # 更新修改时间
        chat_data['updated_at'] = datetime.now().isoformat()
        
        # 保存文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'message': '消息保存成功'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'保存消息失败：{str(e)}'})
