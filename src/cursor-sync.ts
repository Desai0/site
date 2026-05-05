



import { type Identity } from 'spacetimedb';
import { DbConnection, tables, type ErrorContext } from './module_bindings';

declare global {
  interface Window {
    __recordCursorTrailSegment?: (segment: {
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      isRightMouse: boolean;
    }) => void;
  }
}

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST || 'https://maincloud.spacetimedb.com';
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME || 'site-cursors';
const COLOR_KEY = `stdb:${DB_NAME}:cursor-color`;
const NAME_KEY = `stdb:${DB_NAME}:cursor-name`;
const TOKEN_KEY = `stdb:${DB_NAME}:auth-token`;
const PAGE_KEY = getPageKey();
const STROKE_BATCH_FLUSH_MS = 1000;
const STROKE_BATCH_MAX_POINTS = 120;
const SEND_INTERVAL_DEFAULT_MS = 200;
const SEND_INTERVAL_DRAWING_MS = 50;
const ACTIVE_CURSOR_CLASS = 'remote-cursor-active';
const REMOTE_STROKE_NORMAL_WIDTH = 0.35;
const REMOTE_STROKE_RIGHT_WIDTH = 2;

const surface = document.querySelector('.notebook-page') as HTMLElement | null;

if (surface) {
  initCursorSync(surface);
}

function initCursorSync(container: HTMLElement) {
  const historyCanvas = document.createElement('canvas');
  historyCanvas.className = 'persistent-trail-canvas';
  container.appendChild(historyCanvas);

  const drawingCanvas = document.createElement('canvas');
  drawingCanvas.className = 'remote-trail-canvas';
  container.appendChild(drawingCanvas);

  const layer = document.createElement('div');
  layer.className = 'spacetime-cursors-layer';
  container.appendChild(layer);

  const cursorEls = new Map<string, HTMLDivElement>();
  const lastRemotePoints = new Map<string, { x: number; y: number; page: string }>();
  let localColor = getStoredColor() ?? '#0b78ff';
  let localName = getStoredName() ?? createAnonName();
  const historyCtx = historyCanvas.getContext('2d');
  const drawingCtx = drawingCanvas.getContext('2d');

  let connection: DbConnection | null = null;
  let isConnected = false;
  let selfConnectionId = '';
  let lastSentAt = 0;
  let pendingTimer = 0;
  let pendingBatchTimer = 0;
  let retriedWithoutToken = false;
  let pendingStrokeBatch:
    | {
        page: string;
        color: string;
        isRightMouse: boolean;
        points: Array<{ x: number; y: number }>;
      }
    | null = null;
  let pendingPayload:
    | {
        page: string;
        x: number;
        y: number;
        color: string;
        name: string;
        isRightMouse: boolean;
      }
    | null = null;

  const resizeDrawingCanvas = () => {
    const rect = container.getBoundingClientRect();
    const nextWidth = Math.round(rect.width);
    const nextHeight = Math.round(rect.height);
    if (nextWidth <= 0 || nextHeight <= 0) {
      return;
    }

    historyCanvas.width = nextWidth;
    historyCanvas.height = nextHeight;
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
    if (historyCtx) {
      historyCtx.clearRect(0, 0, historyCanvas.width, historyCanvas.height);
    }
    if (drawingCtx) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
  };

  const toLocalPoint = (x: number, y: number) => {
    const rect = container.getBoundingClientRect();
    return {
      x: x * rect.width,
      y: y * rect.width,
    };
  };

  const drawSegment = (
    context: CanvasRenderingContext2D | null,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isRightMouse: boolean
  ) => {
    if (!context) {
      return;
    }

    context.strokeStyle = isRightMouse
      ? hexToAlpha(color, 0.4)
      : 'rgba(50, 50, 50, 0.14)';
    context.lineWidth = isRightMouse
      ? REMOTE_STROKE_RIGHT_WIDTH
      : REMOTE_STROKE_NORMAL_WIDTH;
    context.lineCap = 'round';

    const fromPoint = toLocalPoint(fromX, fromY);
    const toPoint = toLocalPoint(toX, toY);

    context.beginPath();
    context.moveTo(fromPoint.x, fromPoint.y);
    context.lineTo(toPoint.x, toPoint.y);
    context.stroke();
  };

  const drawRemoteSegment = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isRightMouse: boolean
  ) => {
    drawSegment(drawingCtx, fromX, fromY, toX, toY, color, isRightMouse);
  };

  const drawBatchPoints = (
    context: CanvasRenderingContext2D | null,
    points: Array<{ x: number; y: number }>,
    color: string,
    isRightMouse: boolean
  ) => {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      drawSegment(context, previous.x, previous.y, current.x, current.y, color, isRightMouse);
    }
  };

  const syncHistory = () => {
    if (!historyCtx) {
      return;
    }

    historyCtx.clearRect(0, 0, historyCanvas.width, historyCanvas.height);
    if (!connection) {
      return;
    }

    const rows = Array.from(connection.db.strokeBatch.iter())
      .filter(row => row.page === PAGE_KEY && toHex(row.connectionId) !== selfConnectionId)
      .sort((left, right) => {
        if (left.createdAtMs < right.createdAtMs) {
          return -1;
        }
        if (left.createdAtMs > right.createdAtMs) {
          return 1;
        }
        if (left.id < right.id) {
          return -1;
        }
        if (left.id > right.id) {
          return 1;
        }
        return 0;
      });

    console.info('Stroke history rows:', rows.length);

    for (const row of rows) {
      try {
        const points = JSON.parse(row.pointsJson) as Array<{ x?: unknown; y?: unknown }>;
        const normalizedPoints = points
          .map(point => ({
            x: typeof point.x === 'number' ? point.x : Number.NaN,
            y: typeof point.y === 'number' ? point.y : Number.NaN,
          }))
          .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));

        if (normalizedPoints.length >= 2) {
          drawBatchPoints(historyCtx, normalizedPoints, row.color, row.isRightMouse);
        }
      } catch (error) {
        console.warn('Failed to parse stroke batch payload.', error);
      }
    }
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
    const clampedY = Math.max(0, y);
    const point = toLocalPoint(clampedX, clampedY);
    el.style.left = `${point.x}px`;
    el.style.top = `${point.y}px`;
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
      const cursorEl = ensureCursorEl(key, row.color, row.name || shortIdentity(row.identity));
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

  const flushStrokeBatch = () => {
    pendingBatchTimer = 0;
    if (!pendingStrokeBatch || pendingStrokeBatch.points.length < 2) {
      return;
    }

    if (!isConnected || !connection) {
      return;
    }

    const batch = pendingStrokeBatch;
    pendingStrokeBatch = null;
    console.info('Sending stroke batch:', {
      points: batch.points.length,
      page: batch.page,
      isRightMouse: batch.isRightMouse,
    });
    void connection.reducers
      .addStrokeBatch({
        id: createStrokeBatchId(),
        page: batch.page,
        color: batch.color,
        isRightMouse: batch.isRightMouse,
        pointsJson: JSON.stringify(batch.points),
      })
      .catch(error => {
        console.warn('Failed to store stroke batch.', error);
      });
  };

  const scheduleStrokeBatchFlush = () => {
    if (pendingBatchTimer !== 0) {
      return;
    }

    pendingBatchTimer = window.setTimeout(flushStrokeBatch, STROKE_BATCH_FLUSH_MS);
  };

  const normalizeTrailPoint = (x: number, y: number) => {
    const width = Math.max(container.offsetWidth, 1);
    return {
      x: clamp(x / width, 0, 1),
      y: Math.max(0, y / width),
    };
  };

  const appendStrokeSegment = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isRightMouse: boolean
  ) => {
    const from = normalizeTrailPoint(fromX, fromY);
    const to = normalizeTrailPoint(toX, toY);
    if (from.x === to.x && from.y === to.y) {
      return;
    }

    const shouldRestartBatch =
      !pendingStrokeBatch ||
      pendingStrokeBatch.page !== PAGE_KEY ||
      pendingStrokeBatch.color !== localColor ||
      pendingStrokeBatch.isRightMouse !== isRightMouse ||
      pendingStrokeBatch.points.length >= STROKE_BATCH_MAX_POINTS;

    if (shouldRestartBatch) {
      if (pendingStrokeBatch?.points.length && pendingStrokeBatch.points.length >= 2) {
        flushStrokeBatch();
      }

      pendingStrokeBatch = {
        page: PAGE_KEY,
        color: localColor,
        isRightMouse,
        points: [from, to],
      };
      scheduleStrokeBatchFlush();
      return;
    }

    const lastPoint = pendingStrokeBatch.points[pendingStrokeBatch.points.length - 1];
    if (!lastPoint || lastPoint.x !== from.x || lastPoint.y !== from.y) {
      pendingStrokeBatch.points.push(from);
    }
    pendingStrokeBatch.points.push(to);
    scheduleStrokeBatchFlush();
  };

  const queueCursorUpdate = (x: number, y: number, isRightMouse: boolean) => {
    pendingPayload = {
      page: PAGE_KEY,
      x,
      y,
      color: localColor,
      name: localName,
      isRightMouse,
    };

    if (pendingTimer !== 0) {
      return;
    }

    const interval = isRightMouse ? SEND_INTERVAL_DRAWING_MS : SEND_INTERVAL_DEFAULT_MS;
    const delay = Math.max(0, interval - (Date.now() - lastSentAt));
    pendingTimer = window.setTimeout(flushCursorUpdate, delay);
  };

  const refreshNameFromIp = async () => {
    const resolvedName = await getOrCreateName();
    if (resolvedName === localName) {
      return;
    }

    localName = resolvedName;
    queueCursorUpdate(0, 0, false);
  };

  const sendPointerPosition = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = Math.max(0, (event.clientY - rect.top) / rect.width);
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
    const y = Math.max(0, (touch.clientY - rect.top) / rect.width);
    queueCursorUpdate(x, y, false);
  };

  container.addEventListener('pointermove', sendPointerPosition, { passive: true });
  container.addEventListener('pointerdown', sendPointerPosition, { passive: true });
  container.addEventListener('touchstart', sendTouchPosition, { passive: true });
  container.addEventListener('touchmove', sendTouchPosition, { passive: true });
  window.__recordCursorTrailSegment = detail => {
    console.info('Trail segment received.');
    const fromX = typeof detail.fromX === 'number' ? detail.fromX : Number.NaN;
    const fromY = typeof detail.fromY === 'number' ? detail.fromY : Number.NaN;
    const toX = typeof detail.toX === 'number' ? detail.toX : Number.NaN;
    const toY = typeof detail.toY === 'number' ? detail.toY : Number.NaN;
    if (
      !Number.isFinite(fromX) ||
      !Number.isFinite(fromY) ||
      !Number.isFinite(toX) ||
      !Number.isFinite(toY)
    ) {
      return;
    }

    appendStrokeSegment(fromX, fromY, toX, toY, Boolean(detail.isRightMouse));
  };
  window.addEventListener('pointerup', flushStrokeBatch);
  window.addEventListener('touchend', flushStrokeBatch);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushStrokeBatch();
    }
  });
  window.addEventListener('beforeunload', flushStrokeBatch);
  window.addEventListener('resize', resizeDrawingCanvas);
  window.addEventListener('resize', syncAll);
  window.addEventListener('resize', syncHistory);

  const connect = (authToken?: string | null) => {
    connection?.disconnect();

    let builder = DbConnection.builder().withUri(HOST).withDatabaseName(DB_NAME);
    if (authToken) {
      builder = builder.withToken(authToken);
    }

    connection = builder
      .onConnect((conn: DbConnection, _identity: Identity, token?: string) => {
      connection = conn;
      isConnected = true;
      retriedWithoutToken = false;
      selfConnectionId = toHex(conn.connectionId);
      localColor = getOrCreateColor(_identity);
      localName = getStoredName() ?? createAnonName();
      if (token) {
        storeAuthToken(token);
      }

      conn.subscriptionBuilder()
        .onApplied(() => {
          syncAll();
          syncHistory();
        })
        .subscribe([
          'SELECT * FROM cursor',
          'SELECT * FROM strokebatch'
        ]);
      conn.db.cursor.onInsert(syncAll);
      conn.db.cursor.onUpdate(syncAll);
      conn.db.cursor.onDelete(syncAll);
      conn.db.strokeBatch.onInsert(syncHistory);
      conn.db.strokeBatch.onDelete(syncHistory);
      window.setTimeout(() => {
        syncAll();
        syncHistory();
      }, 0);
      queueCursorUpdate(0, 0, false);
      void refreshNameFromIp();
    })
    .onDisconnect(() => {
      isConnected = false;
      selfConnectionId = '';
      clearRemoteCursors();
    })
    .onConnectError((_ctx: ErrorContext, error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: unknown }).message)
              : JSON.stringify(error);

      console.warn('SpaceTimeDB connection error:', message || 'unknown error', error);

      if (authToken && !retriedWithoutToken) {
        retriedWithoutToken = true;
        clearStoredAuthToken();
        console.warn('Retrying SpaceTimeDB connection without stored auth token.');
        connect(null);
      }
    })
    .build();
  };

  connect(getStoredAuthToken());
}

function getPageKey() {
  const path = window.location.pathname.split('/').filter(Boolean).pop();
  if (!path) {
    return 'index';
  }

  return path.replace(/\.[^/.]+$/, '') || 'index';
}

function getStoredColor() {
  return localStorage.getItem(COLOR_KEY);
}

function getStoredName() {
  const stored = localStorage.getItem(NAME_KEY);
  if (!stored || stored === 'IP unavailable' || stored === 'IP pending') {
    return null;
  }

  return stored;
}

function getStoredAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function storeAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getOrCreateColor(identity: Identity) {
  const color = colorFromIdentity(identity);
  localStorage.setItem(COLOR_KEY, color);
  return color;
}

async function getOrCreateName() {
  return Promise.resolve(getStoredName() ?? createAnonName());
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

function colorFromIdentity(identity: Identity) {
  const hex = identity.toHexString();
  let hash = 0;

  for (let index = 0; index < hex.length; index += 1) {
    hash = (hash * 31 + hex.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;
  const saturation = 64 + (hash % 14);
  const lightness = 40 + ((hash >> 4) % 10);
  return hslToHex(hue, saturation, lightness);
}

function refreshStoredIpName() {
  const fallback = getStoredName() ?? createAnonName();
  localStorage.setItem(NAME_KEY, fallback);
  return Promise.resolve(fallback);
}

function createAnonName() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `anon-${suffix}`;
}

function createStrokeBatchId() {
  const randomPart = BigInt(Math.floor(Math.random() * 1000));
  return BigInt(Date.now()) * 1000n + randomPart;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = l - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
