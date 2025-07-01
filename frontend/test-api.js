// 简单测试脚本
function testTextAnalysis() {
    console.log('开始测试文本分析');
    
    const formData = new FormData();
    formData.append('content_type', 'text');
    formData.append('content_data', '这是一段测试文本，用于验证智能伴读功能是否正常工作。');
    
    fetch('/api/intelligent-reading/start', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    })
    .then(response => {
        console.log('响应状态:', response.status);
        console.log('响应头:', response.headers);
        console.log('Content-Type:', response.headers.get('content-type'));
        
        if (response.ok) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            function readStream() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log('流读取完成');
                        return;
                    }
                    
                    const chunk = decoder.decode(value, { stream: true });
                    console.log('收到数据:', chunk);
                    
                    readStream();
                });
            }
            
            readStream();
        } else {
            console.error('请求失败:', response.status);
            response.text().then(text => console.log('错误内容:', text));
        }
    })
    .catch(error => {
        console.error('请求错误:', error);
    });
}

// 自动运行测试
console.log('准备运行测试...');
setTimeout(testTextAnalysis, 1000);
