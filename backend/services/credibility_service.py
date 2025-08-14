"""
可信度评分服务
用于对真假辨别模块中的搜索结果进行智能评分
"""

import re
from urllib.parse import urlparse
from datetime import datetime

class CredibilityService:
    def __init__(self):
        # 权威网站域名列表
        self.authoritative_domains = {
            # 官方机构
            'gov.cn': 10, 'gov': 10, 'edu.cn': 9, 'edu': 9,
            # 权威媒体
            'xinhuanet.com': 9, 'people.com.cn': 9, 'cctv.com': 9,
            'chinadaily.com.cn': 8, 'china.org.cn': 8,
            'bbc.com': 8, 'reuters.com': 8, 'ap.org': 8,
            # 学术机构
            'nature.com': 9, 'science.org': 9, 'springer.com': 8,
            'ieee.org': 8, 'acm.org': 8,
            # 国际组织
            'who.int': 10, 'un.org': 9, 'unesco.org': 9,
            'worldbank.org': 8, 'imf.org': 8,
            # 专业百科
            'britannica.com': 7, 'wikipedia.org': 6,
            # 其他知名媒体
            'nytimes.com': 7, 'wsj.com': 7, 'theguardian.com': 7,
            'ft.com': 7, 'economist.com': 7
        }
        
        # 可疑域名关键词
        self.suspicious_keywords = [
            'fake', 'conspiracy', 'hoax', 'rumor', 'gossip',
            '谣言', '假新闻', '八卦', '小道消息'
        ]
        
        # 高可信度关键词
        self.credible_keywords = [
            'official', 'research', 'study', 'report', 'analysis',
            '官方', '研究', '报告', '分析', '调查'
        ]
        
        # 情感操控关键词 - 引起恐慌的词汇
        self.panic_keywords = [
            '震惊', '惊人', '恐怖', '危险', '威胁', '灾难', '崩溃', '毁灭',
            '末日', '致命', '严重', '紧急', '警告', '爆发', '失控',
            'shocking', 'terrifying', 'dangerous', 'threat', 'disaster', 
            'collapse', 'deadly', 'emergency', 'warning', 'outbreak'
        ]
        
        # 极端情绪词汇 - 引起愤怒或仇恨
        self.extreme_emotion_keywords = [
            '愤怒', '仇恨', '愤慨', '激怒', '暴怒', '憎恨', '痛恨', '恶心',
            '可恶', '卑鄙', '无耻', '该死', '混蛋', '垃圾', '废物',
            'angry', 'hate', 'fury', 'rage', 'disgusting', 'evil', 'damn'
        ]
        
        # 煽动性词汇 - 鼓动特定行为
        self.incitement_keywords = [
            '必须', '应该', '一定要', '绝不能', '坚决', '强烈', '立即',
            '赶紧', '快速', '抵制', '反对', '支持', '行动起来',
            'must', 'should', 'never', 'immediately', 'boycott', 'oppose'
        ]
        
        # 夸大表达模式 - 过度夸张的表达
        self.exaggeration_patterns = [
            r'!!!+', r'\?{3,}', r'[！？]{3,}', r'绝对', r'完全', r'百分百',
            r'史上最', r'前所未有', r'空前', r'史无前例', r'天下第一',
            r'absolutely', r'completely', r'unprecedented', r'never before'
        ]
        
        # 偏见和歧视关键词
        self.bias_keywords = [
            '那些人', '他们都', '全都是', '没有一个好的', '都不是好东西',
            '天生', '注定', '血统', '基因', '种族', '民族劣根性',
            'all of them', 'those people', 'naturally', 'born to'
        ]
        
        # 未验证声明词汇
        self.unverified_claims = [
            '据说', '听说', '有人说', '传说', '据传', '有消息称',
            '内部消息', '知情人士透露', '小道消息', '坊间传闻',
            'rumor has it', 'allegedly', 'supposedly', 'sources say'
        ]
    
    def calculate_source_credibility(self, url, title, snippet):
        """
        计算单个搜索结果的可信度分数
        返回值: 0-100的分数
        """
        score = 50  # 基础分数
        details = []
        
        # 1. 域名权威性评分 (权重: 25%)
        domain_score = self._evaluate_domain(url)
        score += (domain_score - 5) * 5  # 将0-10的分数转换为-25到+25
        details.append(f"域名权威性: {domain_score}/10")
        
        # 2. 标题可信度评分 (权重: 20%)
        title_score = self._evaluate_title(title)
        score += (title_score - 5) * 4  # 将0-10的分数转换为-20到+20
        details.append(f"标题可信度: {title_score}/10")
        
        # 3. 内容描述评分 (权重: 20%)
        snippet_score = self._evaluate_snippet(snippet)
        score += (snippet_score - 5) * 4  # 将0-10的分数转换为-20到+20
        details.append(f"内容描述: {snippet_score}/10")
        
        # 4. 情感偏见检测 (权重: 20%)
        emotion_bias_score = self._evaluate_emotional_bias(title, snippet)
        score += (emotion_bias_score - 5) * 4  # 将0-10的分数转换为-20到+20
        details.append(f"情感偏见: {emotion_bias_score}/10")
        
        # 5. 综合质量评分 (权重: 15%)
        quality_score = self._evaluate_overall_quality(url, title, snippet)
        score += (quality_score - 5) * 3  # 将0-10的分数转换为-15到+15
        details.append(f"综合质量: {quality_score}/10")
        
        # 6. 辟谣内容加权处理
        debunk_bonus = self._evaluate_debunk_content(title, snippet)
        if debunk_bonus > 0:
            score += debunk_bonus
            details.append(f"辟谣内容加权: +{debunk_bonus}")
        
        # 确保分数在0-100范围内
        score = max(0, min(100, score))
        
        return {
            'score': round(score, 1),
            'level': self._get_credibility_level(score),
            'details': details,
            'factors': {
                'domain': domain_score,
                'title': title_score,
                'snippet': snippet_score,
                'emotion_bias': emotion_bias_score,
                'quality': quality_score
            },
            'emotion_analysis': self._get_emotion_analysis(title, snippet)
        }
    
    def _evaluate_domain(self, url):
        """评估域名的权威性 (0-10分)"""
        if not url:
            return 3
        
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # 检查是否为权威域名
            for auth_domain, score in self.authoritative_domains.items():
                if auth_domain in domain:
                    return score
            
            # 检查域名特征
            score = 5  # 默认分数
            
            # https加分
            if parsed.scheme == 'https':
                score += 0.5
            
            # 域名长度（过长或过短都减分）
            if len(domain) > 50:
                score -= 1
            elif len(domain) < 5:
                score -= 1
            
            # 检查可疑特征
            for keyword in self.suspicious_keywords:
                if keyword in domain:
                    score -= 2
                    break
            
            # 顶级域名评分
            if domain.endswith(('.gov', '.edu', '.org')):
                score += 1
            elif domain.endswith(('.com', '.cn', '.net')):
                score += 0.5
            
            return max(0, min(10, score))
            
        except:
            return 3
    
    def _evaluate_title(self, title):
        """评估标题的可信度 (0-10分)"""
        if not title:
            return 3
        
        score = 5  # 基础分数
        title_lower = title.lower()
        
        # 检查辟谣和澄清关键词 - 给予高权重
        debunk_keywords = [
            '辟谣', '澄清', '不实', '谣言', '虚假信息', '打击谣言', '谣传',
            '官方澄清', '官方回应', '权威澄清', '警方澄清', '辟谣声明',
            'debunk', 'clarification', 'false information', 'rumor', 'fake news'
        ]
        for keyword in debunk_keywords:
            if keyword in title_lower:
                score += 2.5  # 辟谣类信息给予更高权重
                break
        
        # 检查可信度关键词
        for keyword in self.credible_keywords:
            if keyword in title_lower:
                score += 1
                break
        
        # 检查可疑关键词
        for keyword in self.suspicious_keywords:
            if keyword in title_lower:
                score -= 2
                break
        
        # 标题长度评分
        title_length = len(title)
        if 10 <= title_length <= 100:
            score += 0.5
        elif title_length > 150:
            score -= 1
        
        # 检查过度夸张的表达
        exaggerated_patterns = [
            r'!!!+', r'\?{3,}', r'震惊', r'惊人', r'不敢相信',
            r'SHOCKING', r'UNBELIEVABLE', r'AMAZING'
        ]
        for pattern in exaggerated_patterns:
            if re.search(pattern, title, re.IGNORECASE):
                score -= 1.5
                break
        
        # 检查权威性指标
        authority_indicators = [
            '研究表明', '报告显示', '专家', '官方',
            'research shows', 'study reveals', 'expert', 'official'
        ]
        for indicator in authority_indicators:
            if indicator in title_lower:
                score += 1
                break
        
        return max(0, min(10, score))
    
    def _evaluate_snippet(self, snippet):
        """评估内容描述的可信度 (0-10分)"""
        if not snippet:
            return 3
        
        score = 5  # 基础分数
        snippet_lower = snippet.lower()
        
        # 检查辟谣和官方澄清内容 - 给予高权重
        debunk_content_keywords = [
            '辟谣', '澄清', '不实信息', '谣言', '虚假信息', '打击谣言', 
            '官方澄清', '官方回应', '权威回应', '警方澄清', '政府澄清',
            '经查证', '经核实', '调查显示', '事实是',
            'debunk', 'clarify', 'false claim', 'misinformation', 'fact check'
        ]
        for keyword in debunk_content_keywords:
            if keyword in snippet_lower:
                score += 2  # 辟谣和澄清内容给予更高权重
                break
        
        # 检查官方否认的表述
        denial_patterns = [
            r'并非.*事实', r'不存在.*情况', r'未发生.*事件', 
            r'经.*核实.*不实', r'.*系谣言', r'.*为虚假信息'
        ]
        for pattern in denial_patterns:
            if re.search(pattern, snippet_lower):
                score += 2.5
                break
        
        # 检查信息完整性
        if len(snippet) > 50 and len(snippet) < 500:
            score += 1
        elif len(snippet) < 20:
            score -= 1
        
        # 检查具体数据和日期
        date_patterns = [
            r'\d{4}年', r'\d{1,2}月', r'\d{4}-\d{2}-\d{2}',
            r'20\d{2}', r'yesterday', r'today', r'recent'
        ]
        has_date = any(re.search(pattern, snippet_lower) for pattern in date_patterns)
        if has_date:
            score += 1
        
        # 检查数据和统计
        data_patterns = [
            r'\d+%', r'\d+万', r'\d+亿', r'\d+千',
            r'\d+\s*(percent|million|billion|thousand)'
        ]
        has_data = any(re.search(pattern, snippet_lower) for pattern in data_patterns)
        if has_data:
            score += 1
        
        # 检查引用来源
        source_indicators = [
            '据', '根据', '来源', '引用',
            'according to', 'source', 'cited', 'reported'
        ]
        has_source = any(indicator in snippet_lower for indicator in source_indicators)
        if has_source:
            score += 1
        
        # 检查可疑内容
        for keyword in self.suspicious_keywords:
            if keyword in snippet_lower:
                score -= 1.5
                break
        
        # 检查客观性（避免过多主观词汇）
        subjective_words = [
            '绝对', '肯定', '必须', '永远', '从不',
            'absolutely', 'definitely', 'always', 'never'
        ]
        subjective_count = sum(1 for word in subjective_words if word in snippet_lower)
        if subjective_count > 2:
            score -= 1
        
        return max(0, min(10, score))
    
    def _evaluate_debunk_content(self, title, snippet):
        """评估辟谣内容的额外加权 (0-15分)"""
        if not title and not snippet:
            return 0
            
        bonus = 0
        combined_text = f"{title or ''} {snippet or ''}".lower()
        
        # 强辟谣关键词 - 高权重
        strong_debunk_keywords = [
            '官方辟谣', '警方辟谣', '政府澄清', '权威澄清', '官方否认',
            '经核实不实', '系谣言', '为虚假信息', '打击谣言典型案例'
        ]
        for keyword in strong_debunk_keywords:
            if keyword in combined_text:
                bonus += 10  # 强辟谣内容给予高权重
                break
        
        # 一般辟谣关键词 - 中等权重
        if bonus == 0:  # 如果没有检测到强辟谣关键词
            general_debunk_keywords = [
                '辟谣', '澄清', '不实', '谣言', '虚假信息', 
                '事实核查', '真相', '调查结果'
            ]
            for keyword in general_debunk_keywords:
                if keyword in combined_text:
                    bonus += 5  # 一般辟谣内容给予中等权重
                    break
        
        # 官方机构否认的表述模式
        denial_patterns = [
            r'(官方|政府|警方|权威部门).{0,10}(否认|澄清|回应)',
            r'经.{0,10}(核实|查证|调查).{0,10}(不实|虚假|谣言)',
            r'(并非|不是|未发生).{0,20}(事实|真实情况)'
        ]
        for pattern in denial_patterns:
            if re.search(pattern, combined_text):
                bonus += 8
                break
        
        return min(bonus, 15)  # 最大加权15分
    
    def _evaluate_overall_quality(self, url, title, snippet):
        """评估整体质量 (0-10分)"""
        score = 5  # 基础分数
        
        # 信息完整性
        completeness = sum([
            1 if url else 0,
            1 if title and len(title) > 5 else 0,
            1 if snippet and len(snippet) > 10 else 0
        ])
        score += completeness - 1.5  # 完整度调整
        
        # 一致性检查（标题和描述的相关性）
        if title and snippet:
            title_words = set(re.findall(r'\w+', title.lower()))
            snippet_words = set(re.findall(r'\w+', snippet.lower()))
            if title_words and snippet_words:
                overlap = len(title_words & snippet_words) / len(title_words | snippet_words)
                if overlap > 0.3:
                    score += 1
                elif overlap < 0.1:
                    score -= 1
        
        # 专业性指标
        professional_indicators = [
            '研究', '分析', '报告', '数据', '调查',
            'research', 'analysis', 'report', 'data', 'survey'
        ]
        text_to_check = f"{title} {snippet}".lower()
        professional_count = sum(1 for indicator in professional_indicators if indicator in text_to_check)
        if professional_count >= 2:
            score += 1
        
        return max(0, min(10, score))
    
    def _get_credibility_level(self, score):
        """根据分数返回可信度等级"""
        if score >= 80:
            return "极高"
        elif score >= 65:
            return "高"
        elif score >= 50:
            return "中等"
        elif score >= 35:
            return "低"
        else:
            return "极低"
    
    def _evaluate_emotional_bias(self, title, snippet):
        """评估情感偏见和极端内容 (0-10分，10分表示客观中性)"""
        if not title and not snippet:
            return 5
        
        score = 8  # 基础分数，假设内容相对客观
        text_to_check = f"{title} {snippet}".lower()
        
        # 检查恐慌情绪词汇
        panic_count = sum(1 for keyword in self.panic_keywords if keyword.lower() in text_to_check)
        if panic_count > 0:
            score -= min(3, panic_count * 0.8)  # 最多扣3分
        
        # 检查极端情绪词汇
        extreme_emotion_count = sum(1 for keyword in self.extreme_emotion_keywords if keyword.lower() in text_to_check)
        if extreme_emotion_count > 0:
            score -= min(2.5, extreme_emotion_count * 0.7)  # 最多扣2.5分
        
        # 检查煽动性词汇
        incitement_count = sum(1 for keyword in self.incitement_keywords if keyword.lower() in text_to_check)
        if incitement_count >= 3:  # 大量煽动性词汇
            score -= 2
        
        # 检查夸大表达模式
        for pattern in self.exaggeration_patterns:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                score -= 1.5
                break
        
        # 检查偏见和歧视内容
        bias_count = sum(1 for keyword in self.bias_keywords if keyword.lower() in text_to_check)
        if bias_count > 0:
            score -= min(2, bias_count)  # 最多扣2分
        
        # 检查未验证声明
        unverified_count = sum(1 for keyword in self.unverified_claims if keyword.lower() in text_to_check)
        if unverified_count > 0:
            score -= min(1.5, unverified_count * 0.5)  # 最多扣1.5分
        
        # 检查感叹号和问号的过度使用
        excessive_punctuation = len(re.findall(r'[!！]{2,}|[?？]{2,}', text_to_check))
        if excessive_punctuation > 0:
            score -= min(1, excessive_punctuation * 0.3)
        
        # 检查全大写词汇（通常表示情绪激动）
        uppercase_words = len(re.findall(r'\b[A-Z]{3,}\b', title + " " + snippet))
        if uppercase_words > 2:
            score -= 1
        
        # 检查客观性指标（如果包含客观词汇，加分）
        objective_keywords = [
            '根据', '显示', '表明', '数据', '统计', '调查', '研究', '专家',
            'according to', 'shows', 'indicates', 'data', 'statistics', 'survey'
        ]
        objective_count = sum(1 for keyword in objective_keywords if keyword.lower() in text_to_check)
        if objective_count >= 2:
            score += 1  # 客观性加分
        
        return max(0, min(10, score))
    
    def _get_emotion_analysis(self, title, snippet):
        """获取情感分析详情"""
        if not title and not snippet:
            return {'risk_level': '未知', 'detected_issues': []}
        
        text_to_check = f"{title} {snippet}".lower()
        detected_issues = []
        risk_level = '低风险'
        risk_score = 0
        
        # 检测各类问题
        panic_count = sum(1 for keyword in self.panic_keywords if keyword.lower() in text_to_check)
        if panic_count > 0:
            detected_issues.append(f'恐慌情绪词汇: {panic_count}个')
            risk_score += panic_count * 2
        
        extreme_emotion_count = sum(1 for keyword in self.extreme_emotion_keywords if keyword.lower() in text_to_check)
        if extreme_emotion_count > 0:
            detected_issues.append(f'极端情绪词汇: {extreme_emotion_count}个')
            risk_score += extreme_emotion_count * 1.5
        
        incitement_count = sum(1 for keyword in self.incitement_keywords if keyword.lower() in text_to_check)
        if incitement_count >= 3:
            detected_issues.append('大量煽动性表达')
            risk_score += 3
        
        for pattern in self.exaggeration_patterns:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                detected_issues.append('夸大表达模式')
                risk_score += 2
                break
        
        bias_count = sum(1 for keyword in self.bias_keywords if keyword.lower() in text_to_check)
        if bias_count > 0:
            detected_issues.append(f'偏见歧视内容: {bias_count}个')
            risk_score += bias_count * 2
        
        unverified_count = sum(1 for keyword in self.unverified_claims if keyword.lower() in text_to_check)
        if unverified_count > 0:
            detected_issues.append(f'未验证声明: {unverified_count}个')
            risk_score += unverified_count
        
        # 确定风险等级
        if risk_score >= 8:
            risk_level = '极高风险'
        elif risk_score >= 5:
            risk_level = '高风险'
        elif risk_score >= 3:
            risk_level = '中等风险'
        elif risk_score > 0:
            risk_level = '低风险'
        else:
            risk_level = '客观中性'
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'detected_issues': detected_issues
        }
    
    def calculate_overall_credibility(self, search_results_with_scores):
        """
        计算整体可信度评分
        基于所有搜索结果的加权平均
        """
        if not search_results_with_scores:
            return {
                'overall_score': 0,
                'overall_level': '无法评估',
                'summary': '没有足够的搜索结果进行评估'
            }
        
        total_weighted_score = 0
        total_weight = 0
        score_distribution = {'极高': 0, '高': 0, '中等': 0, '低': 0, '极低': 0}
        
        for result in search_results_with_scores:
            score = result['credibility']['score']
            level = result['credibility']['level']
            
            # 根据搜索结果的排序位置分配权重
            position_weight = 1.0 / (result.get('position', 1) ** 0.5)  # 前面的结果权重更高
            
            total_weighted_score += score * position_weight
            total_weight += position_weight
            score_distribution[level] += 1
        
        overall_score = total_weighted_score / total_weight if total_weight > 0 else 0
        overall_level = self._get_credibility_level(overall_score)
        
        # 生成评估摘要
        total_results = len(search_results_with_scores)
        high_credibility = score_distribution['极高'] + score_distribution['高']
        low_credibility = score_distribution['低'] + score_distribution['极低']
        
        summary = f"基于 {total_results} 个搜索结果的评估："
        if high_credibility >= total_results * 0.6:
            summary += "大部分搜索结果具有较高可信度"
        elif low_credibility >= total_results * 0.6:
            summary += "大部分搜索结果可信度较低，需谨慎对待"
        else:
            summary += "搜索结果的可信度参差不齐，建议进一步核实"
        
        return {
            'overall_score': round(overall_score, 1),
            'overall_level': overall_level,
            'summary': summary,
            'distribution': score_distribution,
            'high_credibility_ratio': round(high_credibility / total_results * 100, 1),
            'total_sources': total_results
        }

# 全局实例
credibility_service = CredibilityService()
