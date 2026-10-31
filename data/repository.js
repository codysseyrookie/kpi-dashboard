/* Data-access boundary. Replace this sample adapter with Supabase in a later step. */
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
  function stored() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return null;
      const records = JSON.parse(raw);
      if (!Array.isArray(records) || records.some(r => !r || typeof r.id !== "string")) throw new Error("샘플 저장 데이터의 형식이 올바르지 않습니다.");
      return records;
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) throw new Error("브라우저 저장 데이터를 읽을 수 없습니다. 브라우저 저장소 설정을 확인해 주세요.");
      throw error;
    }
  }
  const adapter = {
    mode: "sample",
    async list() { return sorted((stored() ?? SEED).map(r => ({ ...r }))); },
    async add(input) {
      if (!validMonth(input.month)) throw new Error("유효한 월을 선택해 주세요.");
      const department = typeof input.department === "string" ? input.department.trim() : "";
      if (!department || department.length > 80) throw new Error("부서명을 1~80자로 입력해 주세요.");
      if (!safeAmount(input.target) || !safeAmount(input.actual)) throw new Error("목표와 실적은 0 이상의 안전한 정수로 입력해 주세요.");
      const rows = stored() ?? SEED.map(r => ({ ...r }));
      if (rows.some(r => r.month === input.month && r.department.trim() === department)) throw new Error("같은 월과 부서의 자료가 이미 있습니다.");
      const record = { id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, month: input.month, department, target: input.target, actual: input.actual };
      rows.push(record);
      try { localStorage.setItem(KEY, JSON.stringify(rows)); }
      catch { throw new Error("이 브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요."); }
      return { ...record };
    }
  };
  Object.defineProperty(window, "KPIRepository", { value: Object.freeze(adapter), writable: false, configurable: false });
})();
