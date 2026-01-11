// AI service wrapper for OpenAI-compatible chat completions with streaming
// Reads configuration from environment variables:
// - AI_BASE_URL (default: https://api.openai.com/v1)
// - AI_API_KEY or OPENAI_API_KEY (required for real calls)
// - SIMPLE_MODEL (default: GLM-4-Flash)
// - COMPLEX_MODEL (default: GLM-4V-Flash)

const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

// Try to parse Python config.py as fallback when env not provided
function parsePythonAIConfig() {
  try {
    const cfgPath = path.join(__dirname, '..', 'config.py');
    try { console.log('[AI] Trying to read', cfgPath, 'exists=', fs.existsSync(cfgPath)); } catch {}
    if (!fs.existsSync(cfgPath)) return {};
    const text = fs.readFileSync(cfgPath, 'utf8');
    const blockMatch = text.match(/AI_CONFIG\s*=\s*\{[\s\S]*?\}/);
      if (!blockMatch) { try { console.log('[AI] AI_CONFIG block not found in config.py'); } catch {} ; return {}; }
    const block = blockMatch[0];
      try { console.log('[AI] AI_CONFIG block preview:', block.slice(0, 200)); } catch {}
    const pick = (key) => {
        const m = block.match(new RegExp(`['\"]${key}['\"]\s*:\n*\\s*['\"]([^'\"]+)['\"]`));
      return m ? m[1] : undefined;
    };
    return {
      base_url: pick('base_url'),
      api_key: pick('api_key'),
      simple_model: pick('simple_model'),
      complex_model: pick('complex_model')
    };
  } catch {
    return {};
  }
}

const pyCfg = parsePythonAIConfig();
if (!process.env.AI_API_KEY && !process.env.OPENAI_API_KEY) {
  try {
    console.log('[AI] Loaded Python config fallback:', {
      base_url: pyCfg.base_url || null,
      api_key_present: !!pyCfg.api_key,
      simple_model: pyCfg.simple_model || null,
      complex_model: pyCfg.complex_model || null
    });
  } catch {}
}
const AI_BASE_URL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || pyCfg.base_url || 'https://api.openai.com/v1';
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || pyCfg.api_key || '';
const SIMPLE_MODEL = process.env.SIMPLE_MODEL || pyCfg.simple_model || 'GLM-4-Flash';
const COMPLEX_MODEL = process.env.COMPLEX_MODEL || pyCfg.complex_model || 'GLM-4V-Flash';

function hasAIConfig() {
  return Boolean(AI_API_KEY);
}

// Extract thinking content enclosed in <think>...</think>
function extractThinking(text) {
  const re = /<think>([\s\S]*?)<\/think>/g;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push(m[1]);
  }
  const display = text.replace(re, '').trim();
  return { thinking: matches.join('\n'), display };
}

async function* streamChatRaw({ messages, model, temperature = 0.7 }) {
  if (!hasAIConfig()) {
    // Fallback: yield the concatenated message content as a mock stream
    const last = messages[messages.length - 1];
    const mock = `（本地占位响应）你说：${last && last.content ? last.content : ''}`;
    for (let i = 0; i < mock.length; i += 20) {
      yield mock.slice(i, i + 20);
      await new Promise(r => setTimeout(r, 20));
    }
    return;
  }

  const url = `${AI_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: model || SIMPLE_MODEL,
    messages,
    stream: true,
    temperature
  };
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AI_API_KEY}`
  };

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok || !resp.body) {
    throw new Error(`AI API error: ${resp.status} ${resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const dataStr = s.slice(5).trim();
      if (dataStr === '[DONE]' || dataStr === '') continue;
      try {
        const data = JSON.parse(dataStr);
        const delta = data.choices && data.choices[0] && data.choices[0].delta || {};
        const content = delta.content || '';
        if (content) {
          yield content;
        }
      } catch (e) {
        // ignore JSON parse errors for heartbeat lines
      }
    }
  }
}

async function* streamChat({ prompt, systemPrompt, messages, useComplex = false, model, temperature = 0.7 }) {
  // Build messages if prompt provided
  let msgs = messages && messages.length ? messages.slice() : [];
  if (!msgs.length && (prompt || systemPrompt)) {
    msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    if (prompt) msgs.push({ role: 'user', content: prompt });
  }

  const selectedModel = model || (useComplex ? COMPLEX_MODEL : SIMPLE_MODEL);
  let accumulated = '';
  for await (const token of streamChatRaw({ messages: msgs, model: selectedModel, temperature })) {
    accumulated += token;
    // Emit content incrementally. Thinking blocks will be visible in final display unless the client strips them.
    yield { type: 'content', content: token };
  }
}

async function* analyzeImage({ base64Images = [], prompt = '请分析这张图片的内容', systemPrompt, model }) {
  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });

  const content = [];
  for (const b64 of base64Images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${b64}` }
    });
  }
  content.push({ type: 'text', text: prompt });
  msgs.push({ role: 'user', content });

  const selectedModel = model || COMPLEX_MODEL;
  for await (const token of streamChatRaw({ messages: msgs, model: selectedModel })) {
    yield token;
  }
}

// Aggregate a streaming chat into a single string (non-streaming convenience)
async function chatComplete({ prompt, systemPrompt, messages, useComplex = false, model, temperature = 0.7 }) {
  let text = '';
  for await (const ev of streamChat({ prompt, systemPrompt, messages, useComplex, model, temperature })) {
    if (ev && ev.type === 'content' && ev.content) text += ev.content;
  }
  return text;
}

// Shortcut helpers mirroring Python naming
async function simple_chat(prompt, system_prompt = undefined, model = undefined) {
  const out = [];
  for await (const ev of streamChat({ prompt, systemPrompt: system_prompt, model: model || SIMPLE_MODEL, useComplex: false })) {
    if (ev && ev.type === 'content' && ev.content) out.push(ev.content);
  }
  return out.join('');
}

async function complex_chat(prompt, system_prompt = undefined, model = undefined) {
  const out = [];
  for await (const ev of streamChat({ prompt, systemPrompt: system_prompt, model: model || COMPLEX_MODEL, useComplex: true })) {
    if (ev && ev.type === 'content' && ev.content) out.push(ev.content);
  }
  return out.join('');
}

async function simple_chat_complete(prompt, system_prompt = undefined, model = undefined) {
  return chatComplete({ prompt, systemPrompt: system_prompt, model: model || SIMPLE_MODEL, useComplex: false });
}

async function complex_chat_complete(prompt, system_prompt = undefined, model = undefined) {
  return chatComplete({ prompt, systemPrompt: system_prompt, model: model || COMPLEX_MODEL, useComplex: true });
}

module.exports = {
  hasAIConfig,
  streamChat,
  streamChatRaw,
  analyzeImage,
  chatComplete,
  simple_chat,
  complex_chat,
  simple_chat_complete,
  complex_chat_complete,
  extractThinking,
  SIMPLE_MODEL,
  COMPLEX_MODEL
};
