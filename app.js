// plan.json 을 읽어 화면을 그린다. 계산은 하지 않는다.
// 계산은 전부 PC에서 끝났고, 여기는 보여주기만 한다.

const root = document.getElementById('root');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function todayCard(t) {
  const amount = t.distance_km > 0
    ? `총 ${t.distance_km}km` + (t.duration_min ? ` · 약 ${t.duration_min}분` : '')
    : '';
  const pace = t.pace ? `${t.pace} /km` : '';
  const lines = t.reasons.slice();
  // 가민이 우리와 다르게 본 날에만 붙는다. 참고용이라 목록 끝에 둔다.
  if (t.garmin_note) lines.push(t.garmin_note);
  const reasons = lines.length
    ? `<div class="reasons"><ul>${lines.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`
    : '';

  return `
    <section class="card">
      <div class="head">
        <span>${esc(t.date.slice(5).replace('-', '월 '))}일 ${esc(t.weekday)}</span>
        <span class="dot ${esc(t.level)}">● ${esc(t.level_label)}</span>
      </div>
      <div class="kind">${esc(t.kind)}</div>
      ${pace ? `<div class="pace">${esc(pace)}</div>` : ''}
      ${amount ? `<div class="amount">${esc(amount)}</div>` : ''}
      ${t.done ? `<div class="today-done">✓ 오늘 ${esc(t.done_km)}km 뛰었습니다</div>` : ''}
      ${reasons}
    </section>`;
}

function weekCard(w) {
  const rows = w.days.map(d => `
    <div class="row ${d.is_today ? 'today' : ''}">
      <span class="wd">${esc(d.weekday)}</span>
      <span>${esc(d.kind)}${d.pace ? ` · ${esc(d.pace)}` : ''}</span>
      <span class="km">${d.distance_km > 0 ? esc(d.distance_km) + 'km' : ''}${d.done ? ' <span class="done">✓</span>' : ''}</span>
    </div>`).join('');

  return `
    <section class="card">
      <div class="week-head">
        <span>이번 주</span>
        <span>${esc(w.done_km)} / ${esc(w.planned_km)} km</span>
      </div>
      ${rows}
    </section>`;
}

function goalCard(g) {
  // 쓸 만한 기록이 없어 기본값으로 계산한 날은 그 사실을 붙인다.
  // 처음 쓰는 사람이 기본값을 자기 실력으로 오해하지 않게.
  const current = g.current_is_default
    ? `${esc(g.current)} <span class="hint">(기록 부족, 기본값)</span>`
    : esc(g.current);
  return `
    <section class="card">
      <div class="goal-line"><span>목표</span><span>${esc(g.distance_km)}km ${esc(g.target)}</span></div>
      <div class="goal-line"><span>현재 실력 예상</span><span>${current}</span></div>
      <div class="goal-note">${esc(g.note)}</div>
    </section>`;
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];

function garminCard(t) {
  // today.json 의 days: 가민 코치 플랜 또는 가민 캘린더에 예약한 워크아웃(이번 주 + 다음 주).
  if (!t || !t.days || !t.days.length) return '';
  const todayKey = t.generated_for;
  const rows = t.days.map(d => {
    const day = new Date(d.date + 'T00:00:00');
    const past = d.date < todayKey;
    return d.workouts.map(w => `
      <div class="row ${d.date === todayKey ? 'today' : ''} ${past ? 'past' : ''}">
        <span class="wd">${esc(WD[day.getDay()])}</span>
        <span>${esc(d.date.slice(5).replace('-', '/'))} ${esc(w.name || w.label)}</span>
        <span class="km">${w.distance_km ? esc(w.distance_km) + 'km' : (w.duration_min ? esc(w.duration_min) + '분' : '')}${w.done ? ' <span class="done">✓</span>' : ''}</span>
      </div>`).join('');
  }).join('');
  const src = { garmin_coach: '가민 코치', garmin_calendar: '가민 캘린더', mixed: '가민 코치·캘린더' }[t.source] || '가민';
  return `
    <section class="card">
      <div class="week-head"><span>가민 일정</span><span>${esc(src)}</span></div>
      ${rows}
    </section>`;
}

function trendCard(h) {
  if (!h || !h.length) return '';
  const max = Math.max(...h.map(w => w.km), 1);
  const bars = h.map((w, i) => {
    const pct = Math.round(w.km / max * 100);
    const cur = i === h.length - 1;
    return `
      <div class="bar ${cur ? 'cur' : ''}">
        <span class="bar-km">${w.km > 0 ? esc(w.km) : ''}</span>
        <span class="bar-fill" style="height:${pct}%"></span>
        <span class="bar-wk">${esc(w.start.slice(5).replace('-', '/'))}</span>
      </div>`;
  }).join('');
  const last = h[h.length - 1];
  const prev = h[h.length - 2];
  const note = prev
    ? `이번 주 ${esc(last.runs)}회 · 지난주 ${esc(prev.km)}km ${esc(prev.runs)}회${prev.avg_pace ? ` · 평균 ${esc(prev.avg_pace)}/km` : ''}`
    : '';
  return `
    <section class="card">
      <div class="week-head"><span>주간 거리 (최근 ${h.length}주)</span><span>km</span></div>
      <div class="bars">${bars}</div>
      ${note ? `<div class="goal-note">${note}</div>` : ''}
    </section>`;
}

async function fetchJson(name) {
  try {
    const res = await fetch(name + '?t=' + Date.now());
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

function staleWarning(generatedFor) {
  // 수집기가 며칠 멈춰 있으면 낡은 플랜을 최신인 줄 알고 따라가게 된다.
  const made = new Date(generatedFor + 'T00:00:00');
  const days = Math.floor((Date.now() - made.getTime()) / 86400000);
  if (days < 1) return '';
  return `<p class="stale">${days}일 전에 만든 플랜입니다. PC에서 갱신이 안 되고 있습니다.</p>`;
}

async function main() {
  const [p, t] = await Promise.all([fetchJson('plan.json'), fetchJson('today.json')]);
  if (!p) {
    root.innerHTML = '<p class="error">플랜을 불러오지 못했습니다.</p>';
    return;
  }
  // 가민 일정은 없어도 된다(파일이 없거나 형식이 옛것). 그때는 카드만 빠진다.
  root.innerHTML =
    todayCard(p.today) + garminCard(t) + weekCard(p.week) + trendCard(p.history)
    + goalCard(p.goal) + staleWarning(p.generated_for);
}

main();
