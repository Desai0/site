import { SenderError, schema, table, t } from 'spacetimedb/server';

const cursor = table(
  {
    name: 'cursor',
    public: true,
  },
  {
    connectionId: t.connectionId().primaryKey(),
    identity: t.identity(),
    page: t.string(),
    x: t.f32(),
    y: t.f32(),
    color: t.string(),
  }
);

const spacetimedb = schema({ cursor });
export default spacetimedb;

const DEFAULT_PAGE = 'index';
const DEFAULT_COLOR = '#d32f2f';

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
    page: DEFAULT_PAGE,
    x: 0,
    y: 0,
    color: DEFAULT_COLOR,
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
  },
  (ctx, { page, x, y, color }) => {
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
    });
  }
);
