from flask import Blueprint, request, jsonify, Response
import json
import uuid
from services.ai_service import ai_service
from services.web_crawler import web_crawler
from services.ocr_service import ocr_service
from utils.file_handler import save_uploaded_files, extract_text_from_file
from routes.expert_analysis import EXPERT_PERSONAS

intelligent_reading_bp = Blueprint('intelligent_reading', __name__)

def _parse_bool(value):
    """Utility to normalise boolean-like inputs."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return False


def _build_summary_prompt(content: str) -> str:
    return (
        "请根据提供的内容生成结构化总结，包含：\n"
        "1. 核心观点\n"
        "2. 关键要点（使用条目）\n"
        "3. 建议的关注方向或思考问题\n\n"
        "要求：\n"
        "- 使用中文作答\n"
        "- 语言精炼、逻辑清楚\n"
        "- 保留原文中的关键信息\n\n"
        f"内容如下：\n{content}"
    )


@intelligent_reading_bp.route('/start', methods=['POST'])
def start_reading():
    """Entry point for the reading assistant."""
    try:
        summary_mode = False
        persona_key = None
        selected_model = None

        if request.is_json:
            payload = request.get_json()
            message = (payload.get('message') or '').strip()
            selected_model = payload.get('model')
            summary_mode = _parse_bool(payload.get('summary_mode', False))
            persona_key = (payload.get('persona') or '').strip() or None
            if message.startswith(('http://', 'https://')):
                content_type = 'url'
                content_data = message
            else:
                content_type = 'text'
                content_data = message
        else:
            content_type = request.form.get('content_type') or 'text'
            content_data = request.form.get('content_data', '')
            selected_model = request.form.get('model')
            summary_mode = _parse_bool(request.form.get('summary_mode', False))
            persona_key = (request.form.get('persona') or '').strip() or None

        extracted_content = ''
        content_info = {}

        if content_type == 'url':
            urls = [url.strip() for url in content_data.split('\n') if url.strip()]
            results = web_crawler.extract_text_from_multiple_urls(urls)
            for result in results:
                if result.get('success'):
                    extracted_content += f"\n\n=== {result.get('title', '未命名')} ===\n{result.get('content', '')}"
                    content_info[result['url']] = {
                        'title': result.get('title'),
                        'word_count': result.get('word_count')
                    }
                else:
                    extracted_content += f"\n\n错误：无法提取 {result.get('url')} 的内容：{result.get('error')}"
        elif content_type == 'text':
            extracted_content = content_data
            content_info = {'type': 'text', 'word_count': len(content_data.split())}
        elif content_type == 'file':
            files = request.files.getlist('files')
            saved_paths = save_uploaded_files(files)
            for file_path in saved_paths:
                file_content = extract_text_from_file(file_path)
                if file_content:
                    extracted_content += f"\n\n=== {file_path} ===\n{file_content}"
        elif content_type == 'image':
            images = request.files.getlist('images')
            if not images:
                def _empty_image_stream():
                    session_id = str(uuid.uuid4())
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'error', 'message': '没有找到要分析的图片'}, ensure_ascii=False)}\n\n"
                    yield "data: {\"type\": \"done\"}\n\n"
                return Response(_empty_image_stream(), mimetype='text/plain')

            saved_paths = ocr_service.save_uploaded_images(images)
            if not saved_paths:
                def _save_error_stream():
                    session_id = str(uuid.uuid4())
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'error', 'message': '图片保存失败'}, ensure_ascii=False)}\n\n"
                    yield "data: {\"type\": \"done\"}\n\n"
                return Response(_save_error_stream(), mimetype='text/plain')

            session_id = str(uuid.uuid4())

            def _image_stream():
                try:
                    yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'step', 'step': 1, 'title': '图片解析', 'status': 'processing'}, ensure_ascii=False)}\n\n"
                    analysis_prompt = (
                        "请分析这些图片的内容，给出：\n"
                        "1. 详细描述\n"
                        "2. 若包含文字，请提取并整理\n"
                        "3. 深度分析与解读\n"
                        "4. 相关背景或延伸思考\n"
                    )
                    for chunk in ai_service.analyze_image(saved_paths, analysis_prompt):
                        if chunk.strip():
                            payload = {'type': 'content', 'content': chunk, 'step': 1}
                            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'step', 'step': 1, 'status': 'completed'}, ensure_ascii=False)}\n\n"
                    yield "data: {\"type\": \"done\"}\n\n"
                except Exception as exc:
                    yield f"data: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"
                    yield "data: {\"type\": \"done\"}\n\n"
            return Response(_image_stream(), mimetype='text/plain')
        else:
            extracted_content = content_data

        if not extracted_content.strip():
            def _empty_content_stream():
                session_id = str(uuid.uuid4())
                yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
                message = (
                    "没有提取到任何内容。可能的原因：页面需要登录/动态加载、存在防爬虫或网络异常。"
                    "建议尝试复制文本直接分析。"
                )
                yield f"data: {json.dumps({'type': 'error', 'message': message}, ensure_ascii=False)}\n\n"
                yield "data: {\"type\": \"done\"}\n\n"
            return Response(_empty_content_stream(), mimetype='text/plain')

        session_id = str(uuid.uuid4())
        return Response(
            generate_content_parsed_response(
                session_id=session_id,
                extracted_content=extracted_content,
                content_info=content_info,
                content_type=content_type,
                summary_mode=summary_mode,
                persona_key=persona_key,
                model=selected_model
            ),
            mimetype='text/plain'
        )

    except Exception as exc:
        return jsonify({'success': False, 'message': f'启动智能伴读失败：{exc}'})


@intelligent_reading_bp.route('/chat', methods=['POST'])
def chat_with_ai():
    """Handle chat continuation with optional persona and summary mode."""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        user_message = (data.get('message') or '').strip()
        chat_history = data.get('chat_history', [])
        content_context = data.get('content_context', '')
        selected_model = data.get('model')
        summary_mode = _parse_bool(data.get('summary_mode', False))
        persona_key = (data.get('persona') or '').strip() or None
        persona_info = EXPERT_PERSONAS.get(persona_key) if persona_key else None

        if not user_message:
            return jsonify({'success': False, 'message': '消息不能为空'})

        messages = []
        system_sections = []

        if persona_info and persona_info.get('prompt'):
            system_sections.append("角色设定：\n" + persona_info['prompt'])

        if content_context:
            context_prompt = (
                "你是一个智能阅读伴侣，正在帮助用户理解和分析以下内容：\n\n"
                f"{content_context}\n\n"
                "请遵循以下要求：\n"
                "1. 基于上述内容回答用户的问题\n"
                "2. 如果问题超出内容范围，请温和引导回到文本\n"
                "3. 提供准确、有用的分析\n"
                "4. 保持耐心、友好和专业的态度\n"
                "5. 可以引用具体段落或要点支持回答"
            )
            if summary_mode:
                context_prompt += "\n6. 当前处于摘要模式，请优先提炼关键信息并保持回答紧凑。"
            system_sections.append(context_prompt)

        if system_sections:
            messages.append({'role': 'system', 'content': '\n\n'.join(system_sections)})

        for msg in chat_history:
            messages.append({'role': msg['role'], 'content': msg['content']})

        messages.append({'role': 'user', 'content': user_message})

        return Response(
            generate_chat_response(messages, session_id, selected_model, persona_info),
            mimetype='text/plain'
        )
    except Exception as exc:
        return jsonify({'success': False, 'message': f'聊天失败：{exc}'})


def generate_content_parsed_response(session_id, extracted_content, content_info, content_type,
                                     summary_mode=False, persona_key=None, model=None):
    """Stream content parsing information back to the client."""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'message': '正在解析内容...'}, ensure_ascii=False)}\n\n"

        word_count = len(extracted_content.split()) if extracted_content else 0
        char_count = len(extracted_content) if extracted_content else 0

        parse_result = {
            'content_type': content_type,
            'word_count': word_count,
            'char_count': char_count,
            'content_preview': (extracted_content[:300] + '...') if len(extracted_content) > 300 else extracted_content,
            'full_content': extracted_content,
            'content_info': content_info
        }
        yield f"data: {json.dumps({'type': 'content_parsed', 'result': parse_result}, ensure_ascii=False)}\n\n"

        persona_info = EXPERT_PERSONAS.get(persona_key) if persona_key else None
        if persona_info:
            persona_payload = {
                'type': 'persona',
                'name': persona_info.get('name'),
                'description': persona_info.get('description')
            }
            yield f"data: {json.dumps(persona_payload, ensure_ascii=False)}\n\n"

        if summary_mode and extracted_content.strip():
            yield f"data: {json.dumps({'type': 'status', 'message': '正在生成内容总结...'}, ensure_ascii=False)}\n\n"
            summary_source = extracted_content.strip()
            truncated = False
            max_length = 6000
            if len(summary_source) > max_length:
                summary_source = summary_source[:max_length]
                truncated = True

            summary_prompt = _build_summary_prompt(summary_source)
            summary_system_prompt = persona_info['prompt'] if persona_info and persona_info.get('prompt') else None

            try:
                summary_text = ai_service.simple_chat_complete(
                    summary_prompt,
                    system_prompt=summary_system_prompt,
                    model=model
                )
            except Exception as summary_error:
                summary_text = f"总结生成失败：{summary_error}"

            summary_message_parts = ["## ✨ 摘要模式\n", summary_text.strip() or "暂未生成有效总结。"]
            if truncated:
                summary_message_parts.append("\n\n> 注：内容较长，已截取部分进行总结。")
            if persona_info:
                summary_message_parts.append(
                    f"\n\n🎭 当前角色：{persona_info.get('name')}（{persona_info.get('description')}）"
                )

            yield f"data: {json.dumps({'type': 'content', 'content': ''.join(summary_message_parts)}, ensure_ascii=False)}\n\n"

        prompt_lines = [
            "📖 内容解析完成啦！",
            "",
            "📊 解析统计",
            f"- 字符数：{char_count:,} 个",
            f"- 词数：{word_count:,} 个",
            f"- 内容类型：{content_type}"
        ]
        if summary_mode:
            prompt_lines.append("\n✨ 总结模式已开启，欢迎继续追问或深入探讨。")
        else:
            prompt_lines.append("\n🎯 我已经准备好帮助你进一步理解这份内容。")

        prompt_lines.extend([
            "",
            "💡 快速开始的问题示例：",
            ' - "请概括一下主要内容"',
            ' - "这篇文章的核心观点是什么？"',
            ' - "有哪些重要的细节需要注意？"',
            ' - "作者想要表达什么？"'
        ])
        if persona_info:
            prompt_lines.append(f"\n🎭 当前角色：{persona_info.get('name')}——{persona_info.get('description')}")

        prompt_lines.append("\n🌟 想了解什么，尽管告诉我！")

        final_message = "\n".join(prompt_lines)
        yield f"data: {json.dumps({'type': 'content', 'content': final_message}, ensure_ascii=False)}\n\n"
        yield "data: {\"type\": \"done\"}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"


def generate_chat_response(messages, session_id, model=None, persona_info=None):
    """Stream chat completions back to the client."""
    try:
        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id}, ensure_ascii=False)}\n\n"
        if persona_info:
            yield f"data: {json.dumps({'type': 'persona', 'name': persona_info.get('name'), 'description': persona_info.get('description')}, ensure_ascii=False)}\n\n"

        selected_model = model if model else ai_service.simple_model
        for chunk in ai_service._make_request(messages, selected_model):
            thinking, display = ai_service.extract_thinking(chunk)
            if thinking:
                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking}, ensure_ascii=False)}\n\n"
            if display:
                yield f"data: {json.dumps({'type': 'content', 'content': display}, ensure_ascii=False)}\n\n"
        yield "data: {\"type\": \"done\"}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"
