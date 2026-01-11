// Port of credibility scoring service from Python to JavaScript
// Provides functions to score search results and compute overall credibility

const { URL } = require('url');

class CredibilityService {
  constructor() {
    this.authoritative_domains = {
      'gov.cn': 10, 'gov': 10, 'edu.cn': 9, 'edu': 9,
      'xinhuanet.com': 9, 'people.com.cn': 9, 'cctv.com': 9,
      'chinadaily.com.cn': 8, 'china.org.cn': 8,
      'bbc.com': 8, 'reuters.com': 8, 'ap.org': 8,
      'nature.com': 9, 'science.org': 9, 'springer.com': 8,
      'ieee.org': 8, 'acm.org': 8,
      'who.int': 10, 'un.org': 9, 'unesco.org': 9,
      'worldbank.org': 8, 'imf.org': 8,
      'britannica.com': 7, 'wikipedia.org': 6,
      'nytimes.com': 7, 'wsj.com': 7, 'theguardian.com': 7,
      'ft.com': 7, 'economist.com': 7
    };

    this.suspicious_keywords = [
      'fake', 'conspiracy', 'hoax', 'rumor', 'gossip',
      '谣言', '假新闻', '八卦', '小道消息'
    ];

    this.credible_keywords = [
      'official', 'research', 'study', 'report', 'analysis',
      '官方', '研究', '报告', '分析', '调查'
    ];

    this.panic_keywords = [
      '震惊', '惊人', '恐怖', '危险', '威胁', '灾难', '崩溃', '毁灭',
      '末日', '致命', '严重', '紧急', '警告', '爆发', '失控',
      'shocking', 'terrifying', 'dangerous', 'threat', 'disaster',
      'collapse', 'deadly', 'emergency', 'warning', 'outbreak'
    ];

    this.extreme_emotion_keywords = [
      '愤怒', '仇恨', '愤慨', '激怒', '暴怒', '憎恨', '痛恨', '恶心',
      '可恶', '卑鄙', '无耻', '该死', '混蛋', '垃圾', '废物',
      'angry', 'hate', 'fury', 'rage', 'disgusting', 'evil', 'damn'
    ];

    this.incitement_keywords = [
      '必须', '应该', '一定要', '绝不能', '坚决', '强烈', '立即',
      '赶紧', '快速', '抵制', '反对', '支持', '行动起来',
      'must', 'should', 'never', 'immediately', 'boycott', 'oppose'
    ];

    this.exaggeration_patterns = [
      /!!!+/i, /\?{3,}/, /[！？]{3,}/, /绝对/, /完全/, /百分百/,
      /史上最/, /前所未有/, /空前/, /史无前例/, /天下第一/,
      /absolutely/i, /completely/i, /unprecedented/i, /never before/i
    ];

    this.bias_keywords = [
      '那些人', '他们都', '全都是', '没有一个好的', '都不是好东西',
      '天生', '注定', '血统', '基因', '种族', '民族劣根性',
      'all of them', 'those people', 'naturally', 'born to'
    ];

    this.unverified_claims = [
      '据说', '听说', '有人说', '传说', '据传', '有消息称',
      '内部消息', '知情人士透露', '小道消息', '坊间传闻',
      'rumor has it', 'allegedly', 'supposedly', 'sources say'
    ];
  }

  _evaluate_domain(urlStr) {
    if (!urlStr) return 3;
    try {
      const u = new URL(urlStr);
      const domain = (u.host || '').toLowerCase();
      for (const [authDomain, score] of Object.entries(this.authoritative_domains)) {
        if (domain.includes(authDomain)) return score;
      }
      let score = 5;
      if (u.protocol === 'https:') score += 0.5;
      if (domain.length > 50 || domain.length < 5) score -= 1;
      for (const kw of this.suspicious_keywords) {
        if (domain.includes(kw)) { score -= 2; break; }
      }
      if (/(\.gov|\.edu|\.org)$/.test(domain)) score += 1;
      else if (/(\.com|\.cn|\.net)$/.test(domain)) score += 0.5;
      return Math.max(0, Math.min(10, score));
    } catch {
      return 3;
    }
  }

  _evaluate_title(title) {
    if (!title) return 3;
    let score = 5;
    const lower = title.toLowerCase();
    const debunk_keywords = [
      '辟谣','澄清','不实','谣言','虚假信息','打击谣言','谣传',
      '官方澄清','官方回应','权威澄清','警方澄清','辟谣声明',
      'debunk','clarification','false information','rumor','fake news'
    ];
    if (debunk_keywords.some(k => lower.includes(k))) score += 2.5;
    if (this.credible_keywords.some(k => lower.includes(k))) score += 1;
    if (this.suspicious_keywords.some(k => lower.includes(k))) score -= 2;
    const len = title.length;
    if (len >= 10 && len <= 100) score += 0.5; else if (len > 150) score -= 1;
    const exaggerated_patterns = [/!!!+/i, /\?{3,}/, /震惊|惊人|不敢相信/i, /SHOCKING|UNBELIEVABLE|AMAZING/];
    if (exaggerated_patterns.some(p => p.test(title))) score -= 1.5;
    const authority_indicators = ['研究表明','报告显示','专家','官方','research shows','study reveals','expert','official'];
    if (authority_indicators.some(k => lower.includes(k))) score += 1;
    return Math.max(0, Math.min(10, score));
  }

  _evaluate_snippet(snippet) {
    if (!snippet) return 3;
    let score = 5;
    const lower = snippet.toLowerCase();
    const debunk_content_keywords = [
      '辟谣','澄清','不实信息','谣言','虚假信息','打击谣言',
      '官方澄清','官方回应','权威回应','警方澄清','政府澄清',
      '经查证','经核实','调查显示','事实是',
      'debunk','clarify','false claim','misinformation','fact check'
    ];
    if (debunk_content_keywords.some(k => lower.includes(k))) score += 2;
    const denial_patterns = [/并非.*事实/, /不存在.*情况/, /未发生.*事件/, /经.*核实.*不实/, /.*系谣言/, /.*为虚假信息/];
    if (denial_patterns.some(p => p.test(lower))) score += 2.5;
    if (snippet.length > 50 && snippet.length < 500) score += 1; else if (snippet.length < 20) score -= 1;
    const has_date = [/(\d{4}年)/, /(\d{1,2}月)/, /(\d{4}-\d{2}-\d{2})/, /20\d{2}/, /yesterday|today|recent/].some(p => p.test(lower));
    if (has_date) score += 1;
    const has_data = [/\d+%/, /\d+万/, /\d+亿/, /\d+千/, /\d+\s*(percent|million|billion|thousand)/i].some(p => p.test(lower));
    if (has_data) score += 1;
    const source_indicators = ['据','根据','来源','引用','according to','source','cited','reported'];
    if (source_indicators.some(k => lower.includes(k))) score += 1;
    if (this.suspicious_keywords.some(k => lower.includes(k))) score -= 1.5;
    const subjective_words = ['绝对','肯定','必须','永远','从不','absolutely','definitely','always','never'];
    const subjective_count = subjective_words.filter(w => lower.includes(w)).length;
    if (subjective_count > 2) score -= 1;
    return Math.max(0, Math.min(10, score));
  }

  _evaluate_debunk_content(title, snippet) {
    if (!title && !snippet) return 0;
    const text = `${title || ''} ${snippet || ''}`.toLowerCase();
    let bonus = 0;
    const strong = ['官方辟谣','警方辟谣','政府澄清','权威澄清','官方否认','经核实不实','系谣言','为虚假信息','打击谣言典型案例'];
    if (strong.some(k => text.includes(k))) bonus += 10;
    if (bonus === 0) {
      const general = ['辟谣','澄清','不实','谣言','虚假信息','事实核查','真相','调查结果'];
      if (general.some(k => text.includes(k))) bonus += 5;
    }
    const denial_patterns = [/(官方|政府|警方|权威部门).{0,10}(否认|澄清|回应)/, /经.{0,10}(核实|查证|调查).{0,10}(不实|虚假|谣言)/, /(并非|不是|未发生).{0,20}(事实|真实情况)/];
    if (denial_patterns.some(p => p.test(text))) bonus += 8;
    return Math.min(bonus, 15);
  }

  _evaluate_overall_quality(url, title, snippet) {
    let score = 5;
    const completeness = (url ? 1 : 0) + (title && title.length > 5 ? 1 : 0) + (snippet && snippet.length > 10 ? 1 : 0);
    score += completeness - 1.5;
    if (title && snippet) {
      const titleWords = new Set(String(title).toLowerCase().match(/\w+/g) || []);
      const snippetWords = new Set(String(snippet).toLowerCase().match(/\w+/g) || []);
      const union = new Set([...titleWords, ...snippetWords]);
      const inter = new Set([...titleWords].filter(w => snippetWords.has(w)));
      const overlap = union.size ? inter.size / union.size : 0;
      if (overlap > 0.3) score += 1; else if (overlap < 0.1) score -= 1;
    }
    const professional_indicators = ['研究','分析','报告','数据','调查','research','analysis','report','data','survey'];
    const text = `${title || ''} ${snippet || ''}`.toLowerCase();
    const professional_count = professional_indicators.filter(k => text.includes(k)).length;
    if (professional_count >= 2) score += 1;
    return Math.max(0, Math.min(10, score));
  }

  _get_credibility_level(score) {
    if (score >= 80) return '极高';
    if (score >= 65) return '高';
    if (score >= 50) return '中等';
    if (score >= 35) return '低';
    return '极低';
  }

  _evaluate_emotional_bias(title, snippet) {
    if (!title && !snippet) return 5;
    let score = 8;
    const text = `${title || ''} ${snippet || ''}`.toLowerCase();
    const panic = this.panic_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (panic > 0) score -= Math.min(3, panic * 0.8);
    const extreme = this.extreme_emotion_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (extreme > 0) score -= Math.min(2.5, extreme * 0.7);
    const incitement = this.incitement_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (incitement >= 3) score -= 2;
    if (this.exaggeration_patterns.some(p => p.test(text))) score -= 1.5;
    const bias = this.bias_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (bias > 0) score -= Math.min(2, bias);
    const unverified = this.unverified_claims.filter(k => text.includes(k.toLowerCase())).length;
    if (unverified > 0) score -= Math.min(1.5, unverified * 0.5);
    const excessive_punct = (text.match(/[!！]{2,}|[?？]{2,}/g) || []).length;
    if (excessive_punct > 0) score -= Math.min(1, excessive_punct * 0.3);
    const uppercase_words = ((`${title || ''} ${snippet || ''}`).match(/\b[A-Z]{3,}\b/g) || []).length;
    if (uppercase_words > 2) score -= 1;
    const objective_keywords = ['根据','显示','表明','数据','统计','调查','研究','专家','according to','shows','indicates','data','statistics','survey'];
    const objective_count = objective_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (objective_count >= 2) score += 1;
    return Math.max(0, Math.min(10, score));
  }

  _get_emotion_analysis(title, snippet) {
    if (!title && !snippet) return { risk_level: '未知', detected_issues: [] };
    const text = `${title || ''} ${snippet || ''}`.toLowerCase();
    const detected_issues = [];
    let risk_score = 0;
    const panic = this.panic_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (panic > 0) { detected_issues.push(`恐慌情绪词汇: ${panic}个`); risk_score += panic * 2; }
    const extreme = this.extreme_emotion_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (extreme > 0) { detected_issues.push(`极端情绪词汇: ${extreme}个`); risk_score += extreme * 1.5; }
    const inc = this.incitement_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (inc >= 3) { detected_issues.push('大量煽动性表达'); risk_score += 3; }
    if (this.exaggeration_patterns.some(p => p.test(text))) { detected_issues.push('夸大表达模式'); risk_score += 2; }
    const bias = this.bias_keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (bias > 0) { detected_issues.push(`偏见歧视内容: ${bias}个`); risk_score += bias * 2; }
    const unverified = this.unverified_claims.filter(k => text.includes(k.toLowerCase())).length;
    if (unverified > 0) { detected_issues.push(`未验证声明: ${unverified}个`); risk_score += unverified; }
    let risk_level = '低风险';
    if (risk_score >= 8) risk_level = '极高风险';
    else if (risk_score >= 5) risk_level = '高风险';
    else if (risk_score >= 3) risk_level = '中等风险';
    else if (risk_score === 0) risk_level = '客观中性';
    return { risk_level, risk_score, detected_issues };
  }

  calculate_source_credibility(url, title, snippet) {
    let score = 50;
    const domain_score = this._evaluate_domain(url);
    score += (domain_score - 5) * 5;
    const title_score = this._evaluate_title(title);
    score += (title_score - 5) * 4;
    const snippet_score = this._evaluate_snippet(snippet);
    score += (snippet_score - 5) * 4;
    const emotion_bias_score = this._evaluate_emotional_bias(title, snippet);
    score += (emotion_bias_score - 5) * 4;
    const quality_score = this._evaluate_overall_quality(url, title, snippet);
    score += (quality_score - 5) * 3;
    const debunk_bonus = this._evaluate_debunk_content(title, snippet);
    if (debunk_bonus > 0) score += debunk_bonus;
    score = Math.max(0, Math.min(100, score));
    return {
      score: Math.round(score * 10) / 10,
      level: this._get_credibility_level(score),
      details: [
        `域名权威性: ${domain_score}/10`,
        `标题可信度: ${title_score}/10`,
        `内容描述: ${snippet_score}/10`,
        `情感偏见: ${emotion_bias_score}/10`,
        `综合质量: ${quality_score}/10`
      ],
      factors: {
        domain: domain_score,
        title: title_score,
        snippet: snippet_score,
        emotion_bias: emotion_bias_score,
        quality: quality_score
      },
      emotion_analysis: this._get_emotion_analysis(title, snippet)
    };
  }

  calculate_overall_credibility(results = []) {
    if (!results || !results.length) {
      return {
        overall_score: 0,
        overall_level: '无法评估',
        summary: '没有足够的搜索结果进行评估'
      };
    }
    let total_weighted = 0;
    let total_weight = 0;
    const dist = { '极高': 0, '高': 0, '中等': 0, '低': 0, '极低': 0 };
    for (const r of results) {
      const cred = r.credibility || {};
      const score = cred.score || 0;
      const level = cred.level || '中等';
      const position_weight = 1.0 / Math.sqrt(r.position || 1);
      total_weighted += score * position_weight;
      total_weight += position_weight;
      if (dist[level] !== undefined) dist[level] += 1;
    }
    const overall_score = total_weight ? total_weighted / total_weight : 0;
    const overall_level = this._get_credibility_level(overall_score);
    const total = results.length;
    const high = (dist['极高'] || 0) + (dist['高'] || 0);
    const low = (dist['低'] || 0) + (dist['极低'] || 0);
    let summary = `基于 ${total} 个搜索结果的评估：`;
    if (high >= total * 0.6) summary += '大部分搜索结果具有较高可信度';
    else if (low >= total * 0.6) summary += '大部分搜索结果可信度较低，需谨慎对待';
    else summary += '搜索结果的可信度参差不齐，建议进一步核实';
    return {
      overall_score: Math.round(overall_score * 10) / 10,
      overall_level: overall_level,
      summary,
      distribution: dist,
      high_credibility_ratio: Math.round((high / total) * 1000) / 10,
      total_sources: total
    };
  }
}

const credibility_service = new CredibilityService();
module.exports = { CredibilityService, credibility_service };
