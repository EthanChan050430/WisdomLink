import requests
import json

def test_keli_analysis():
    """测试可莉风格的分析"""
    print("=== 测试可莉分析风格 ===")
    
    url = 'http://localhost:80/api/expert-analysis/start'
    
    # 简化的新闻内容，更适合可莉分析
    news_content = """有个叔叔和阿姨结婚了，但是阿姨不愿意和叔叔住一个房间。叔叔很生气，说阿姨骗了他的钱。叔叔给了阿姨很多很多钱才结婚的，有110万元还有一斤黄金呢！但是阿姨拿了钱就不理叔叔了。现在叔叔想离婚，但是阿姨不同意。很多人都觉得阿姨不对。"""
    
    data = {
        'content_type': 'text',
        'content_data': news_content,
        'persona': 'keli'
    }
    
    try:
        response = requests.post(url, data=data, stream=True)
        print(f'状态码: {response.status_code}')
        
        content_buffer = ""
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith('data: '):
                try:
                    json_str = line[6:].strip()
                    if json_str and json_str != '[DONE]':
                        data_obj = json.loads(json_str)
                        
                        if data_obj.get('type') == 'content':
                            content = data_obj.get('content', '')
                            content_buffer += content
                            print(content, end='', flush=True)
                        elif data_obj.get('type') == 'done':
                            print('\n\n=== 分析完成 ===')
                            print(f'总字数: {len(content_buffer)} 字符')
                            break
                            
                except json.JSONDecodeError as e:
                    pass
                    
    except Exception as e:
        print(f'请求错误: {e}')

if __name__ == '__main__':
    test_keli_analysis()
