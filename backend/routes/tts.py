from flask import Blueprint, request, jsonify
import requests
import logging
import urllib.parse

tts_bp = Blueprint('tts', __name__)

# API配置
TTS_API_BASE = "https://api.suol.cc/v1/zs_tts.php"
TTS_TOKEN = "831FBBCB97442A85E74894B260496B50"

# 声音ID映射 - 讯飞语音（1-20）
XUNFEI_VOICES = {
    1: "讯飞-七哥（男声）",
    2: "讯飞-子晴（女声）", 
    3: "讯飞-一菲（女声）",
    4: "讯飞-小露（女声）",
    5: "讯飞-小鹏（男声）",
    6: "讯飞-萌小新（男声）",
    7: "讯飞-小雪（女声）",
    8: "讯飞-超哥（男声）",
    9: "讯飞-小媛（女声）",
    10: "讯飞-叶子（女声）",
    11: "讯飞-千雪（女声）",
    12: "讯飞-小忠（男声）",
    13: "讯飞-万叔（男声）",
    14: "讯飞-虫虫（女声）",
    15: "讯飞-楠楠（儿童-男）",
    16: "讯飞-晓璇（女声）",
    17: "讯飞-芳芳（儿童-女）",
    18: "讯飞-嘉嘉（女声）",
    19: "讯飞-小倩（女声）",
    20: "讯飞-Catherine（女声-英文专用）"
}

# 百度语音ID映射（主要的一些音色）
BAIDU_VOICES = {
    4259: "度小新-播音女声",
    6748: "度书严-沉稳男声", 
    6205: "度悠然-旁白男声",
    6562: "度雨楠-元气少女",
    6747: "度书古-情感男声",
    6746: "度书道-沉稳男声",
    6644: "度书宁-亲和女声",
    4176: "度有为-磁性男声",
    4148: "度小夏-甜美女声",
    111: "度小萌-软萌妹子",
    4: "度丫丫-童声",
    0: "度小美-标准女主播"
}

@tts_bp.route('', methods=['POST'])
def text_to_speech():
    """
    文本转语音接口
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'success': False, 'error': '缺少文本内容'}), 400
        
        text = data.get('text', '')
        voice_type = data.get('voice_type', 'xunfei')  # 默认使用讯飞
        voice_id = data.get('voice_id', 9)  # 默认使用讯飞-小媛
        
        if not text.strip():
            return jsonify({'success': False, 'error': '文本内容不能为空'}), 400
        
        # 限制文本长度，避免请求过大
        if len(text) > 1000:
            text = text[:1000] + "..."
            
        logging.info(f"TTS请求: text={text[:50]}..., voice_type={voice_type}, voice_id={voice_id}")
        
        # 调用慕名API进行语音合成
        tts_result = call_tts_api(text, voice_type, voice_id)
        
        if tts_result['success']:
            return jsonify({
                'success': True,
                'audio_url': tts_result['audio_url'],
                'voice_name': tts_result['voice_name'],
                'message': '语音合成成功'
            })
        else:
            # TTS API调用失败，返回错误
            return jsonify({
                'success': False,
                'error': tts_result['error']
            })
        
    except Exception as e:
        logging.error(f"TTS处理出错: {str(e)}")
        return jsonify({'success': False, 'error': '语音合成服务暂时不可用'}), 500


def call_tts_api(text, voice_type, voice_id):
    """
    调用慕名API进行语音合成
    """
    try:
        # 确保voice_type正确
        if voice_type not in ['baidu', 'xunfei']:
            voice_type = 'xunfei'
            
        # 转换voice_id为整数
        try:
            voice_id = int(voice_id)
        except (ValueError, TypeError):
            voice_id = 9 if voice_type == 'xunfei' else 4259
            
        # 验证voice_id范围
        if voice_type == 'xunfei' and (voice_id < 1 or voice_id > 20):
            voice_id = 9  # 默认讯飞-小媛
        elif voice_type == 'baidu' and voice_id not in BAIDU_VOICES:
            voice_id = 4259  # 默认度小新-播音女声
            
        # 构建请求URL
        params = {
            'type': voice_type,
            'msg': text,
            'id': voice_id,
            'm_token': TTS_TOKEN
        }
        
        # URL编码参数
        query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        api_url = f"{TTS_API_BASE}?{query_string}"
        
        logging.info(f"调用TTS API: {api_url}")
        
        # 发送请求
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        
        # 解析响应
        result = response.json()
        
        if result.get('code') == 200:
            # 获取语音名称
            voice_name = None
            if voice_type == 'xunfei':
                voice_name = XUNFEI_VOICES.get(voice_id, f"讯飞语音{voice_id}")
            else:
                voice_name = BAIDU_VOICES.get(voice_id, f"百度语音{voice_id}")
                
            return {
                'success': True,
                'audio_url': result.get('tts'),
                'voice_name': voice_name
            }
        else:
            error_msg = result.get('msg', '语音合成失败')
            logging.error(f"TTS API返回错误: {error_msg}")
            return {
                'success': False,
                'error': f"语音合成失败: {error_msg}"
            }
            
    except requests.exceptions.Timeout:
        logging.error("TTS API请求超时")
        return {
            'success': False,
            'error': '语音合成请求超时，请稍后重试'
        }
    except requests.exceptions.RequestException as e:
        logging.error(f"TTS API请求异常: {str(e)}")
        return {
            'success': False,
            'error': '语音合成服务暂时不可用'
        }
    except Exception as e:
        logging.error(f"TTS处理异常: {str(e)}")
        return {
            'success': False,
            'error': '语音合成处理异常'
        }
