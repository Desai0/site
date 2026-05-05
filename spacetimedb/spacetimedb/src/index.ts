import { SenderError, schema, table, t } from 'spacetimedb/server';

const cursor = table(
  {
    name: 'cursor',
    public: true,
  },
  {
    connectionId: t.connectionId().primaryKey(),
    identity: t.identity(),
    name: t.string(),
    page: t.string(),
    x: t.f32(),
    y: t.f32(),
    color: t.string(),
    isRightMouse: t.bool(),
  }
);

const strokeBatch = table(
  {
    name: 'stroke_batch',
    public: true,
  },
  {
    id: t.u64().primaryKey(),
    connectionId: t.connectionId(),
    page: t.string(),
    color: t.string(),
    isRightMouse: t.bool(),
    pointsJson: t.string(),
    createdAtMs: t.u64(),
  }
);

const spacetimedb = schema({ cursor, strokeBatch });
export default spacetimedb;

const DEFAULT_PAGE = 'index';
const DEFAULT_COLOR = '#d32f2f';
const DEFAULT_NAME = 'Unknown GPU';
const STROKE_HISTORY_TTL_MS = 15 * 60 * 1000;

export const init = spacetimedb.init(() => {
  // Module initialization hook.
});

export const onConnect = spacetimedb.clientConnected(ctx => {
  if (ctx.connectionId === null) {
    return;
  }

  ctx.db.cursor.insert({
    connectionId: ctx.connectionId,
    identity: ctx.sender,
    name: DEFAULT_NAME,
    page: DEFAULT_PAGE,
    x: 0,
    y: 0,
    color: DEFAULT_COLOR,
    isRightMouse: false,
  });
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  if (ctx.connectionId === null) {
    return;
  }

  ctx.db.cursor.connectionId.delete(ctx.connectionId);
});

export const update_cursor = spacetimedb.reducer(
  {
    page: t.string(),
    x: t.f32(),
    y: t.f32(),
    color: t.string().optional(),
    name: t.string().optional(),
    isRightMouse: t.bool(),
  },
  (ctx, { page, x, y, color, name, isRightMouse }) => {
    if (ctx.connectionId === null) {
      throw new SenderError('Connection id is required to update cursor state.');
    }

    const existing = ctx.db.cursor.connectionId.find(ctx.connectionId);
    if (!existing) {
      throw new SenderError('Cursor session was not initialized for this connection.');
    }

    ctx.db.cursor.connectionId.update({
      ...existing,
      page,
      x,
      y,
      color: color ?? existing.color,
      name: name ?? existing.name,
      isRightMouse,
    });
  }
);

export const add_stroke_batch = spacetimedb.reducer(
  {
    id: t.u64(),
    page: t.string(),
    color: t.string(),
    isRightMouse: t.bool(),
    pointsJson: t.string(),
  },
  (ctx, { id, page, color, isRightMouse, pointsJson }) => {
    if (ctx.connectionId === null) {
      throw new SenderError('Connection id is required to save a stroke batch.');
    }

    const createdAtMs = BigInt(Date.now());
    ctx.db.strokeBatch.insert({
      id,
      connectionId: ctx.connectionId,
      page,
      color,
      isRightMouse,
      pointsJson,
      createdAtMs,
    });
  }
);

export const get_stroke_history = spacetimedb.procedure(
  {
    page: t.string(),
  },
  t.string(),
  (ctx, { page }) => {
    const cutoff = BigInt(Date.now() - STROKE_HISTORY_TTL_MS);
    const rows = Array.from(ctx.db.strokeBatch.iter())
      .filter(row => row.page === page && row.createdAtMs >= cutoff)
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
      })
      .map(row => ({
        connectionId: row.connectionId.toHexString(),
        page: row.page,
        color: row.color,
        isRightMouse: row.isRightMouse,
        pointsJson: row.pointsJson,
        createdAtMs: row.createdAtMs.toString(),
        id: row.id.toString(),
      }));

    return JSON.stringify(rows);
  }
);
