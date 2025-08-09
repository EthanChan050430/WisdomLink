from flask import Blueprint, request, jsonify, send_file
import json
import uuid
import os
import base64
import re
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import textwrap
import io
from services.ai_service import ai_service

share_bp = Blueprint('share', __name__)

def load_fonts():
    """加载字体"""
    try:
        # Windows系统字体路径
        font_paths = [
            "C:/Windows/Fonts/msyh.ttc",  # 微软雅黑
            "C:/Windows/Fonts/simhei.ttf",  # 黑体
            "C:/Windows/Fonts/simsun.ttc",  # 宋体
            "/System/Library/Fonts/PingFang.ttc",  # macOS
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  # Linux
        ]
        
        font_loaded = False
        for font_path in font_paths:
            try:
                if os.path.exists(font_path):
                    title_font = ImageFont.truetype(font_path, 24)
                    content_font = ImageFont.truetype(font_path, 16)
                    small_font = ImageFont.truetype(font_path, 12)
                    bold_font = ImageFont.truetype(font_path, 18)
                    font_loaded = True
                    print(f"成功加载字体: {font_path}")
                    break
            except:
                continue
        
        if not font_loaded:
            # 如果无法加载任何字体，使用默认字体
            title_font = ImageFont.load_default()
            content_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
            bold_font = ImageFont.load_default()
            print("使用默认字体")
            
        return title_font, content_font, small_font, bold_font
    except Exception as e:
        print(f"字体加载错误: {e}")
        title_font = ImageFont.load_default()
        content_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        bold_font = ImageFont.load_default()
        return title_font, content_font, small_font, bold_font

def simulate_draw_formatted_text(draw, text_blocks, start_x, start_y, max_width, fonts):
    """模拟绘制格式化文本，只计算高度，不实际绘制"""
    current_y = start_y
    line_spacing = 8
    
    title_font, content_font, small_font, bold_font = fonts
    
    for block in text_blocks:
        block_type = block['type']
        content = block['content']
        
        if block_type == 'empty':
            current_y += 10
            continue
            
        # 根据类型选择字体
        if block_type == 'h1':
            font = title_font
            current_y += 10
        elif block_type == 'h2':
            font = bold_font
            current_y += 8
        elif block_type == 'h3':
            font = bold_font
            current_y += 6
        elif block_type == 'bold':
            font = bold_font
            content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
        elif block_type in ['list', 'numbered_list']:
            font = content_font
            if block_type == 'list':
                content = f"• {content}"
            start_x_adjusted = start_x + 20
        else:
            font = content_font
            
        if block_type not in ['list', 'numbered_list']:
            start_x_adjusted = start_x
            
        # 计算可用宽度
        available_width = max_width - start_x_adjusted - 40
        
        # 计算文本占用的高度
        if content:
            try:
                wrapped_lines = wrap_text_by_width(draw, content, font, available_width)
                line_count = len(wrapped_lines)
                
                # 根据文本类型调整行高
                if block_type in ['h1', 'h2', 'h3']:
                    current_y += line_count * 36
                else:
                    current_y += line_count * 28
                    
            except Exception as e:
                # 降级处理
                simple_lines = textwrap.wrap(content, width=40)
                current_y += len(simple_lines) * 28
            
            # 块之间的间距
            if block_type in ['h1', 'h2', 'h3']:
                current_y += 15
            elif block_type in ['list', 'numbered_list']:
                current_y += 10
            else:
                current_y += line_spacing
    
    return current_y

def parse_markdown_content(content):
    """解析markdown内容并返回格式化的文本块"""
    lines = content.split('\n')
    parsed_blocks = []
    
    for line in lines:
        line = line.strip()
        if not line:
            parsed_blocks.append({'type': 'empty', 'content': ''})
            continue
            
        # 标题处理
        if line.startswith('###'):
            parsed_blocks.append({'type': 'h3', 'content': line[3:].strip()})
        elif line.startswith('##'):
            parsed_blocks.append({'type': 'h2', 'content': line[2:].strip()})
        elif line.startswith('#'):
            parsed_blocks.append({'type': 'h1', 'content': line[1:].strip()})
        # 粗体文本
        elif '**' in line:
            # 简单处理粗体，提取粗体内容
            bold_pattern = r'\*\*(.*?)\*\*'
            if re.search(bold_pattern, line):
                parsed_blocks.append({'type': 'bold', 'content': line})
            else:
                parsed_blocks.append({'type': 'text', 'content': line})
        # 列表项
        elif line.startswith('- ') or line.startswith('* '):
            parsed_blocks.append({'type': 'list', 'content': line[2:].strip()})
        elif re.match(r'^\d+\.', line):
            parsed_blocks.append({'type': 'numbered_list', 'content': line})
        # 普通文本
        else:
            parsed_blocks.append({'type': 'text', 'content': line})
    
    return parsed_blocks

def wrap_text_by_width(draw, text, font, max_width):
    """根据实际像素宽度进行文本换行，支持中文"""
    if not text.strip():
        return []
    
    # 调试信息
    print(f"换行处理: 最大宽度={max_width}, 文本长度={len(text)}")
    
    lines = []
    current_line = ""
    
    # 简化处理：逐字符检查宽度
    for i, char in enumerate(text):
        test_line = current_line + char
        
        try:
            bbox = draw.textbbox((0, 0), test_line, font=font)
            line_width = bbox[2] - bbox[0]
            
            # 调试信息（只打印前几次）
            if i < 5:
                print(f"字符 '{char}': 测试行宽度={line_width}, 最大宽度={max_width}")
            
            if line_width <= max_width:
                current_line = test_line
            else:
                # 需要换行
                if current_line.strip():  # 如果当前行不为空
                    lines.append(current_line.rstrip())
                    print(f"添加行: '{current_line.rstrip()}' (宽度超出)")
                
                # 开始新行
                current_line = char
                
                # 检查单个字符是否也超出宽度
                single_char_bbox = draw.textbbox((0, 0), char, font=font)
                single_char_width = single_char_bbox[2] - single_char_bbox[0]
                if single_char_width > max_width:
                    print(f"警告: 单个字符 '{char}' 宽度 {single_char_width} 超出最大宽度 {max_width}")
                    
        except Exception as e:
            print(f"文本宽度测量错误: {e}")
            # 降级处理：按固定字符数换行
            if len(current_line) >= 30:  # 假设30个字符为一行
                if current_line.strip():
                    lines.append(current_line.rstrip())
                current_line = char
            else:
                current_line = test_line
    
    # 添加最后一行
    if current_line.strip():
        lines.append(current_line.rstrip())
        print(f"添加最后一行: '{current_line.rstrip()}'")
    
    print(f"换行结果: 共 {len(lines)} 行")
    return lines

def draw_formatted_text(draw, text_blocks, start_x, start_y, max_width, fonts, max_height):
    """绘制格式化的文本块"""
    current_y = start_y
    line_spacing = 8  # 增加行间距
    
    title_font, content_font, small_font, bold_font = fonts
    
    for block in text_blocks:
        # 完全移除高度限制，让所有内容都能显示
        # if current_y > max_height - 150:  # 注释掉高度限制
        #     draw.text((start_x, current_y), "...", fill='#cccccc', font=content_font)
        #     current_y += 30
        #     break
            
        block_type = block['type']
        content = block['content']
        
        if block_type == 'empty':
            current_y += 10
            continue
            
        # 根据类型选择字体和颜色
        if block_type == 'h1':
            font = title_font
            color = '#FFD700'  # 金色
            current_y += 10
        elif block_type == 'h2':
            font = bold_font
            color = '#87CEEB'  # 天蓝色
            current_y += 8
        elif block_type == 'h3':
            font = bold_font
            color = '#98FB98'  # 浅绿色
            current_y += 6
        elif block_type == 'bold':
            font = bold_font
            color = '#FFFFFF'
            # 处理粗体文本中的**标记
            content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
        elif block_type == 'list':
            font = content_font
            color = '#E0E0E0'
            content = f"• {content}"  # 添加项目符号
            start_x_adjusted = start_x + 20  # 缩进
        elif block_type == 'numbered_list':
            font = content_font
            color = '#E0E0E0'
            start_x_adjusted = start_x + 20  # 缩进
        else:  # 普通文本
            font = content_font
            color = '#FFFFFF'
            
        # 设置缩进
        if block_type not in ['list', 'numbered_list']:
            start_x_adjusted = start_x
            
        # 计算可用宽度，确保有足够的右边距
        available_width = max_width - start_x_adjusted - 40  # 留出更多右边距
        
        # 文本换行处理
        if content:
            try:
                # 使用精确的像素宽度换行
                wrapped_lines = wrap_text_by_width(draw, content, font, available_width)
                
                for line in wrapped_lines:
                    # 移除硬编码的高度限制
                    # if current_y > 1800:
                    #     break
                        
                    try:
                        draw.text((start_x_adjusted, current_y), line, fill=color, font=font)
                    except:
                        # 如果字体渲染失败，使用默认字体
                        draw.text((start_x_adjusted, current_y), line, fill=color, font=content_font)
                    
                    # 根据文本类型调整行高，增加间距防止堆叠
                    if block_type in ['h1', 'h2', 'h3']:
                        current_y += 36  # 标题行高
                    else:
                        current_y += 28  # 普通文本行高
                
            except Exception as e:
                print(f"文本换行错误: {e}")
                # 降级到简单换行
                simple_lines = textwrap.wrap(content, width=40)
                for line in simple_lines:  # 不限制行数
                    # 移除高度限制
                    # if current_y > 1800:
                    #     break
                    draw.text((start_x_adjusted, current_y), line, fill=color, font=font)
                    current_y += 28
            
            # 块之间的间距，增加间距防止堆叠
            if block_type in ['h1', 'h2', 'h3']:
                current_y += 15
            elif block_type in ['list', 'numbered_list']:
                current_y += 10
            else:
                current_y += line_spacing
    
    return current_y

def create_share_image(conversation_data):
    """创建分享图片"""
    try:
        # 图片尺寸
        width = 800
        messages = conversation_data.get('messages', [])
        
        # 第一步：加载字体（用于测量）
        title_font, content_font, small_font, bold_font = load_fonts()
        fonts = (title_font, content_font, small_font, bold_font)
        
        # 第二步：创建临时图片进行高度测量
        temp_img = Image.new('RGB', (width, 5000), color='#1a1a2e')  # 临时大图片
        temp_draw = ImageDraw.Draw(temp_img)
        
        # 模拟绘制过程，计算实际需要的高度
        y_offset = 120  # 标题和时间占用的空间
        max_content_width = width - 100
        
        for message in messages:
            role = message.get('role', 'user')
            content = message.get('content', '')
            
            # 角色标识占用的空间
            y_offset += 40
            
            # 计算内容占用的高度
            if role == 'assistant' and ('**' in content or '#' in content or '-' in content):
                # Markdown内容
                text_blocks = parse_markdown_content(content)
                y_offset = simulate_draw_formatted_text(temp_draw, text_blocks, 60, y_offset, max_content_width, fonts)
            else:
                # 普通文本
                available_width = max_content_width - 60 - 40
                try:
                    wrapped_lines = wrap_text_by_width(temp_draw, content, content_font, available_width)
                    y_offset += len(wrapped_lines) * 28  # 每行28px高度
                except:
                    # 降级处理
                    simple_lines = textwrap.wrap(content, width=40)
                    y_offset += len(simple_lines) * 28
            
            y_offset += 30  # 消息间距
        
        # 计算实际需要的高度
        actual_height = y_offset + 100  # 加上底部空间
        
        # 第三步：创建正确大小的最终图片
        height = actual_height
        
        # 创建最终图片
        img = Image.new('RGB', (width, height), color='#1a1a2e')
        draw = ImageDraw.Draw(img)
        
        print(f"创建图片: 宽度={width}, 高度={height}")
        
        # 绘制背景渐变效果
        for y in range(height):
            alpha = y / height
            color = (
                int(26 + (52 - 26) * alpha),
                int(26 + (73 - 26) * alpha),
                int(46 + (94 - 46) * alpha)
            )
            draw.line([(0, y), (width, y)], fill=color)
        
        # 绘制标题
        title = f"智链AI - {conversation_data.get('function_name', '智能分析')}"
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((width - title_width) // 2, 30), title, fill='#ffffff', font=title_font)
        
        # 绘制时间
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        time_bbox = draw.textbbox((0, 0), timestamp, font=small_font)
        time_width = time_bbox[2] - time_bbox[0]
        draw.text(((width - time_width) // 2, 70), timestamp, fill='#cccccc', font=small_font)
        
        # 绘制对话内容
        y_offset = 120
        max_content_width = width - 100
        
        for i, message in enumerate(messages):  # 显示所有消息，不限制数量
            # 移除高度限制，让所有内容都能显示
            # if y_offset > height - 300:
            #     draw.text((40, y_offset), "...", fill='#cccccc', font=content_font)
            #     break
                
            role = message.get('role', 'user')
            content = message.get('content', '')
            
            # 角色标识
            role_text = "👤 用户" if role == 'user' else "🤖 AI助手"
            role_color = '#4CAF50' if role == 'assistant' else '#2196F3'
            draw.text((40, y_offset), role_text, fill=role_color, font=bold_font)
            y_offset += 40  # 增加角色标识后的间距
            
            # 解析markdown内容
            if role == 'assistant' and ('**' in content or '#' in content or '-' in content):
                # AI回复可能包含markdown格式
                text_blocks = parse_markdown_content(content)
                y_offset = draw_formatted_text(draw, text_blocks, 60, y_offset, max_content_width, fonts, height)
            else:
                # 用户消息或简单文本，使用普通渲染
                available_width = max_content_width - 60 - 40  # 减去左边距和更多右边距
                try:
                    wrapped_lines = wrap_text_by_width(draw, content, content_font, available_width)
                    for line_idx, line in enumerate(wrapped_lines):
                        # 移除所有高度和行数限制，显示完整内容
                        # if y_offset > height - 150:
                        #     draw.text((60, y_offset), "...", fill='#cccccc', font=content_font)
                        #     y_offset += 28
                        #     break
                        # if line_idx >= 10:
                        #     draw.text((60, y_offset), "...", fill='#cccccc', font=content_font)
                        #     y_offset += 28
                        #     break
                        draw.text((60, y_offset), line, fill='#ffffff', font=content_font)
                        y_offset += 28  # 增加行间距
                except Exception as e:
                    print(f"用户消息换行错误: {e}")
                    # 降级到简单换行
                    simple_lines = textwrap.wrap(content, width=40)
                    for line_idx, line in enumerate(simple_lines):
                        # 移除所有高度和行数限制
                        # if y_offset > height - 150 or line_idx >= 8:
                        #     draw.text((60, y_offset), "...", fill='#cccccc', font=content_font)
                        #     y_offset += 28
                        #     break
                        draw.text((60, y_offset), line, fill='#ffffff', font=content_font)
                        y_offset += 28
            
            y_offset += 30  # 增加消息间距
        
        # 绘制底部信息
        footer_text = "由智链AI生成 - 智能阅读助手"
        footer_bbox = draw.textbbox((0, 0), footer_text, font=small_font)
        footer_width = footer_bbox[2] - footer_bbox[0]
        draw.text(((width - footer_width) // 2, height - 40), footer_text, fill='#888888', font=small_font)
        
        return img
        
    except Exception as e:
        print(f"创建分享图片失败: {e}")
        return None

@share_bp.route('/generate', methods=['POST'])
def generate_share_image():
    """生成分享图片"""
    try:
        data = request.get_json()
        
        # 验证数据
        if not data or 'messages' not in data:
            return jsonify({'success': False, 'message': '缺少对话数据'})
        
        # 创建分享图片
        img = create_share_image(data)
        if not img:
            return jsonify({'success': False, 'message': '图片生成失败'})
        
        # 保存图片到内存
        img_io = io.BytesIO()
        img.save(img_io, 'PNG', quality=95)
        img_io.seek(0)
        
        # 转换为base64
        img_base64 = base64.b64encode(img_io.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f"data:image/png;base64,{img_base64}",
            'message': '分享图片生成成功'
        })
        
    except Exception as e:
        print(f"生成分享图片错误: {e}")
        return jsonify({'success': False, 'message': f'生成失败: {str(e)}'})

@share_bp.route('/download', methods=['POST'])
def download_share_image():
    """下载分享图片"""
    try:
        data = request.get_json()
        
        if not data or 'messages' not in data:
            return jsonify({'success': False, 'message': '缺少对话数据'})
        
        # 创建分享图片
        img = create_share_image(data)
        if not img:
            return jsonify({'success': False, 'message': '图片生成失败'})
        
        # 保存到临时文件
        temp_filename = f"share_{uuid.uuid4().hex[:8]}.png"
        temp_path = os.path.join('data', 'uploads', temp_filename)
        
        # 确保目录存在
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        
        img.save(temp_path, 'PNG', quality=95)
        
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=f"智链AI分享_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png",
            mimetype='image/png'
        )
        
    except Exception as e:
        print(f"下载分享图片错误: {e}")
        return jsonify({'success': False, 'message': f'下载失败: {str(e)}'})