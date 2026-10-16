// Minimal in-memory stand-in for the Supabase query builder (enough for our fulfilment code).
export function fakeDb(seed: Record<string, any[]> = {}, rpcs: Record<string, (a: any) => any> = {}) {
  const tables: Record<string, any[]> = JSON.parse(JSON.stringify(seed));
  class Q {
    filters: ((r: any) => boolean)[] = []; op = "select"; patch: any; row: any; conflict?: string; wantSel = false;
    constructor(public t: string) { tables[t] ??= []; }
    select() { this.wantSel = true; return this; }
    eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
    neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
    update(p: any) { this.op = "update"; this.patch = p; return this; }
    insert(r: any) { this.op = "insert"; this.row = r; return this; }
    delete() { this.op = "delete"; return this; }
    upsert(r: any, o?: { onConflict?: string }) { this.op = "upsert"; this.row = r; this.conflict = o?.onConflict; return this; }
    async maybeSingle() { const r = this.run(); return { data: r.data?.[0] ?? null, error: r.error }; }
    async single() { return this.maybeSingle(); }
    then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej); }
    run(): { data: any[]; error: any } {
      const rows = tables[this.t];
      const m = () => rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "insert") {
        const pk = ({ webhook_events: "event_id", manual_payments: "utr" } as Record<string, string>)[this.t] ?? null;
        if (pk && rows.some((r) => r[pk] === this.row[pk])) return { data: [], error: { code: "23505" } };
        rows.push({ id: `id${rows.length + 1}`, ...this.row }); return { data: [rows.at(-1)], error: null };
      }
      if (this.op === "update") { const hit = m(); hit.forEach((r) => Object.assign(r, this.patch)); return { data: hit, error: null }; }
      if (this.op === "delete") { const hit = m(); hit.forEach((r) => rows.splice(rows.indexOf(r), 1)); return { data: hit, error: null }; }
      if (this.op === "upsert") {
        const key = this.conflict ?? (this.t === "subscriptions" ? "user_id" : "id");
        const ex = rows.find((r) => r[key] === this.row[key]);
        if (ex) Object.assign(ex, this.row); else rows.push({ ...this.row });
        return { data: [], error: null };
      }
      return { data: m(), error: null };
    }
  }
  return { tables, from: (t: string) => new Q(t), rpc: async (n: string, a: any) => ({ data: rpcs[n]?.(a), error: null }) } as any;
}
