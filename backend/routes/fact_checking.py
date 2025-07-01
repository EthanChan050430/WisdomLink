from flask import Blueprint, request, jsonify, Response
import json
import uuid
import requests
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from utils.file_handler import save_uploaded_files, extract_text_from_file

fact_checking_bp = Blueprint('fact_checking', __name__)

SEARCH_API_URL = "http://chengyuxuan.top:3100/search"

@fact_checking_bp.route('/start', methods=['POST'])
def start_fact_checking():
    """开始真伪鉴定"""
    try:
        # 获取上传的内容
        content_type = request.form.get('content_type')
        content_data = request.form.get('content_data', '')
        
        extracted_content = ""
        
        # 提取内容（与之前相同的逻辑）
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
            generate_fact_checking_analysis(extracted_content, session_id),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'开始真伪鉴定失败：{str(e)}'})

def search_information(query):
    """搜索相关信息"""
    try:
        params = {
            'q': query,
            'format': 'json'
        }
        response = requests.get(SEARCH_API_URL, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return data
        
    except Exception as e:
        return {'error': str(e)}

def generate_fact_checking_analysis(content, session_id):
    """生成真伪鉴定分析的四个步骤"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        
        # 第一步：文章解析
        yield f"data: {json.dumps({'type': 'step_start', 'step': 1, 'name': '文章解析', 'description': '分析文章内容和结构'})}\n\n"
        
        parsing_prompt = f"""请对以下内容进行结构化解析：

{content}

请提供：
1. 文章主要声明和观点
2. 具体的事实陈述
3. 数据、时间、地点等关键信息
4. 引用的资料或来源
5. 作者的推论和结论

<think>
我需要仔细分析这篇文章，识别出其中的事实陈述、观点和可能需要验证的信息。
</think>"""
        
        parsed_content = ""
        for chunk in ai_service.simple_chat(parsing_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 1, 'content': thinking})}\n\n"
            if display:
                parsed_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 1, 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 1})}\n\n"
        
        # 第二步：关键词提取
        yield f"data: {json.dumps({'type': 'step_start', 'step': 2, 'name': '关键词提取', 'description': '提取需要验证的关键信息'})}\n\n"
        
        keyword_prompt = f"""基于文章解析结果：
{parsed_content}

原文：
{content}

请提取需要事实核查的关键词和关键信息，包括：
1. 具体的人名、地名、机构名
2. 时间、日期、数字
3. 重要的事件或现象
4. 科学数据或统计信息
5. 可验证的具体声明

请列出5-10个最重要的关键词或短语，用于后续搜索验证。

<think>
我需要从文章中提取最关键的、可以通过搜索验证的信息点。
</think>"""
        
        keywords_content = ""
        keywords_list = []
        for chunk in ai_service.simple_chat(keyword_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': thinking})}\n\n"
            if display:
                keywords_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': display})}\n\n"
                
                # 尝试提取关键词列表
                lines = display.split('\n')
                for line in lines:
                    line = line.strip()
                    if line and (line.startswith('-') or line.startswith('•') or line[0].isdigit()):
                        # 清理关键词
                        keyword = line.lstrip('-•0123456789. ').strip()
                        if keyword and len(keyword) > 2:
                            keywords_list.append(keyword)
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 2})}\n\n"
        
        # 第三步：资料查阅
        yield f"data: {json.dumps({'type': 'step_start', 'step': 3, 'name': '资料查阅', 'description': '搜索相关资料进行对比'})}\n\n"
        
        search_results = {}
        all_search_content = ""
        
        # 搜索关键词
        for i, keyword in enumerate(keywords_list[:5]):  # 限制搜索数量
            yield f"data: {json.dumps({'type': 'search_progress', 'step': 3, 'keyword': keyword, 'progress': i+1, 'total': min(len(keywords_list), 5)})}\n\n"
            
            search_result = search_information(keyword)
            search_results[keyword] = search_result
            
            if 'error' not in search_result:
                search_content = f"\n\n=== 搜索「{keyword}」的结果 ===\n"
                if 'results' in search_result:
                    for j, result in enumerate(search_result['results'][:3]):  # 取前3个结果
                        search_content += f"\n{j+1}. {result.get('title', '无标题')}\n{result.get('snippet', '无摘要')}\n来源：{result.get('url', '未知')}\n"
                else:
                    search_content += "未找到相关结果\n"
                
                all_search_content += search_content
                yield f"data: {json.dumps({'type': 'content', 'step': 3, 'content': search_content})}\n\n"
            else:
                error_content = f"\n搜索「{keyword}」时出错：{search_result['error']}\n"
                all_search_content += error_content
                yield f"data: {json.dumps({'type': 'content', 'step': 3, 'content': error_content})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 3})}\n\n"
        
        # 第四步：真伪鉴定
        yield f"data: {json.dumps({'type': 'step_start', 'step': 4, 'name': '真伪鉴定', 'description': '基于搜索结果进行真伪分析'})}\n\n"
        
        verification_prompt = f"""请基于以下信息进行真伪鉴定：

原文内容：
{content}

文章解析：
{parsed_content}

提取的关键词：
{keywords_content}

搜索得到的参考资料：
{all_search_content}

请进行综合分析并提供：
1. 对文章中各个声明的真实性评估
2. 与搜索结果的对比分析
3. 发现的矛盾或不一致之处
4. 可信度评级（高/中/低）
5. 需要进一步核实的信息
6. 总体结论和建议

请客观、严谨地进行分析，避免绝对化的判断。

<think>
现在我需要综合所有信息，客观地分析文章的真实性。我要对比原文声明和搜索到的资料，找出一致性和矛盾之处。
</think>"""
        
        for chunk in ai_service.complex_chat(verification_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 4, 'content': thinking})}\n\n"
            if display:
                yield f"data: {json.dumps({'type': 'content', 'step': 4, 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 4})}\n\n"
        yield f"data: {json.dumps({'type': 'verification_complete'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

@fact_checking_bp.route('/chat', methods=['POST'])
def chat_with_ai():
    """与AI聊天 - 真伪鉴定功能的继续对话"""
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
