import requests
import json
import re
from typing import Generator, Dict, Any
from config import AI_CONFIG

class AIService:
    def __init__(self):
        self.base_url = AI_CONFIG['base_url']
        self.api_key = AI_CONFIG['api_key']
        self.simple_model = AI_CONFIG['simple_model']
        self.complex_model = AI_CONFIG['complex_model']
    
    def _make_request(self, messages: list, model: str, stream: bool = True) -> Generator[str, None, None]:
        """发送请求到AI模型"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': messages,
            'stream': stream,
            'temperature': 0.7
        }
        
        try:
            response = requests.post(
                f'{self.base_url}/chat/completions',
                headers=headers,
                data=json.dumps(data),
                stream=stream
            )
            
            if stream:
                for line in response.iter_lines():
                    if line:
                        line = line.decode('utf-8')
                        if line.startswith('data: '):
                            data_str = line[6:]
                            if data_str == '[DONE]':
                                break
                            try:
                                data_obj = json.loads(data_str)
                                if 'choices' in data_obj and len(data_obj['choices']) > 0:
                                    delta = data_obj['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
            else:
                response_data = response.json()
                if 'choices' in response_data and len(response_data['choices']) > 0:
                    yield response_data['choices'][0]['message']['content']
                    
        except Exception as e:
            yield f"错误：{str(e)}"
    
    def simple_chat(self, prompt: str, system_prompt: str = None) -> Generator[str, None, None]:
        """简单任务聊天（使用GLM-4-Flash）"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        return self._make_request(messages, self.simple_model)
    
    def complex_chat(self, prompt: str, system_prompt: str = None) -> Generator[str, None, None]:
        """复杂任务聊天（使用GLM-4V-Flash）"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        return self._make_request(messages, self.complex_model)
    
    def extract_thinking(self, content: str) -> tuple[str, str]:
        """提取思考内容和显示内容"""
        # 提取<think>标签内的内容
        thinking_pattern = r'<think>(.*?)</think>'
        thinking_matches = re.findall(thinking_pattern, content, re.DOTALL)
        thinking_content = '\n'.join(thinking_matches) if thinking_matches else ""
        
        # 移除<think>标签，保留其他内容
        display_content = re.sub(thinking_pattern, '', content, flags=re.DOTALL).strip()
        
        return thinking_content, display_content
    
    def continue_conversation(self, messages: list, new_message: str, use_complex: bool = False) -> Generator[str, None, None]:
        """继续对话"""
        messages.append({"role": "user", "content": new_message})
        model = self.complex_model if use_complex else self.simple_model
        return self._make_request(messages, model)

# 全局AI服务实例
ai_service = AIService()
