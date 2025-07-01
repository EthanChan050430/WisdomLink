from flask import Blueprint, request, jsonify, Response
import json
import uuid
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from utils.file_handler import save_uploaded_files, extract_text_from_file

comprehensive_analysis_bp = Blueprint('comprehensive_analysis', __name__)

@comprehensive_analysis_bp.route('/start', methods=['POST'])
def start_comprehensive_analysis():
    """开始全面总结分析"""
    try:
        # 获取上传的内容
        content_type = request.form.get('content_type')
        content_data = request.form.get('content_data', '')
        
        extracted_content = ""
        
        # 提取内容（与智能伴读相同的逻辑）
        if content_type == 'url':
            urls = [url.strip() for url in content_data.split('\n') if url.strip()]
            results = web_crawler.extract_text_from_multiple_urls(urls)
            
            for result in results:
                if result['success']:
                    extracted_content += f"\n\n=== {result['title']} ===\n{result['content']}"
                else:
                    extracted_content += f"\n\n错误：无法提取 {result['url']} 的内容：{result['error']}"
        
        elif content_type == 'text':
            extracted_content = content_data
        
        elif content_type == 'file':
            files = request.files.getlist('files')
            saved_paths = save_uploaded_files(files)
            
            for file_path in saved_paths:
                file_content = extract_text_from_file(file_path)
                if file_content:
                    extracted_content += f"\n\n=== {file_path} ===\n{file_content}"
        
        elif content_type == 'image':
            images = request.files.getlist('images')
            saved_paths = ocr_service.save_uploaded_images(images)
            ocr_results = ocr_service.extract_text_from_multiple_images(saved_paths)
            
            for result in ocr_results:
                if result['success']:
                    extracted_content += f"\n\n=== 图片文字 ===\n{result['text']}"
                else:
                    extracted_content += f"\n\n错误：无法识别图片文字：{result['error']}"
        
        if not extracted_content.strip():
            return jsonify({'success': False, 'message': '没有提取到任何内容'})
        
        # 生成会话ID
        session_id = str(uuid.uuid4())
        
        return Response(
            generate_comprehensive_analysis(extracted_content, session_id),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'开始全面分析失败：{str(e)}'})

def generate_comprehensive_analysis(content, session_id):
    """生成全面分析的四个步骤"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        
        # 第一步：文章概要
        yield f"data: {json.dumps({'type': 'step_start', 'step': 1, 'name': '文章概要', 'description': '提取文章大意和核心信息'})}\n\n"
        
        overview_prompt = f"""请对以下内容进行概要分析，提取主要观点和核心信息：

{content}

请包括：
1. 文章主题和核心观点
2. 主要论述内容
3. 关键信息点
4. 文章结构简述

<think>
我需要仔细阅读这篇文章，理解其主要内容和结构，然后提供一个清晰的概要。
</think>"""
        
        overview_content = ""
        for chunk in ai_service.complex_chat(overview_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 1, 'content': thinking})}\n\n"
            if display:
                overview_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 1, 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 1})}\n\n"
        
        # 第二步：细节分析
        yield f"data: {json.dumps({'type': 'step_start', 'step': 2, 'name': '细节分析', 'description': '深入分析文章细节和论证过程'})}\n\n"
        
        detail_prompt = f"""基于之前的概要分析：
{overview_content}

现在请对原文进行细节分析：

{content}

请包括：
1. 详细的论证过程分析
2. 重要细节和支撑材料
3. 文章的逻辑结构
4. 语言特色和表达方式
5. 数据、案例、引用等具体内容分析

<think>
现在我需要更深入地分析文章的细节，包括论证方式、具体例子、数据支撑等。
</think>"""
        
        detail_content = ""
        for chunk in ai_service.complex_chat(detail_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': thinking})}\n\n"
            if display:
                detail_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 2})}\n\n"
        
        # 第三步：深入思考
        yield f"data: {json.dumps({'type': 'step_start', 'step': 3, 'name': '深入思考', 'description': '把握文章主旨和深层含义'})}\n\n"
        
        thinking_prompt = f"""基于概要分析：
{overview_content}

和细节分析：
{detail_content}

请对文章进行深入思考：

原文：
{content}

请包括：
1. 文章的深层主旨和意图
2. 作者的观点立场和价值取向
3. 文章的社会意义和影响
4. 可能的争议点和不同解读
5. 对读者的启发和思考价值
6. 文章的历史背景和时代意义（如适用）

<think>
我需要从更高的角度来理解这篇文章的深层含义，包括作者的真正意图、社会背景、价值观念等。
</think>"""
        
        deep_content = ""
        for chunk in ai_service.complex_chat(thinking_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 3, 'content': thinking})}\n\n"
            if display:
                deep_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 3, 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 3})}\n\n"
        
        # 第四步：总结归纳
        yield f"data: {json.dumps({'type': 'step_start', 'step': 4, 'name': '总结归纳', 'description': '综合所有分析生成最终报告'})}\n\n"
        
        summary_prompt = f"""请基于前面的所有分析，生成一份完整的综合报告：

概要分析：
{overview_content}

细节分析：
{detail_content}

深入思考：
{deep_content}

原文：
{content}

请生成最终报告，包括：
1. 文章全面总结
2. 主要发现和洞察
3. 价值评估和意义分析
4. 优缺点评价
5. 对读者的建议和启发
6. 延伸思考和相关推荐

请用清晰的结构和专业的语言呈现。

<think>
现在我需要将前面的所有分析整合起来，形成一个完整、有条理的最终报告。
</think>"""
        
        for chunk in ai_service.complex_chat(summary_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 4, 'content': thinking})}\n\n"
            if display:
                yield f"data: {json.dumps({'type': 'content', 'step': 4, 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 4})}\n\n"
        yield f"data: {json.dumps({'type': 'analysis_complete'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

@comprehensive_analysis_bp.route('/chat', methods=['POST'])
def chat_with_ai():
    """与AI聊天 - 全面总结功能的继续对话"""
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
