/* Data-access boundary: Supabase when configured; local sample adapter otherwise. */
(() => {
  "use strict";
  const KEY = "kpi-desk.sample-records.v1";
  const SEED = [
    { id: "sample-2026-09-sales-a", month: "2026-09", department: "영업A", target: 10000000, actual: 9000000 },
    { id: "sample-2026-09-sales-b", month: "2026-09", department: "영업B", target: 8000000, actual: 8800000 },
    { id: "sample-2026-09-sales-c", month: "2026-09", department: "영업C", target: 12000000, actual: 10800000 },
    { id: "sample-2026-10-sales-a", month: "2026-10", department: "영업A", target: 10000000, actual: 11000000 },
    { id: "sample-2026-10-sales-b", month: "2026-10", department: "영업B", target: 8000000, actual: 7200000 },
    { id: "sample-2026-10-sales-c", month: "2026-10", department: "영업C", target: 12000000, actual: 12600000 }
  ];
  const safeAmount = value => Number.isSafeInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
  const validMonth = value => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const sorted = records => [...records].sort((a, b) => b.month.localeCompare(a.month) || a.department.localeCompare(b.department, "ko"));
  const mapRow = row => ({ id: row.id, month: row.month, department: row.team, target: Number(row.target), actual: Number(row.actual) });
  const config = window.KPI_CONFIG || {};
  const url = typeof config.supabaseUrl === "string" ? config.supabaseUrl.trim() : "";
  const key = typeof config.supabasePublishableKey === "string" ? config.supabasePublishableKey.trim() : "";
  const urlValid = /^https:\/\/[\w.-]+\.supabase\.co\/?$/.test(url) && !/YOUR_PROJECT_URL|placeholder/i.test(url);
  const keyValid = key.length > 20 && !/YOUR_PUBLISHABLE_KEY|placeholder/i.test(key) && !/service_role|secret/i.test(key);
  const configured = urlValid && keyValid;
  let client = null;
  let session = null;
  let authHandler = () => {};
  let initPromise = null;
  if (configured && window.supabase?.createClient) client = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  function sampleRows() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return SEED.map(row => ({ ...row }));
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== "string")) throw new Error("샘플 저장 데이터의 형식이 올바르지 않습니다.");
      return rows;
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) throw new Error("브라우저 샘플 저장 데이터를 읽지 못했습니다.");
      throw error;
    }
  }
  function validate(input) {
    if (!validMonth(input.month)) throw new Error("유효한 월을 선택해 주세요.");
    const department = typeof input.department === "string" ? input.department.trim() : "";
    if (!department || department.length > 80) throw new Error("부서명을 1~80자로 입력해 주세요.");
    if (!safeAmount(input.target) || !safeAmount(input.actual)) throw new Error("목표와 실적은 0 이상의 안전한 정수로 입력해 주세요.");
    return { month: input.month, department, target: input.target, actual: input.actual };
  }
  function dbError(error) {
    if (error?.code === "23505") return new Error("같은 월과 부서의 자료가 이미 저장되어 있습니다.");
    if (error?.code === "42501" || error?.status === 401 || error?.status === 403) return new Error("접근이 거부되었습니다. 로그인 상태와 본인 자료 접근 정책(RLS)을 확인해 주세요.");
    if (error?.code === "42P01" || error?.code === "PGRST205") return new Error("kpi_records 테이블을 찾지 못했습니다. 제공된 schema.sql 적용 상태를 확인해 주세요.");
    return new Error(error?.message || "Supabase 요청에 실패했습니다.");
  }
  const repository = {
    mode: configured ? (client ? "supabase" : "config-error") : "sample",
    get configured() { return configured; },
    async init() {
      if (!client) return null;
      if (!initPromise) {
        const { data, error } = await client.auth.getSession();
        if (error) throw dbError(error);
        session = data.session;
        client.auth.onAuthStateChange((_event, nextSession) => {
          const priorId = session?.user?.id || null;
          const nextId = nextSession?.user?.id || null;
          session = nextSession;
          if (priorId !== nextId) authHandler(nextSession?.user || null);
        });
        initPromise = true;
      }
      return session?.user || null;
    },
    onAuthChange(callback) { authHandler = callback; },
    async signIn(email, password) {
      if (!client) throw new Error("Supabase 설정이 없거나 SDK를 불러오지 못했습니다.");
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw dbError(error);
      session = data.session;
      return data.user;
    },
    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw dbError(error);
      session = null;
    },
    async list() {
      if (!configured) return sorted(sampleRows().map(row => ({ ...row })));
      if (!client) throw new Error("Supabase SDK를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
      if (!session?.user) return [];
      const { data, error } = await client.from("kpi_records").select("id,user_id,month,team,target,actual").eq("user_id", session.user.id).order("month", { ascending: false }).order("team", { ascending: true });
      if (error) throw dbError(error);
      return sorted((data || []).map(mapRow));
    },
    async add(input) {
      const row = validate(input);
      if (!configured) {
        const rows = sampleRows();
        if (rows.some(item => item.month === row.month && item.department.trim() === row.department)) throw new Error("같은 월과 부서의 자료가 이미 있습니다.");
        const saved = { id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...row };
        rows.push(saved);
        try { localStorage.setItem(KEY, JSON.stringify(rows)); }
        catch { throw new Error("브라우저 샘플 저장에 실패했습니다."); }
        return saved;
      }
      if (!client) throw new Error("Supabase SDK를 불러오지 못했습니다.");
      if (!session?.user) throw new Error("먼저 로그인해 주세요.");
      const payload = { user_id: session.user.id, month: row.month, team: row.department, target: row.target, actual: row.actual };
      const { data, error } = await client.from("kpi_records").insert(payload).select("id,user_id,month,team,target,actual").single();
      if (error) throw dbError(error);
      return mapRow(data);
    }
  };
  Object.defineProperty(window, "KPIRepository", { value: Object.freeze(repository), writable: false, configurable: false });
})();
