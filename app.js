/* Presentation and interaction layer. KPIRepository owns data access. */
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const el = {
    theme: $("#themeSelect"),
    month: $("#monthFilter"), dept: $("#departmentFilter"), target: $("#targetTotal"), actual: $("#actualTotal"), rate: $("#achievementRate"),
    progress: $("#progressFill"), rateCaption: $("#rateCaption"), rateDelta: $("#rateDelta"), targetCount: $("#targetCount"), actualCount: $("#actualCount"),
    count: $("#recordCount"), recordCaption: $("#recordCaption"), recordTotal: $("#recordTotal"), tbody: $("#recordsBody"), table: $("#tableWrap"),
    empty: $("#emptyState"), emptyTitle: $("#emptyTitle"), emptyDescription: $("#emptyDescription"), emptyAction: $("#emptyAction"),
    error: $("#errorState"), errorMessage: $("#errorMessage"), retry: $("#retryButton"), dialog: $("#recordDialog"), form: $("#recordForm"),
    inputMonth: $("#inputMonth"), inputDept: $("#inputDepartment"), inputTarget: $("#inputTarget"), inputActual: $("#inputActual"),
    formMessage: $("#formMessage"), toast: $("#toast")
  };
  const money = value => `${new Intl.NumberFormat("ko-KR").format(value)}원`;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const monthLabel = value => `${value.slice(0, 4)}년 ${Number(value.slice(5, 7))}월`;
  let data = [];
  const themes = { sunrise: { color: "#fbf6f1", title: "Sunrise · 산호색과 오렌지" }, "ink-blue": { color: "#f2f5fa", title: "Ink & Blue · 네이비와 코발트" } };
  function applyTheme(name, persist = true) {
    const selected = themes[name] ? name : "sunrise";
    const theme = themes[selected];
    el.theme.value = selected;
    document.documentElement.dataset.theme = selected;
    document.querySelector('meta[name="theme-color"]').content = theme.color;
    document.title = `KPI 현황 | ${theme.title}`;
    if (persist) { try { localStorage.setItem("kpi-desk.theme", selected); } catch {} }
  }
  function buildOptions(records) {
    const selectedMonth = el.month.value || "all", selectedDept = el.dept.value || "all";
    const months = [...new Set(records.map(r => r.month))].sort((a, b) => b.localeCompare(a));
    const depts = [...new Set(records.map(r => r.department))].sort((a, b) => a.localeCompare(b, "ko"));
    el.month.innerHTML = '<option value="all">전체 월</option>' + months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join("");
    el.dept.innerHTML = '<option value="all">전체 부서</option>' + depts.map(d => `<option value="${escape(d)}">${escape(d)}</option>`).join("");
    el.month.value = months.includes(selectedMonth) ? selectedMonth : "all";
    el.dept.value = depts.includes(selectedDept) ? selectedDept : "all";
  }
  function summarize(rows) {
    const target = rows.reduce((sum, r) => sum + r.target, 0);
    const actual = rows.reduce((sum, r) => sum + r.actual, 0);
    const rate = target > 0 ? actual / target * 100 : null;
    el.target.textContent = money(target); el.actual.textContent = money(actual);
    el.targetCount.textContent = `${rows.filter(r => r.target > 0).length}건 목표 설정`;
    el.actualCount.textContent = `${rows.length}건 실적`;
    el.count.textContent = `${rows.length}건`; el.recordCaption.textContent = rows.length ? "근거표와 일치" : "결과 없음";
    el.rateCaption.textContent = rate === null ? "합산 목표가 0원입니다" : "실적 합계 ÷ 목표 합계";
    el.rate.textContent = rate === null ? "목표 미설정" : `${rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
    el.progress.style.width = rate === null ? "0%" : `${Math.min(rate, 100)}%`;
    el.rateDelta.textContent = rate === null ? "목표 입력 필요" : rate >= 100 ? "목표 달성" : `${(100 - rate).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}% 남음`;
    el.recordTotal.textContent = `${rows.length}건`;
  }
  function renderRows(rows) {
    el.tbody.innerHTML = rows.map(r => {
      const rate = r.target === 0 ? null : r.actual / r.target * 100;
      const shownRate = rate === null ? '<span class="rate-cell unset">목표 미설정</span>' : `<span class="rate-cell">${rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%</span>`;
      return `<tr><td class="month-cell">${monthLabel(r.month)}</td><td class="department-cell">${escape(r.department)}</td><td class="number money-cell">${money(r.target)}</td><td class="number money-cell">${money(r.actual)}</td><td class="number">${shownRate}</td><td class="progress-cell"><div class="mini-progress" aria-label="${rate === null ? "목표 미설정" : `${rate.toFixed(2)}% 진행`}"><span style="width:${rate === null ? 0 : Math.min(rate, 100)}%"></span></div></td></tr>`;
    }).join("");
  }
  function render() {
    const rows = data.filter(r => (el.month.value === "all" || r.month === el.month.value) && (el.dept.value === "all" || r.department === el.dept.value));
    summarize(rows); el.error.hidden = true; el.table.hidden = rows.length === 0; el.empty.hidden = rows.length !== 0;
    if (rows.length) { renderRows(rows); return; }
    el.tbody.innerHTML = "";
    el.emptyTitle.textContent = data.length ? "조건에 맞는 실적이 없습니다" : "아직 입력된 실적이 없습니다";
    el.emptyDescription.textContent = data.length ? "월과 부서 조건을 바꾸거나 필터를 초기화해 보세요." : "실적을 입력하면 부서별 근거를 확인할 수 있습니다.";
    el.emptyAction.hidden = data.length === 0;
  }
  async function load() {
    el.table.hidden = true; el.empty.hidden = true; el.error.hidden = true; el.tbody.innerHTML = "";
    try { data = await window.KPIRepository.list(); buildOptions(data); render(); }
    catch (error) {
      el.target.textContent = "—"; el.actual.textContent = "—"; el.rate.textContent = "—"; el.count.textContent = "—"; el.recordTotal.textContent = "—";
      el.errorMessage.textContent = error.message || "잠시 후 다시 시도해 주세요."; el.error.hidden = false;
    }
  }
  function formError(message) { el.formMessage.textContent = message; el.formMessage.hidden = false; }
  el.month.addEventListener("change", render); el.dept.addEventListener("change", render);
  el.theme.addEventListener("change", () => applyTheme(el.theme.value));
  $("#resetFilters").addEventListener("click", () => { el.month.value = "all"; el.dept.value = "all"; render(); });
  el.emptyAction.addEventListener("click", () => { el.month.value = "all"; el.dept.value = "all"; render(); });
  el.retry.addEventListener("click", load);
  $("#addRecordButton").addEventListener("click", () => { el.form.reset(); el.formMessage.hidden = true; el.inputMonth.value = el.month.value === "all" ? "2026-10" : el.month.value; el.dialog.showModal(); el.inputDept.focus(); });
  const close = () => { if (el.dialog.open) el.dialog.close(); };
  $("#closeDialog").addEventListener("click", close); $("#cancelDialog").addEventListener("click", close);
  el.dialog.addEventListener("click", event => { if (event.target === el.dialog) close(); });
  el.form.addEventListener("submit", async event => {
    event.preventDefault(); el.formMessage.hidden = true;
    const target = Number(el.inputTarget.value), actual = Number(el.inputActual.value);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(el.inputMonth.value)) return formError("유효한 월을 선택해 주세요.");
    if (!el.inputDept.value.trim()) return formError("부서명을 입력해 주세요.");
    if (!Number.isSafeInteger(target) || target < 0 || !Number.isSafeInteger(actual) || actual < 0) return formError("목표와 실적은 0 이상의 정수로 입력해 주세요.");
    try {
      await window.KPIRepository.add({ month: el.inputMonth.value, department: el.inputDept.value, target, actual });
      close(); await load(); el.toast.textContent = "샘플 데이터를 이 브라우저에 저장했습니다."; el.toast.hidden = false; setTimeout(() => { el.toast.hidden = true; }, 2800);
    } catch (error) { formError(error.message || "저장하지 못했습니다."); }
  });
  let savedTheme = "sunrise";
  try { savedTheme = localStorage.getItem("kpi-desk.theme") || "sunrise"; } catch {}
  applyTheme(savedTheme, false);
  load();
})();
