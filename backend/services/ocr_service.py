import pytesseract
from PIL import Image
import cv2
import numpy as np
import os
import tempfile
import time
from typing import List, Dict

class OCRService:
    def __init__(self):
        # 配置Tesseract路径（如果需要）
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        pass
    
    def extract_text_from_image(self, image_path: str) -> Dict:
        """从单个图片提取文本"""
        try:
            # 读取图片
            image = Image.open(image_path)
            
            # 转换为RGB格式（如果需要）
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 图片预处理
            processed_image = self._preprocess_image(image)
            
            # OCR识别
            text = pytesseract.image_to_string(
                processed_image, 
                lang='chi_sim+eng',  # 支持中英文
                config='--oem 3 --psm 6'
            )
            
            # 清理文本
            cleaned_text = self._clean_text(text)
            
            return {
                'success': True,
                'text': cleaned_text,
                'word_count': len(cleaned_text.split()),
                'image_path': image_path
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'image_path': image_path
            }
    
    def extract_text_from_multiple_images(self, image_paths: List[str]) -> List[Dict]:
        """从多个图片提取文本"""
        results = []
        for image_path in image_paths:
            result = self.extract_text_from_image(image_path)
            results.append(result)
        return results
    
    def _preprocess_image(self, image: Image) -> Image:
        """图片预处理，提高OCR识别率"""
        try:
            # 转换为numpy数组
            img_array = np.array(image)
            
            # 转换为灰度图
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # 去噪
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # 二值化
            _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # 转换回PIL图片
            processed_image = Image.fromarray(binary)
            
            return processed_image
            
        except Exception:
            # 如果预处理失败，返回原图
            return image
    
    def _clean_text(self, text: str) -> str:
        """清理OCR识别的文本"""
        # 移除多余的空白字符
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line:  # 只保留非空行
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def save_uploaded_images(self, files) -> List[str]:
        """保存上传的图片文件"""
        saved_paths = []
        upload_dir = 'data/uploads/images'
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            if file and self._is_image_file(file.filename):
                # 生成唯一文件名
                filename = f"{int(time.time())}_{file.filename}"
                file_path = os.path.join(upload_dir, filename)
                file.save(file_path)
                saved_paths.append(file_path)
        
        return saved_paths
    
    def _is_image_file(self, filename: str) -> bool:
        """检查是否为图片文件"""
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'}
        return any(filename.lower().endswith(ext) for ext in allowed_extensions)

# 全局OCR服务实例
ocr_service = OCRService()
