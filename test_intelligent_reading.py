import requests
import json

def test_intelligent_reading():
    """测试新的智能伴读功能"""
    print("=== 测试智能伴读功能 ===")
    
    # 测试URL解析
    url = 'http://localhost:80/api/intelligent-reading/start'
    
    # 测试内容
    test_content = """人工智能正在以前所未有的速度发展。从ChatGPT到GPT-4，从图像生成到代码编程，AI技术在各个领域都展现出了惊人的能力。

然而，随着AI技术的快速发展，我们也面临着诸多挑战：

1. 就业问题：AI可能会替代部分人类工作
2. 隐私安全：大模型需要大量数据训练
3. 技术伦理：AI决策的公平性和透明度
4. 监管政策：如何有效规范AI的发展和应用

未来，人工智能将继续推动社会进步，但我们需要在发展技术的同时，积极应对这些挑战，确保AI技术能够造福全人类。"""
    
    data = {
        'content_type': 'text',
        'content_data': test_content
    }
    
    try:
        response = requests.post(url, data=data, stream=True)
        print(f'状态码: {response.status_code}')
        
        session_id = None
        parse_result = None
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith('data: '):
                try:
                    json_str = line[6:].strip()
                    if json_str and json_str != '[DONE]':
                        data_obj = json.loads(json_str)
                        
                        if data_obj.get('type') == 'session_id':
                            session_id = data_obj.get('session_id')
                            print(f'会话ID: {session_id}')
                            
                        elif data_obj.get('type') == 'content_parsed':
                            parse_result = data_obj.get('result')
                            print(f'内容解析完成:')
                            print(f'  - 类型: {parse_result["content_type"]}')
                            print(f'  - 字符数: {parse_result["char_count"]}')
                            print(f'  - 词数: {parse_result["word_count"]}')
                            print(f'  - 预览: {parse_result["content_preview"][:100]}...')
                            
                        elif data_obj.get('type') == 'content':
                            content = data_obj.get('content', '')
                            print(f'AI响应: {content}')
                            
                        elif data_obj.get('type') == 'done':
                            print('解析完成，等待用户提问')
                            break
                            
                except json.JSONDecodeError as e:
                    print(f'JSON解析错误: {e}')
        
        # 如果解析成功，测试聊天功能
        if session_id and parse_result:
            print('\n=== 测试聊天功能 ===')
            test_chat(session_id, parse_result['full_content'])
                    
    except Exception as e:
        print(f'请求错误: {e}')

def test_chat(session_id, content_context):
    """测试聊天功能"""
    url = 'http://localhost:80/api/intelligent-reading/chat'
    
    data = {
        'session_id': session_id,
        'message': '请概括一下这篇文章的主要内容',
        'content_context': content_context,
        'chat_history': []
    }
    
    try:
        response = requests.post(url, json=data, stream=True)
        print(f'聊天状态码: {response.status_code}')
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith('data: '):
                try:
                    json_str = line[6:].strip()
                    if json_str and json_str != '[DONE]':
                        data_obj = json.loads(json_str)
                        
                        if data_obj.get('type') == 'content':
                            content = data_obj.get('content', '')
                            print(content, end='', flush=True)
                        elif data_obj.get('type') == 'done':
                            print('\n聊天完成')
                            break
                            
                except json.JSONDecodeError as e:
                    pass
                    
    except Exception as e:
        print(f'聊天错误: {e}')

if __name__ == '__main__':
    test_intelligent_reading()
