



import { type Identity } from 'spacetimedb';
import { DbConnection, tables, type ErrorContext } from './module_bindings';

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? 'ws://127.0.0.1:3000';
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'site-cursors';
const TOKEN_KEY = `stdb:${DB_NAME}:auth-token`;
const COLOR_KEY = `stdb:${DB_NAME}:cursor-color`;
const PAGE_KEY = getPageKey();
const SEND_INTERVAL_MS = 50;

const surface = document.querySelector('.notebook-page') as HTMLElement | null;

if (surface) {
  initCursorSync(surface);
}

function initCursorSync(container: HTMLElement) {
  const layer = document.createElement('div');
  layer.className = 'spacetime-cursors-layer';
  container.appendChild(layer);

  const cursorEls = new Map<string, HTMLDivElement>();
  const localColor = getOrCreateColor();

  let connection: DbConnection | null = null;
  let isConnected = false;
  let selfConnectionId = '';
  let lastSentAt = 0;
  let pendingTimer = 0;
  let pendingPayload: { page: string; x: number; y: number; color: string } | null =
    null;

  const clearRemoteCursors = () => {
    for (const el of cursorEls.values()) {
      el.remove();
    }
    cursorEls.clear();
  };

  const updateCursorEl = (el: HTMLDivElement, color: string, label: string) => {
    const dot = el.querySelector('.remote-cursor-dot') as HTMLSpanElement | null;
    const text = el.querySelector('.remote-cursor-label') as HTMLSpanElement | null;

    if (dot) {
      dot.style.backgroundColor = color;
      dot.style.boxShadow = `0 0 0 4px ${hexToAlpha(color, 0.15)}`;
    }

    if (text) {
      text.textContent = label;
      text.style.borderColor = hexToAlpha(color, 0.28);
    }
  };

  const ensureCursorEl = (key: string, color: string, label: string) => {
    let el = cursorEls.get(key);
    if (el) {
      updateCursorEl(el, color, label);
      return el;
    }

    el = document.createElement('div');
    el.className = 'remote-cursor';
    el.innerHTML =
      '<span class="remote-cursor-dot"></span><span class="remote-cursor-label"></span>';
    layer.appendChild(el);
    cursorEls.set(key, el);
    updateCursorEl(el, color, label);
    return el;
  };

  const positionCursor = (el: HTMLElement, x: number, y: number) => {
    const clampedX = clamp(x, 0, 1);
    const clampedY = clamp(y, 0, 1);
    el.style.left = `${clampedX * 100}%`;
    el.style.top = `${clampedY * 100}%`;
  };

  const syncAll = () => {
    if (!connection) {
      clearRemoteCursors();
      return;
    }

    const nextKeys = new Set<string>();

    for (const row of connection.db.cursor.iter()) {
      const key = toHex(row.connectionId);
      if (!key || key === selfConnectionId || row.page !== PAGE_KEY) {
        continue;
      }

      nextKeys.add(key);
      const cursorEl = ensureCursorEl(key, row.color, shortIdentity(row.identity));
      positionCursor(cursorEl, row.x, row.y);
    }

    for (const [key, el] of cursorEls) {
      if (nextKeys.has(key)) {
        continue;
      }

      el.remove();
      cursorEls.delete(key);
    }
  };

  const flushCursorUpdate = () => {
    pendingTimer = 0;
    if (!isConnected || !connection || !pendingPayload) {
      return;
    }

    const payload = pendingPayload;
    pendingPayload = null;
    lastSentAt = Date.now();
    connection.reducers.updateCursor(payload);
  };

  const queueCursorUpdate = (x: number, y: number) => {
    pendingPayload = {
      page: PAGE_KEY,
      x,
      y,
      color: localColor,
    };

    if (pendingTimer !== 0) {
      return;
    }

    const delay = Math.max(0, SEND_INTERVAL_MS - (Date.now() - lastSentAt));
    pendingTimer = window.setTimeout(flushCursorUpdate, delay);
  };

  const sendPointerPosition = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    queueCursorUpdate(x, y);
  };

  container.addEventListener('pointermove', sendPointerPosition, { passive: true });
  container.addEventListener('pointerdown', sendPointerPosition, { passive: true });
  window.addEventListener('resize', syncAll);

  connection = DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DB_NAME)
    .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
    .onConnect((conn: DbConnection, _identity: Identity, token: string) => {
      connection = conn;
      isConnected = true;
      selfConnectionId = toHex(conn.connectionId);
      localStorage.setItem(TOKEN_KEY, token);

      conn.subscriptionBuilder().onApplied(syncAll).subscribe(tables.cursor);
      conn.db.cursor.onInsert(syncAll);
      conn.db.cursor.onUpdate(syncAll);
      conn.db.cursor.onDelete(syncAll);
    })
    .onDisconnect(() => {
      isConnected = false;
      selfConnectionId = '';
      clearRemoteCursors();
    })
    .onConnectError((_ctx: ErrorContext, error: Error) => {
      console.warn('SpaceTimeDB connection error:', error.message);
    })
    .build();
}

function getPageKey() {
  const path = window.location.pathname.split('/').filter(Boolean).pop();
  if (!path) {
    return 'index';
  }

  return path.replace(/\.[^/.]+$/, '') || 'index';
}

function getOrCreateColor() {
  const saved = localStorage.getItem(COLOR_KEY);
  if (saved) {
    return saved;
  }

  const palette = ['#d32f2f', '#0b78ff', '#2f8f4e', '#cf7a00', '#6f57d9', '#0b7f7b'];
  const color = palette[Math.floor(Math.random() * palette.length)];
  localStorage.setItem(COLOR_KEY, color);
  return color;
}

function shortIdentity(identity: Identity) {
  const hex = identity.toHexString();
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

function toHex(value: { toHexString?: () => string } | null | undefined) {
  return value?.toHexString?.() ?? '';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return `rgba(30, 30, 30, ${alpha})`;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
