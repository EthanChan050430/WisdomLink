import requests
import json

def test_expert_analysis():
    """测试大师分析功能"""
    print("=== 测试大师分析功能 ===")
    
    url = 'http://localhost:80/api/expert-analysis/start'
    data = {
        'content_type': 'url',
        'content_data': 'https://www.msn.cn/zh-cn/news/other/%E7%99%BE%E4%B8%87%E5%BD%A9%E7%A4%BC%E9%97%AA%E5%A9%9A%E5%A6%BB%E5%AD%90%E6%8B%92%E5%90%8C%E6%88%BF-%E9%9A%BE%E6%B4%97%E9%AA%97%E5%A9%9A%E5%AB%8C%E7%96%91/ar-AA1HApZw?ocid=BingNewsSerp',
        'persona': 'luxun'
    }
    
    try:
        response = requests.post(url, data=data, stream=True)
        print(f'状态码: {response.status_code}')
        
        session_id = None
        crawler_results = None
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith('data: '):
                try:
                    json_str = line[6:].strip()
                    if json_str and json_str != '[DONE]':
                        data_obj = json.loads(json_str)
                        
                        if data_obj.get('type') == 'session_id':
                            session_id = data_obj.get('session_id')
                            print(f'会话ID: {session_id}')
                            
                        elif data_obj.get('type') == 'crawler_results':
                            crawler_results = data_obj.get('results')
                            print(f'爬虫结果: {len(crawler_results)} 个链接')
                            for i, result in enumerate(crawler_results):
                                print(f'  链接 {i+1}: {result["url"]}')
                                print(f'    成功: {result["success"]}')
                                print(f'    标题: {result.get("title", "无")}')
                                print(f'    内容长度: {len(result.get("content", ""))} 字符')
                                if not result["success"]:
                                    print(f'    错误: {result.get("error", "未知错误")}')
                                print()
                            break
                            
                except json.JSONDecodeError as e:
                    print(f'JSON解析错误: {e}, 内容: {json_str}')
                    
    except Exception as e:
        print(f'请求错误: {e}')

def test_chat_with_expert():
    """测试与专家聊天功能"""
    print("=== 测试与专家聊天功能 ===")
    
    url = 'http://localhost:80/api/expert-analysis/chat'
    data = {
        'session_id': 'test-session',
        'message': '请简要分析一下中国经济发展趋势',
        'persona': 'luxun',
        'chat_history': []
    }
    
    try:
        response = requests.post(url, json=data, stream=True)
        print(f'状态码: {response.status_code}')
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith('data: '):
                try:
                    json_str = line[6:].strip()
                    if json_str and json_str != '[DONE]':
                        data_obj = json.loads(json_str)
                        
                        if data_obj.get('type') == 'content':
                            print(f'内容: {data_obj.get("content", "")}', end='')
                        elif data_obj.get('type') == 'done':
                            print('\n响应完成')
                            break
                            
                except json.JSONDecodeError as e:
                    print(f'JSON解析错误: {e}')
                    
    except Exception as e:
        print(f'请求错误: {e}')

if __name__ == '__main__':
    test_expert_analysis()
    print("\n" + "="*50 + "\n")
    test_chat_with_expert()
