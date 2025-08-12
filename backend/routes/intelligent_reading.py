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
            selected_model = data.get('model')  # 获取模型参数
            
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
            selected_model = request.form.get('model')  # 获取模型参数
        
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
            # 图片分析 - 直接使用GLM-4V-Flash模型分析图片
            images = request.files.getlist('images')
            
            if not images:
                def generate_error_response():
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': str(uuid.uuid4())})}\n\n"
                    yield f"data: {json.dumps({'type': 'error', 'message': '没有找到要分析的图片'})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                
                return Response(
                    generate_error_response(),
                    mimetype='text/plain'
                )
            
            # 保存上传的图片
            saved_paths = ocr_service.save_uploaded_images(images)
            
            if not saved_paths:
                def generate_error_response():
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': str(uuid.uuid4())})}\n\n"
                    yield f"data: {json.dumps({'type': 'error', 'message': '图片保存失败'})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                
                return Response(
                    generate_error_response(),
                    mimetype='text/plain'
                )
            
            # 生成会话ID
            session_id = str(uuid.uuid4())
            
            # 构建图片分析提示
            analysis_prompt = f"""请分析这些图片的内容。根据智能伴读的要求，请提供：

1. 图片内容的详细描述
2. 如果图片包含文字，请提取并整理文字内容
3. 对图片内容的深入解读和分析
4. 相关的背景知识或延伸思考

用户的具体需求：{content_data if content_data else '全面分析图片内容'}

请以智能伴读助手的身份，用友好、专业的语气进行分析。"""
            
            def generate_image_analysis():
                try:
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
                    yield f"data: {json.dumps({'type': 'step', 'step': 1, 'title': '图片解析', 'status': 'processing'})}\n\n"
                    
                    # 使用GLM-4V-Flash分析图片
                    for chunk in ai_service.analyze_image(saved_paths, analysis_prompt):
                        if chunk.strip():
                            yield f"data: {json.dumps({'type': 'content', 'content': chunk, 'step': 1})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'step', 'step': 1, 'status': 'completed'})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'图片分析失败：{str(e)}'})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
            return Response(
                generate_image_analysis(),
                mimetype='text/plain'
            )
        
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
        
        # 返回解析结果，询问用户问题
        return Response(
            generate_content_parsed_response(session_id, extracted_content, content_info, content_type),
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
        content_context = data.get('content_context', '')  # 新增：内容上下文
        selected_model = data.get('model')  # 新增：模型选择
        
        if not user_message:
            return jsonify({'success': False, 'message': '消息不能为空'})
        
        # 构建对话历史
        messages = []
        
        # 如果有内容上下文，添加系统提示
        if content_context:
            system_prompt = f"""你是一个智能阅读伴侣，正在帮助用户理解和分析以下内容：

{content_context}

请遵循以下要求：
1. 基于上述内容回答用户的问题
2. 如果用户问题超出内容范围，友善地引导回到内容讨论
3. 提供准确、有用的分析和解释
4. 保持耐心、友好和专业的态度
5. 可以引用具体段落或要点来支持你的回答"""
            messages.append({"role": "system", "content": system_prompt})
        
        # 添加历史对话
        for msg in chat_history:
            messages.append({"role": msg['role'], "content": msg['content']})
        
        # 添加用户新消息
        messages.append({"role": "user", "content": user_message})
        
        return Response(
            generate_chat_response(messages, session_id, selected_model),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'聊天失败：{str(e)}'})

def generate_content_parsed_response(session_id, extracted_content, content_info, content_type):
    """生成内容解析完成的响应"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'message': '正在解析内容...'})}\n\n"
        
        # 分析内容信息
        word_count = len(extracted_content.split()) if extracted_content else 0
        char_count = len(extracted_content) if extracted_content else 0
        
        # 发送内容解析结果
        parse_result = {
            'content_type': content_type,
            'word_count': word_count,
            'char_count': char_count,
            'content_preview': extracted_content[:300] + '...' if len(extracted_content) > 300 else extracted_content,
            'full_content': extracted_content,
            'content_info': content_info
        }
        
        yield f"data: {json.dumps({'type': 'content_parsed', 'result': parse_result})}\n\n"
        
        # 发送询问消息
        ask_message = f"""📖 **内容解析完成！**

✅ **解析统计：**
- 字符数：{char_count:,} 个
- 词数：{word_count:,} 个
- 内容类型：{content_type}

🎯 **我已经成功解析了您的内容，现在可以帮您：**

💡 **快速开始的问题示例：**
- "请概括一下主要内容"
- "这篇文章的核心观点是什么？"
- "有哪些重要的细节需要注意？"
- "作者想要表达什么？"

❓ **请告诉我您想了解什么，我来为您详细解答！**"""
        
        yield f"data: {json.dumps({'type': 'content', 'content': ask_message})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
def generate_chat_response(messages, session_id, model=None):
    """生成聊天响应"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        
        # 选择模型：优先使用指定模型，否则使用简单模型
        selected_model = model if model else ai_service.simple_model
        
        for chunk in ai_service._make_request(messages, selected_model):
            # 提取思考内容和显示内容
            thinking, display = ai_service.extract_thinking(chunk)
            
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
            
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
