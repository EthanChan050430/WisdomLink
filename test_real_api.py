import requests
import json

def test_intelligent_reading_api():
    """测试智能伴读API的实际响应"""
    
    # 测试URL分析
    print("测试URL分析...")
    
    form_data = {
        'content_type': 'url',
        'content_data': 'https://www.example.com'
    }
    
    try:
        response = requests.post(
            'http://localhost:80/api/intelligent-reading/start',
            data=form_data
        )
        
        print(f"响应状态: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        
        if response.ok:
            # 读取流式响应
            print("响应内容:")
            print("-" * 50)
            
            content_buffer = ""
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    print(f"原始行: {repr(line)}")
                    
                    if line.startswith('data: '):
                        json_str = line[6:].strip()
                        if json_str and json_str != '[DONE]':
                            try:
                                data = json.loads(json_str)
                                print(f"解析数据: {data}")
                                
                                if data.get('type') == 'content':
                                    content_buffer += data.get('content', '')
                                    
                            except json.JSONDecodeError as e:
                                print(f"JSON解析错误: {e}, 数据: {json_str}")
            
            print("-" * 50)
            print(f"累积内容: {content_buffer[:200]}...")
            
            if content_buffer.startswith("抱歉"):
                print("⚠️ 发现'抱歉'开头!")
            else:
                print("✅ 没有发现'抱歉'开头")
                
        else:
            print(f"请求失败: {response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")

def test_text_analysis():
    """测试文本分析"""
    
    print("\n" + "="*60)
    print("测试文本分析...")
    
    form_data = {
        'content_type': 'text',
        'content_data': '人工智能技术正在快速发展，它正在改变我们的生活方式。'
    }
    
    try:
        response = requests.post(
            'http://localhost:80/api/intelligent-reading/start',
            data=form_data
        )
        
        print(f"响应状态: {response.status_code}")
        
        if response.ok:
            content_buffer = ""
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        json_str = line[6:].strip()
                        if json_str and json_str != '[DONE]':
                            try:
                                data = json.loads(json_str)
                                if data.get('type') == 'content':
                                    content_buffer += data.get('content', '')
                            except:
                                pass
            
            print(f"文本分析结果开头: {content_buffer[:100]}...")
            
            if content_buffer.startswith("抱歉"):
                print("⚠️ 发现'抱歉'开头!")
            else:
                print("✅ 没有发现'抱歉'开头")
                
        else:
            print(f"请求失败: {response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")

if __name__ == "__main__":
    test_intelligent_reading_api()
    test_text_analysis()
