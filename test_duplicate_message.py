#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append('backend')

from services.ai_service import ai_service
import json

def test_single_conversation():
    """测试正常的单次对话"""
    print('=== 测试单次对话 ===')
    response = ''
    for chunk in ai_service.simple_chat('请简单介绍一下人工智能'):
        response += chunk
        print(chunk, end='', flush=True)
    print('\n=== 单次对话结束 ===\n')
    return response

def test_duplicate_messages():
    """测试带有重复消息的对话历史"""
    print('=== 测试重复消息的对话历史 ===')
    messages = [
        {'role': 'user', 'content': '请简单介绍一下人工智能'},
        {'role': 'assistant', 'content': '人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智慧的任务的系统。'},
        {'role': 'user', 'content': '请简单介绍一下人工智能'},  # 重复的用户消息
    ]

    response = ''
    for chunk in ai_service._make_request(messages, ai_service.simple_model):
        response += chunk
        print(chunk, end='', flush=True)
    print('\n=== 重复消息对话结束 ===\n')
    return response

def test_empty_user_message():
    """测试包含空用户消息的对话历史"""
    print('=== 测试包含空用户消息的对话历史 ===')
    messages = [
        {'role': 'user', 'content': '请简单介绍一下人工智能'},
        {'role': 'assistant', 'content': '人工智能（AI）是计算机科学的一个分支。'},
        {'role': 'user', 'content': ''},  # 空的用户消息
        {'role': 'user', 'content': '谢谢你的回答'},
    ]

    response = ''
    for chunk in ai_service._make_request(messages, ai_service.simple_model):
        response += chunk
        print(chunk, end='', flush=True)
    print('\n=== 空用户消息对话结束 ===\n')
    return response

if __name__ == "__main__":
    print("开始测试AI服务的各种场景...\n")
    
    # 测试1：正常对话
    resp1 = test_single_conversation()
    
    # 测试2：重复消息
    resp2 = test_duplicate_messages()
    
    # 测试3：空消息
    resp3 = test_empty_user_message()
    
    # 分析结果
    print("=== 分析结果 ===")
    print(f"单次对话是否包含'抱歉': {'抱歉' in resp1}")
    print(f"重复消息是否包含'抱歉': {'抱歉' in resp2}")
    print(f"空消息是否包含'抱歉': {'抱歉' in resp3}")
