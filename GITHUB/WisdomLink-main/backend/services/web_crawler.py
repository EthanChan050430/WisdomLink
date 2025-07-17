import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import time
import json
import asyncio
import logging
from playwright.async_api import async_playwright
import asyncio
from playwright.async_api import async_playwright
import logging

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
        self.use_playwright_fallback = True  # 是否启用Playwright降级
        
        # 需要使用Playwright的网站列表
        self.playwright_required_sites = [
            'zhihu.com',
            'blog.csdn.net',
            'csdn.net',
            'juejin.cn',
            'segmentfault.com'
        ]
    
    def extract_text_from_url(self, url: str) -> dict:
        """从URL提取文本内容"""
        try:
            print(f"正在抓取URL: {url}")
            
            # 检查是否需要优先使用Playwright
            domain = urlparse(url).netloc.lower()
            force_playwright = any(site in domain for site in self.playwright_required_sites)
            
            if force_playwright:
                print("检测到需要JavaScript渲染的网站，使用Playwright...")
                playwright_result = asyncio.run(self._extract_with_playwright(url))
                if playwright_result and playwright_result.get('success'):
                    return playwright_result
                print("Playwright提取失败，尝试常规方法...")
            
            # 先尝试特殊站点处理
            special_result = self._handle_special_sites(url)
            if special_result and special_result.get('success'):
                print(f"使用特殊处理器提取内容，成功: {special_result['success']}")
                return special_result
            
            # 普通处理流程
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            print(f"响应状态码: {response.status_code}, 内容长度: {len(response.content)}")
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 检测是否为反爬虫页面
            if self._detect_anti_crawler_page(soup):
                print("检测到反爬虫页面，尝试使用Playwright...")
                if self.use_playwright_fallback:
                    playwright_result = asyncio.run(self._extract_with_playwright(url))
                    if playwright_result and playwright_result.get('success'):
                        return playwright_result
            
            result = self._extract_content_from_soup(soup, url)
            
            # 如果内容提取失败或太少，且启用了Playwright降级，则尝试Playwright
            if (not result.get('success') or not self._is_content_quality_good(result.get('content', ''), result.get('title', ''))) and self.use_playwright_fallback:
                print("常规方法提取失败或内容质量不佳，尝试使用Playwright...")
                playwright_result = asyncio.run(self._extract_with_playwright(url))
                if playwright_result and playwright_result.get('success'):
                    return playwright_result
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            print(f"常规提取失败: {error_msg}")
            
            # 尝试Playwright作为最后的降级方案
            if self.use_playwright_fallback:
                try:
                    print("尝试使用Playwright作为降级方案...")
                    playwright_result = asyncio.run(self._extract_with_playwright(url))
                    if playwright_result and playwright_result.get('success'):
                        return playwright_result
                except Exception as pw_e:
                    print(f"Playwright降级也失败: {str(pw_e)}")
            
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
            
            # 知乎文章 - 优化处理
            if 'zhihu.com' in domain:
                return self._extract_zhihu_content_enhanced(url)
            
            # CSDN文章
            if 'csdn.net' in domain:
                return self._extract_csdn_content(url)
            
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
    
    def _extract_zhihu_content_enhanced(self, url: str) -> dict:
        """增强的知乎内容提取（优先使用Playwright）"""
        try:
            # 对于知乎，直接使用Playwright
            print("知乎网站检测，使用Playwright进行内容提取...")
            return asyncio.run(self._extract_zhihu_with_playwright(url))
            
        except Exception as e:
            print(f"知乎Playwright提取失败，尝试常规方法: {str(e)}")
            return self._extract_zhihu_content(url)
    
    async def _extract_zhihu_with_playwright(self, url: str) -> dict:
        """使用Playwright提取知乎内容"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # 拦截不必要的资源
                await page.route("**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}", lambda route: route.abort())
                
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                await page.wait_for_timeout(3000)  # 等待内容加载
                
                # 尝试滚动加载更多内容
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
                await page.wait_for_timeout(1000)
                
                content = await page.content()
                await browser.close()
                
                soup = BeautifulSoup(content, 'html.parser')
                
                # 提取标题
                title_selectors = [
                    'h1.Post-Title',
                    '.QuestionHeader-title', 
                    '.Post-Title',
                    'h1',
                    'title'
                ]
                
                title = "知乎内容"
                for selector in title_selectors:
                    title_elem = soup.select_one(selector)
                    if title_elem:
                        title = title_elem.get_text().strip()
                        break
                
                # 提取正文内容
                content_selectors = [
                    '.Post-RichTextContainer',
                    '.RichText',
                    '.ztext',
                    '.Post-RichText',
                    '.RichContent-inner',
                    '.AnswerItem .RichContent',
                    'div[data-za-module="RichText"]'
                ]
                
                content_parts = []
                for selector in content_selectors:
                    elements = soup.select(selector)
                    for elem in elements:
                        text = elem.get_text(separator='\n', strip=True)
                        if len(text) > 50:  # 确保内容足够长
                            content_parts.append(text)
                
                if not content_parts:
                    # 备用提取方法
                    article = soup.find('article') or soup.find('.Post-Main')
                    if article:
                        content_parts.append(article.get_text(separator='\n', strip=True))
                
                content_text = '\n\n'.join(content_parts) if content_parts else "无法提取知乎内容"
                
                # 清理文本
                lines = content_text.split('\n')
                cleaned_lines = []
                for line in lines:
                    line = line.strip()
                    if line and len(line) > 3 and not self._is_noise_line(line):
                        cleaned_lines.append(line)
                
                content_text = '\n'.join(cleaned_lines)
                
                return {
                    'success': True,
                    'title': title,
                    'content': content_text,
                    'images': [],
                    'url': url,
                    'word_count': len(content_text.split()),
                    'extraction_method': 'Playwright-Zhihu'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"知乎Playwright提取失败: {str(e)}",
                'url': url
            }
    
    def _extract_csdn_content(self, url: str) -> dict:
        """提取CSDN博客内容"""
        try:
            # 先尝试常规方法
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 提取标题
            title_selectors = [
                '.title-article',
                'h1.title',
                '.article-title',
                'h1',
                'title'
            ]
            
            title = "CSDN文章"
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem:
                    title = title_elem.get_text().strip()
                    break
            
            # 提取正文
            content_selectors = [
                '#article_content',
                '.article_content',
                '.blog-content-box',
                '.markdown_views',
                '.htmledit_views'
            ]
            
            content_text = ""
            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    content_text = content_elem.get_text(separator='\n', strip=True)
                    break
            
            # 如果常规方法提取失败或内容太少，使用Playwright
            if len(content_text) < 100:
                print("CSDN常规提取失败，尝试使用Playwright...")
                playwright_result = asyncio.run(self._extract_csdn_with_playwright(url))
                if playwright_result and playwright_result.get('success'):
                    return playwright_result
            
            if not content_text:
                content_text = "无法提取CSDN文章内容"
            
            # 清理文本
            lines = content_text.split('\n')
            cleaned_lines = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 3 and not self._is_noise_line(line):
                    cleaned_lines.append(line)
            
            content_text = '\n'.join(cleaned_lines)
            
            return {
                'success': True,
                'title': title,
                'content': content_text,
                'images': [],
                'url': url,
                'word_count': len(content_text.split()),
                'extraction_method': 'requests-CSDN'
            }
            
        except Exception as e:
            print(f"CSDN常规提取失败: {str(e)}")
            # 尝试Playwright作为降级
            try:
                return asyncio.run(self._extract_csdn_with_playwright(url))
            except Exception as pw_e:
                return {
                    'success': False,
                    'error': f"CSDN提取失败: {str(e)}, Playwright也失败: {str(pw_e)}",
                    'url': url
                }
    
    async def _extract_csdn_with_playwright(self, url: str) -> dict:
        """使用Playwright提取CSDN内容"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                await page.route("**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}", lambda route: route.abort())
                
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                await page.wait_for_timeout(2000)
                
                content = await page.content()
                await browser.close()
                
                soup = BeautifulSoup(content, 'html.parser')
                
                # 提取标题
                title_selectors = [
                    '.title-article',
                    'h1.title',
                    '.article-title',
                    'h1',
                    'title'
                ]
                
                title = "CSDN文章"
                for selector in title_selectors:
                    title_elem = soup.select_one(selector)
                    if title_elem:
                        title = title_elem.get_text().strip()
                        break
                
                # 提取正文
                content_selectors = [
                    '#article_content',
                    '.article_content',
                    '.blog-content-box',
                    '.markdown_views',
                    '.htmledit_views'
                ]
                
                content_text = ""
                for selector in content_selectors:
                    content_elem = soup.select_one(selector)
                    if content_elem:
                        content_text = content_elem.get_text(separator='\n', strip=True)
                        break
                
                if not content_text:
                    content_text = "无法提取CSDN文章内容"
                
                # 清理文本
                lines = content_text.split('\n')
                cleaned_lines = []
                for line in lines:
                    line = line.strip()
                    if line and len(line) > 3 and not self._is_noise_line(line):
                        cleaned_lines.append(line)
                
                content_text = '\n'.join(cleaned_lines)
                
                return {
                    'success': True,
                    'title': title,
                    'content': content_text,
                    'images': [],
                    'url': url,
                    'word_count': len(content_text.split()),
                    'extraction_method': 'Playwright-CSDN'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"CSDN Playwright提取失败: {str(e)}",
                'url': url
            }
    
    async def _extract_with_playwright(self, url: str) -> dict:
        """使用Playwright提取内容（支持JavaScript渲染和反爬虫机制）"""
        browsers_to_try = ['chromium', 'firefox']
        
        for browser_name in browsers_to_try:
            try:
                async with async_playwright() as p:
                    # 尝试不同的浏览器
                    if browser_name == 'chromium':
                        browser = await p.chromium.launch(
                            headless=True,
                            args=[
                                '--no-sandbox',
                                '--disable-blink-features=AutomationControlled',
                                '--disable-dev-shm-usage',
                                '--disable-gpu',
                                '--disable-web-security',
                                '--disable-features=VizDisplayCompositor'
                            ]
                        )
                    else:
                        browser = await p.firefox.launch(headless=True)
                    
                    # 创建更真实的浏览器环境
                    context = await browser.new_context(
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        viewport={'width': 1920, 'height': 1080},
                        locale='zh-CN',
                        timezone_id='Asia/Shanghai',
                        permissions=['geolocation'],
                        java_script_enabled=True,
                        extra_http_headers={
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                            'Sec-Ch-Ua-Mobile': '?0',
                            'Sec-Ch-Ua-Platform': '"Windows"',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'none',
                            'Sec-Fetch-User': '?1',
                            'Upgrade-Insecure-Requests': '1',
                        }
                    )
                    
                    page = await context.new_page()
                    
                    # 注入脚本来隐藏自动化特征
                    await page.add_init_script("""
                        Object.defineProperty(navigator, 'webdriver', {
                            get: () => undefined,
                        });
                        
                        Object.defineProperty(navigator, 'plugins', {
                            get: () => [1, 2, 3, 4, 5],
                        });
                        
                        Object.defineProperty(navigator, 'languages', {
                            get: () => ['zh-CN', 'zh', 'en'],
                        });
                        
                        window.chrome = {
                            runtime: {},
                        };
                    """)
                    
                    # 设置请求拦截
                    await page.route("**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,mp4,mp3}", lambda route: route.abort())
                    
                    # 随机延迟
                    await page.wait_for_timeout(1000 + (hash(url) % 1000))
                    
                    # 访问页面
                    await page.goto(url, wait_until='domcontentloaded', timeout=45000)
                    
                    # 针对不同网站的特殊处理
                    domain = urlparse(url).netloc.lower()
                    if 'zhihu.com' in domain:
                        # 知乎特殊处理：等待内容加载
                        try:
                            await page.wait_for_selector('.RichText, .ztext, .Post-RichTextContainer', timeout=5000)
                        except:
                            pass
                        # 尝试滚动以触发内容加载
                        await page.evaluate("window.scrollTo(0, Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) / 3)")
                        await page.wait_for_timeout(2000)
                    
                    elif 'csdn.net' in domain:
                        # CSDN特殊处理：等待文章内容
                        try:
                            await page.wait_for_selector('.article_content, #content_views, .markdown_views', timeout=5000)
                        except:
                            pass
                        # 点击展开全文按钮（如果存在）
                        try:
                            expand_btn = await page.query_selector('.btn-readmore, .read-more-btn')
                            if expand_btn:
                                await expand_btn.click()
                                await page.wait_for_timeout(1000)
                        except:
                            pass
                    
                    elif 'juejin.cn' in domain:
                        # 掘金特殊处理
                        try:
                            await page.wait_for_selector('.markdown-body, .article-content', timeout=5000)
                        except:
                            pass
                    
                    # 模拟人类行为
                    await page.wait_for_timeout(2000)
                    
                    # 尝试滚动页面以触发懒加载
                    try:
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                        await page.wait_for_timeout(1000)
                        await page.evaluate("window.scrollTo(0, 0)")
                        await page.wait_for_timeout(1000)
                    except:
                        pass
                    
                    # 检查是否出现验证码或安全检查页面
                    page_content = await page.content()
                    page_text = await page.evaluate("document.body ? document.body.innerText : ''")
                    
                    # 更精确的反爬虫检测
                    anti_crawler_indicators = [
                        '安全验证', '验证码', '机器人', 'captcha', 'security check',
                        '滑动验证', '点击验证', '人机验证', 'bot detection',
                        '访问频率过快', '请稍后再试', '系统繁忙',
                        'cloudflare', 'ddos protection'
                    ]
                    
                    # 检查页面文本和内容
                    is_anti_crawler = False
                    if page_text and len(page_text.strip()) < 200:  # 页面内容太少
                        page_text_lower = page_text.lower()
                        for indicator in anti_crawler_indicators:
                            if indicator in page_text_lower:
                                is_anti_crawler = True
                                break
                    
                    # 检查HTTP状态码
                    if '404' in page_content or '403' in page_content:
                        is_anti_crawler = True
                    
                    if is_anti_crawler:
                        print(f"检测到安全验证页面 ({browser_name})，跳过...")
                        await browser.close()
                        continue
                    
                    # 等待动态内容加载
                    try:
                        # 等待主要内容元素出现
                        await page.wait_for_selector('article, main, .content, .post-content, .article-content', timeout=5000)
                    except:
                        # 如果没有找到主要内容选择器，继续执行
                        pass
                    
                    # 获取最终页面内容
                    content = await page.content()
                    await browser.close()
                    
                    # 使用BeautifulSoup解析
                    soup = BeautifulSoup(content, 'html.parser')
                    result = self._extract_content_from_soup(soup, url, method=f"Playwright-{browser_name}")
                    
                    # 检查提取结果质量
                    if (result.get('success') and 
                        self._is_content_quality_good(result.get('content', ''), result.get('title', ''))):
                        print(f"使用 {browser_name} 成功提取内容")
                        return result
                    else:
                        print(f"{browser_name} 提取内容质量不佳，尝试下一个浏览器...")
                        continue
                        
            except Exception as e:
                print(f"{browser_name} 提取失败: {str(e)}")
                continue
        
        # 所有浏览器都失败了
        return {
            'success': False,
            'error': f"所有Playwright浏览器都提取失败",
            'url': url
        }
    
    def _extract_content_from_soup(self, soup, url: str, method: str = "requests") -> dict:
        """从BeautifulSoup对象中提取内容"""
        try:
            # 移除脚本和样式元素
            for script in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                script.decompose()
            
            # 提取标题
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "未找到标题"
            
            # 提取主要内容 - 针对主流网站优化的选择器
            content_selectors = [
                # 通用选择器
                'article', 'main', '.content', '.post-content', 
                '.entry-content', '.article-content', '#content',
                '.post', '.article', '.story', '.news-content',
                
                # 知乎选择器
                '.Post-RichTextContainer', '.RichText', '.ztext',
                '.Post-RichText', '.RichContent-inner', '.css-0',
                '.QuestionAnswer-content', '.AnswerItem .RichContent',
                
                # CSDN选择器
                '.article_content', '#article_content', '.blog-content-box',
                '.htmledit_views', '#content_views', '.article-body',
                '.markdown_views', '.blog_content',
                
                # 掘金选择器
                '.markdown-body', '.article-content', '.content',
                
                # 简书选择器
                '.show-content', '.article',
                
                # 博客园选择器
                '.postBody', '.blogpost-body', '#cnblogs_post_body',
                
                # 开源中国选择器
                '.article-detail', '.blog-detail',
                
                # SegmentFault选择器
                '.article-content', '.article__content',
                
                # 其他常见选择器
                '.video-info', '.video-desc', '.video-title',
                '.description', '.summary', '.abstract',
                '[class*="content"]', '[class*="article"]',
                '[class*="text"]', '[id*="content"]',
                '[class*="markdown"]', '[class*="rich"]'
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
            
            print(f"使用{method}提取文本长度: {len(content_text)}")
            
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
                'word_count': len(content_text.split()),
                'extraction_method': method
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"内容解析失败: {str(e)}",
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
    
    def _is_content_quality_good(self, content: str, title: str = "") -> bool:
        """检测内容质量是否良好"""
        if len(content) < 50:
            return False
        
        # 检查是否包含反爬虫关键词
        anti_crawler_keywords = [
            '安全验证', '验证码', '机器人', 'captcha', 'security check',
            '403', '404', '页面不存在', '访问受限', '请稍后再试',
            '系统繁忙', '网络错误', '服务器错误', '暂时无法访问'
        ]
        
        content_lower = content.lower()
        for keyword in anti_crawler_keywords:
            if keyword in content_lower:
                return False
        
        # 检查中文字符比例（对中文网站）
        chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', content))
        total_chars = len(content)
        chinese_ratio = chinese_chars / total_chars if total_chars > 0 else 0
        
        # 如果中文字符比例太低，可能是错误页面
        if chinese_ratio < 0.1 and total_chars > 100:
            # 但如果是英文网站，则允许
            english_chars = len(re.findall(r'[a-zA-Z]', content))
            english_ratio = english_chars / total_chars
            if english_ratio < 0.3:  # 既不是中文也不是英文
                return False
        
        # 检查重复内容比例
        lines = content.split('\n')
        unique_lines = set(line.strip() for line in lines if len(line.strip()) > 5)
        if len(lines) > 10 and len(unique_lines) / len(lines) < 0.5:
            return False  # 重复内容太多
        
        return True

    def _detect_anti_crawler_page(self, soup) -> bool:
        """检测是否为反爬虫页面"""
        # 检查页面标题
        title = soup.find('title')
        if title:
            title_text = title.get_text().lower()
            anti_crawler_titles = [
                '安全验证', 'security', 'captcha', '验证码',
                '403', '404', '访问被拒绝', 'access denied'
            ]
            for keyword in anti_crawler_titles:
                if keyword in title_text:
                    return True
        
        # 检查页面内容
        page_text = soup.get_text()[:1000].lower()  # 只检查前1000字符
        anti_crawler_content = [
            '请完成安全验证', '点击验证', '滑动验证',
            'please complete the security verification',
            'bot detection', 'cloudflare', '请开启javascript'
        ]
        
        for keyword in anti_crawler_content:
            if keyword in page_text:
                return True
        
        # 检查是否有验证码相关的元素
        captcha_selectors = [
            '[class*="captcha"]', '[id*="captcha"]',
            '[class*="verify"]', '[id*="verify"]',
            '.security-check', '.bot-check'
        ]
        
        for selector in captcha_selectors:
            if soup.select(selector):
                return True
        
        return False

# 全局爬虫实例
web_crawler = WebCrawler()
