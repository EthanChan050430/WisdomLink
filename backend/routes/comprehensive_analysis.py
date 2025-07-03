from flask import Blueprint, request, jsonify, Response
import json
import uuid
import requests
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from utils.file_handler import save_uploaded_files, extract_text_from_file

comprehensive_analysis_bp = Blueprint('comprehensive_analysis', __name__)

SEARCH_API_URL = "http://chengyuxuan.top:3100/search"

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
            if not urls:
                return jsonify({'success': False, 'message': '请提供有效的网址'})
            
            print(f"=== URL提取调试 ===")
            print(f"URLs: {urls}")
            
            results = web_crawler.extract_text_from_multiple_urls(urls)
            
            print(f"爬虫结果数量: {len(results)}")
            for i, result in enumerate(results):
                print(f"结果 {i}: success={result.get('success')}, content_length={len(result.get('content', ''))}")
            
            successful_extractions = 0
            for result in results:
                if result['success']:
                    extracted_content += f"\n\n=== {result['title']} ===\n{result['content']}"
                    successful_extractions += 1
                    print(f"成功提取: {result['title'][:50]}...")
                else:
                    extracted_content += f"\n\n错误：无法提取 {result['url']} 的内容：{result['error']}"
                    print(f"提取失败: {result['url']} - {result['error']}")
            
            print(f"总提取内容长度: {len(extracted_content)}")
            print(f"================")
            
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
                
            saved_paths = ocr_service.save_uploaded_images(images)
            ocr_results = ocr_service.extract_text_from_multiple_images(saved_paths)
            
            for result in ocr_results:
                if result['success']:
                    extracted_content += f"\n\n=== 图片文字 ===\n{result['text']}"
                else:
                    extracted_content += f"\n\n错误：无法识别图片文字：{result['error']}"
        
        if not extracted_content.strip():
            return jsonify({'success': False, 'message': '没有提取到任何有效内容，请检查上传的内容'})
        
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
        
        # 调试信息
        print(f"=== 全面分析调试 ===")
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
        
        # 第一步：文章概要
        yield f"data: {json.dumps({'type': 'step_start', 'step': 1, 'name': '文章概要', 'description': '提取文章大意和核心信息'})}\n\n"
        
        overview_prompt = f"""我是一个专业的内容分析助手。我已经接收到了需要分析的内容，现在开始进行概要分析。

**待分析内容：**
{content}

**分析任务：**
请对上述内容进行全面的概要分析，包括：

## 1. 文章主题和核心观点
- 识别文章的主要主题
- 提取核心观点和论述

## 2. 主要论述内容
- 梳理文章的主要论点
- 分析论述逻辑和结构

## 3. 关键信息点
- 提取重要的事实、数据、案例
- 识别关键术语和概念

## 4. 文章结构简述
- 分析文章的组织结构
- 概述各部分的功能和作用

请直接开始分析，不要询问或说明缺少内容。

<think>
我已经收到了完整的内容，现在开始进行详细的概要分析。我需要仔细阅读并理解这篇文章的主要内容和结构。
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
        
        # 第二步：搜索结果
        yield f"data: {json.dumps({'type': 'step_start', 'step': 2, 'name': '搜索结果', 'description': '搜索相关资料和信息'})}\n\n"
        
        # 首先让AI提取搜索关键词
        yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': '正在基于文章内容提取搜索关键词...'})}\n\n"
        
        keyword_prompt = f"""基于以下概要分析结果：
{overview_content}

以及原文内容：
{content}

请提取3-5个最重要的搜索关键词，用于搜索相关资料和信息。
关键词应该是：
1. 文章的核心主题
2. 重要的概念或术语
3. 可能需要进一步了解的话题

请只返回关键词，每行一个，不要其他解释。例如：
人工智能
机器学习
深度学习"""
        
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
        keywords_display = "## 🎯 提取的搜索关键词\\n\\n"
        for i, kw in enumerate(keywords, 1):
            keywords_display += f"**{i}.** `{kw}`\\n\\n"
        keywords_display += "\\n正在基于这些关键词搜索相关资料...\\n\\n"
        
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
                        
                        # 使用简洁的文本格式，避免复杂嵌套
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
        summary_content += f"- 总共获取到 {sum(len(sr['results'].get('results', [])) for sr in search_results)} 条相关信息\\n"
        
        if search_results:
            summary_content += "\\n这些搜索结果为文章分析提供了额外的背景信息和相关资料，有助于更深入地理解文章内容。"
        
        yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': summary_content})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 2})}\n\n"
        
        # 第三步：深入思考
        yield f"data: {json.dumps({'type': 'step_start', 'step': 3, 'name': '深入思考', 'description': '结合搜索结果深入分析文章'})}\n\n"
        
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
        
        thinking_prompt = f"""基于概要分析：
{overview_content}

结合搜索结果：
{search_context}

请对原文进行深入思考和分析：

原文：
{content}

**分析任务：**
请结合搜索到的相关信息，对文章进行深度分析：

## 1. 文章的深层主旨和意图
- 结合背景信息理解作者真正想表达的观点
- 分析文章的深层含义

## 2. 作者的观点立场和价值取向
- 基于搜索结果分析作者的立场
- 识别可能的偏见或倾向

## 3. 文章的社会意义和影响
- 结合当前相关讨论分析文章的社会价值
- 评估文章可能产生的影响

## 4. 可能的争议点和不同解读
- 基于搜索到的不同观点分析争议
- 提供多角度的解读

## 5. 对读者的启发和思考价值
- 评估文章的教育和启发意义
- 分析读者可以从中获得的价值

## 6. 文章的历史背景和时代意义
- 结合搜索信息分析文章的时代背景
- 评估其历史意义和现实价值

<think>
我需要结合搜索到的相关信息，从更高的角度来理解这篇文章的深层含义，包括作者的真正意图、社会背景、价值观念等。搜索结果为我提供了更多的背景信息和不同视角。
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

搜索结果和相关信息：
{search_context}

深入思考：
{deep_content}

原文：
{content}

**分析任务：**
请生成最终的综合分析报告：

## 1. 文章全面总结
- 基于概要分析的文章总结
- 结合搜索信息的背景补充

## 2. 主要发现和洞察
- 通过深入分析得出的关键发现
- 结合外部信息的新洞察

## 3. 价值评估和意义分析
- 文章的学术或实用价值
- 在相关领域中的地位和意义

## 4. 优缺点评价
- 文章的优点和亮点
- 可能存在的不足或局限

## 5. 对读者的建议和启发
- 读者应该关注的重点
- 可以获得的启发和思考

## 6. 延伸思考和相关推荐
- 相关的延伸阅读建议
- 进一步深入的方向

请用清晰的结构和专业的语言呈现这份综合报告。

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
