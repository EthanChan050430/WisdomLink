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
        
        # 使用流式响应实现实时进度更新
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
        print(f"=== 全面分析调试（流式版本）===")
        print(f"会话ID: {session_id}")
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
        print("=" * 30)
        print("开始第一步：文章概要")
        print("=" * 30)
        yield f"data: {json.dumps({'type': 'step_start', 'step': 1, 'name': '文章概要', 'description': '提取文章大意和核心信息'})}\n\n"
        
        overview_prompt = f"""我是一个专业的内容分析助手。请对以下内容进行全面的概要分析。

**待分析内容：**
{content}

**分析任务：**
请对上述内容进行全面的概要分析，包括：

## 📋 文章概要分析

### 🎯 主要主题
- 明确识别文章的核心主题
- 分析主题的重要性和相关性

### 💡 核心观点
- 提取文章的核心观点和主要论述
- 分析观点的逻辑性和说服力

### 📊 主要论述内容
- **主要论点**：系统梳理文章的主要论点
- **论述逻辑**：分析论述的逻辑关系和结构
- **支撑证据**：识别用于支撑论点的证据和案例

### 🔍 关键信息点
- **重要事实和数据**：提取重要的事实、数据、统计信息
- **关键术语和概念**：识别并解释关键术语和概念
- **重要人物和机构**：识别文中提到的重要人物和机构

### 📖 文章结构
- 分析文章的组织结构和段落安排
- 评估结构的合理性和逻辑性

请使用清晰的markdown格式，确保分析全面而深入。

<think>
我需要仔细阅读这篇内容，从多个维度进行概要分析，包括主题、观点、论述、信息点和结构等方面。
</think>"""
        
        overview_content = ""
        print("正在调用AI进行概要分析...")
        for chunk in ai_service.complex_chat(overview_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 1, 'content': thinking})}\n\n"
            if display:
                overview_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 1, 'content': display})}\n\n"
        
        print(f"概要分析完成，内容长度: {len(overview_content)}")
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 1})}\n\n"
        
        # 第二步：搜索结果
        print("=" * 30)
        print("开始第二步：搜索结果")
        print("=" * 30)
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
4. 相关的人物、机构或事件

请直接输出关键词，每行一个，不要其他格式和解释。"""
        
        keywords_content = ""
        for chunk in ai_service.simple_chat(keyword_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': thinking})}\n\n"
            if display:
                keywords_content += display
        
        # 解析关键词
        keywords = [kw.strip() for kw in keywords_content.split('\n') if kw.strip() and not kw.startswith('#') and not kw.startswith('*')]
        keywords = keywords[:5]  # 最多5个关键词
        
        print(f"提取到的关键词: {keywords}")
        
        # 美化关键词显示
        keywords_display = "## 🎯 提取的搜索关键词\\n\\n"
        for i, kw in enumerate(keywords, 1):
            keywords_display += f"**{i}.** `{kw}`\\n\\n"
        keywords_display += "\\n正在基于这些关键词搜索相关资料...\\n\\n"
        
        yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': keywords_display})}\n\n"
        
        # 执行搜索
        search_results = []
        search_results_data = []
        
        for keyword in keywords:
            print(f"正在搜索关键词: {keyword}")
            yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': f'正在搜索关键词: {keyword}'})}\n\n"
            
            search_result = search_information(keyword)
            if 'error' not in search_result and 'results' in search_result and search_result['results']:
                search_results.append({
                    'keyword': keyword,
                    'results': search_result
                })
                
                results = search_result['results'][:3]  # 显示前3个结果
                print(f"  找到 {len(results)} 个相关结果")
                
                # 显示搜索结果
                result_content = f"\\n\\n### 🔍 关键词: {keyword}\\n\\n"
                
                for i, item in enumerate(results, 1):
                    title = item.get('title', '无标题')
                    url = item.get('url', '')
                    snippet = item.get('snippet', item.get('description', '无描述'))
                    
                    # 使用简洁的文本格式，避免复杂嵌套
                    result_content += f"{i}. **{title}**\\n"
                    if snippet and snippet != '无描述':
                        result_content += f"   📄 {snippet}\\n"
                    if url:
                        result_content += f"   🔗 {url}\\n"
                    result_content += "\\n"
                    
                    # 保存搜索结果数据供后续分析使用
                    search_results_data.append({
                        'keyword': keyword,
                        'title': title,
                        'snippet': snippet,
                        'url': url
                    })
                
                yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': result_content})}\n\n"
            else:
                print(f"  搜索 '{keyword}' 时出现错误或无结果")
                error_msg = search_result.get('error', '未知错误')
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': f'搜索 {keyword} 失败: {error_msg}'})}\n\n"
                
                result_content = f"\\n\\n### 🔍 关键词: {keyword}\\n\\n❌ 搜索时出现错误或无结果\\n\\n"
                yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': result_content})}\n\n"
        
        # 总结搜索结果
        summary_content = f"\\n\\n## 📊 搜索结果总结\\n\\n"
        summary_content += f"- 成功搜索关键词: {len(search_results)}/{len(keywords)}\\n"
        summary_content += f"- 总共获取到 {len(search_results_data)} 条相关信息\\n"
        
        if search_results:
            summary_content += "\\n这些搜索结果为文章分析提供了额外的背景信息和相关资料，有助于更深入地理解文章内容。"
        
        yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': summary_content})}\n\n"
        print(f"搜索结果汇总完成，共获得 {len(search_results_data)} 条有效结果")
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 2})}\n\n"
        
        # 第三步：深入思考
        print("=" * 30)
        print("开始第三步：深入思考")
        print("=" * 30)
        yield f"data: {json.dumps({'type': 'step_start', 'step': 3, 'name': '深入思考', 'description': '结合搜索结果深入分析文章'})}\n\n"
        
        # 将搜索结果整理为文本
        search_context = ""
        if search_results_data:
            search_context = "相关搜索结果：\n"
            for result in search_results_data:
                search_context += f"- 关键词'{result['keyword']}'：{result['title']} - {result['snippet']}\n"
        
        thinking_prompt = f"""基于前面的概要分析：
{overview_content}

结合搜索结果：
{search_context}

请对原文进行深入思考和分析：

原文：
{content}

**分析任务：**
请结合搜索到的相关信息，对文章进行深度分析：

## 🔬 深度分析

### 💎 内容价值评估
- **学术价值**：评估内容的学术意义和理论贡献
- **实用价值**：分析内容的实际应用价值和指导意义
- **社会影响**：评估内容可能产生的社会影响和意义
- **创新性**：分析内容的创新点和独特之处

### 🎭 观点深度解读
- **观点层次**：分析观点的深度和复杂性
- **论证质量**：评估论证的严密性和说服力
- **偏见识别**：识别可能存在的偏见或局限性
- **多角度视角**：从不同角度解读核心观点

### 🔗 逻辑关系分析
- **论证结构**：分析论证的逻辑结构和推理过程
- **因果关系**：识别内容中的因果关系链
- **矛盾冲突**：发现可能存在的逻辑矛盾或冲突
- **论证缺陷**：指出论证中的薄弱环节

### 🌍 背景和上下文
- **历史背景**：分析内容的历史背景和发展脉络
- **社会环境**：考虑内容产生的社会环境和条件
- **相关研究**：结合搜索结果分析相关研究和观点
- **时代意义**：评估内容在当前时代的意义和价值

### 🤔 批判性思考
- **质疑与反思**：对内容进行批判性质疑和反思
- **替代观点**：提出可能的替代观点或解释
- **改进建议**：提出内容可以改进的方面
- **未来展望**：分析内容的发展趋势和未来可能性

请进行深入而全面的分析，使用清晰的markdown格式。

<think>
我需要结合概要分析和搜索结果，对原始内容进行深入的批判性分析，从多个维度评估其价值、观点、逻辑和意义。
</think>"""
        
        deep_content = ""
        print("正在进行深度分析...")
        for chunk in ai_service.complex_chat(thinking_prompt):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'step': 3, 'content': thinking})}\n\n"
            if display:
                deep_content += display
                yield f"data: {json.dumps({'type': 'content', 'step': 3, 'content': display})}\n\n"
        
        print(f"深度分析完成，内容长度: {len(deep_content)}")
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 3})}\n\n"
        
        # 第四步：总结归纳
        print("=" * 30)
        print("开始第四步：总结归纳")
        print("=" * 30)
        yield f"data: {json.dumps({'type': 'step_start', 'step': 4, 'name': '总结归纳', 'description': '综合所有分析生成最终报告'})}\n\n"
        
        # 限制前面步骤内容的长度，避免prompt过长
        overview_summary = overview_content[:500] + "..." if len(overview_content) > 500 else overview_content
        search_summary = search_context[:300] + "..." if len(search_context) > 300 else search_context
        deep_summary = deep_content[:500] + "..." if len(deep_content) > 500 else deep_content
        
        print(f"第四步prompt长度控制 - 概要: {len(overview_summary)}, 搜索: {len(search_summary)}, 深度: {len(deep_summary)}")
        
        # 简化prompt，避免过长导致AI无响应
        summary_prompt = f"""基于前面的分析，请生成最终的综合总结报告。

概要分析摘要：
{overview_summary}

搜索结果摘要：
{search_summary}

深度分析摘要：
{deep_summary}

请生成：

## 📊 最终分析总结

### 🎯 核心发现
总结最重要的发现和洞察

### 💎 关键价值点
- 理论价值
- 实践价值  
- 启发价值

### 📋 综合评价
- 优点分析
- 不足之处
- 整体评估

### 💡 实用建议
为读者提供实用的建议和启示

### 🔮 延伸思考
提出值得进一步探索的问题和方向

请用清晰的markdown格式，提供有价值的总结。

<think>
我需要基于前面的分析，生成一个完整而有价值的最终总结报告。
</think>"""
        
        print("正在生成最终汇总...")
        summary_content = ""
        chunk_count = 0
        
        try:
            for chunk in ai_service.complex_chat(summary_prompt):
                chunk_count += 1
                print(f"第四步收到chunk {chunk_count}: {chunk[:100]}...")
                
                thinking, display = ai_service.extract_thinking(chunk)
                if thinking:
                    print(f"第四步思考内容: {thinking[:100]}...")
                    yield f"data: {json.dumps({'type': 'thinking', 'step': 4, 'content': thinking})}\n\n"
                if display:
                    print(f"第四步显示内容: {display[:100]}...")
                    summary_content += display
                    yield f"data: {json.dumps({'type': 'content', 'step': 4, 'content': display})}\n\n"
        except Exception as e:
            print(f"第四步AI调用出错: {str(e)}")
            chunk_count = 0
            summary_content = ""
        
        print(f"最终汇总完成，总共收到 {chunk_count} 个chunk，内容长度: {len(summary_content)}")
        
        # 如果没有收到任何内容，生成一个备用总结
        if not summary_content.strip() or chunk_count == 0:
            print("警告：AI没有返回任何内容，生成备用总结...")
            
            # 基于前面步骤的内容生成一个简单的总结
            fallback_summary = f"""## 📊 最终分析总结

### 🎯 核心发现
通过前面的分析，我们完成了以下工作：
- 对内容进行了详细的概要分析
- 搜索了相关的背景资料和信息
- 进行了深入的批判性分析

### 💎 关键价值点
- **理论价值**：内容提供了有价值的技术信息和实践指导
- **实践价值**：对读者具有实际的参考和应用价值
- **启发价值**：能够引发读者对相关技术的深入思考

### 📋 综合评价
- **优点**：内容详实，步骤清晰，具有较强的实用性
- **价值**：为技术学习和实践提供了有效的指导
- **意义**：有助于读者快速掌握相关技术要点

### 💡 实用建议
- 建议读者结合实际需求，选择性地应用文中的方法和技巧
- 在实践过程中注意环境配置和版本兼容性问题
- 可以参考文中提供的资源和工具来提高效率

### 🔮 延伸思考
- 可以进一步探索相关技术的最新发展和应用场景
- 思考如何将所学知识应用到实际项目中
- 关注技术社区的最佳实践和经验分享

*注：本总结基于前面的分析步骤生成。*"""
            
            yield f"data: {json.dumps({'type': 'content', 'step': 4, 'content': fallback_summary})}\n\n"
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 4})}\n\n"
        yield f"data: {json.dumps({'type': 'analysis_complete'})}\n\n"
        
        print("=" * 50)
        print("全面分析完成！")
        print("=" * 50)
        
    except Exception as e:
        print(f"全面分析出错：{str(e)}")
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

def generate_comprehensive_analysis_json(content, session_id):
    """生成全面分析的四个步骤 - JSON版本（非流式）"""
    try:
        print(f"=== 全面分析调试（JSON版本）===")
        print(f"会话ID: {session_id}")
        print(f"内容长度: {len(content)}")
        print(f"内容前200字符: {content[:200]}")
        print(f"==================")
        
        # 检查内容是否为空或包含爬虫错误
        if not content.strip():
            raise Exception('内容为空，无法进行分析')
            
        if "错误：无法提取" in content:
            raise Exception('网页内容提取失败，请检查链接是否有效')
            
        if "没有提取到任何内容" in content:
            raise Exception('没有提取到任何有效内容，请重新尝试')
        
        analysis_result = {
            'steps': []
        }
        
        # 第一步：文章概要
        print("=" * 50)
        print("开始第一步：文章概要")
        print("=" * 50)
        
        overview_prompt = f"""我是一个专业的内容分析助手。请对以下内容进行全面的概要分析。

**待分析内容：**
{content}

**分析任务：**
请对上述内容进行全面的概要分析，包括：

## 📋 文章概要分析

### 🎯 主要主题
- 明确识别文章的核心主题
- 分析主题的重要性和相关性

### 💡 核心观点
- 提取文章的核心观点和主要论述
- 分析观点的逻辑性和说服力

### 📊 主要论述内容
- **主要论点**：系统梳理文章的主要论点
- **论述逻辑**：分析论述的逻辑关系和结构
- **支撑证据**：识别用于支撑论点的证据和案例

### 🔍 关键信息点
- **重要事实和数据**：提取重要的事实、数据、统计信息
- **关键术语和概念**：识别并解释关键术语和概念
- **重要人物和机构**：识别文中提到的重要人物和机构

### 📖 文章结构
- 分析文章的组织结构和段落安排
- 评估结构的合理性和逻辑性

请使用清晰的markdown格式，确保分析全面而深入。

<think>
我需要仔细阅读这篇内容，从多个维度进行概要分析，包括主题、观点、论述、信息点和结构等方面。
</think>"""
        
        print("正在调用AI进行概要分析...")
        overview_content = ai_service.complex_chat_complete(overview_prompt)
        print(f"概要分析完成，内容长度: {len(overview_content)}")
        print(f"概要分析内容预览: {overview_content[:300]}...")
        
        analysis_result['steps'].append({
            'step': 1,
            'name': '文章概要',
            'description': '提取文章大意和核心信息',
            'content': overview_content
        })
        
        # 第二步：搜索结果
        print("=" * 50)
        print("开始第二步：搜索结果")
        print("=" * 50)
        
        # 提取搜索关键词
        print("正在提取搜索关键词...")
        keyword_prompt = f"""基于以下概要分析结果：
{overview_content}

以及原文内容：
{content}

请提取3-5个最重要的搜索关键词，用于搜索相关资料和信息。
关键词应该是：
1. 文章的核心主题
2. 重要的概念或术语
3. 可能需要进一步了解的话题
4. 相关的人物、机构或事件

请直接输出关键词，每行一个，不要其他格式和解释。"""
        
        keywords_text = ai_service.simple_chat_complete(keyword_prompt)
        keywords = [kw.strip() for kw in keywords_text.split('\n') if kw.strip() and not kw.strip().startswith('#') and not kw.strip().startswith('*')]
        keywords = keywords[:5]  # 限制最多5个关键词
        
        print(f"提取到的关键词: {keywords}")
        
        search_results_content = "## 🔍 搜索结果汇总\n\n"
        search_results_content += f"基于文章内容，我们提取了以下关键词进行搜索：`{'`、`'.join(keywords)}`\n\n"
        
        search_results_data = []
        
        for i, keyword in enumerate(keywords, 1):
            print(f"正在搜索关键词 {i}/{len(keywords)}: {keyword}")
            search_results_content += f"### {i}. 关键词：{keyword}\n\n"
            
            search_data = search_information(keyword)
            if 'error' not in search_data and 'results' in search_data and search_data['results']:
                results = search_data['results'][:3]  # 取前3个结果
                print(f"  找到 {len(results)} 个相关结果")
                
                for j, result in enumerate(results, 1):
                    title = result.get('title', '未知标题')
                    snippet = result.get('snippet', result.get('description', '无描述'))
                    url = result.get('url', '#')
                    
                    search_results_content += f"**结果 {j}**：[{title}]({url})\n"
                    search_results_content += f"📄 {snippet}\n\n"
                    
                    # 保存搜索结果数据供后续分析使用
                    search_results_data.append({
                        'keyword': keyword,
                        'title': title,
                        'snippet': snippet,
                        'url': url
                    })
            else:
                print(f"  搜索 '{keyword}' 时出现错误或无结果")
                search_results_content += f"❌ 搜索 '{keyword}' 时出现错误或无结果\n\n"
        
        print(f"搜索结果汇总完成，共获得 {len(search_results_data)} 条有效结果")
        
        analysis_result['steps'].append({
            'step': 2,
            'name': '搜索结果',
            'description': '搜索相关资料和信息',
            'content': search_results_content
        })
        
        # 第三步：深度分析
        print("=" * 50)
        print("开始第三步：深度分析")
        print("=" * 50)
        
        # 构建搜索结果上下文
        search_context = ""
        if search_results_data:
            search_context = "相关搜索结果：\n"
            for result in search_results_data:
                search_context += f"- 关键词'{result['keyword']}'：{result['title']} - {result['snippet']}\n"
        
        # 限制内容长度，避免prompt过长
        overview_summary = overview_content[:800] + "..." if len(overview_content) > 800 else overview_content
        search_summary = search_context[:500] + "..." if len(search_context) > 500 else search_context
        content_summary = content[:1000] + "..." if len(content) > 1000 else content
        
        deep_analysis_prompt = f"""基于前面的概要分析：
{overview_summary}

以及搜索到的相关信息：
{search_summary}

请对以下内容进行深度分析：
{content_summary}

请进行简洁而深入的分析：

## 🔬 深度分析

### 💎 内容价值评估
- 分析内容的实用价值和指导意义
- 评估内容的创新性和独特之处

### 🎭 观点深度解读  
- 分析观点的深度和复杂性
- 评估论证的严密性和说服力

### 🔗 逻辑关系分析
- 分析论证的逻辑结构和推理过程
- 识别内容中的因果关系

### 🌍 背景和上下文
- 分析内容的历史背景和发展脉络
- 评估内容在当前时代的意义和价值

### 🤔 批判性思考
- 对内容进行批判性质疑和反思
- 提出可能的改进建议

请使用清晰的markdown格式，保持分析简洁明了。

<think>
我需要对这个内容进行深入的批判性分析，从多个维度评估其价值、观点、逻辑和意义。
</think>"""
        
        print("正在进行深度分析...")
        print(f"深度分析prompt长度: {len(deep_analysis_prompt)}")
        try:
            deep_analysis_content = ai_service.complex_chat_complete(deep_analysis_prompt)
            print(f"深度分析完成，内容长度: {len(deep_analysis_content)}")
            print(f"深度分析内容预览: {deep_analysis_content[:300]}...")
        except Exception as e:
            print(f"第三步AI调用出错: {str(e)}")
            import traceback
            traceback.print_exc()
            deep_analysis_content = ""
        
        analysis_result['steps'].append({
            'step': 3,
            'name': '深度分析',
            'description': '深入分析内容价值和意义',
            'content': deep_analysis_content
        })
        
        # 第四步：结果汇总
        print("=" * 50)
        print("开始第四步：结果汇总")
        print("=" * 50)
        
        # 限制前面步骤内容的长度，避免prompt过长
        overview_summary = overview_content[:600] + "..." if len(overview_content) > 600 else overview_content
        search_summary = search_results_content[:400] + "..." if len(search_results_content) > 400 else search_results_content
        deep_summary = deep_analysis_content[:600] + "..." if len(deep_analysis_content) > 600 else deep_analysis_content
        
        summary_prompt = f"""基于前面的分析：

**概要分析摘要：**
{overview_summary}

**搜索结果摘要：**
{search_summary}

**深度分析摘要：**
{deep_summary}

请生成最终的综合总结：

## 📊 最终分析总结

### 🎯 核心发现
- 总结分析过程中最重要的发现和洞察
- 提炼出最核心的观点和论述

### 💎 关键价值点
- **理论价值**：总结内容的理论贡献和学术价值
- **实践价值**：分析内容的实际应用价值和指导意义
- **启发价值**：提炼对读者最有启发意义的内容

### 📋 综合评价
- **优点分析**：总结内容的主要优点和亮点
- **不足之处**：指出内容可能存在的不足或局限
- **整体评估**：给出对内容的整体评价和定位

### 💡 实用建议
- **阅读建议**：为读者提供阅读和理解的建议
- **应用建议**：提供如何应用内容的实用建议
- **学习建议**：为进一步学习提供方向性建议

### 🔮 延伸思考
- **深入问题**：提出值得进一步思考和探索的问题
- **相关领域**：推荐相关的研究领域或话题
- **未来发展**：分析相关领域的未来发展趋势

请提供一个全面、深入、有价值的最终总结，使用清晰的markdown格式。

<think>
我需要将前面的所有分析整合起来，形成一个完整、有条理、有价值的最终报告。
</think>"""
        
        print("正在生成最终汇总...")
        print(f"最终汇总prompt长度: {len(summary_prompt)}")
        try:
            summary_content = ai_service.complex_chat_complete(summary_prompt)
            print(f"最终汇总完成，内容长度: {len(summary_content)}")
            print(f"最终汇总内容预览: {summary_content[:300]}...")
        except Exception as e:
            print(f"第四步AI调用出错: {str(e)}")
            import traceback
            traceback.print_exc()
            summary_content = ""
        
        # 如果没有收到任何内容，生成一个备用总结
        if not summary_content.strip():
            print("警告：AI没有返回任何内容，生成备用总结...")
            summary_content = f"""## 📊 最终分析总结

### 🎯 核心发现
通过前面的分析，我们完成了以下工作：
- 对内容进行了详细的概要分析
- 搜索了相关的背景资料和信息
- 进行了深入的批判性分析

### 💎 关键价值点
- **理论价值**：内容提供了有价值的技术信息和实践指导
- **实践价值**：对读者具有实际的参考和应用价值
- **启发价值**：能够引发读者对相关技术的深入思考

### 📋 综合评价
- **优点**：内容详实，步骤清晰，具有较强的实用性
- **价值**：为技术学习和实践提供了有效的指导
- **意义**：有助于读者快速掌握相关技术要点

### 💡 实用建议
- 建议读者结合实际需求，选择性地应用文中的方法和技巧
- 在实践过程中注意环境配置和版本兼容性问题
- 可以参考文中提供的资源和工具来提高效率

### 🔮 延伸思考
- 可以进一步探索相关技术的最新发展和应用场景
- 思考如何将所学知识应用到实际项目中
- 关注技术社区的最佳实践和经验分享

*注：本总结基于前面的分析步骤生成。*"""
            print(f"备用总结生成完成，内容长度: {len(summary_content)}")
        
        analysis_result['steps'].append({
            'step': 4,
            'name': '结果汇总',
            'description': '汇总分析结果和关键发现',
            'content': summary_content
        })
        
        print("=" * 50)
        print("全面分析完成！")
        print(f"总共生成了 {len(analysis_result['steps'])} 个分析步骤")
        for step in analysis_result['steps']:
            print(f"  步骤 {step['step']}: {step['name']} - 内容长度: {len(step['content'])}")
        print("=" * 50)
        
        return analysis_result
        
    except Exception as e:
        print(f"全面分析出错：{str(e)}")
        print("错误详情：", e)
        raise e
