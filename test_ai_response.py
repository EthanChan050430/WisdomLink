import sys
sys.path.append('d:/AIReader/backend')

from services.ai_service import ai_service

def test_ai_response():
    print("测试AI服务响应...")
    
    system_prompt = """你是一个智能阅读伴侣，你的任务是帮助用户理解和分析他们提供的文章内容。
请遵循以下要求：
1. 首先简要概括文章的主要内容
2. 引导用户进行深入思考和讨论
3. 准备回答用户可能提出的问题
4. 保持耐心、友好和专业的态度
5. 如果内容很长，可以分段进行讲解

现在请开始分析用户提供的内容，并主动引导对话。"""
    
    user_prompt = """请帮我分析和理解以下内容：

人工智能技术正在快速发展，它正在改变我们的生活方式。从智能手机到自动驾驶汽车，AI技术无处不在。"""
    
    print("发送的系统提示词:")
    print(system_prompt)
    print("\n发送的用户提示词:")
    print(user_prompt)
    print("\n" + "="*50)
    print("AI响应:")
    
    full_response = ""
    for chunk in ai_service.complex_chat(user_prompt, system_prompt):
        print(chunk, end='', flush=True)
        full_response += chunk
    
    print("\n" + "="*50)
    print("完整响应:")
    print(full_response)

if __name__ == "__main__":
    test_ai_response()
