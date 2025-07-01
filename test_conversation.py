import sys
sys.path.append('d:/AIReader/backend')

from services.ai_service import ai_service

def test_continue_conversation():
    print("测试继续对话功能...")
    
    # 模拟对话历史
    messages = [
        {"role": "system", "content": "你是一个智能阅读伴侣，帮助用户理解和分析文章内容。"},
        {"role": "user", "content": "请分析这段话：人工智能正在改变世界。"},
        {"role": "assistant", "content": "这段话讨论了人工智能的影响力。人工智能确实正在多个领域产生深远影响..."},
        {"role": "user", "content": "能举个具体例子吗？"}
    ]
    
    print("对话历史:")
    for i, msg in enumerate(messages):
        print(f"{i+1}. {msg['role']}: {msg['content'][:50]}...")
    
    print("\n" + "="*50)
    print("使用旧方法 (continue_conversation):")
    
    old_response = ""
    try:
        for chunk in ai_service.continue_conversation(messages[:-1], messages[-1]['content'], use_complex=False):
            print(chunk, end='', flush=True)
            old_response += chunk
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n" + "="*50)
    print("使用新方法 (直接_make_request):")
    
    new_response = ""
    try:
        for chunk in ai_service._make_request(messages, ai_service.simple_model):
            print(chunk, end='', flush=True)
            new_response += chunk
    except Exception as e:
        print(f"错误: {e}")
    
    print("\n" + "="*50)
    print("对比分析:")
    print(f"旧方法响应开头: {old_response[:100]}...")
    print(f"新方法响应开头: {new_response[:100]}...")

if __name__ == "__main__":
    test_continue_conversation()
