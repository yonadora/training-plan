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

function staleWarning(generatedFor) {
  // 수집기가 며칠 멈춰 있으면 낡은 플랜을 최신인 줄 알고 따라가게 된다.
  const made = new Date(generatedFor + 'T00:00:00');
  const days = Math.floor((Date.now() - made.getTime()) / 86400000);
  if (days < 1) return '';
  return `<p class="stale">${days}일 전에 만든 플랜입니다. PC에서 갱신이 안 되고 있습니다.</p>`;
}

async function main() {
  try {
    const res = await fetch('plan.json?t=' + Date.now());
    if (!res.ok) throw new Error(res.status);
    const p = await res.json();
    root.innerHTML =
      todayCard(p.today) + weekCard(p.week) + goalCard(p.goal)
      + staleWarning(p.generated_for);
  } catch (e) {
    root.innerHTML = '<p class="error">플랜을 불러오지 못했습니다.</p>';
  }
}

main();
