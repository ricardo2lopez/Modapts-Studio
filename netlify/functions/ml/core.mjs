// MODAPTS Studio · almacén central del machine learning (la lógica, sin depender de Netlify para poder probarla)
// Guarda solo los 14 datos de cada movimiento y la respuesta (nunca video). Escribir pide la clave de la app;
// borrar o regresar de versión pide la clave de administrador. Cada borrado deja un respaldo.
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const CLS = ['G1', 'P2', 'P5', 'X4', 'P0', 'J2', 'C', 'U', 'none', 'hold'];
const okLabel = x => x && typeof x.sid === 'string' && (x.h === 'L' || x.h === 'R') && isFinite(x.t1) && CLS.includes(x.y) && Array.isArray(x.f) && x.f.length >= 10 && x.f.length <= 40 && x.f.every(Number.isFinite);
const same = (a, b) => a.sid === b.sid && a.h === b.h && Math.abs(a.t1 - b.t1) < 0.06;

export function makeHandler(store, env) {
  const APP = env.MODAPTS_APP_KEY || '', ADMIN = env.MODAPTS_ADMIN_KEY || '';
  const labels = async () => (await store.get('labels', { type: 'json' })) || [];
  const meta = async () => (await store.get('meta', { type: 'json' })) || { v: 0, versions: [] };
  return async (req) => {
    const u = new URL(req.url), key = req.headers.get('x-modapts-key') || '', admin = req.headers.get('x-modapts-admin') || '';
    if (!APP || !ADMIN) return J({ error: 'Faltan las claves MODAPTS_APP_KEY y MODAPTS_ADMIN_KEY en Netlify' }, 500);
    try {
      if (req.method === 'GET') {
        const what = u.searchParams.get('what') || 'model';
        if (what === 'ping') return J({ ok: true });
        if (what === 'model') { const m = await meta(); const model = m.v && m.active !== false ? await store.get('model-v' + m.v, { type: 'json' }) : null; const L = await labels(); return J({ v: m.v, model, n: L.length, sessions: new Set(L.map(x => x.sid)).size, versions: m.versions.slice(-20), reset: m.reset || null }); }
        if (what === 'labels') { if (key !== APP) return J({ error: 'clave' }, 401); return J({ labels: await labels() }); }
        return J({ error: 'what' }, 400);
      }
      if (req.method !== 'POST') return J({ error: 'método' }, 405);
      const b = await req.json().catch(() => ({}));
      if (b.action === 'labels') {
        if (key !== APP) return J({ error: 'clave' }, 401);
        const inc = (b.labels || []).filter(okLabel).slice(0, 5000), L = await labels(); let add = 0, upd = 0;
        for (const x of inc) { const y = { sid: x.sid, sname: String(x.sname || '').slice(0, 120), h: x.h, t1: +x.t1, y: x.y, f: x.f, date: x.date || new Date().toISOString(), dev: String(b.dev || '').slice(0, 40) }; const i = L.findIndex(z => same(z, y)); if (i >= 0) { L[i] = y; upd++; } else { L.push(y); add++; } }
        await store.setJSON('labels', L); return J({ ok: true, add, upd, n: L.length });
      }
      if (b.action === 'model') {
        if (key !== APP) return J({ error: 'clave' }, 401);
        const m = await meta(), mod = b.model;
        if (!mod || !mod.tree) return J({ error: 'modelo' }, 400);
        if (b.base != null && b.base !== m.v) return J({ error: 'versión', v: m.v }, 409); // alguien entrenó antes: bajar y volver a entrenar
        const v = m.v + 1; mod.v = v; await store.setJSON('model-v' + v, mod);
        m.v = v; m.active = true; m.versions.push({ v, n: mod.n, cv: mod.cv, date: new Date().toISOString(), dev: String(b.dev || '').slice(0, 40) }); await store.setJSON('meta', m);
        return J({ ok: true, v });
      }
      if (b.action === 'deleteSession') {
        if (admin !== ADMIN) return J({ error: 'clave de administrador' }, 403);
        const L = await labels(), keep = L.filter(x => x.sid !== b.sid), gone = L.length - keep.length;
        if (gone) { await store.setJSON('backup-' + Date.now(), { sid: b.sid, labels: L.filter(x => x.sid === b.sid) }); await store.setJSON('labels', keep); }
        return J({ ok: true, gone, n: keep.length });
      }
      if (b.action === 'wipe') { // empezar de cero: todas las etiquetas fuera y sin modelo activo; queda respaldo y las versiones viejas siguen para regresar
        if (admin !== ADMIN) return J({ error: 'clave de administrador' }, 403);
        const L = await labels(), m = await meta(), ts = Date.now();
        await store.setJSON('backup-' + ts, { wipe: true, labels: L, meta: m });
        await store.setJSON('labels', []); m.active = false; m.reset = ts; await store.setJSON('meta', m);
        return J({ ok: true, gone: L.length, reset: ts });
      }
      if (b.action === 'rollback') {
        if (admin !== ADMIN) return J({ error: 'clave de administrador' }, 403);
        const m = await meta(), old = await store.get('model-v' + b.v, { type: 'json' });
        if (!old) return J({ error: 'no existe esa versión' }, 404);
        const v = m.v + 1, mod = Object.assign({}, old, { v, from: b.v }); await store.setJSON('model-v' + v, mod);
        m.v = v; m.active = true; m.versions.push({ v, n: mod.n, cv: mod.cv, date: new Date().toISOString(), from: b.v }); await store.setJSON('meta', m);
        return J({ ok: true, v });
      }
      return J({ error: 'acción' }, 400);
    } catch (e) { return J({ error: String(e && e.message || e) }, 500); }
  };
}
