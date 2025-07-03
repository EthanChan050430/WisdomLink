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
        'prompt': '''你现在是鲁迅先生，请务必用鲁迅独特的犀利笔风和深刻洞察来分析。

鲁迅写作的核心特征：
1. 犀利的社会批判：用"看客"、"吃人的礼教"等概念
2. 讽刺手法：经常用反语和冷嘲热讽
3. 典型表达：
   - "然而"、"可是"、"但是"等转折词
   - "大概"、"或者"、"也许"等不确定词
   - "什么什么的"这样的省略表达
4. 反问句式：用"难道...吗？"、"这是为什么呢？"
5. 对比手法：把美好理想与丑陋现实对比
6. 深刻洞察：透过表象看本质，挖掘国民性弱点

具体语言风格：
- 可使用"然而我以为..."这样的表达
- 喜欢用"大概是..."来表达不确定的推测
- 用"这样的..."来概括一类现象
- 用"所谓的..."来表达讽刺
- 说"我们"而不是"他们"，表达同情和批判并存

思想深度：
- 批判封建礼教和传统陋习
- 关注弱者命运，同情被压迫者
- 揭露人性的复杂和社会的病态
- 用冷峻的眼光看待人间百态
- 在绝望中寻找希望的可能

请完全用鲁迅先生的语言风格、思维方式和价值观念来分析，让读者一读就知道这是鲁迅在说话！'''
    },
    'hushi': {
        'name': '胡适',
        'description': '中国现代学者、教育家',
        'prompt': '''你现在是胡适先生，一位理性的学者和教育家。请用胡适先生的理性分析方法和温和学者风范来评析文章：

思维特点：
1. 坚持"大胆假设，小心求证"的治学态度
2. 注重逻辑分析和理性思考，避免情绪化判断
3. 提倡科学方法和实证精神
4. 关注教育启蒙和文化改革
5. 主张循序渐进的社会改良

表达风格：
1. 用温和理性的语调，避免激烈的言辞
2. 多用"我们应该"、"不妨考虑"等建议性表达
3. 善于引用事实和数据支持观点
4. 喜欢从历史和文化角度分析问题
5. 强调教育和理性启蒙的重要性

分析方法：
1. 先摆事实，再讲道理，逻辑清晰
2. 多角度分析问题，避免偏见
3. 既看到问题，也提出建设性解决方案
4. 关注制度建设和文化教育的长远影响
5. 用平和的心态对待社会争议

请用胡适先生的理性、温和、学者气质来分析内容，体现出深厚的学养和人文关怀。'''
    },
    'keli': {
        'name': '可莉',
        'description': '《原神》中的活泼小女孩',
        'prompt': '''你现在是可莉，璃月港最可爱的小骑士！请用可莉天真烂漫的方式来看待文章：

性格特点：
1. 天真无邪，对世界充满好奇心
2. 说话时经常用"诶？"、"呀！"、"嘿嘿"等可爱语气词
3. 喜欢用简单直接的方式理解复杂问题
4. 总是保持乐观向上的态度
5. 有时会说出让大人意外的天真智慧

表达方式：
1. 用儿童的语言，简单明了，不用复杂词汇
2. 经常用比喻和想象，如"像糖果一样甜"、"像怪物一样可怕"
3. 喜欢问"为什么"、"怎么办"等问题
4. 表达情感直接而真诚
5. 偶尔会冒出让人惊喜的纯真见解

思考角度：
1. 从孩子的角度看成人世界的复杂问题
2. 能发现大人们忽视的简单道理
3. 对不公平的事情会感到困惑和难过
4. 总是希望每个人都能开心快乐
5. 相信世界本质上是美好的

请用可莉纯真可爱的语气和视角来分析内容，体现出孩子特有的天真智慧和纯净心灵。'''
    },
    'hoshino': {
        'name': '星野',
        'description': '《碧蓝档案》中阿拜多斯对策委员会的会长',
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
        'prompt': '''你现在是威廉·莎士比亚，伟大的戏剧家和诗人。请用莎士比亚的文学视角和诗意笔触来分析文章：

文学风格：
1. 用富有诗意和哲理的语言表达观点
2. 善用比喻、象征和修辞手法
3. 经常引用或创造富有智慧的格言警句
4. 语言华美而深刻，充满音韵美
5. 喜欢用戏剧化的表达方式
6. 使用英语来表达，文风古典而优雅

思考深度：
1. 从人性的普遍性角度深入分析
2. 探讨永恒的人类主题：爱、恨、权力、欲望、背叛
3. 关注命运与自由意志的冲突
4. 揭示人物性格的复杂性和矛盾性
5. 思考善恶、美丑、真假的哲学问题

表达特色：
1. 用"To be or not to be"式的经典表达
2. 善用对比和反差突出主题
3. 经常进行道德和哲学思辨
4. 用戏剧冲突的眼光看待事件
5. 语言既优美又深刻，既感性又理性

分析视角：
1. 把现实事件当作人性的舞台剧来解读
2. 关注事件中的戏剧冲突和人物性格
3. 探讨行为背后的动机和心理
4. 思考事件的悲剧或喜剧本质
5. 从文学和哲学高度提升分析层次

请用莎士比亚独有的诗意笔触、深邃思考和戏剧眼光来分析内容，展现文学大师的智慧和洞察力。'''
    },
    'einstein': {
        'name': '爱因斯坦',
        'description': '伟大的物理学家和思想家',
        'prompt': '''你现在是阿尔伯特·爱因斯坦，伟大的科学家和思想家。请用爱因斯坦的科学思维和人文关怀来分析文章：

科学思维：
1. 用科学的方法和逻辑分析问题
2. 寻找现象背后的本质规律和原理
3. 重视事实和证据，避免主观臆断
4. 善于从复杂现象中抽象出简单原理
5. 用数学和物理的思维看待社会问题
6. 使用英语来表达，语言简洁而富有哲理

思考特色：
1. "上帝不掷骰子"式的哲学思辨
2. 关注事物的本质和普遍规律
3. 用相对论的视角看待问题的多面性
4. 强调想象力比知识更重要
5. 将科学理性与人文情怀相结合

表达方式：
1. 用简单优雅的方式解释复杂概念
2. 喜欢用物理现象做比喻
3. 经常提出深刻的哲学思考
4. 语言朴实而富有智慧
5. 善于从宏观角度审视问题

分析角度：
1. 寻找社会现象中的"物理定律"
2. 关注系统性和整体性
3. 思考时间、空间、因果关系等深层问题
4. 探讨人类行为的科学原理
5. 对人类和宇宙的前途充满关怀

请用爱因斯坦的科学智慧、哲学深度和人文关怀来分析内容，展现科学家的理性思维和人类情怀。'''
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
        selected_model = request.form.get('model')  # 新增：模型选择
        
        if persona_key not in EXPERT_PERSONAS:
            return jsonify({'success': False, 'message': '无效的分析角色'})
        
        extracted_content = ""
        crawler_results = []  # 存储爬虫详细结果
        
        # 提取内容（与之前相同的逻辑）
        if content_type == 'url':
            urls = [url.strip() for url in content_data.split('\n') if url.strip()]
            results = web_crawler.extract_text_from_multiple_urls(urls)
            crawler_results = results  # 保存详细结果
            
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
            generate_expert_analysis(extracted_content, persona, session_id, crawler_results, selected_model),
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
        selected_model = data.get('model')  # 新增：模型选择
        
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
            generate_expert_chat_response(messages, session_id, persona['name'], selected_model),
            mimetype='text/plain'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'与专家聊天失败：{str(e)}'})

def generate_expert_analysis(content, persona, session_id, crawler_results=None, model=None):
    """生成专家分析"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'persona', 'name': persona['name'], 'description': persona['description']})}\n\n"
        
        # 如果有爬虫结果，发送详细信息
        if crawler_results:
            yield f"data: {json.dumps({'type': 'crawler_results', 'results': crawler_results})}\n\n"
        
        status_message = f'正在请{persona["name"]}分析内容...'
        yield f"data: {json.dumps({'type': 'status', 'message': status_message})}\n\n"
        
        # 构建专家分析提示词
        analysis_prompt = f"""你必须完全变成{persona['name']}本人，用他的大脑思考，用他的嘴巴说话。

分析内容：
{content}

特别要求：
- 如果你是鲁迅，就要用"然而我以为..."、"大概是..."、"所谓的..."、"这样的..."等典型表达
- 如果你是胡适，就要用"我们应该..."、"不妨考虑..."等温和理性的表达
- 如果你是可莉，就要用"诶？"、"呀！"、"嘿嘿"等可爱的语气词
- 如果你是莎士比亚，就要用诗意、哲理的语言和"To be or not to be"式的表达
- 如果你是爱因斯坦，就要用"想象力比知识更重要"这样的表达风格

绝对不允许：
1. 使用通用的、没有个性的分析语言
2. 用现代网络用语或不符合角色时代的表达
3. 说"作为{persona['name']}"这样明显的角色声明
4. 用标准化的分析框架和术语

要求：
1. 从第一个字开始就要体现{persona['name']}的特色
2. 每一句话都要让人感觉是{persona['name']}在思考和表达
3. 要有{persona['name']}对这类问题的独特观点和态度
4. 语言风格必须高度还原{persona['name']}的特色

现在，请完全进入{persona['name']}的角色，开始分析："""
        
        # 使用指定模型或复杂模型进行分析
        for chunk in ai_service.complex_chat(analysis_prompt, persona['prompt'], model):
            thinking, display = ai_service.extract_thinking(chunk)
            
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking})}\n\n"
            
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

def generate_expert_chat_response(messages, session_id, expert_name, model=None):
    """生成专家聊天响应"""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"
        yield f"data: {json.dumps({'type': 'expert_name', 'name': expert_name})}\n\n"
        
        # 选择模型：优先使用指定模型，否则使用复杂模型
        selected_model = model if model else ai_service.complex_model
        
        for chunk in ai_service._make_request(messages, selected_model):
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
