from flask import Blueprint, request, jsonify, Response
import json
import uuid
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from utils.file_handler import save_uploaded_files, extract_text_from_file

expert_analysis_bp = Blueprint('expert_analysis', __name__)

# 预定义的分析角色
EXPERT_PERSONAS = {
    'luxun': {
        'name': '鲁迅',
        'description': '中国现代文学家、思想家',
        'prompt': '''你现在是鲁迅先生，一位犀利的文学家和社会批评家。请用鲁迅先生的语言风格和思维方式来分析文章：
1. 用辛辣讽刺的笔调指出问题
2. 关注社会现实和人性深度
3. 用简洁有力的语言表达观点
4. 展现深刻的社会洞察力
5. 不回避尖锐的社会问题'''
    },
    'hushi': {
        'name': '胡适',
        'description': '中国现代学者、教育家',
        'prompt': '''你现在是胡适先生，一位理性的学者和教育家。请用胡适先生的理性分析方法来评析文章：
1. 注重逻辑分析和理性思考
2. 提倡科学方法和实证精神
3. 关注教育和文化问题
4. 用温和理性的语调表达观点
5. 强调求真务实的学术态度'''
    },
    'keli': {
        'name': '可莉',
        'description': '《原神》中的活泼小女孩',
        'prompt': '''你现在是可莉，一个充满活力的小女孩！请用可莉的天真活泼方式来看待文章：
1. 用简单直接的方式理解内容
2. 带着好奇心提出有趣的问题
3. 用可爱的语气表达观点
4. 从孩子的视角发现成人世界的问题
5. 保持乐观向上的态度，但也会有天真的疑问'''
    },
    'hoshino': {
        'name': '星野',
        'description': '《碧蓝档案》中的理性学生会长',
        'prompt': '''你现在是星野，一位理性冷静的学生会长。请用星野的分析方式来评价文章：
1. 用理性客观的态度分析问题
2. 注重逻辑性和条理性
3. 关注实际效果和可行性
4. 用简洁明确的语言表达观点
5. 有时会显露出一些可爱的反差'''
    },
    'shakespeare': {
        'name': '莎士比亚',
        'description': '英国文学巨匠',
        'prompt': '''你现在是威廉·莎士比亚，伟大的戏剧家和诗人。请用莎士比亚的文学视角来分析文章：
1. 从人性的角度深入分析
2. 用富有诗意的语言表达观点
3. 关注文章中的戏剧冲突和人物性格
4. 用比喻和象征的手法阐述观点
5. 探讨永恒的人类主题'''
    },
    'einstein': {
        'name': '爱因斯坦',
        'description': '伟大的物理学家和思想家',
        'prompt': '''你现在是阿尔伯特·爱因斯坦，伟大的科学家和思想家。请用爱因斯坦的科学思维来分析文章：
1. 用科学的方法和逻辑分析问题
2. 关注事物的本质和规律
3. 提出深刻的哲学思考
4. 用简单优雅的方式解释复杂概念
5. 展现对人类和宇宙的深刻理解'''
    }
}

@expert_analysis_bp.route('/get-personas', methods=['GET'])
def get_personas():
    """获取可用的分析角色"""
    personas = {}
    for key, value in EXPERT_PERSONAS.items():
        personas[key] = {
            'name': value['name'],
            'description': value['description']
        }
    return jsonify({'success': True, 'personas': personas})

@expert_analysis_bp.route('/start', methods=['POST'])
def start_expert_analysis():
    """开始大师分析"""
    try:
        # 获取上传的内容和选择的角色
        content_type = request.form.get('content_type')
        content_data = request.form.get('content_data', '')
        persona_key = request.form.get('persona', 'luxun')
        
        if persona_key not in EXPERT_PERSONAS:
            return jsonify({'success': False, 'message': '无效的分析角色'})
        
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
        
        persona = EXPERT_PERSONAS[persona_key]
        
        return Response(
            generate_expert_analysis(extracted_content, persona, session_id),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'开始大师分析失败：{str(e)}'})

@expert_analysis_bp.route('/chat', methods=['POST'])
def chat_with_expert():
    """与专家角色聊天"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        user_message = data.get('message', '').strip()
        persona_key = data.get('persona', 'luxun')
        chat_history = data.get('chat_history', [])
        
        if not user_message:
            return jsonify({'success': False, 'message': '消息不能为空'})
        
        if persona_key not in EXPERT_PERSONAS:
            return jsonify({'success': False, 'message': '无效的分析角色'})
        
        persona = EXPERT_PERSONAS[persona_key]
        
        # 构建对话历史
        messages = [{"role": "system", "content": persona['prompt']}]
        for msg in chat_history:
            messages.append({"role": msg['role'], "content": msg['content']})
        
        # 添加用户新消息
        messages.append({"role": "user", "content": user_message})
        
        return Response(
            generate_expert_chat_response(messages, session_id, persona['name']),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'与专家聊天失败：{str(e)}'})

def generate_expert_analysis(content, persona, session_id):
    """生成专家分析"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'persona', 'name': persona['name'], 'description': persona['description']})}\n\n"
        
        status_message = f'正在请{persona["name"]}分析内容...'
        yield f"data: {json.dumps({'type': 'status', 'message': status_message})}\n\n"
        
        # 构建专家分析提示词
        analysis_prompt = f"""请以{persona['name']}的身份和视角，对以下内容进行深入分析和评论：

{content}

请提供：
1. 对文章主要观点的评价
2. 从你的专业角度提出的见解
3. 对文章价值和意义的判断
4. 可能的批评或建议
5. 个人化的独特观点

请保持角色特色，用符合你身份的语言风格来表达。"""
        
        # 使用复杂模型进行分析
        for chunk in ai_service.complex_chat(analysis_prompt, persona['prompt']):
            thinking, display = ai_service.extract_thinking(chunk)
            
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
            
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

def generate_expert_chat_response(messages, session_id, expert_name):
    """生成专家聊天响应"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'expert_name', 'name': expert_name})}\n\n"
        
        # 使用复杂模型进行对话
        for chunk in ai_service._make_request(messages, ai_service.complex_model):
            thinking, display = ai_service.extract_thinking(chunk)
            
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
            
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

@expert_analysis_bp.route('/add-persona', methods=['POST'])
def add_custom_persona():
    """添加自定义角色"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        prompt = data.get('prompt', '').strip()
        
        if not all([name, description, prompt]):
            return jsonify({'success': False, 'message': '角色信息不完整'})
        
        # 生成角色键名
        key = f"custom_{len(EXPERT_PERSONAS)}"
        
        EXPERT_PERSONAS[key] = {
            'name': name,
            'description': description,
            'prompt': prompt
        }
        
        return jsonify({'success': True, 'message': '自定义角色添加成功', 'key': key})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'添加角色失败：{str(e)}'})
