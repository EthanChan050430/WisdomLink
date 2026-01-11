// Simple Node.js backend for the project (Express-based), replacing Python backend
// Provides API endpoints expected by the frontend under /api/*

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
// New services
const aiService = require('./services/ai_service');
const ocrService = require('./services/ocr_service');
const { credibility_service } = require('./services/credibility_service');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Config
const PORT = process.env.PORT || 7000;
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const USERS_CSV = path.join(DATA_DIR, 'users.csv');
const SEARCH_API_URL = 'http://chengyuxuan.top:3100/search';

// Ensure directories exist
fse.ensureDirSync(DATA_DIR);
fse.ensureDirSync(USERS_DIR);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static frontend serving (optional)
app.use('/', express.static(FRONTEND_DIR));

// Health
app.get('/api/health', (req, res) => {
	res.json({
		ok: true,
		ai: {
			configured: aiService.hasAIConfig(),
			base_url: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'auto-from-python',
		}
	});
});

// In-memory session store (simple)
const sessionStore = new Map(); // token -> { username }

// Personas (basic info, can be extended)
const EXPERT_PERSONAS = {
	luxun: { name: '鲁迅', description: '犀利的文学批判家' },
	hushi: { name: '胡适', description: '理性的学者思辨' },
	keli: { name: '可莉', description: '活泼的元素使者' },
	socrates: { name: '苏格拉底', description: '哲学的启发者' },
	einstein: { name: '爱因斯坦', description: '科学的探索者' },
	hoshino: { name: '星野', description: '强大的战斗人员' },
	shakespeare: { name: '莎士比亚', description: '戏剧与诗歌大师' }
};

function createToken() {
	return crypto.randomBytes(24).toString('hex');
}

function getUserFromReq(req) {
	const token = req.cookies && req.cookies.token;
	if (!token) return null;
	const sess = sessionStore.get(token);
	return sess ? sess.username : null;
}

function ensureUserDirs(username) {
	const userDir = path.join(USERS_DIR, username);
	const chatDir = path.join(userDir, 'chat_history');
	fse.ensureDirSync(chatDir);
	return { userDir, chatDir };
}

function usersCsvReadAll() {
	if (!fs.existsSync(USERS_CSV)) return [];
	const text = fs.readFileSync(USERS_CSV, 'utf8');
	const lines = text.split(/\r?\n/).filter(Boolean);
	const rows = [];
	for (const line of lines) {
		const [username, password, created_at] = line.split(',');
		if (username) rows.push({ username, password, created_at });
	}
	return rows;
}

function usersCsvAppend(user) {
	const line = `${user.username},${user.password},${user.created_at || new Date().toISOString()}\n`;
	fs.appendFileSync(USERS_CSV, line, 'utf8');
}

function getSessionFile(username, chatId) {
	const { chatDir } = ensureUserDirs(username);
	return path.join(chatDir, `${chatId}.json`);
}

function loadSession(username, chatId) {
	const file = getSessionFile(username, chatId);
	if (!fs.existsSync(file)) return null;
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (e) {
		return null;
	}
}

function saveSession(username, sessionObj) {
	const file = getSessionFile(username, sessionObj.id);
	fse.ensureFileSync(file);
	fs.writeFileSync(file, JSON.stringify(sessionObj, null, 2), 'utf8');
}

function listSessions(username) {
	const { chatDir } = ensureUserDirs(username);
	if (!fs.existsSync(chatDir)) return [];
	const files = fs.readdirSync(chatDir).filter(f => f.endsWith('.json'));
	const result = [];
	for (const file of files) {
		try {
			const full = path.join(chatDir, file);
			const obj = JSON.parse(fs.readFileSync(full, 'utf8'));
			result.push({
				chat_id: obj.id,
				title: obj.title || '新对话',
				created_at: obj.created_at || obj.updated_at || new Date().toISOString(),
				preview: (obj.messages && obj.messages[0] && obj.messages[0].content) ? String(obj.messages[0].content).slice(0, 80) : ''
			});
		} catch {}
	}
	// sort by created_at desc
	result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
	return result;
}

// ---------------- Helpers: parsing, crawling, booleans ----------------
function parseBool(value, defaultVal = false) {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
	return defaultVal;
}

async function extractFromUrl(url) {
	try {
		const resp = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Node Backend)' } });
		const html = resp.data || '';
		const $ = cheerio.load(html);
		// Remove script/style/noscript
		$('script, style, noscript').remove();
		const title = $('title').first().text().trim() || url;
		const text = $('body').text().replace(/\s+/g, ' ').trim();
		const word_count = text.split(/\s+/).filter(Boolean).length;
		return { success: true, url, title, content: text, word_count };
	} catch (error) {
		return { success: false, url, error: error.message };
	}
}

async function extractTextFromMultipleUrls(urls = []) {
	const results = [];
	for (const u of urls) {
		if (!u) continue;
		// sequential to avoid hammering
		const r = await extractFromUrl(u);
		results.push(r);
	}
	return results;
}

async function extractTextFromFiles(files = []) {
	// files: array of { buffer, originalname, mimetype }
	let combined = '';
	for (const file of files) {
		const ext = path.extname(file.originalname || '').toLowerCase();
		const mime = (file.mimetype || '').toLowerCase();
		try {
			if (mime.includes('pdf') || ext === '.pdf') {
				const data = await pdfParse(file.buffer);
				if (data && data.text) {
					combined += `\n\n=== ${file.originalname} ===\n${data.text}`;
				}
			} else if (ext === '.docx' || mime.includes('officedocument.wordprocessingml.document')) {
				const result = await mammoth.extractRawText({ buffer: file.buffer });
				if (result && result.value) {
					combined += `\n\n=== ${file.originalname} ===\n${result.value}`;
				}
			} else if (mime.startsWith('text/') || ['.txt', '.md', '.csv'].includes(ext)) {
				const text = file.buffer.toString('utf8');
				combined += `\n\n=== ${file.originalname} ===\n${text}`;
			} else {
				// attempt utf8 as fallback
				const text = file.buffer.toString('utf8');
				if (text && /[\x20-\x7E\u4e00-\u9fa5]/.test(text)) {
					combined += `\n\n=== ${file.originalname} ===\n${text}`;
				}
			}
		} catch (err) {
			combined += `\n\n错误：无法解析 ${file.originalname || '文件'} - ${err.message}`;
		}
	}
	return combined.trim();
}

// ============ Auth APIs ============
app.get('/api/auth/check', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.json({ success: false, message: '未登录' });
	const { userDir } = ensureUserDirs(username);
	return res.json({ success: true, user: { username, created_at: new Date().toISOString(), user_folder: userDir } });
});

app.post('/api/auth/register', (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) return res.json({ success: false, message: '用户名或密码缺失' });
	const users = usersCsvReadAll();
	if (users.find(u => u.username === username)) {
		return res.json({ success: false, message: '用户已存在' });
	}
	usersCsvAppend({ username, password, created_at: new Date().toISOString() });
	ensureUserDirs(username);
	return res.json({ success: true, message: '注册成功' });
});

app.post('/api/auth/login', (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) return res.json({ success: false, message: '用户名或密码缺失' });
	const users = usersCsvReadAll();
	const user = users.find(u => u.username === username && u.password === password);
	if (!user) return res.json({ success: false, message: '用户名或密码错误' });
	const token = createToken();
	sessionStore.set(token, { username });
	res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
	return res.json({ success: true, message: '登录成功', user: { username } });
});

app.post('/api/auth/logout', (req, res) => {
	const token = req.cookies && req.cookies.token;
	if (token) sessionStore.delete(token);
	res.clearCookie('token');
	return res.json({ success: true });
});

app.get('/api/auth/profile', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.json({ success: false, message: '未登录' });
	const { userDir } = ensureUserDirs(username);
	return res.json({ success: true, profile: { username, created_at: new Date().toISOString(), user_folder: userDir } });
});

// ============ Chat History APIs ============
app.get('/api/chat-history/list', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.json({ success: false, message: '未登录' });
	const chats = listSessions(username);
	return res.json({ success: true, chats });
});

app.post('/api/chat-history/create', (req, res) => {
	const username = getUserFromReq(req);
	const title = (req.body && req.body.title) || '新对话';
	const chat_id = uuidv4();
	const now = new Date().toISOString();
	if (username) {
		const sessionObj = { id: chat_id, title, created_at: now, updated_at: now, messages: [] };
		saveSession(username, sessionObj);
		return res.json({ success: true, chat_id, message: '新对话已创建' });
	} else {
		// 访客模式：不持久化，但返回一个会话ID
		return res.json({ success: true, chat_id, message: '当前为访客模式，对话不会保存（未登录）' });
	}
});

app.get('/api/chat-history/get/:id', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.status(401).json({ success: false, message: '未登录' });
	const sess = loadSession(username, req.params.id);
	if (!sess) return res.status(404).json({ success: false, message: '会话不存在' });
	return res.json({ success: true, messages: sess.messages || [] });
});

app.post('/api/chat-history/update-title', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.status(401).json({ success: false, message: '未登录' });
	const { chat_id, title } = req.body || {};
	const sess = loadSession(username, chat_id);
	if (!sess) return res.status(404).json({ success: false, message: '会话不存在' });
	sess.title = title || sess.title;
	sess.updated_at = new Date().toISOString();
	saveSession(username, sess);
	return res.json({ success: true });
});

app.delete('/api/chat-history/delete/:id', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.status(401).json({ success: false, message: '未登录' });
	const file = getSessionFile(username, req.params.id);
	if (fs.existsSync(file)) fs.unlinkSync(file);
	return res.json({ success: true });
});

app.get('/api/chat-history/export/:id', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.status(401).json({ success: false, message: '未登录' });
	const sess = loadSession(username, req.params.id);
	if (!sess) return res.status(404).json({ success: false, message: '会话不存在' });
	const buf = Buffer.from(JSON.stringify(sess, null, 2), 'utf8');
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Disposition', `attachment; filename="chat_${req.params.id}.json"`);
	return res.send(buf);
});

app.get('/api/chat/export', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.status(401).json({ success: false, message: '未登录' });
	const sessions = listSessions(username).map(item => loadSession(username, item.chat_id)).filter(Boolean);
	const buf = Buffer.from(JSON.stringify(sessions, null, 2), 'utf8');
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Disposition', `attachment; filename="chat_history_${new Date().toISOString().slice(0,10)}.json"`);
	return res.send(buf);
});

app.delete('/api/chat/sessions', (req, res) => {
	const username = getUserFromReq(req);
	if (!username) return res.status(401).json({ success: false, message: '未登录' });
	const { chatDir } = ensureUserDirs(username);
	if (fs.existsSync(chatDir)) {
		for (const file of fs.readdirSync(chatDir)) {
			if (file.endsWith('.json')) fs.unlinkSync(path.join(chatDir, file));
		}
	}
	return res.json({ success: true });
});

app.post('/api/chat-history/save-message', (req, res) => {
	const username = getUserFromReq(req);
	// 即使未登录也返回OK，前端会静默错误
	const { session_id, message } = req.body || {};
	if (!username || !session_id || !message) return res.json({ success: true });
	const sess = loadSession(username, session_id) || { id: session_id, title: '新对话', created_at: new Date().toISOString(), messages: [] };
	const msg = { ...message };
	if (!msg.timestamp) msg.timestamp = new Date().toISOString();
	sess.messages = sess.messages || [];
	sess.messages.push(msg);
	sess.updated_at = new Date().toISOString();
	saveSession(username, sess);
	return res.json({ success: true });
});

// ============ Expert Personas & TTS & Share ============
app.get('/api/expert-analysis/get-personas', (req, res) => {
	return res.json({ success: true, personas: EXPERT_PERSONAS });
});

app.post('/api/expert-analysis/add-persona', express.json(), (req, res) => {
	try {
		const { name = '', description = '', prompt = '' } = req.body || {};
		if (!name.trim() || !description.trim() || !prompt.trim()) {
			return res.json({ success: false, message: 'name/description/prompt 不能为空' });
		}
		const key = `custom_${Object.keys(EXPERT_PERSONAS).length}`;
		EXPERT_PERSONAS[key] = { name: name.trim(), description: description.trim(), prompt: prompt.trim() };
		return res.json({ success: true, message: '自定义角色添加成功', key });
	} catch (e) {
		return res.json({ success: false, message: `添加角色失败：${e.message}` });
	}
});

app.post('/api/tts', (req, res) => {
	// Placeholder: indicate backend TTS not configured; front-end will fallback to browser TTS
	return res.json({ success: false, message: 'TTS未配置，使用浏览器语音合成' });
});

app.post('/api/share/download', express.json({ limit: '1mb' }), (req, res) => {
	// Return a simple 1x1 transparent PNG as placeholder
	const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAnEB9i3m8gQAAAAASUVORK5CYII=';
	const buf = Buffer.from(base64PNG, 'base64');
	res.setHeader('Content-Type', 'image/png');
	res.setHeader('Content-Disposition', `attachment; filename="share_${Date.now()}.png"`);
	return res.send(buf);
});

// ============ Analysis Endpoints (placeholders with streaming) ============
function writeSSE(res, obj) {
	res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

async function httpSearch(query) {
	try {
		const resp = await axios.get(SEARCH_API_URL, { params: { q: query, format: 'json' }, timeout: 30000 });
		const data = resp.data || {};
		// Normalize fields to align with Python expectations
		if (data && Array.isArray(data.results)) {
			data.results = data.results.map((r, idx) => {
				const title = r.title || r.name || r.url || `结果${idx + 1}`;
				const snippet = r.snippet || r.description || r.content || '';
				return { ...r, title, snippet };
			});
		}
		return data;
	} catch (e) {
		return { error: e.message };
	}
}

async function streamAIWithThinking({ res, prompt, systemPrompt, model, step }) {
	let inThink = false;
	let thinkBuf = '';
	for await (const ev of aiService.streamChat({ prompt, systemPrompt, model })) {
		if (!ev || ev.type !== 'content' || !ev.content) continue;
		let chunk = String(ev.content);

		if (inThink) {
			thinkBuf += chunk;
			const endIdx = thinkBuf.indexOf('</think>');
			if (endIdx !== -1) {
				const thought = thinkBuf.slice(0, endIdx);
				writeSSE(res, { type: 'thinking', ...(step ? { step } : {}), content: thought });
				const rest = thinkBuf.slice(endIdx + 8);
				inThink = false; thinkBuf = '';
				if (rest) writeSSE(res, { type: 'content', ...(step ? { step } : {}), content: rest });
			} else {
				writeSSE(res, { type: 'thinking', ...(step ? { step } : {}), content: thinkBuf });
			}
			continue;
		}

		const startIdx = chunk.indexOf('<think>');
		if (startIdx !== -1) {
			const before = chunk.slice(0, startIdx);
			if (before) writeSSE(res, { type: 'content', ...(step ? { step } : {}), content: before });
			const afterStart = chunk.slice(startIdx + 7);
			const endIdx2 = afterStart.indexOf('</think>');
			if (endIdx2 !== -1) {
				const thought = afterStart.slice(0, endIdx2);
				writeSSE(res, { type: 'thinking', ...(step ? { step } : {}), content: thought });
				const rest = afterStart.slice(endIdx2 + 8);
				if (rest) writeSSE(res, { type: 'content', ...(step ? { step } : {}), content: rest });
			} else {
				inThink = true;
				thinkBuf = afterStart;
				writeSSE(res, { type: 'thinking', ...(step ? { step } : {}), content: thinkBuf });
			}
		} else {
			writeSSE(res, { type: 'content', ...(step ? { step } : {}), content: chunk });
		}
	}
}

// Common handler to start an analysis (multipart form)
function handleStartAnalysis(feature) {
	return [
		upload.any(),
		async (req, res) => {
			try {
				const fields = req.body || {};
				const content_type = fields.content_type || 'text';
				const content_data = fields.content_data || '';
				const personaKey = (fields.persona || '').trim() || null;
				const model = fields.model || 'GLM-4-Flash';
				const summary_mode = parseBool(fields.summary_mode, false);

				const session_id = uuidv4();

				res.setHeader('Content-Type', 'text/plain; charset=utf-8');
				res.setHeader('Transfer-Encoding', 'chunked');

				writeSSE(res, { type: 'session_id', session_id });
				writeSSE(res, { type: 'status', message: '正在解析内容...' });

				let extracted_content = '';
				let content_info = {};

				if (content_type === 'url') {
					const urls = String(content_data || '')
						.split(/\n/)
						.map(s => s.trim())
						.filter(Boolean);
					const results = await extractTextFromMultipleUrls(urls);
					for (const r of results) {
						if (r.success) {
							extracted_content += `\n\n=== ${r.title || '未命名'} ===\n${r.content || ''}`;
							content_info[r.url] = { title: r.title, word_count: r.word_count };
						} else {
							extracted_content += `\n\n错误：无法提取 ${r.url} 的内容：${r.error}`;
						}
					}
				} else if (content_type === 'text') {
					extracted_content = String(content_data || '');
					content_info = { type: 'text', word_count: extracted_content.split(/\s+/).filter(Boolean).length };
				} else if (content_type === 'file') {
					// Accept common field names and any non-image files
					const files = (req.files || []).filter(f => (f.fieldname === 'files' || f.fieldname === 'file' || !(String(f.mimetype || '').toLowerCase().startsWith('image/'))));
					extracted_content = await extractTextFromFiles(files);
				} else if (content_type === 'image') {
					// OCR pipeline using tesseract.js
					const images = (req.files || []).filter(f => f.fieldname === 'images' || (f.mimetype || '').toLowerCase().startsWith('image/'));
					if (!images.length) {
						writeSSE(res, { type: 'error', message: '未检测到上传的图片' });
						writeSSE(res, { type: 'done' });
						return res.end();
					}
					writeSSE(res, { type: 'status', message: '正在进行OCR识别...' });
					try {
						extracted_content = await ocrService.extractTextFromImages(images);
						content_info = { type: 'image', count: images.length };
					} catch (e) {
						writeSSE(res, { type: 'error', message: `图片OCR失败：${e.message}` });
						writeSSE(res, { type: 'done' });
						return res.end();
					}
				} else {
					extracted_content = String(content_data || '');
				}

				if (!extracted_content || !extracted_content.trim()) {
					const message = '没有提取到任何内容。可能的原因：页面需要登录/动态加载、存在防爬虫或网络异常。建议尝试复制文本直接分析。';
					writeSSE(res, { type: 'error', message });
					writeSSE(res, { type: 'done' });
					return res.end();
				}

				const word_count = extracted_content.split(/\s+/).filter(Boolean).length;
				const char_count = extracted_content.length;
				const preview = extracted_content.length > 300 ? extracted_content.slice(0, 300) + '...' : extracted_content;

				writeSSE(res, {
					type: 'content_parsed',
					result: {
						content_type,
						word_count,
						char_count,
						content_preview: preview,
						full_content: extracted_content,
						content_info
					}
				});

				// Send persona info when applicable
				if (personaKey && EXPERT_PERSONAS[personaKey]) {
					const p = EXPERT_PERSONAS[personaKey];
					writeSSE(res, { type: 'persona', name: p.name, description: p.description });
				} else if (feature === 'expert-analysis' && personaKey) {
					// Fallback to name-only if unknown key provided
					writeSSE(res, { type: 'expert_name', name: personaKey });
				}

				// Optional: summary mode for intelligent-reading
				if (feature === 'intelligent-reading' && summary_mode) {
					writeSSE(res, { type: 'status', message: '正在生成内容总结...' });
					const truncated = extracted_content.length > 6000;
					const base = truncated ? extracted_content.slice(0, 6000) : extracted_content;
					const summary_prompt = (
						'请根据提供的内容生成结构化总结，包含：\n' +
						'1. 核心观点\n' +
						'2. 关键要点（使用条目）\n' +
						'3. 建议的关注方向或思考问题\n\n' +
						'要求：\n' +
						'- 使用中文作答\n' +
						'- 语言精炼、逻辑清楚\n' +
						'- 保留原文中的关键信息\n\n' +
						`内容如下：\n${base}`
					);
					let summaryText = '';
					try { summaryText = await aiService.simple_chat_complete(summary_prompt, undefined, model); } catch (e) { summaryText = ''; }
					let summary = `## ✨ 摘要模式\n\n${summaryText.trim() || '暂未生成有效总结。'}`;
					if (truncated) summary += `\n\n> 注：内容较长，已截取部分进行总结。`;
					if (personaKey && EXPERT_PERSONAS[personaKey]) {
						const p = EXPERT_PERSONAS[personaKey];
						summary += `\n\n🎭 当前角色：${p.name}（${p.description}）`;
					}
					writeSSE(res, { type: 'content', content: summary });
				}

				// Branch into multi-step flows when needed
						if (feature === 'comprehensive-analysis') {
							// Step 1: 概要
							writeSSE(res, { type: 'step_start', step: 1, name: '文章概要', description: '提取文章大意和核心信息' });
							const overview_prompt = `我是一个专业的内容分析助手。请对以下内容进行全面的概要分析。\n\n**待分析内容：**\n${extracted_content}\n\n**分析任务：**\n请对上述内容进行全面的概要分析，包括：\n\n## 📋 文章概要分析\n\n### 🎯 主要主题\n- 明确识别文章的核心主题\n- 分析主题的重要性和相关性\n\n### 💡 核心观点\n- 提取文章的核心观点和主要论述\n- 分析观点的逻辑性和说服力\n\n### 📊 主要论述内容\n- **主要论点**：系统梳理文章的主要论点\n- **论述逻辑**：分析论述的逻辑关系和结构\n- **支撑证据**：识别用于支撑论点的证据和案例\n\n### 🔍 关键信息点\n- **重要事实和数据**：提取重要的事实、数据、统计信息\n- **关键术语和概念**：识别并解释关键术语和概念\n- **重要人物和机构**：识别文中提到的重要人物和机构\n\n### 📖 文章结构\n- 分析文章的组织结构和段落安排\n- 评估结构的合理性和逻辑性\n\n请使用清晰的markdown格式，确保分析全面而深入。\n\n<think>\n我需要仔细阅读这篇内容，从多个维度进行概要分析，包括主题、观点、论述、信息点和结构等方面。\n</think>`;
							let overview_acc = '';
							await streamAIWithThinking({ res, prompt: overview_prompt, model });
							// Overview content was streamed; we still need it as context for the next steps, so compute a compact version
							try { overview_acc = await aiService.complex_chat_complete(overview_prompt, undefined, model); } catch { overview_acc = ''; }
							writeSSE(res, { type: 'step_complete', step: 1 });

							// Step 2: 搜索关键词
							writeSSE(res, { type: 'step_start', step: 2, name: '搜索结果', description: '搜索相关资料和信息' });
							writeSSE(res, { type: 'thinking', step: 2, content: '正在基于文章内容提取搜索关键词...' });
							const keyword_prompt = `基于以下概要分析结果：\n${overview_acc}\n\n以及原文内容：\n${extracted_content}\n\n请提取3-5个最重要的搜索关键词，用于搜索相关资料和信息。\n关键词应该是：\n1. 文章的核心主题\n2. 重要的概念或术语\n3. 可能需要进一步了解的话题\n4. 相关的人物、机构或事件\n\n请直接输出关键词，每行一个，不要其他格式和解释。`;
							let keywords_text = '';
							try { keywords_text = await aiService.simple_chat_complete(keyword_prompt, undefined, model); } catch (e) { keywords_text = ''; }
							let keywords = (keywords_text || '').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#') && !s.startsWith('*')).slice(0, 5);
							if (!keywords.length) keywords = ['要点', '主题', '背景'];
							let kwDisplay = '## 🎯 提取的搜索关键词\n\n';
							keywords.forEach((kw, i) => { kwDisplay += `- ${i + 1}. ${kw}\n`; });
							kwDisplay += '\n正在基于这些关键词搜索相关资料...\n\n';
							writeSSE(res, { type: 'content', step: 2, content: kwDisplay });

							const search_results = [];
							const search_results_data = [];
							for (const kw of keywords) {
								const data = await httpSearch(kw);
								if (data && Array.isArray(data.results) && data.results.length) {
									const top = data.results.slice(0, 5).map((r, idx) => ({ ...r, position: idx + 1, keyword: kw }));
									search_results.push({ keyword: kw, results: top });
									search_results_data.push(...top);
									let block = `### 🔎 关键词：${kw}\n`;
									for (const r of top) {
										block += `- [${r.title || r.url}](${r.url})\n`;
									}
									block += '\n';
									writeSSE(res, { type: 'content', step: 2, content: block });
								} else {
									writeSSE(res, { type: 'content', step: 2, content: `未找到与“${kw}”相关的搜索结果。\n` });
								}
							}

							let summary2 = `\n\n## 📊 搜索结果总结\n\n- 成功搜索关键词: ${search_results.length}/${keywords.length}\n- 总共获取到 ${search_results_data.length} 条相关信息\n`;
							if (search_results.length) summary2 += `- 覆盖的关键词：${search_results.map(x => x.keyword).join('、')}\n`;
							writeSSE(res, { type: 'content', step: 2, content: summary2 });
							writeSSE(res, { type: 'step_complete', step: 2 });

							// Step 3: 深入思考
							writeSSE(res, { type: 'step_start', step: 3, name: '深入思考', description: '结合搜索结果深入分析文章' });
							let search_context = '';
							if (search_results_data.length) {
								search_context = search_results_data.slice(0, 20).map((r, i) => `(${i + 1}) ${r.title || ''} - ${r.url}\n${r.snippet || ''}`).join('\n\n');
							}
							const deep_prompt = `基于前面的概要分析：\n${overview_acc}\n\n结合搜索结果：\n${search_context}\n\n请对原文进行深入思考和分析：\n\n原文：\n${extracted_content}\n\n**分析任务：**\n请结合搜索到的相关信息，对文章进行深度分析：\n\n## 🔬 深度分析\n\n### 💎 内容价值评估\n- **学术价值**：评估内容的学术意义和理论贡献\n- **实用价值**：分析内容的实际应用价值和指导意义\n- **社会影响**：评估内容可能产生的社会影响和意义\n- **创新性**：分析内容的创新点和独特之处\n\n### 🎭 观点深度解读\n- **观点层次**：分析观点的深度和复杂性\n- **论证质量**：评估论证的严密性和说服力\n- **偏见识别**：识别可能存在的偏见或局限性\n- **多角度视角**：从不同角度解读核心观点\n\n### 🔗 逻辑关系分析\n- **论证结构**：分析论证的逻辑结构和推理过程\n- **因果关系**：识别内容中的因果关系链\n- **矛盾冲突**：发现可能存在的逻辑矛盾或冲突\n- **论证缺陷**：指出论证中的薄弱环节\n\n### 🌍 背景和上下文\n- **历史背景**：分析内容的历史背景和发展脉络\n- **社会环境**：考虑内容产生的社会环境和条件\n- **相关研究**：结合搜索结果分析相关研究和观点\n- **时代意义**：评估内容在当前时代的意义和价值\n\n### 🤔 批判性思考\n- **质疑与反思**：对内容进行批判性质疑和反思\n- **替代观点**：提出可能的替代观点或解释\n- **改进建议**：提出内容可以改进的方面\n- **未来展望**：分析内容的发展趋势和未来可能性\n\n请进行深入而全面的分析，使用清晰的markdown格式。\n\n<think>\n我需要结合概要分析和搜索结果，对原始内容进行深入的批判性分析，从多个维度评估其价值、观点、逻辑和意义。\n</think>`;
							await streamAIWithThinking({ res, prompt: deep_prompt, model, step: 3 });
							writeSSE(res, { type: 'step_complete', step: 3 });

							// Step 4: 总结归纳
							writeSSE(res, { type: 'step_start', step: 4, name: '总结归纳', description: '综合所有分析生成最终报告' });
							const final_prompt = `基于前面的分析，请生成最终的综合总结报告。\n\n概要分析摘要：\n${overview_acc.slice(0, 500)}\n\n搜索结果摘要：\n${search_context.slice(0, 300)}\n\n请生成：\n\n## 📊 最终分析总结\n\n### 🎯 核心发现\n总结最重要的发现和洞察\n\n### 💎 关键价值点\n- 理论价值\n- 实践价值\n- 启发价值\n\n### 📋 综合评价\n- 优点分析\n- 不足之处\n- 整体评估\n\n### 💡 实用建议\n为读者提供实用的建议和启示\n\n### 🔮 延伸思考\n提出值得进一步探索的问题和方向\n\n<think>\n我需要基于前面的分析，生成一个完整而有价值的最终总结报告。\n</think>`;
							await streamAIWithThinking({ res, prompt: final_prompt, model, step: 4 });
							writeSSE(res, { type: 'step_complete', step: 4 });
							writeSSE(res, { type: 'analysis_complete' });
							writeSSE(res, { type: 'done' });
							return res.end();
						}

						if (feature === 'fact-checking') {
							// Step 1: 文章解析
							writeSSE(res, { type: 'step_start', step: 1, name: '文章解析', description: '分析文章内容和结构' });
							const parsing_prompt = `我是一个专业的事实核查分析助手。我已经接收到了需要进行真伪鉴定的内容，现在开始进行结构化解析。\n\n**待分析内容：**\n${extracted_content}\n\n**分析任务：**\n请对上述内容进行结构化解析，重点识别需要验证的事实信息：\n\n## 1. 文章主要声明和观点\n- 识别文章中的主要论断\n- 提取作者的核心观点\n\n## 2. 具体的事实陈述\n- 列出文章中的具体事实声明\n- 识别可能存在争议的陈述\n\n## 3. 数据、时间、地点等关键信息\n- 提取具体的数字、日期、地点\n- 识别统计数据和量化信息\n\n## 4. 引用的资料或来源\n- 找出文章引用的资料和来源\n- 分析引用的可信度\n\n## 5. 作者的推论和结论\n- 区分事实和推论\n- 识别逻辑推理过程\n\n请直接开始分析，不要询问或说明缺少内容。\n\n<think>我已经收到了完整的内容，现在开始进行详细的事实分析。我需要仔细识别出其中的事实陈述、观点和可能需要验证的信息，专注于找出可能存在争议或需要核实的具体内容。</think>`;
							let parsed_acc = '';
							await streamAIWithThinking({ res, prompt: parsing_prompt, model, step: 1 });
							try { parsed_acc = await aiService.simple_chat_complete(parsing_prompt, undefined, model); } catch { parsed_acc = ''; }
							writeSSE(res, { type: 'step_complete', step: 1 });

							// Step 2: 关键词提取与搜索（严格对齐 Python 提示与展示）
							writeSSE(res, { type: 'step_start', step: 2, name: '搜索结果', description: '提取关键信息并搜索验证资料' });
							const keyword_prompt2 = `基于文章解析结果：\n${parsed_acc}\n\n原文：\n${extracted_content}\n\n请提取需要事实核查的关键词，用于搜索验证。要求：\n- 提取5个最重要的关键词或短语\n- 选择具体的、可验证的信息点\n- 包括人名、地名、机构名、重要事件等\n\n请只返回关键词，每行一个，不要其他解释。例如：\n福岛核污染水\n东京电力公司\nIAEA报告\n海洋污染`;
							let kws2_text = '';
							try { kws2_text = await aiService.simple_chat_complete(keyword_prompt2, undefined, model); } catch { kws2_text = ''; }
							let keywords2 = (kws2_text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 5);
							if (!keywords2.length) keywords2 = ['事实', '来源', '数据'];
							let kw2Display = '## 🎯 提取的验证关键词\\n\\n';
							keywords2.forEach((kw, i) => { kw2Display += `**${i + 1}.** \`${kw}\`\\n\\n`; });
							kw2Display += '\\n正在基于这些关键词搜索验证资料...\\n\\n';
							writeSSE(res, { type: 'content', step: 2, content: kw2Display });

							const all_scored_results = [];
							for (const kw of keywords2) {
								writeSSE(res, { type: 'thinking', step: 2, content: `正在搜索关键词: ${kw}` });
								const data = await httpSearch(kw);
								if (data && Array.isArray(data.results) && data.results.length) {
									// 附加可信度评分
									const items = data.results.map((r, idx) => ({ ...r, position: idx + 1 }));
									for (const r of items) {
										const cred = credibility_service.calculate_source_credibility(r.url, r.title, r.snippet || r.description);
										r.credibility = cred;
									}

									// 展示对齐 Python 的富文本块
									let result_content = `\\n\\n### 🔍 关键词: ${kw}\\n\\n`;
									const topN = items.slice(0, 3);
									for (let i = 0; i < topN.length; i++) {
										const item = topN[i];
										const title = item.title || '无标题';
										const url = item.url || '';
										const snippet = item.snippet || item.description || '无描述';
										const credibility = item.credibility || {};
										const cred_score = credibility.score || 0;
										const cred_level = credibility.level || '未知';
										const emotion = (credibility.emotion_analysis || {});
										const emotion_risk = emotion.risk_level || '低风险';
										const cred_icon = cred_score < 35 ? '🔴' : (cred_score < 65 ? '🟡' : '🟢');
										const emotion_icon = emotion_risk === '极高风险' || emotion_risk === '高风险' ? '⚠️' : (emotion_risk === '中等风险' ? '⚡' : '✅');

										result_content += `**${i + 1}. ${title}** ${cred_icon} ${emotion_icon}\\n`;
										result_content += `   📊 **可信度**: ${cred_score}/100 (${cred_level})\\n`;
										result_content += `   🧠 **情感分析**: ${emotion_risk}\\n`;
										if (snippet && snippet !== '无描述') result_content += `   📝 ${snippet}\\n`;
										if (url) result_content += `   🔗 [查看来源](${url})\\n`;
										if (Array.isArray(credibility.details) && credibility.details.length) {
											result_content += `   💡 评分依据: ${credibility.details.join(' | ')}\\n`;
										}
										const issues = (emotion.detected_issues || []);
										if (issues.length) result_content += `   ⚠️ 检测到的问题: ${issues.join(' | ')}\\n`;
										result_content += `\\n`;
									}

									// 收集全局用于整体评估
									all_scored_results.push(...items);

									// 该关键词整体可信度
									const overall_kw = credibility_service.calculate_overall_credibility(items);
									result_content += `**该关键词搜索结果整体可信度**: ${overall_kw.overall_score}/100 (${overall_kw.overall_level})\\n`;
									result_content += `*${overall_kw.summary}*\\n\\n`;
									writeSSE(res, { type: 'content', step: 2, content: result_content });
								} else {
									writeSSE(res, { type: 'thinking', step: 2, content: `搜索 ${kw} 失败: ${data && data.error ? data.error : '无相关结果'}` });
								}
							}

							// 全局整体可信度总结
							let summary_content = '';
							if (all_scored_results.length) {
								const overall = credibility_service.calculate_overall_credibility(all_scored_results);
								summary_content = `\\n\\n## 📊 搜索结果与可信度总结\\n\\n` +
									`- ✅ 成功搜索关键词: ${Math.min(keywords2.length, keywords2.length)}/${keywords2.length}\\n` +
									`- 📄 总共获取验证资料: ${all_scored_results.length} 条\\n` +
									`- 🎯 **整体可信度评分**: **${overall.overall_score}/100** (${overall.overall_level})\\n` +
									`- 📈 高可信度来源占比: ${overall.high_credibility_ratio}%\\n\\n` +
									`**可信度分布**: \\n` +
									Object.entries(overall.distribution).filter(([,c]) => c>0).map(([k,v])=>`- ${k}: ${v} 条 (${overall.total_sources?Math.round(v/overall.total_sources*1000)/10:0}%)\\n`).join('') +
									`\\n💬 **评估总结**: ${overall.summary}\\n\\n这些搜索结果和可信度评估将用于下一步的事实验证和真伪鉴定分析。`;
							} else {
								summary_content = `\\n\\n## 📊 搜索结果总结\\n\\n- 成功搜索关键词: 0/${keywords2.length}\\n- ⚠️ 未获取到有效的验证资料，可能影响真伪鉴定的准确性\\n`;
							}
							writeSSE(res, { type: 'content', step: 2, content: summary_content });
							writeSSE(res, { type: 'step_complete', step: 2 });

							// Step 3: 深度分析（对齐 Python 文案与统计指标）
							writeSSE(res, { type: 'step_start', step: 3, name: '深度分析', description: '结合可信度评分进行深度分析' });
							const search_ctx2 = all_scored_results.slice(0, 25).map((r, i) => `(${i + 1}) ${r.title || ''} - ${r.url}\n可信度: ${r.credibility?.score}/100（${r.credibility?.level}）\n${r.snippet || r.description || ''}`).join('\n\n');
							const credScores = all_scored_results.map(r => (r.credibility && typeof r.credibility.score === 'number') ? r.credibility.score : 0);
							const avgCred = credScores.length ? (credScores.reduce((a,b)=>a+b,0)/credScores.length) : 0;
							const minCred = credScores.length ? Math.min(...credScores) : 0;
							const maxCred = credScores.length ? Math.max(...credScores) : 0;
							const highCnt = credScores.filter(s => s >= 65).length;
							const lowCnt = credScores.filter(s => s <= 35).length;
							const analysis_prompt = `基于文章解析和带有可信度评分的搜索结果进行深度分析：\n\n**文章解析：**\n${parsed_acc}\n\n**原文：**\n${extracted_content}\n\n**带可信度评分和情感分析的验证资料：**\n${search_ctx2}\n\n**搜索结果可信度概况：**\n- 平均可信度评分: ${avgCred.toFixed(1)}/100\n- 评分范围: ${minCred}-${maxCred}\n- 高可信度来源(≥65分)数量: ${highCnt}\n- 低可信度来源(≤35分)数量: ${lowCnt}\n\n请结合搜索资料的可信度评分和情感偏见分析对原文进行深度分析：\n\n## 1. 信息对比分析\n- 对比原文声明与不同可信度搜索资料的一致性\n- **重点关注辟谣和澄清信息**：如果搜索结果中包含官方辟谣、澄清声明或否认信息，需要特别重视\n- 重点关注高可信度来源的信息与原文的匹配度\n- 识别低可信度来源可能带来的误导信息\n- **优先级顺序**：官方辟谣 > 权威媒体澄清 > 一般可信来源 > 低可信度来源\n\n## 2. 情感偏见检测分析\n- 分析原文和搜索结果中的情感色彩和偏见倾向\n- 识别可能利用恐慌、愤怒等极端情绪的内容\n- 检测煽动性表达、夸大修辞和未验证声明\n- 评估信息传播中的情感操控风险\n\n## 3. 加权可信度评估\n- 基于来源可信度和情感客观性对验证信息进行加权分析\n- 高可信度且情感客观的来源支持或反驳原文的程度\n- 低可信度或情感极端的来源对判断可能造成的偏差\n\n## 4. 谣言传播模式识别\n- 识别典型的网络谣言传播特征\n- 分析利用社会热点、群体偏见进行传播的手段\n- 检测故意制造对立、引发争议的内容策略\n\n## 5. 风险评估与预警\n- 基于来源可信度和情感分析识别信息传播风险\n- 评估可能引发恐慌、仇恨或极端行为的内容风险\n- 分析对特定群体可能造成的负面影响\n\n## 6. 综合判断建议\n- 结合可信度评分和情感客观性给出更准确的真伪判断建议\n- 基于来源质量和情感风险的信任度建议\n- 针对不同风险等级的处理建议\n\n<think>我需要仔细分析这些带有可信度评分和情感分析的搜索结果，重点关注高可信度且情感客观的来源，同时警惕低可信度或情感极端的来源可能的误导。特别要注意识别利用恐慌、愤怒等情绪进行传播的谣言特征。</think>`;
							await streamAIWithThinking({ res, prompt: analysis_prompt, model, step: 3 });
							writeSSE(res, { type: 'step_complete', step: 3 });

							// Step 4: 综合判定（严格输出固定 JSON 结构）
							writeSSE(res, { type: 'step_start', step: 4, name: '智能真伪鉴定', description: '基于可信度评分进行综合真伪判定' });
							const credStats = {
								total_sources: credScores.length,
								average_score: avgCred,
								high_credibility_count: highCnt,
								medium_credibility_count: credScores.filter(s => s >= 35 && s < 65).length,
								low_credibility_count: lowCnt,
								score_range: `${minCred}-${maxCred}`
							};
							const verification_prompt = `你是一名事实核查首席分析官，需要综合所有已整理的证据，输出结构化的最终结论模块。\n\n=== 原始资料摘要 ===\n- 原文内容：\n${extracted_content}\n\n- 文章解析结果：\n${parsed_acc}\n\n- 提取的验证关键词：\n${kws2_text}\n\n- 带可信度评分与情感分析的验证资料：\n${search_ctx2}\n\n- 深度分析结论：\n(以上第三步输出的要点已在上下文里，不必重复)\n\n- 可信度统计数据：\n${JSON.stringify(credStats, null, 2)}\n\n请只使用上述材料中的信息，不得凭空编造。若证据不足，请据实说明。\n\n=== 输出要求 ===\n1. 必须给出原文信息的可信度数值评分（0-100）及对应等级，并解释原因。\n2. 明确列出支持与反驳原文的关键证据点。\n3. 评估情感风险、谣言传播风险并给出专业建议。\n4. 输出一个 Mermaid 图（graph TD 或 graph LR），展示原文主张与证据之间的支持/反驳关系。\n5. 输出必须为固定 JSON 结构，方便前端渲染。\n\n=== 输出格式（严格遵守） ===\n仅输出单个 JSON 对象，不可出现额外文字、注释或 Markdown，也不要使用 \`\`\` 代码块。JSON 模式及示例如下（示例值仅供参考）：\n\n{\n    "confidenceScore": 58,\n    "confidenceLabel": "存疑",\n    "confidenceLevel": "C级",\n    "confidenceDescription": "高可信度来源分歧较大，整体结论尚存疑点。",\n    "verdictSummary": "综合权威证据，该消息尚无法确认真实性，需进一步核实。",\n    "supportingPoints": [\n        "来自新华社的调研报道指出，相关政策确有试点。",\n        "两家行业协会发布声明支持该说法。"\n    ],\n    "contradictingPoints": [\n        "国务院新闻办发布的辟谣通告明确否认该消息。",\n        "多个高可信度媒体引用官方数据反驳该结论。"\n    ],\n    "analysisHighlights": [\n        {\n            "title": "综合真实性评估",\n            "body": "权威辟谣与官方数据占主导，使整体可信度被显著拉低。"\n        },\n        {\n            "title": "情感偏见影响",\n            "body": "原文大量使用煽动性语句，引导读者产生恐慌与不信任。"\n        }\n    ],\n    "riskAssessment": {\n        "emotionRisk": "高风险",\n        "rumorRisk": "中等风险",\n        "notes": [\n            "原文通过耸动措辞放大恐慌情绪。",\n            "社交平台上出现快速扩散的转发模式。"\n        ]\n    },\n    "recommendations": [\n        "谨慎转发该消息，等待官方进一步说明。",\n        "引用权威机构数据向团队澄清事实。",\n        "跟踪后续调查结果，必要时发布正式说明。"\n    ],\n    "evidence": [\n        {\n            "stance": "contradicting",\n            "title": "国务院新闻办：关于××传言的澄清",\n            "source": "国务院新闻办公室",\n            "credibilityScore": 92,\n            "url": "https://www.gov.cn/example"\n        },\n        {\n            "stance": "supporting",\n            "title": "行业协会：已有试点案例",\n            "source": "中国行业协会",\n            "credibilityScore": 68,\n            "url": "https://www.example.org/report"\n        }\n    ],\n    "mermaidDiagram": "graph TD; SourceA[官方辟谣 92分] -->|否定| Claim; SourceB[行业协会 68分] -->|支持| Claim;",\n    "mermaidDescription": "节点展示主要证据与原文主张之间的支持或反驳关系。"\n}\n\n=== 字段约束 ===\n- confidenceScore：0-100 的整数，依据证据加权结果计算。\n- confidenceLabel：必须为 ["真实","大部分真实","部分真实","存疑","大部分虚假","虚假"] 之一。\n- confidenceLevel：从 ["A级","B级","C级","D级","E级","F级"] 中选择，并与得分区间对应（≥90 A级，80-89 B级，70-79 C级，60-69 D级，50-59 E级，<50 F级）。\n- confidenceDescription：一句话说明评分原因。\n- verdictSummary：2-3 句中文总结整体判断。\n- supportingPoints / contradictingPoints：按证据强度归纳为列表，每项一句话；若没有相应证据，返回空数组。\n- analysisHighlights：至少 1 条，包含 title 与 body 字段，body 为 2-3 句概述。\n- riskAssessment.notes：可为空数组，若存在则每项为一句话。\n- recommendations：至少 1 条行动建议。\n- evidence：若存在证据需列出，credibilityScore 为 0-100 整数，stance 只能是 "supporting"、"contradicting" 或 "neutral"；若确无证据也须返回空数组。\n- mermaidDiagram：必须为合法的 Mermaid 语法（graph TD 或 graph LR），仅使用 ASCII 字符，确保引号配对正确。\n- 若某类信息确实不存在，请返回空数组或空字符串，但字段必须保留。\n\n在输出前请再次校验所有字段满足约束，并确保 JSON 语法完全正确，可直接被 JSON.parse 解析。最终回答只能包含上述 JSON 对象，无其他文本。`;
							await streamAIWithThinking({ res, prompt: verification_prompt, model, step: 4 });
							writeSSE(res, { type: 'step_complete', step: 4 });
							writeSSE(res, { type: 'verification_complete' });
							writeSSE(res, { type: 'done' });
							return res.end();
						}

						// Default final friendly message for simple flows
						const lines = [
							'📖 内容解析完成啦！',
							'',
							'📊 解析统计',
							`- 字符数：${char_count.toLocaleString()} 个`,
							`- 词数：${word_count.toLocaleString()} 个`,
							`- 内容类型：${content_type}`,
							'',
							'💡 快速开始的问题示例：',
							' - "请概括一下主要内容"',
							' - "这篇文章的核心观点是什么？"',
							' - "有哪些重要的细节需要注意？"',
							' - "作者想要表达什么？"',
							'',
							'🌟 想了解什么，尽管告诉我！'
						];
						writeSSE(res, { type: 'content', content: lines.join('\n') });
						writeSSE(res, { type: 'done' });
						return res.end();
			} catch (err) {
				writeSSE(res, { type: 'error', message: `启动分析失败：${err.message}` });
				writeSSE(res, { type: 'done' });
				return res.end();
			}
		}
	];
}

function handleChat(feature) {
	return (req, res) => {
		try {
			const { message, session_id, persona, chat_history = [], model, content_context = '', summary_mode } = req.body || {};
			res.setHeader('Content-Type', 'text/plain; charset=utf-8');
			res.setHeader('Transfer-Encoding', 'chunked');

			writeSSE(res, { type: 'session_id', session_id: session_id || uuidv4() });
			if (feature === 'expert-analysis' && persona) {
				if (EXPERT_PERSONAS[persona]) {
					const p = EXPERT_PERSONAS[persona];
					writeSSE(res, { type: 'persona', name: p.name, description: p.description });
				} else {
					writeSSE(res, { type: 'expert_name', name: persona });
				}
			}

			// Build system prompt based on feature/persona and optional content context
			let systemSections = [];
			if (feature === 'expert-analysis') {
				if (persona && EXPERT_PERSONAS[persona]) {
					const p = EXPERT_PERSONAS[persona];
					if (p.prompt) {
						systemSections.push(`角色设定：\n${p.prompt}`);
					} else {
						systemSections.push(`你将以“${p.name}：${p.description}”的风格回答，语言清晰、结构化，给出专业建议。`);
					}
				} else if (persona) {
					systemSections.push(`你将以“${persona}”的风格回答，语言清晰、结构化，给出专业建议。`);
				} else {
					systemSections.push('你是一位专家顾问，请清晰、结构化地回答用户问题。');
				}
			} else if (feature === 'fact-checking') {
				systemSections.push('你是一名事实核查助手，请客观中立，提供可验证的信息与建议。');
			} else if (feature === 'comprehensive-analysis') {
				systemSections.push('你是一名深度分析助手，给出有条理的结构化分析与要点。');
			} else if (feature === 'intelligent-reading') {
				systemSections.push('你是智能伴读助手，回答简洁、有条理，并突出要点。');
			}

			if (content_context) {
				let contextPrompt = (
					'你正在帮助用户理解和分析以下内容：\n\n' +
					`${content_context}\n\n` +
					'请遵循以下要求：\n' +
					'1. 基于上述内容回答用户的问题\n' +
					'2. 如果问题超出内容范围，请温和引导回到文本\n' +
					'3. 提供准确、有用的分析\n' +
					'4. 保持耐心、友好和专业的态度\n' +
					'5. 可以引用具体段落或要点支持回答'
				);
				if (summary_mode === true || String(summary_mode).toLowerCase() === 'true') {
					contextPrompt += '\n6. 简明扼要地概括关键要点（用户启用了摘要模式）';
				}
				systemSections.push(contextPrompt);
			}

			const systemPrompt = systemSections.length ? systemSections.join('\n\n') : null;

			const messages = [];
			if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
			if (Array.isArray(chat_history)) {
				for (const m of chat_history) {
					if (m && m.role && m.content) messages.push({ role: m.role, content: m.content });
				}
			}
			messages.push({ role: 'user', content: String(message || '') });

			(async () => {
				try {
					// Stream tokens and split <think>...</think> to 'thinking' events
					let inThink = false;
					let thinkBuf = '';
					for await (const ev of aiService.streamChat({ messages, model })) {
						if (!ev || ev.type !== 'content' || !ev.content) continue;
						let chunk = String(ev.content);

						// If we are currently inside <think>, accumulate until closing tag
						if (inThink) {
							thinkBuf += chunk;
							const endIdx = thinkBuf.indexOf('</think>');
							if (endIdx !== -1) {
								const thought = thinkBuf.slice(0, endIdx);
								writeSSE(res, { type: 'thinking', content: thought });
								const rest = thinkBuf.slice(endIdx + 8); // after </think>
								inThink = false;
								thinkBuf = '';
								if (rest) writeSSE(res, { type: 'content', content: rest });
							} else {
								// partial thinking
								writeSSE(res, { type: 'thinking', content: thinkBuf });
							}
							continue;
						}

						// Not in think: look for <think>
						const startIdx = chunk.indexOf('<think>');
						if (startIdx !== -1) {
							const before = chunk.slice(0, startIdx);
							if (before) writeSSE(res, { type: 'content', content: before });
							const afterStart = chunk.slice(startIdx + 7);
							const endIdx2 = afterStart.indexOf('</think>');
							if (endIdx2 !== -1) {
								// Open and close in same chunk
								const thought = afterStart.slice(0, endIdx2);
								writeSSE(res, { type: 'thinking', content: thought });
								const rest = afterStart.slice(endIdx2 + 8);
								if (rest) writeSSE(res, { type: 'content', content: rest });
							} else {
								// Opened thinking, not closed yet
								inThink = true;
								thinkBuf = afterStart;
								writeSSE(res, { type: 'thinking', content: thinkBuf });
							}
						} else {
							// No think tags, regular content
							writeSSE(res, { type: 'content', content: chunk });
						}
					}
					writeSSE(res, { type: 'done' });
					res.end();
				} catch (e) {
					writeSSE(res, { type: 'error', message: `聊天失败：${e.message}` });
					writeSSE(res, { type: 'done' });
					res.end();
				}
			})();
			return;
		} catch (err) {
			writeSSE(res, { type: 'error', message: `聊天失败：${err.message}` });
			writeSSE(res, { type: 'done' });
			return res.end();
		}
	};
}

// Intelligent Reading
app.post('/api/intelligent-reading/start', ...handleStartAnalysis('intelligent-reading'));
app.post('/api/intelligent-reading/chat', express.json(), handleChat('intelligent-reading'));

// Comprehensive Analysis
app.post('/api/comprehensive-analysis/start', ...handleStartAnalysis('comprehensive-analysis'));
app.post('/api/comprehensive-analysis/chat', express.json(), handleChat('comprehensive-analysis'));

// Expert Analysis
app.post('/api/expert-analysis/start', ...handleStartAnalysis('expert-analysis'));
app.post('/api/expert-analysis/chat', express.json(), handleChat('expert-analysis'));

// Fact Checking
app.post('/api/fact-checking/start', ...handleStartAnalysis('fact-checking'));
app.post('/api/fact-checking/chat', express.json(), handleChat('fact-checking'));

// -------------- Start server --------------
const os = require('os');
const HOST = process.env.HOST || '0.0.0.0';
let TLS_KEY_PATH = process.env.TLS_KEY_PATH;
let TLS_CERT_PATH = process.env.TLS_CERT_PATH;

function compgen(globPattern) {
	// Minimal glob helper: returns array of matches or empty array
	const dir = path.dirname(globPattern);
	const base = path.basename(globPattern);
	if (!fs.existsSync(dir)) return [];
	const regex = new RegExp('^' + base.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
	return fs.readdirSync(dir).filter(f => regex.test(f)).map(f => path.join(dir, f));
}

function pickTlsPairInDir(dir) {
	try {
		if (!fs.existsSync(dir)) return null;
		// Priority 0: specific wisdomlink files
		if (fs.existsSync(path.join(dir, 'wisdomlink.asia_key.key')) && fs.existsSync(path.join(dir, 'wisdomlink.asia.pem'))) {
			return { key: path.join(dir, 'wisdomlink.asia_key.key'), cert: path.join(dir, 'wisdomlink.asia.pem') };
		}
		// Priority 1: privkey*.pem + fullchain*.pem
		const privs = compgen(path.join(dir, 'privkey*.pem'));
		const fulls = compgen(path.join(dir, 'fullchain*.pem'));
		if (privs.length && fulls.length) return { key: privs[0], cert: fulls[0] };
		// Priority 2: server.key + server.crt
		if (fs.existsSync(path.join(dir, 'server.key')) && fs.existsSync(path.join(dir, 'server.crt'))) {
			return { key: path.join(dir, 'server.key'), cert: path.join(dir, 'server.crt') };
		}
		// Priority 3: key.pem + cert.pem
		if (fs.existsSync(path.join(dir, 'key.pem')) && fs.existsSync(path.join(dir, 'cert.pem'))) {
			return { key: path.join(dir, 'key.pem'), cert: path.join(dir, 'cert.pem') };
		}
		// Priority 4: any *.key with same basename *.crt or *.pem
		const keys = compgen(path.join(dir, '*.key'));
		for (const k of keys) {
			const base = k.slice(0, -4);
			if (fs.existsSync(base + '.crt')) return { key: k, cert: base + '.crt' };
			if (fs.existsSync(base + '.pem')) return { key: k, cert: base + '.pem' };
		}
		// Priority 5: heuristic pairing if basenames differ
		const keyCandidates = [
			...compgen(path.join(dir, '*.key')),
			...compgen(path.join(dir, 'privkey*.pem')),
			...(fs.existsSync(path.join(dir, 'key.pem')) ? [path.join(dir, 'key.pem')] : [])
		];
		const certCandidates = [
			...compgen(path.join(dir, '*.crt')),
			...compgen(path.join(dir, 'fullchain*.pem')),
			...compgen(path.join(dir, 'cert*.pem'))
		];
		if (keyCandidates.length && certCandidates.length) {
			return { key: keyCandidates[0], cert: certCandidates[0] };
		}
	} catch {}
	return null;
}

function autoDetectTlsPair() {
	// -1) Explicit directory via env TLS_CERT_DIR (highest priority)
	try {
		const certDir = (process.env.TLS_CERT_DIR || '').trim();
		if (certDir && fs.existsSync(certDir)) {
			const p = pickTlsPairInDir(certDir);
			if (p) return p;
		}
	} catch {}

	// 0) repo-level certs: <repo>/certs or <repo>/backend/certs
	try {
			const repoCertDirs = [
				path.join(ROOT_DIR, 'ssh'),
				path.join(__dirname, 'ssh'),
				path.join(ROOT_DIR, 'certs'),
				path.join(__dirname, 'certs')
			];
		for (const d of repoCertDirs) {
			const p = pickTlsPairInDir(d);
			if (p) return p;
		}
	} catch {}

	// 1) ~/.ssh
	const home = os.homedir();
	const sshDir = path.join(home, '.ssh');
	let pair = pickTlsPairInDir(sshDir);
	if (pair) return pair;
	// 2) /etc/letsencrypt/live/<first>
	const leRoot = path.join(path.sep, 'etc', 'letsencrypt', 'live');
	if (process.platform !== 'win32' && fs.existsSync(leRoot)) {
		try {
			const prefer = (process.env.TLS_DOMAIN || '').trim();
			if (prefer && fs.existsSync(path.join(leRoot, prefer, 'privkey.pem')) && fs.existsSync(path.join(leRoot, prefer, 'fullchain.pem'))) {
				return { key: path.join(leRoot, prefer, 'privkey.pem'), cert: path.join(leRoot, prefer, 'fullchain.pem') };
			}
			const subs = fs.readdirSync(leRoot).filter(name => fs.existsSync(path.join(leRoot, name, 'privkey.pem')) && fs.existsSync(path.join(leRoot, name, 'fullchain.pem')));
			if (subs.length) return { key: path.join(leRoot, subs[0], 'privkey.pem'), cert: path.join(leRoot, subs[0], 'fullchain.pem') };
		} catch {}
	}
	return null;
}

try {
	// Auto-detect if env not provided
	if (!(TLS_KEY_PATH && TLS_CERT_PATH)) {
		const pair = autoDetectTlsPair();
		if (pair) {
			TLS_KEY_PATH = pair.key;
			TLS_CERT_PATH = pair.cert;
			process.env.TLS_KEY_PATH = TLS_KEY_PATH;
			process.env.TLS_CERT_PATH = TLS_CERT_PATH;
			console.log(`[TLS] Auto-detected certificates -> key=${TLS_KEY_PATH}, cert=${TLS_CERT_PATH}`);
		}
	}

	if (TLS_KEY_PATH && TLS_CERT_PATH && fs.existsSync(TLS_KEY_PATH) && fs.existsSync(TLS_CERT_PATH)) {
		const https = require('https');
		const options = {
			key: fs.readFileSync(TLS_KEY_PATH),
			cert: fs.readFileSync(TLS_CERT_PATH)
		};
		const server = https.createServer(options, app);
		server.listen(PORT, HOST, () => {
			const aiOk = aiService.hasAIConfig();
			console.log(`Node backend running at https://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
			console.log(`TLS enabled using key=${TLS_KEY_PATH}, cert=${TLS_CERT_PATH}`);
			console.log(`AI configured: ${aiOk ? 'YES' : 'NO'}${aiOk ? '' : ' (将从backend/config.py自动读取或请设置AI_API_KEY)'}`);
		});
	} else {
		app.listen(PORT, HOST, () => {
			const aiOk = aiService.hasAIConfig();
			console.log(`Node backend running at http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
			if (TLS_KEY_PATH || TLS_CERT_PATH) {
				console.log('TLS not enabled: key/cert path not found or incomplete. Using HTTP.');
			}
			console.log(`AI configured: ${aiOk ? 'YES' : 'NO'}${aiOk ? '' : ' (将从backend/config.py自动读取或请设置AI_API_KEY)'}`);
		});
	}
} catch (err) {
	console.error('Failed to start server:', err);
	process.exit(1);
}
