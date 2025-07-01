#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试模型选择功能
"""

import requests
import json

def test_intelligent_reading_with_model():
    """测试智能伴读的模型选择"""
    url = "http://localhost:5000/api/intelligent-reading/start"
    
    data = {
        "message": "测试文本：人工智能是未来科技发展的重要方向。",
        "model": "GLM-Z1-Flash"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, stream=True)
        print(f"状态码: {response.status_code}")
        print(f"响应头: {response.headers}")
        
        if response.status_code == 200:
            print("流式响应:")
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        try:
                            data_obj = json.loads(data_str)
                            print(f"  {data_obj}")
                        except json.JSONDecodeError:
                            print(f"  (非JSON): {data_str}")
        else:
            print(f"错误: {response.text}")
            
    except Exception as e:
        print(f"请求失败: {e}")

def test_expert_analysis_with_model():
    """测试大师分析的模型选择"""
    url = "http://localhost:5000/api/expert-analysis/start"
    
    data = {
        "content_type": "text",
        "content_data": "测试文本：教育应该培养学生的独立思考能力。",
        "persona": "luxun",
        "model": "DeepSeek-R1-Distill-Qwen-7B"
    }
    
    try:
        response = requests.post(url, data=data, stream=True)
        print(f"\n大师分析测试:")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("流式响应:")
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        try:
                            data_obj = json.loads(data_str)
                            print(f"  {data_obj}")
                        except json.JSONDecodeError:
                            print(f"  (非JSON): {data_str}")
        else:
            print(f"错误: {response.text}")
            
    except Exception as e:
        print(f"请求失败: {e}")

if __name__ == "__main__":
    print("测试模型选择功能...")
    test_intelligent_reading_with_model()
    test_expert_analysis_with_model()
