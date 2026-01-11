from flask import Blueprint, request, jsonify, Response
import json
import uuid
import requests
import textwrap
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from services.credibility_service import credibility_service
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
    """搜索相关信息并进行可信度评分"""
    try:
        params = {
            'q': query,
            'format': 'json'
        }
        response = requests.get(SEARCH_API_URL, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # 为每个搜索结果添加可信度评分
        if 'results' in data and data['results']:
            scored_results = []
            for i, result in enumerate(data['results']):
                url = result.get('url', '')
                title = result.get('title', '')
                snippet = result.get('snippet', result.get('description', ''))
                
                # 计算可信度评分
                credibility = credibility_service.calculate_source_credibility(url, title, snippet)
                
                scored_result = {
                    **result,  # 保留原有信息
                    'credibility': credibility,
                    'position': i + 1  # 搜索结果位置
                }
                scored_results.append(scored_result)
            
            # 按可信度排序（可选：保持原始排序或按可信度排序）
            # scored_results.sort(key=lambda x: x['credibility']['score'], reverse=True)
            
            data['results'] = scored_results
            
            # 添加整体可信度评估
            overall_credibility = credibility_service.calculate_overall_credibility(scored_results)
            data['overall_credibility'] = overall_credibility
        
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
        all_scored_results = []  # 存储所有带评分的结果用于最终评估
        
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
                        credibility = item.get('credibility', {})
                        
                        # 获取可信度信息
                        cred_score = credibility.get('score', 0)
                        cred_level = credibility.get('level', '未知')
                        emotion_analysis = credibility.get('emotion_analysis', {})
                        
                        # 可信度图标
                        cred_icon = "🔴" if cred_score < 35 else "🟡" if cred_score < 65 else "🟢"
                        
                        # 情感风险图标
                        emotion_risk = emotion_analysis.get('risk_level', '低风险')
                        if emotion_risk in ['极高风险', '高风险']:
                            emotion_icon = "⚠️"
                        elif emotion_risk == '中等风险':
                            emotion_icon = "⚡"
                        else:
                            emotion_icon = "✅"
                        
                        # 使用丰富的格式显示结果
                        result_content += f"**{i}. {title}** {cred_icon} {emotion_icon}\\n"
                        result_content += f"   📊 **可信度**: {cred_score}/100 ({cred_level})\\n"
                        result_content += f"   🧠 **情感分析**: {emotion_risk}\\n"
                        
                        if snippet and snippet != '无描述':
                            result_content += f"   📝 {snippet}\\n"
                        if url:
                            result_content += f"   🔗 [查看来源]({url})\\n"
                        
                        # 显示可信度详情（折叠显示）
                        if credibility.get('details'):
                            result_content += f"   💡 评分依据: {' | '.join(credibility['details'])}\\n"
                        
                        # 显示情感分析详情
                        detected_issues = emotion_analysis.get('detected_issues', [])
                        if detected_issues:
                            result_content += f"   ⚠️ 检测到的问题: {' | '.join(detected_issues)}\\n"
                        
                        result_content += "\\n"
                    
                    # 收集所有结果用于整体评估
                    all_scored_results.extend(search_result['results'])
                    
                    # 显示该关键词的整体可信度
                    if 'overall_credibility' in search_result:
                        overall = search_result['overall_credibility']
                        result_content += f"**该关键词搜索结果整体可信度**: {overall['overall_score']}/100 ({overall['overall_level']})\\n"
                        result_content += f"*{overall['summary']}*\\n\\n"
                
                else:
                    result_content += "未找到相关搜索结果\\n\\n"
                
                yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': result_content})}\n\n"
            else:
                error_msg = search_result.get('error', '未知错误')
                yield f"data: {json.dumps({'type': 'thinking', 'step': 2, 'content': f'搜索 {keyword} 失败: {error_msg}'})}\n\n"
        
        # 计算所有搜索结果的整体可信度评估
        if all_scored_results:
            final_credibility = credibility_service.calculate_overall_credibility(all_scored_results)
            
            # 总结搜索结果
            summary_content = f"\\n\\n## 📊 搜索结果与可信度总结\\n\\n"
            summary_content += f"- ✅ 成功搜索关键词: {len(search_results)}/{len(keywords)}\\n"
            summary_content += f"- 📄 总共获取验证资料: {len(all_scored_results)} 条\\n"
            summary_content += f"- 🎯 **整体可信度评分**: **{final_credibility['overall_score']}/100** ({final_credibility['overall_level']})\\n"
            summary_content += f"- 📈 高可信度来源占比: {final_credibility['high_credibility_ratio']}%\\n\\n"
            
            # 可信度分布
            summary_content += "**可信度分布**:\\n"
            for level, count in final_credibility['distribution'].items():
                if count > 0:
                    percentage = round(count / final_credibility['total_sources'] * 100, 1)
                    summary_content += f"- {level}: {count} 条 ({percentage}%)\\n"
            
            summary_content += f"\\n💬 **评估总结**: {final_credibility['summary']}\\n\\n"
            
            if search_results:
                summary_content += "这些搜索结果和可信度评估将用于下一步的事实验证和真伪鉴定分析。"
        else:
            summary_content = f"\\n\\n## 📊 搜索结果总结\\n\\n"
            summary_content += f"- 成功搜索关键词: {len(search_results)}/{len(keywords)}\\n"
            summary_content += f"- ⚠️ 未获取到有效的验证资料，可能影响真伪鉴定的准确性\\n"
        
        yield f"data: {json.dumps({'type': 'content', 'step': 2, 'content': summary_content})}\n\n"
        
        yield f"data: {json.dumps({'type': 'step_complete', 'step': 2})}\n\n"
        
        # 第三步：深度分析
        yield f"data: {json.dumps({'type': 'step_start', 'step': 3, 'name': '深度分析', 'description': '结合可信度评分进行深度分析'})}\n\n"
        
        # 将搜索结果整理为文本，包含可信度信息
        search_context = ""
        total_credibility_scores = []
        
        for sr in search_results:
            search_context += f"关键词 '{sr['keyword']}' 的搜索结果：\n"
            if 'results' in sr['results'] and sr['results']['results']:
                for item in sr['results']['results'][:2]:  # 每个关键词取前2个结果
                    title = item.get('title', '无标题')
                    snippet = item.get('snippet', item.get('description', ''))
                    url = item.get('url', '')
                    credibility = item.get('credibility', {})
                    
                    cred_score = credibility.get('score', 0)
                    cred_level = credibility.get('level', '未知')
                    total_credibility_scores.append(cred_score)
                    
                    search_context += f"- 标题: {title}\n"
                    search_context += f"  内容: {snippet}\n"
                    search_context += f"  来源: {url}\n"
                    search_context += f"  可信度评分: {cred_score}/100 ({cred_level})\n"
                    
                    if credibility.get('details'):
                        search_context += f"  评分详情: {'; '.join(credibility['details'])}\n"
                    search_context += "\n"
            search_context += "\n"
        
        # 计算平均可信度
        avg_credibility = sum(total_credibility_scores) / len(total_credibility_scores) if total_credibility_scores else 0
        
        analysis_prompt = f"""基于文章解析和带有可信度评分的搜索结果进行深度分析：

**文章解析：**
{parsed_content}

**原文：**
{content}

**带可信度评分和情感分析的验证资料：**
{search_context}

**搜索结果可信度概况：**
- 平均可信度评分: {avg_credibility:.1f}/100
- 评分范围: {min(total_credibility_scores) if total_credibility_scores else 0}-{max(total_credibility_scores) if total_credibility_scores else 0}
- 高可信度来源(≥65分)数量: {sum(1 for score in total_credibility_scores if score >= 65)}
- 低可信度来源(≤35分)数量: {sum(1 for score in total_credibility_scores if score <= 35)}

请结合搜索资料的可信度评分和情感偏见分析对原文进行深度分析：

## 1. 信息对比分析
- 对比原文声明与不同可信度搜索资料的一致性
- **重点关注辟谣和澄清信息**：如果搜索结果中包含官方辟谣、澄清声明或否认信息，需要特别重视
- 重点关注高可信度来源的信息与原文的匹配度
- 识别低可信度来源可能带来的误导信息
- **优先级顺序**：官方辟谣 > 权威媒体澄清 > 一般可信来源 > 低可信度来源

## 2. 情感偏见检测分析
- 分析原文和搜索结果中的情感色彩和偏见倾向
- 识别可能利用恐慌、愤怒等极端情绪的内容
- 检测煽动性表达、夸大修辞和未验证声明
- 评估信息传播中的情感操控风险

## 3. 加权可信度评估
- 基于来源可信度和情感客观性对验证信息进行加权分析
- 高可信度且情感客观的来源支持或反驳原文的程度
- 低可信度或情感极端的来源对判断可能造成的偏差

## 4. 谣言传播模式识别
- 识别典型的网络谣言传播特征
- 分析利用社会热点、群体偏见进行传播的手段
- 检测故意制造对立、引发争议的内容策略

## 5. 风险评估与预警
- 基于来源可信度和情感分析识别信息传播风险
- 评估可能引发恐慌、仇恨或极端行为的内容风险
- 分析对特定群体可能造成的负面影响

## 6. 综合判断建议
- 结合可信度评分和情感客观性给出更准确的真伪判断建议
- 基于来源质量和情感风险的信任度建议
- 针对不同风险等级的处理建议

<think>
我需要仔细分析这些带有可信度评分和情感分析的搜索结果，重点关注高可信度且情感客观的来源，同时警惕低可信度或情感极端的来源可能的误导。特别要注意识别利用恐慌、愤怒等情绪进行传播的谣言特征。
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
        yield f"data: {json.dumps({'type': 'step_start', 'step': 4, 'name': '智能真伪鉴定', 'description': '基于可信度评分进行综合真伪判定'})}\n\n"
        
        # 准备可信度统计信息
        credibility_stats = {
            'total_sources': len(total_credibility_scores),
            'average_score': avg_credibility,
            'high_credibility_count': sum(1 for score in total_credibility_scores if score >= 65),
            'medium_credibility_count': sum(1 for score in total_credibility_scores if 35 <= score < 65),
            'low_credibility_count': sum(1 for score in total_credibility_scores if score < 35),
            'score_range': f"{min(total_credibility_scores) if total_credibility_scores else 0}-{max(total_credibility_scores) if total_credibility_scores else 0}"
        }
        
        verification_prompt = textwrap.dedent(f"""
                你是一名事实核查首席分析官，需要综合所有已整理的证据，输出结构化的最终结论模块。

                === 原始资料摘要 ===
                - 原文内容：
                {content}

                - 文章解析结果：
                {parsed_content}

                - 提取的验证关键词：
                {keywords_content}

                - 带可信度评分与情感分析的验证资料：
                {search_context}

                - 深度分析结论：
                {analysis_content}

                - 可信度统计数据：
                {json.dumps(credibility_stats, ensure_ascii=False)}

                请只使用上述材料中的信息，不得凭空编造。若证据不足，请据实说明。

                === 输出要求 ===
                1. 必须给出原文信息的可信度数值评分（0-100）及对应等级，并解释原因。
                2. 明确列出支持与反驳原文的关键证据点。
                3. 评估情感风险、谣言传播风险并给出专业建议。
                4. 输出一个 Mermaid 图（graph TD 或 graph LR），展示原文主张与证据之间的支持/反驳关系。
                5. 输出必须为固定 JSON 结构，方便前端渲染。

                === 输出格式（严格遵守） ===
                仅输出单个 JSON 对象，不可出现额外文字、注释或 Markdown，也不要使用 ``` 代码块。JSON 模式及示例如下（示例值仅供参考）：

                {{
                    "confidenceScore": 58,
                    "confidenceLabel": "存疑",
                    "confidenceLevel": "C级",
                    "confidenceDescription": "高可信度来源分歧较大，整体结论尚存疑点。",
                    "verdictSummary": "综合权威证据，该消息尚无法确认真实性，需进一步核实。",
                    "supportingPoints": [
                        "来自新华社的调研报道指出，相关政策确有试点。",
                        "两家行业协会发布声明支持该说法。"
                    ],
                    "contradictingPoints": [
                        "国务院新闻办发布的辟谣通告明确否认该消息。",
                        "多个高可信度媒体引用官方数据反驳该结论。"
                    ],
                    "analysisHighlights": [
                        {{
                            "title": "综合真实性评估",
                            "body": "权威辟谣与官方数据占主导，使整体可信度被显著拉低。"
                        }},
                        {{
                            "title": "情感偏见影响",
                            "body": "原文大量使用煽动性语句，引导读者产生恐慌与不信任。"
                        }}
                    ],
                    "riskAssessment": {{
                        "emotionRisk": "高风险",
                        "rumorRisk": "中等风险",
                        "notes": [
                            "原文通过耸动措辞放大恐慌情绪。",
                            "社交平台上出现快速扩散的转发模式。"
                        ]
                    }},
                    "recommendations": [
                        "谨慎转发该消息，等待官方进一步说明。",
                        "引用权威机构数据向团队澄清事实。",
                        "跟踪后续调查结果，必要时发布正式说明。"
                    ],
                    "evidence": [
                        {{
                            "stance": "contradicting",
                            "title": "国务院新闻办：关于××传言的澄清",
                            "source": "国务院新闻办公室",
                            "credibilityScore": 92,
                            "url": "https://www.gov.cn/example"
                        }},
                        {{
                            "stance": "supporting",
                            "title": "行业协会：已有试点案例",
                            "source": "中国行业协会",
                            "credibilityScore": 68,
                            "url": "https://www.example.org/report"
                        }}
                    ],
                    "mermaidDiagram": "graph TD; SourceA[官方辟谣 92分] -->|否定| Claim; SourceB[行业协会 68分] -->|支持| Claim;",
                    "mermaidDescription": "节点展示主要证据与原文主张之间的支持或反驳关系。"
                }}

                === 字段约束 ===
                - confidenceScore：0-100 的整数，依据证据加权结果计算。
                - confidenceLabel：必须为 ["真实","大部分真实","部分真实","存疑","大部分虚假","虚假"] 之一。
                - confidenceLevel：从 ["A级","B级","C级","D级","E级","F级"] 中选择，并与得分区间对应（≥90 A级，80-89 B级，70-79 C级，60-69 D级，50-59 E级，<50 F级）。
                - confidenceDescription：一句话说明评分原因。
                - verdictSummary：2-3 句中文总结整体判断。
                - supportingPoints / contradictingPoints：按证据强度归纳为列表，每项一句话；若没有相应证据，返回空数组。
                - analysisHighlights：至少 1 条，包含 title 与 body 字段，body 为 2-3 句概述。
                - riskAssessment.notes：可为空数组，若存在则每项为一句话。
                - recommendations：至少 1 条行动建议。
                - evidence：若存在证据需列出，credibilityScore 为 0-100 整数，stance 只能是 "supporting"、"contradicting" 或 "neutral"；若确无证据也须返回空数组。
                - mermaidDiagram：必须为合法的 Mermaid 语法（graph TD 或 graph LR），仅使用 ASCII 字符，确保引号配对正确。
                - 若某类信息确实不存在，请返回空数组或空字符串，但字段必须保留。

                在输出前请再次校验所有字段满足约束，并确保 JSON 语法完全正确，可直接被 JSON.parse 解析。最终回答只能包含上述 JSON 对象，无其他文本。
                """)
        
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
        all_search_results = []  # 收集所有搜索结果用于可信度评估
        
        for i, keyword in enumerate(keywords, 1):
            fact_check_content += f"### {i}. 核查要点：{keyword}\n\n"
            
            search_data = search_information(keyword)
            if 'error' not in search_data and 'results' in search_data:
                results = search_data['results'][:3]  # 取前3个结果
                all_search_results.extend(results)  # 收集结果
                
                for j, result in enumerate(results, 1):
                    title = result.get('title', '未知标题')
                    snippet = result.get('snippet', '无描述')
                    url = result.get('url', '#')
                    credibility = result.get('credibility', {})
                    
                    # 获取可信度信息
                    cred_score = credibility.get('score', 0)
                    cred_level = credibility.get('level', '未知')
                    cred_details = credibility.get('details', [])
                    
                    # 可信度图标
                    cred_icon = "🔴" if cred_score < 35 else "🟡" if cred_score < 65 else "🟢"
                    
                    fact_check_content += f"**参考资料 {j}** {cred_icon}：[{title}]({url})\n"
                    fact_check_content += f"📊 **可信度评分**: {cred_score}/100 ({cred_level})\n"
                    fact_check_content += f"📝 **内容**: {snippet}\n"
                    if cred_details:
                        fact_check_content += f"💡 **评分依据**: {' | '.join(cred_details)}\n"
                    fact_check_content += "\n"
                
                # 添加该关键词的整体可信度评估
                if 'overall_credibility' in search_data:
                    overall = search_data['overall_credibility']
                    fact_check_content += f"**关键词 '{keyword}' 搜索结果整体可信度**: {overall['overall_score']}/100 ({overall['overall_level']})\n"
                    fact_check_content += f"*{overall['summary']}*\n\n"
                
            else:
                fact_check_content += f"搜索 '{keyword}' 时出现错误或无结果\n\n"
        
        # 添加全局可信度评估
        if all_search_results:
            global_credibility = credibility_service.calculate_overall_credibility(all_search_results)
            fact_check_content += "\n## 🎯 整体验证资料可信度评估\n\n"
            fact_check_content += f"- **总体评分**: {global_credibility['overall_score']}/100 ({global_credibility['overall_level']})\n"
            fact_check_content += f"- **高可信度来源占比**: {global_credibility['high_credibility_ratio']}%\n"
            fact_check_content += f"- **验证来源总数**: {global_credibility['total_sources']} 个\n"
            fact_check_content += f"- **评估结论**: {global_credibility['summary']}\n\n"
            
            # 可信度分布
            fact_check_content += "**可信度等级分布**:\n"
            for level, count in global_credibility['distribution'].items():
                if count > 0:
                    percentage = round(count / global_credibility['total_sources'] * 100, 1)
                    fact_check_content += f"- {level}: {count} 个来源 ({percentage}%)\n"
        
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

以及带有可信度评分的事实核查结果：
{fact_check_content}

以及原始内容：
{content}

请进行综合可信度分析：

## 可信度分析

### 验证来源质量评估
- 分析搜索到的验证来源的整体可信度水平
- 评估高可信度来源与低可信度来源的比例
- 识别最权威和最可疑的信息来源

### 加权信息一致性分析
- 重点关注高可信度来源(≥65分)的信息与原文的一致性
- 分析中等可信度来源(35-64分)提供的补充信息
- 识别低可信度来源(<35分)可能的误导信息

### 证据强度评估
- 基于来源可信度对支持/反驳证据进行加权评估
- 计算高可信度证据对原文声明的支撑程度
- 评估证据质量对最终判断的影响

### 风险点识别
- 识别基于低可信度来源可能导致的判断偏差
- 分析信息传播中的潜在风险
- 评估需要进一步验证的关键点

### 综合可信度评级
- 结合来源质量给出内容的综合可信度等级
- 基于验证资料质量的风险评估
- 对信息使用的建议等级

请使用标准的markdown格式，特别关注不同可信度来源的影响权重。"""
        
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

**带可信度评分的事实核查：**
{fact_check_content}

**可信度分析：**
{credibility_analysis}

**原始内容：**
{content}

请给出基于可信度评分的最终真伪判定结论：

## 智能真伪判定结论

### 📊 可信度加权评估结果
- 基于验证来源可信度的加权真实性评估
- 高可信度来源支持/反驳原文的证据强度
- 整体验证质量对判定结果的可靠性影响

### ⚖️ 智能评级系统
请给出以下具体评级：

**真实性评级**：
- [ ] 真实 (高可信度来源强力支持，无明显反驳)
- [ ] 大部分真实 (多数高可信度来源支持，少量争议)
- [ ] 部分真实 (真实与虚假信息混合)
- [ ] 存疑 (证据不足或高可信度来源意见分歧)
- [ ] 大部分虚假 (多数高可信度来源反驳)
- [ ] 虚假 (高可信度来源一致反驳或证实为假)

**验证质量评级**：
- [ ] A级 (90-100分) - 多个权威来源，证据充分
- [ ] B级 (80-89分) - 较多可靠来源，证据较充分
- [ ] C级 (70-79分) - 部分可靠来源，证据一般
- [ ] D级 (60-69分) - 来源质量参差，证据有限
- [ ] E级 (50-59分) - 来源质量较差，证据不足
- [ ] F级 (<50分) - 来源不可靠，难以验证

**风险等级**：
- [ ] 低风险 - 信息基本可靠，传播风险小
- [ ] 中等风险 - 存在部分争议，需要谨慎对待
- [ ] 高风险 - 可能误导公众，不建议传播
- [ ] 极高风险 - 明确虚假信息，严重误导风险

### 🎯 核心判定依据
**支持原文的高可信度证据（≥65分）：**
（列出具体的高可信度支持性证据）

**反驳原文的高可信度证据（≥65分）：**
（列出具体的高可信度反驳性证据）

**需要警惕的低可信度信息（<35分）：**
（列出可能误导的低可信度信息）

### 📋 专业建议
**对信息使用者的建议：**
- 基于验证质量的信任度建议
- 信息使用和传播的注意事项
- 建议的后续验证方向

**风险提示：**
- 可能存在的误导性内容
- 需要特别关注的争议点
- 传播时应注意的问题

### 🔍 最终结论
给出明确、负责任的判定结论，说明判定的主要依据和可信度水平。

**评判原则说明：**
本判定基于智能可信度评分系统，优先采信高可信度来源（政府机构、权威媒体、学术机构等），对低可信度来源保持审慎态度，综合考虑来源多样性和证据一致性。

请使用标准的markdown格式，提供准确、客观、负责任的判定结果。"""
        
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
