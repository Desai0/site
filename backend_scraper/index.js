import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const STORE_PATH = process.env.TRACK_STORE_PATH || join(__dirname, 'data', 'tracks.json');
const MAX_BODY_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const server = createServer(async (req, res) => {
  const startedAt = Date.now();
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, null);
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/tracks/submit') {
      await handleSubmit(req, res);
      return;
    }

    const lookupMatch = url.pathname.match(/^\/api\/tracks\/([^/]+)$/);
    if (req.method === 'GET' && lookupMatch) {
      await handleLookup(res, decodeURIComponent(lookupMatch[1]));
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Internal server error' });
  } finally {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} ${Date.now() - startedAt}ms`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Track backend listening on http://${HOST}:${PORT}`);
});

async function handleSubmit(req, res) {
  const payload = await readJsonBody(req);
  const title = cleanString(payload.title);
  const artist = cleanString(payload.artist);
  const sourceLink = cleanString(payload.sourceLink);

  if (!title || !artist || !sourceLink) {
    sendJson(res, 400, { error: 'title, artist and sourceLink are required' });
    return;
  }

  const store = await readStore();
  const id = String(store.nextId);
  store.nextId += 1;

  const now = new Date().toISOString();
  const searchResult = await findDownloadLink({ title, artist });
  const record = {
    id,
    title,
    artist,
    sourceLink,
    status: searchResult.downloadUrl ? 'ready' : 'not_found',
    downloadUrl: searchResult.downloadUrl,
    provider: searchResult.provider,
    matchedTitle: searchResult.matchedTitle,
    createdAt: now,
    updatedAt: now,
  };

  store.tracks[id] = record;
  await writeStore(store);
  sendJson(res, 201, record);
}

async function handleLookup(res, id) {
  const store = await readStore();
  const record = store.tracks[String(id)];

  if (!record) {
    sendJson(res, 404, { error: `Track ${id} not found` });
    return;
  }

  sendJson(res, 200, record);
}

async function findDownloadLink(track) {
  const query = `${track.artist} ${track.title}`.replace(/\s+/g, ' ').trim();
  const providers = [searchMuzfrog, searchHitmoz];

  for (const provider of providers) {
    try {
      const result = await provider(query, track);
      if (result?.downloadUrl) {
        return result;
      }
    } catch (error) {
      console.warn(`Search provider failed: ${provider.name}`, getErrorMessage(error));
    }
  }

  return {
    provider: null,
    downloadUrl: '',
    matchedTitle: '',
  };
}

async function searchMuzfrog(query, track) {
  const url = `https://mob.muzfrog.com/search/${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const blocks = html.match(/<div class="mp3">[\s\S]*?(?=<div class="mp3">|<\/div><\/div><\/div>)/g) || [];
  const candidates = blocks
    .map(block => {
      const source = matchFirst(block, /mp3source="([^"]+)"/i);
      const spans = Array.from(block.matchAll(/<span>([\s\S]*?)<\/span>/gi)).map(match =>
        normalizeText(stripTags(match[1]))
      );
      const label = normalizeText(spans.join(' '));
      return {
        provider: 'muzfrog',
        downloadUrl: cleanupUrl(source),
        matchedTitle: label,
        score: scoreMatch(label, track),
      };
    })
    .filter(candidate => candidate.downloadUrl);

  return pickBestCandidate(candidates);
}

async function searchHitmoz(query, track) {
  const urls = [
    `https://rus.hitmoz.org/search?q=${encodeURIComponent(query)}`,
    `https://rus.hitmoz.org/search/${encodeURIComponent(query)}`,
  ];

  for (const url of urls) {
    const html = await fetchText(url);
    const links = Array.from(
      html.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,220}?)<\/a>/gi)
    ).map(match => ({
      provider: 'hitmoz',
      downloadUrl: absolutizeUrl(cleanupUrl(match[1]), 'https://rus.hitmoz.org'),
      matchedTitle: normalizeText(stripTags(match[2])),
      score: scoreMatch(stripTags(match[2]), track),
    }));

    const direct = links.filter(link => /download|dl|mp3|track/i.test(link.downloadUrl));
    const best = pickBestCandidate(direct);
    if (best) {
      return best;
    }
  }

  return null;
}

function pickBestCandidate(candidates) {
  if (!candidates.length) {
    return null;
  }

  return candidates.sort((left, right) => right.score - left.score)[0];
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('Request body is too large');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      nextId: Number(parsed.nextId) || 1,
      tracks: parsed.tracks && typeof parsed.tracks === 'object' ? parsed.tracks : {},
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }

    return { nextId: 1, tracks: {} };
  }
}

async function writeStore(store) {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  if (payload === null) {
    res.end();
    return;
  }

  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function matchFirst(value, pattern) {
  return value.match(pattern)?.[1] || '';
}

function stripTags(value) {
  return decodeHtml(String(value).replace(/<[^>]+>/g, ' '));
}

function normalizeText(value) {
  return decodeHtml(String(value))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanupUrl(value) {
  return decodeHtml(String(value || ''))
    .replace(/\\+"/g, '')
    .replace(/\\"/g, '')
    .trim();
}

function absolutizeUrl(url, baseUrl) {
  if (!url) {
    return '';
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function scoreMatch(label, track) {
  const haystack = normalizeText(label);
  const title = normalizeText(track.title);
  const artist = normalizeText(track.artist);
  let score = 0;

  if (haystack.includes(title)) {
    score += 5;
  }
  if (haystack.includes(artist)) {
    score += 5;
  }

  for (const token of `${artist} ${title}`.split(/\s+/).filter(Boolean)) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
