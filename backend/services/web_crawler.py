import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import time
import json

class WebCrawler:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def extract_text_from_url(self, url: str) -> dict:
        """从URL提取文本内容"""
        try:
            print(f"正在抓取URL: {url}")
            
            # 先尝试特殊站点处理
            special_result = self._handle_special_sites(url)
            if special_result:
                print(f"使用特殊处理器提取内容，成功: {special_result['success']}")
                return special_result
            
            # 普通处理流程
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            print(f"响应状态码: {response.status_code}, 内容长度: {len(response.content)}")
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 移除脚本和样式元素
            for script in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                script.decompose()
            
            # 提取标题
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "未找到标题"
            
            # 提取主要内容 - 扩展选择器
            content_selectors = [
                'article', 'main', '.content', '.post-content', 
                '.entry-content', '.article-content', '#content',
                '.post', '.article', '.story', '.news-content',
                '.video-info', '.video-desc', '.video-title',
                '.description', '.summary', '.abstract',
                '[class*="content"]', '[class*="article"]',
                '[class*="text"]', '[id*="content"]'
            ]
            
            main_content = None
            for selector in content_selectors:
                content = soup.select_one(selector)
                if content and len(content.get_text().strip()) > 50:  # 确保内容足够长
                    main_content = content
                    break
            
            if not main_content:
                # 如果没有找到特定的内容区域，尝试从body中提取
                body = soup.find('body')
                if body:
                    # 移除导航、广告等无关内容
                    for unwanted in body.find_all(['nav', 'header', 'footer', 'aside', 'advertisement']):
                        unwanted.decompose()
                    main_content = body
            
            # 提取文本
            if main_content:
                text = main_content.get_text(separator='\n', strip=True)
            else:
                text = soup.get_text(separator='\n', strip=True)
            
            # 清理文本
            lines = text.split('\n')
            cleaned_lines = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 3 and not self._is_noise_line(line):
                    cleaned_lines.append(line)
            
            content_text = '\n'.join(cleaned_lines)
            
            print(f"提取文本长度: {len(content_text)}")
            
            # 如果内容太少，尝试备用方法
            if len(content_text) < 100:
                print("内容太少，尝试备用提取方法...")
                content_text = self._fallback_extraction(soup)
                print(f"备用方法提取文本长度: {len(content_text)}")
            
            # 提取图片
            images = []
            for img in soup.find_all('img', limit=10):  # 限制图片数量
                src = img.get('src')
                if src:
                    abs_url = urljoin(url, src)
                    alt = img.get('alt', '')
                    images.append({
                        'url': abs_url,
                        'alt': alt
                    })
            
            return {
                'success': True,
                'title': title_text,
                'content': content_text,
                'images': images,
                'url': url,
                'word_count': len(content_text.split())
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"提取失败: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'url': url
            }
    
    def _handle_special_sites(self, url: str) -> dict:
        """处理特殊网站"""
        try:
            domain = urlparse(url).netloc.lower()
            
            # Bilibili 特殊处理
            if 'bilibili.com' in domain:
                return self._extract_bilibili_content(url)
            
            # 微信公众号文章
            if 'mp.weixin.qq.com' in domain:
                return self._extract_wechat_content(url)
            
            # 知乎文章
            if 'zhihu.com' in domain:
                return self._extract_zhihu_content(url)
            
            return None
            
        except Exception as e:
            print(f"特殊站点处理失败: {str(e)}")
            return None
    
    def _extract_bilibili_content(self, url: str) -> dict:
        """提取Bilibili视频信息"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 提取标题
            title_elem = soup.find('h1', class_='video-title') or soup.find('title')
            title = title_elem.get_text().strip() if title_elem else "Bilibili视频"
            
            # 提取描述信息
            content_parts = []
            
            # 视频简介
            desc_elem = soup.find('div', class_='desc-info-text')
            if desc_elem:
                content_parts.append(f"视频简介：\n{desc_elem.get_text().strip()}")
            
            # UP主信息
            up_elem = soup.find('a', class_='up-name')
            if up_elem:
                content_parts.append(f"UP主：{up_elem.get_text().strip()}")
            
            # 视频统计信息
            stats = []
            for stat in soup.find_all(class_='view'):
                stats.append(stat.get_text().strip())
            
            if stats:
                content_parts.append(f"播放数据：{' '.join(stats)}")
            
            # 尝试从页面脚本中提取更多信息
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'window.__INITIAL_STATE__' in script.string:
                    try:
                        # 简单的信息提取，避免复杂的JSON解析
                        script_text = script.string
                        if '"title"' in script_text:
                            content_parts.append("从页面数据中提取到视频相关信息")
                    except:
                        pass
            
            content_text = '\n\n'.join(content_parts) if content_parts else f"这是一个Bilibili视频链接：{title}"
            
            return {
                'success': True,
                'title': title,
                'content': content_text,
                'images': [],
                'url': url,
                'word_count': len(content_text.split())
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Bilibili内容提取失败: {str(e)}",
                'url': url
            }
    
    def _extract_wechat_content(self, url: str) -> dict:
        """提取微信公众号文章"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 提取标题
            title_elem = soup.find('h1', class_='rich_media_title') or soup.find('title')
            title = title_elem.get_text().strip() if title_elem else "微信文章"
            
            # 提取正文
            content_elem = soup.find('div', class_='rich_media_content')
            if content_elem:
                content_text = content_elem.get_text(separator='\n', strip=True)
            else:
                content_text = "无法提取微信文章内容"
            
            return {
                'success': True,
                'title': title,
                'content': content_text,
                'images': [],
                'url': url,
                'word_count': len(content_text.split())
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"微信文章提取失败: {str(e)}",
                'url': url
            }
    
    def _extract_zhihu_content(self, url: str) -> dict:
        """提取知乎内容"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 提取标题
            title_elem = soup.find('h1', class_='QuestionHeader-title') or soup.find('title')
            title = title_elem.get_text().strip() if title_elem else "知乎内容"
            
            # 提取答案内容
            content_parts = []
            for answer in soup.find_all('div', class_='RichContent-inner'):
                content_parts.append(answer.get_text(separator='\n', strip=True))
            
            content_text = '\n\n'.join(content_parts) if content_parts else "无法提取知乎内容"
            
            return {
                'success': True,
                'title': title,
                'content': content_text,
                'images': [],
                'url': url,
                'word_count': len(content_text.split())
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"知乎内容提取失败: {str(e)}",
                'url': url
            }
    
    def _is_noise_line(self, line: str) -> bool:
        """判断是否为噪音行"""
        noise_patterns = [
            r'^[点击|查看|更多|广告|推荐]',
            r'^\d+$',  # 纯数字
            r'^[^\u4e00-\u9fa5]{1,3}$',  # 很短的非中文
            r'登录|注册|首页|导航|菜单',
            r'Copyright|©|版权|备案'
        ]
        
        for pattern in noise_patterns:
            if re.search(pattern, line):
                return True
        return False
    
    def _fallback_extraction(self, soup):
        """备用提取方法"""
        try:
            # 尝试提取所有段落
            paragraphs = soup.find_all(['p', 'div'], limit=50)
            content_parts = []
            
            for p in paragraphs:
                text = p.get_text().strip()
                if len(text) > 20 and not self._is_noise_line(text):
                    content_parts.append(text)
            
            return '\n\n'.join(content_parts)
            
        except:
            return "无法提取页面内容，可能是动态加载的内容"
    
    def extract_text_from_multiple_urls(self, urls: list) -> list:
        """从多个URL提取文本"""
        results = []
        for url in urls:
            result = self.extract_text_from_url(url)
            results.append(result)
            time.sleep(1)  # 避免过于频繁的请求
        return results
    
    def is_valid_url(self, url: str) -> bool:
        """验证URL是否有效"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False

# 全局爬虫实例
web_crawler = WebCrawler()
