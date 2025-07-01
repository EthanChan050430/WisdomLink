from flask import Blueprint, request, jsonify, session, Response
import json
import uuid
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from utils.file_handler import save_uploaded_files, extract_text_from_file

intelligent_reading_bp = Blueprint('intelligent_reading', __name__)

@intelligent_reading_bp.route('/start', methods=['POST'])
def start_reading():
    """开始智能伴读"""
    try:
        # 检查请求格式
        if request.is_json:
            # JSON格式请求
            data = request.get_json()
            message = data.get('message', '').strip()
            
            # 根据消息内容判断类型
            if message.startswith(('http://', 'https://')):
                content_type = 'url'
                content_data = message
            else:
                content_type = 'text'
                content_data = message
        else:
            # 表单格式请求（向后兼容）
            content_type = request.form.get('content_type')
            content_data = request.form.get('content_data', '')
        
        print(f"处理请求 - 类型: {content_type}, 数据: {content_data[:100]}...")  # 调试信息
        
        extracted_content = ""
        content_info = {}
        
        if content_type == 'url':
            # 处理URL
            urls = [url.strip() for url in content_data.split('\n') if url.strip()]
            print(f"提取URL: {urls}")  # 调试信息
            results = web_crawler.extract_text_from_multiple_urls(urls)
            
            for result in results:
                if result['success']:
                    extracted_content += f"\n\n=== {result['title']} ===\n{result['content']}"
                    content_info[result['url']] = {
                        'title': result['title'],
                        'word_count': result['word_count']
                    }
                else:
                    extracted_content += f"\n\n错误：无法提取 {result['url']} 的内容：{result['error']}"
        
        elif content_type == 'text':
            # 直接文本
            extracted_content = content_data
            content_info = {'type': 'text', 'word_count': len(content_data.split())}
        
        elif content_type == 'file':
            # 文件上传
            files = request.files.getlist('files')
            saved_paths = save_uploaded_files(files)
            
            for file_path in saved_paths:
                file_content = extract_text_from_file(file_path)
                if file_content:
                    extracted_content += f"\n\n=== {file_path} ===\n{file_content}"
        
        elif content_type == 'image':
            # 图片OCR
            images = request.files.getlist('images')
            saved_paths = ocr_service.save_uploaded_images(images)
            ocr_results = ocr_service.extract_text_from_multiple_images(saved_paths)
            
            for result in ocr_results:
                if result['success']:
                    extracted_content += f"\n\n=== 图片文字 ===\n{result['text']}"
                    content_info[result['image_path']] = {
                        'word_count': result['word_count']
                    }
                else:
                    extracted_content += f"\n\n错误：无法识别图片 {result['image_path']} 的文字：{result['error']}"
        
        if not extracted_content.strip():
            # 统一使用流式响应格式返回错误
            def generate_error_response():
                yield f"data: {json.dumps({'type': 'session_id', 'session_id': str(uuid.uuid4())})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'message': '没有提取到任何内容。可能的原因：页面内容需要JavaScript动态加载、网站有反爬虫保护或网络连接问题。建议：复制页面主要文字内容进行直接分析。'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
            return Response(
                generate_error_response(),
                mimetype='text/plain'
            )
        
        # 生成会话ID
        session_id = str(uuid.uuid4())
        
        # 准备AI提示词
        system_prompt = """你是一个智能阅读伴侣，你的任务是帮助用户理解和分析他们提供的文章内容。
请遵循以下要求：
1. 首先简要概括文章的主要内容
2. 引导用户进行深入思考和讨论
3. 准备回答用户可能提出的问题
4. 保持耐心、友好和专业的态度
5. 如果内容很长，可以分段进行讲解

现在请开始分析用户提供的内容，并主动引导对话。"""
        
        user_prompt = f"请帮我分析和理解以下内容：\n\n{extracted_content}"
        
        return Response(
            generate_reading_response(system_prompt, user_prompt, session_id, extracted_content),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'启动智能伴读失败：{str(e)}'})

@intelligent_reading_bp.route('/chat', methods=['POST'])
def chat_with_ai():
    """与AI聊天"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        user_message = data.get('message', '').strip()
        chat_history = data.get('chat_history', [])
        
        if not user_message:
            return jsonify({'success': False, 'message': '消息不能为空'})
        
        # 构建对话历史
        messages = []
        for msg in chat_history:
            messages.append({"role": msg['role'], "content": msg['content']})
        
        # 添加用户新消息
        messages.append({"role": "user", "content": user_message})
        
        return Response(
            generate_chat_response(messages, session_id),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'聊天失败：{str(e)}'})

def generate_reading_response(system_prompt, user_prompt, session_id, content):
    """生成智能伴读响应"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'message': '正在分析内容...'})}\n\n"
        
        # 使用复杂模型进行分析
        for chunk in ai_service.complex_chat(user_prompt, system_prompt):
            # 提取思考内容和显示内容
            thinking, display = ai_service.extract_thinking(chunk)
            
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
            
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

def generate_chat_response(messages, session_id):
    """生成聊天响应"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        
        # 直接使用已构建的消息列表，不添加额外的空消息
        model = ai_service.simple_model  # 使用简单模型进行对话
        
        for chunk in ai_service._make_request(messages, model):
            # 提取思考内容和显示内容
            thinking, display = ai_service.extract_thinking(chunk)
            
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
            
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
