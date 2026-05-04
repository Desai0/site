



import { type Identity } from 'spacetimedb';
import { DbConnection, tables, type ErrorContext } from './module_bindings';

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST || 'https://maincloud.spacetimedb.com';
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME || 'site-cursors';
const COLOR_KEY = `stdb:${DB_NAME}:cursor-color`;
const PAGE_KEY = getPageKey();
const SEND_INTERVAL_MS = 50;
const ACTIVE_CURSOR_CLASS = 'remote-cursor-active';
const REMOTE_STROKE_NORMAL_WIDTH = 0.8;
const REMOTE_STROKE_RIGHT_WIDTH = 2;

const surface = document.querySelector('.notebook-page') as HTMLElement | null;

if (surface) {
  initCursorSync(surface);
}

function initCursorSync(container: HTMLElement) {
  const drawingCanvas = document.createElement('canvas');
  drawingCanvas.className = 'remote-trail-canvas';
  container.appendChild(drawingCanvas);

  const layer = document.createElement('div');
  layer.className = 'spacetime-cursors-layer';
  container.appendChild(layer);

  const cursorEls = new Map<string, HTMLDivElement>();
  const lastRemotePoints = new Map<string, { x: number; y: number; page: string }>();
  const localColor = getOrCreateColor();
  const drawingCtx = drawingCanvas.getContext('2d');

  let connection: DbConnection | null = null;
  let isConnected = false;
  let selfConnectionId = '';
  let lastSentAt = 0;
  let pendingTimer = 0;
  let pendingPayload:
    | { page: string; x: number; y: number; color: string; isRightMouse: boolean }
    | null = null;

  const resizeDrawingCanvas = () => {
    const nextWidth = container.offsetWidth;
    const nextHeight = container.offsetHeight;
    if (!drawingCtx || nextWidth <= 0 || nextHeight <= 0) {
      return;
    }

    drawingCanvas.width = nextWidth;
    drawingCanvas.height = nextHeight;
  };

  resizeDrawingCanvas();

  const clearRemoteCursors = () => {
    for (const el of cursorEls.values()) {
      el.remove();
    }
    cursorEls.clear();
    lastRemotePoints.clear();
    if (drawingCtx) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
  };

  const drawRemoteSegment = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isRightMouse: boolean
  ) => {
    if (!drawingCtx) {
      return;
    }

    drawingCtx.strokeStyle = isRightMouse
      ? hexToAlpha(color, 0.4)
      : 'rgba(50, 50, 50, 0.2)';
    drawingCtx.lineWidth = isRightMouse
      ? REMOTE_STROKE_RIGHT_WIDTH
      : REMOTE_STROKE_NORMAL_WIDTH;
    drawingCtx.lineCap = 'round';

    drawingCtx.beginPath();
    drawingCtx.moveTo(fromX * drawingCanvas.width, fromY * drawingCanvas.height);
    drawingCtx.lineTo(toX * drawingCanvas.width, toY * drawingCanvas.height);
    drawingCtx.stroke();
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
    el.classList.remove(ACTIVE_CURSOR_CLASS);
    void el.offsetWidth;
    el.classList.add(ACTIVE_CURSOR_CLASS);
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
        if (key) {
          lastRemotePoints.delete(key);
        }
        continue;
      }

      nextKeys.add(key);
      const cursorEl = ensureCursorEl(key, row.color, shortIdentity(row.identity));
      positionCursor(cursorEl, row.x, row.y);

      const previousPoint = lastRemotePoints.get(key);
      if (previousPoint && previousPoint.page === row.page) {
        drawRemoteSegment(
          previousPoint.x,
          previousPoint.y,
          row.x,
          row.y,
          row.color,
          row.isRightMouse
        );
      }

      lastRemotePoints.set(key, { x: row.x, y: row.y, page: row.page });
    }

    for (const [key, el] of cursorEls) {
      if (nextKeys.has(key)) {
        continue;
      }

      el.remove();
      cursorEls.delete(key);
      lastRemotePoints.delete(key);
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

  const queueCursorUpdate = (x: number, y: number, isRightMouse: boolean) => {
    pendingPayload = {
      page: PAGE_KEY,
      x,
      y,
      color: localColor,
      isRightMouse,
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
    queueCursorUpdate(x, y, Boolean(event.buttons & 2));
  };

  const sendTouchPosition = (event: TouchEvent) => {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) {
      return;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = clamp((touch.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((touch.clientY - rect.top) / rect.height, 0, 1);
    queueCursorUpdate(x, y, false);
  };

  container.addEventListener('pointermove', sendPointerPosition, { passive: true });
  container.addEventListener('pointerdown', sendPointerPosition, { passive: true });
  container.addEventListener('touchstart', sendTouchPosition, { passive: true });
  container.addEventListener('touchmove', sendTouchPosition, { passive: true });
  window.addEventListener('resize', resizeDrawingCanvas);
  window.addEventListener('resize', syncAll);

  connection = DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DB_NAME)
    .onConnect((conn: DbConnection, _identity: Identity) => {
      connection = conn;
      isConnected = true;
      selfConnectionId = toHex(conn.connectionId);

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
