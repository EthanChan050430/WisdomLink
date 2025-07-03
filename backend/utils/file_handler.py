import os
import tempfile
import time
from typing import List

def save_uploaded_files(files) -> List[str]:
    """保存上传的文件"""
    saved_paths = []
    upload_dir = 'data/uploads/files'
    os.makedirs(upload_dir, exist_ok=True)
    
    for file in files:
        if file and file.filename:
            # 生成唯一文件名
            filename = f"{int(time.time())}_{file.filename}"
            file_path = os.path.join(upload_dir, filename)
            file.save(file_path)
            saved_paths.append(file_path)
    
    return saved_paths

def extract_text_from_file(file_path: str) -> str:
    """从文件中提取文本"""
    try:
        # 获取文件扩展名
        _, ext = os.path.splitext(file_path.lower())
        
        if ext == '.txt':
            # 读取文本文件
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif ext in ['.md', '.markdown']:
            # 读取Markdown文件
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif ext == '.csv':
            # 读取CSV文件
            import csv
            content = []
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    content.append(','.join(row))
            return '\n'.join(content)
        elif ext in ['.docx', '.doc']:
            # 处理Word文档（需要安装python-docx）
            try:
                from docx import Document
                doc = Document(file_path)
                content = []
                for paragraph in doc.paragraphs:
                    content.append(paragraph.text)
                return '\n'.join(content)
            except ImportError:
                return "错误：需要安装python-docx库来处理Word文档"
        elif ext == '.pdf':
            # 处理PDF文件（需要安装PyPDF2）
            try:
                import PyPDF2
                content = []
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        content.append(page.extract_text())
                return '\n'.join(content)
            except ImportError:
                return "错误：需要安装PyPDF2库来处理PDF文档"
        else:
            return f"不支持的文件格式：{ext}"
            
    except Exception as e:
        return f"读取文件失败：{str(e)}"

def clean_filename(filename: str) -> str:
    """清理文件名，移除非法字符"""
    import re
    # 移除或替换非法字符
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    return filename

def get_file_size(file_path: str) -> int:
    """获取文件大小（字节）"""
    try:
        return os.path.getsize(file_path)
    except:
        return 0

def is_text_file(filename: str) -> bool:
    """检查是否为文本文件"""
    text_extensions = {'.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm'}
    _, ext = os.path.splitext(filename.lower())
    return ext in text_extensions

def is_document_file(filename: str) -> bool:
    """检查是否为文档文件"""
    doc_extensions = {'.doc', '.docx', '.pdf', '.rtf', '.odt'}
    _, ext = os.path.splitext(filename.lower())
    return ext in doc_extensions
