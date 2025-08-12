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
            if not urls:
                return jsonify({'success': False, 'message': '请提供有效的网址'})
                
            results = web_crawler.extract_text_from_multiple_urls(urls)
            
            successful_extractions = 0
            for result in results:
                if result['success']:
                    extracted_content += f"\n\n=== {result['title']} ===\n{result['content']}"
                    successful_extractions += 1
                else:
                    extracted_content += f"\n\n错误：无法提取 {result['url']} 的内容：{result['error']}"
            
            # 如果所有URL都失败了，返回错误
            if successful_extractions == 0:
                return jsonify({'success': False, 'message': '无法获取任何网页内容，请检查网址是否有效或网络连接'})
        
        elif content_type == 'text':
            extracted_content = content_data
        
        elif content_type == 'file':
            files = request.files.getlist('files')
            if not files:
                return jsonify({'success': False, 'message': '未检测到上传的文件'})
                
            saved_paths = save_uploaded_files(files)
            
            for file_path in saved_paths:
                file_content = extract_text_from_file(file_path)
                if file_content:
                    extracted_content += f"\n\n=== {file_path} ===\n{file_content}"
        
        elif content_type == 'image':
            images = request.files.getlist('images')
            if not images:
                return jsonify({'success': False, 'message': '未检测到上传的图片'})
            
            # 保存上传的图片
            saved_paths = ocr_service.save_uploaded_images(images)
            
            if not saved_paths:
                return jsonify({'success': False, 'message': '图片保存失败'})
            
            # 生成会话ID
            session_id = str(uuid.uuid4())
            
            # 构建图片事实核查提示
            analysis_prompt = f"""请对这些图片进行事实核查分析。重点关注：

1. **图片内容描述**：详细描述图片中的信息、文字、数据等
2. **文字信息提取**：如果图片包含文字、数据、声明等，请准确提取
3. **事实核查分析**：
   - 识别图片中可能的事实性声明
   - 分析这些信息的可信度
   - 指出可能存在的误导性或虚假信息
   - 提供相关的背景事实
4. **真实性评估**：对图片内容的真实性给出专业判断
5. **建议**：如何进一步验证图片中的信息

用户关注的内容：{content_data if content_data else '请全面核查图片信息的真实性'}

请以事实核查专家的身份，客观、严谨地进行分析。"""
            
            def generate_image_fact_check():
                try:
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'step_start', 'step': 1, 'title': '图片信息提取与分析'}, ensure_ascii=False)}\n\n"
                    
                    # 使用GLM-4V-Flash分析图片
                    for chunk in ai_service.analyze_image(saved_paths, analysis_prompt):
                        if chunk.strip():
                            yield f"data: {json.dumps({'type': 'content', 'content': chunk, 'step': 1}, ensure_ascii=False)}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'step_complete', 'step': 1}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'analysis_complete'}, ensure_ascii=False)}\n\n"
                    
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'图片事实核查失败：{str(e)}'}, ensure_ascii=False)}\n\n"
            
            return Response(
                generate_image_fact_check(),
                mimetype='text/plain; charset=utf-8'
            )
        
        if not extracted_content.strip():
            return jsonify({'success': False, 'message': '没有提取到任何有效内容，请检查上传的内容'})
        
        # 生成会话ID
        session_id = str(uuid.uuid4())
        
        # 使用流式响应实现实时进度更新
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
        
        # 调试信息
        print(f"=== 真伪鉴定调试 ===")
        print(f"内容长度: {len(content)}")
        print(f"内容前200字符: {content[:200]}")
        print(f"==================")
        
        # 检查内容是否为空或包含爬虫错误
        if not content.strip():
            yield f"data: {json.dumps({'type': 'error', 'message': '内容为空，无法进行分析'})}\n\n"
            return
            
        if "错误：无法提取" in content:
            yield f"data: {json.dumps({'type': 'error', 'message': '网页内容提取失败，请检查链接是否有效'})}\n\n"
            return
            
        if "没有提取到任何内容" in content:
            yield f"data: {json.dumps({'type': 'error', 'message': '没有提取到任何有效内容，请重新尝试'})}\n\n"
            return
        
        # 第一步：文章解析
        yield f"data: {json.dumps({'type': 'step_start', 'step': 1, 'name': '文章解析', 'description': '分析文章内容和结构'})}\n\n"
        
        parsing_prompt = f"""我是一个专业的事实核查分析助手。我已经接收到了需要进行真伪鉴定的内容，现在开始进行结构化解析。

**待分析内容：**
{content}

**分析任务：**
请对上述内容进行结构化解析，重点识别需要验证的事实信息：

## 1. 文章主要声明和观点
- 识别文章中的主要论断
- 提取作者的核心观点

## 2. 具体的事实陈述
- 列出文章中的具体事实声明
- 识别可能存在争议的陈述

## 3. 数据、时间、地点等关键信息
- 提取具体的数字、日期、地点
- 识别统计数据和量化信息

## 4. 引用的资料或来源
- 找出文章引用的资料和来源
- 分析引用的可信度

## 5. 作者的推论和结论
- 区分事实和推论
- 识别逻辑推理过程

请直接开始分析，不要询问或说明缺少内容。

<think>
我已经收到了完整的内容，现在开始进行详细的事实分析。我需要仔细识别出其中的事实陈述、观点和可能需要验证的信息，专注于找出可能存在争议或需要核实的具体内容。
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
        
        # 第二步：关键词提取和搜索
        yield f"data: {json.dumps({'type': 'step_start', 'step': 2, 'name': '搜索结果', 'description': '提取关键信息并搜索验证资料'})}\n\n"
        
        keyword_prompt = f"""基于文章解析结果：
{parsed_content}

原文：
{content}

请提取需要事实核查的关键词，用于搜索验证。要求：
- 提取5个最重要的关键词或短语
- 选择具体的、可验证的信息点
- 包括人名、地名、机构名、重要事件等

请只返回关键词，每行一个，不要其他解释。例如：
福岛核污染水
东京电力公司
IAEA报告
海洋污染"""
        
        keywords_content = ""
        for chunk in ai_service.simple_chat(keyword_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': thinking})}\n\n"
            if display:
                keywords_content += display
        
        # 解析关键词
        keywords = [kw.strip() for kw in keywords_content.split('\n') if kw.strip() and not kw.startswith('#')]
        keywords = keywords[:5]  # 最多5个关键词
        
        # 美化关键词显示
        keywords_display = "## 🎯 提取的验证关键词\\n\\n"
        for i, kw in enumerate(keywords, 1):
            keywords_display += f"**{i}.** `{kw}`\\n\\n"
        keywords_display += "\\n正在基于这些关键词搜索验证资料...\\n\\n"
        
        yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': keywords_display})}\n\n"
        
        # 执行搜索
        search_results = []
        for keyword in keywords:
            yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': f'正在搜索关键词: {keyword}'})}\n\n"
            
            search_result = search_information(keyword)
            if 'error' not in search_result:
                search_results.append({
                    'keyword': keyword,
                    'results': search_result
                })
                
                # 显示搜索结果
                result_content = f"\\n\\n### 🔍 关键词: {keyword}\\n\\n"
                
                if 'results' in search_result and search_result['results']:
                    for i, item in enumerate(search_result['results'][:3], 1):  # 显示前3个结果
                        title = item.get('title', '无标题')
                        url = item.get('url', '')
                        snippet = item.get('snippet', item.get('description', '无描述'))
                        
                        # 使用简洁的文本格式
                        result_content += f"{i}. **{title}**\\n"
                        if snippet and snippet != '无描述':
                            result_content += f"   {snippet}\\n"
                        if url:
                            result_content += f"   链接: {url}\\n"
                        result_content += "\\n"
                else:
                    result_content += "未找到相关搜索结果\\n\\n"
                
                yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': result_content})}\n\n"
            else:
                error_msg = search_result.get('error', '未知错误')
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': f'搜索 {keyword} 失败: {error_msg}'})}\n\n"
        
        # 总结搜索结果
        summary_content = f"\\n\\n## 📊 搜索结果总结\\n\\n"
        summary_content += f"- 成功搜索关键词: {len(search_results)}/{len(keywords)}\\n"
        summary_content += f"- 总共获取到 {sum(len(sr['results'].get('results', [])) for sr in search_results)} 条验证资料\\n"
        
        if search_results:
            summary_content += "\\n这些搜索结果将用于下一步的事实验证和真伪鉴定分析。"
        
        yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': summary_content})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 2})}\n\n"
        
        # 第三步：深度分析
        yield f"data: {json.dumps({'type': 'step_start', 'step': 3, 'name': '深度分析', 'description': '对比搜索结果与原文进行深度分析'})}\n\n"
        
        # 将搜索结果整理为文本
        search_context = ""
        for sr in search_results:
            search_context += f"关键词 '{sr['keyword']}' 的搜索结果：\n"
            if 'results' in sr['results'] and sr['results']['results']:
                for item in sr['results']['results'][:2]:  # 每个关键词取前2个结果
                    title = item.get('title', '无标题')
                    snippet = item.get('snippet', item.get('description', ''))
                    search_context += f"- {title}: {snippet}\n"
            search_context += "\n"
        
        # 第四步：真伪鉴定
        yield f"data: {json.dumps({'type': 'step_start', 'step': 4, 'name': '真伪鉴定', 'description': '基于搜索结果进行真伪分析'})}\n\n"
        
        analysis_prompt = f"""基于文章解析和搜索结果进行深度分析：

文章解析：
{parsed_content}

原文：
{content}

搜索得到的验证资料：
{search_context}

请结合搜索到的资料对原文进行深度分析：

## 1. 信息对比分析
- 原文声明与搜索资料的一致性分析
- 发现的矛盾或不一致之处

## 2. 可信度评估
- 基于搜索资料评估原文信息的可信度
- 识别可能的误导性信息

## 3. 补充信息
- 搜索资料中的额外背景信息
- 原文未提及的重要相关信息

## 4. 争议点分析
- 识别存在争议的观点
- 分析不同来源的观点差异

<think>
我需要仔细对比原文和搜索到的资料，找出事实的准确性，识别可能的偏见或错误信息。
</think>"""
        
        analysis_content = ""
        for chunk in ai_service.complex_chat(analysis_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 3, 'content': thinking})}\n\n"
            if display:
                analysis_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 3, 'content': display})}\n\n"
        
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

搜索得到的验证资料：
{search_context}

深度分析结果：
{analysis_content}

请进行综合分析并提供：

## 1. 真实性评估
- 对文章中各个声明的真实性评估
- 基于搜索结果的事实核查

## 2. 对比分析
- 原文与搜索结果的一致性分析
- 发现的矛盾或不一致之处

## 3. 可信度评级
- 整体可信度评级（高/中/低）
- 具体声明的可信度分析

## 4. 风险提示
- 需要进一步核实的信息
- 可能的误导性内容

## 5. 总体结论
- 客观的真伪判定结论
- 对读者的建议

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

def generate_fact_checking_analysis_json(content, session_id):
    """生成真伪鉴定分析的四个步骤 - JSON版本（非流式）"""
    try:
        print(f"=== 真伪鉴定调试（JSON版本）===")
        print(f"内容长度: {len(content)}")
        print(f"内容前200字符: {content[:200]}")
        print(f"==================")
        
        # 检查内容是否为空或包含爬虫错误
        if not content.strip():
            raise Exception('内容为空，无法进行鉴定')
            
        if "错误：无法提取" in content:
            raise Exception('网页内容提取失败，请检查链接是否有效')
            
        if "没有提取到任何内容" in content:
            raise Exception('没有提取到任何有效内容，请重新尝试')
        
        analysis_result = {
            'steps': []
        }
        
        # 第一步：内容解析
        print("开始第一步：内容解析")
        content_analysis_prompt = f"""我是一个专业的真伪鉴定助手。现在需要对以下内容进行真伪鉴定分析。

**待鉴定内容：**
{content}

**鉴定任务：**
请对上述内容进行详细的解析，包括：

## 内容解析

### 内容类型识别
分析这是什么类型的内容（新闻、观点、数据、传言等）

### 关键声明提取
提取内容中的关键声明、数据和论断

### 信息来源分析
分析内容的信息来源和引用情况

### 可验证要素
识别哪些部分是可以验证的具体事实

请使用标准的markdown格式。

<think>
我需要仔细分析这个内容，识别其中的关键声明和可验证要素。
</think>"""
        
        content_analysis = ai_service.simple_chat_complete(content_analysis_prompt)
        analysis_result['steps'].append({
            'step': 1,
            'name': '内容解析',
            'description': '解析内容类型和关键声明',
            'content': content_analysis
        })
        
        # 第二步：事实核查
        print("开始第二步：事实核查")
        
        # 提取核查关键词
        keyword_prompt = f"""基于以下内容解析：
{content_analysis}

以及原始内容：
{content}

请提取3-5个最需要核查的关键词或关键声明，用于搜索验证信息。
关键词应该是：
1. 具体的事实声明
2. 可验证的数据
3. 重要的人物、地点、事件
4. 需要证实的关键信息

请直接输出关键词，每行一个，不要其他格式。"""
        
        keywords_text = ai_service.simple_chat_complete(keyword_prompt)
        keywords = [kw.strip() for kw in keywords_text.split('\n') if kw.strip() and not kw.strip().startswith('#')]
        keywords = keywords[:5]  # 限制最多5个关键词
        
        fact_check_content = "## 事实核查结果\n\n"
        
        for i, keyword in enumerate(keywords, 1):
            fact_check_content += f"### {i}. 核查要点：{keyword}\n\n"
            
            search_data = search_information(keyword)
            if 'error' not in search_data and 'results' in search_data:
                results = search_data['results'][:3]  # 取前3个结果
                for j, result in enumerate(results, 1):
                    title = result.get('title', '未知标题')
                    snippet = result.get('snippet', '无描述')
                    url = result.get('url', '#')
                    
                    fact_check_content += f"**参考资料 {j}**：[{title}]({url})\n"
                    fact_check_content += f"{snippet}\n\n"
            else:
                fact_check_content += f"搜索 '{keyword}' 时出现错误或无结果\n\n"
        
        analysis_result['steps'].append({
            'step': 2,
            'name': '事实核查',
            'description': '搜索验证信息和参考资料',
            'content': fact_check_content
        })
        
        # 第三步：可信度分析
        print("开始第三步：可信度分析")
        credibility_prompt = f"""基于前面的内容解析：
{content_analysis}

以及事实核查结果：
{fact_check_content}

以及原始内容：
{content}

请进行可信度分析，包括：

## 可信度分析

### 信息源可信度
分析信息来源的权威性和可靠性

### 逻辑一致性
检查内容的逻辑是否一致、论证是否合理

### 证据支撑度
评估有多少可靠证据支持相关声明

### 疑点识别
指出内容中存在的疑点或矛盾之处

### 风险评估
评估信息传播可能带来的风险

请使用标准的markdown格式。"""
        
        credibility_analysis = ai_service.complex_chat_complete(credibility_prompt)
        analysis_result['steps'].append({
            'step': 3,
            'name': '可信度分析',
            'description': '分析信息的可信度和逻辑性',
            'content': credibility_analysis
        })
        
        # 第四步：结论判定
        print("开始第四步：结论判定")
        conclusion_prompt = f"""基于所有前面的分析：

**内容解析：**
{content_analysis}

**事实核查：**
{fact_check_content}

**可信度分析：**
{credibility_analysis}

**原始内容：**
{content}

请给出最终的真伪判定结论：

## 真伪判定结论

### 总体判定
给出明确的真假判断（真实/部分真实/存疑/虚假）

### 判定依据
详细说明判定的主要依据

### 核心证据
列出支持或反驳的核心证据

### 建议处理
针对该信息给出处理建议

### 注意事项
提醒用户需要注意的相关问题

请使用标准的markdown格式，提供准确、负责任的判定结果。"""
        
        conclusion = ai_service.complex_chat_complete(conclusion_prompt)
        analysis_result['steps'].append({
            'step': 4,
            'name': '结论判定',
            'description': '给出最终的真伪判定结论',
            'content': conclusion
        })
        
        print("真伪鉴定完成")
        return analysis_result
        
    except Exception as e:
        print(f"真伪鉴定出错：{str(e)}")
        raise e
