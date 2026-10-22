// plan.json 을 읽어 화면을 그린다. 계산은 하지 않는다.
// 계산은 전부 PC에서 끝났고, 여기는 보여주기만 한다.
// 화자는 냥코치(고양이 러닝 코치)다. 문장은 '냥'으로 끝낸다(2026-10-22 사용자 결정).
// 냥코치 한마디는 plan.json 숫자로만 만든 규칙 기반 문장이다.

const root = document.getElementById('root');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 계산 쪽(PC)에서 온 존댓말 문장을 냥코치 말투로. src/gtp/report.py 의 nyang() 과 같은 규칙.
const NYANG_ENDINGS = [
  ['했습니다.', '했다냥.'], ['합니다.', '한다냥.'], ['봅니다.', '본다냥.'],
  ['없습니다.', '없다냥.'], ['있습니다.', '있다냥.'], ['입니다.', '이다냥.'],
  ['습니다.', '다냥.'], ['예상.', '예상이다냥.'],
];

function nyang(text) {
  return String(text ?? '').trim().split(/(?<=\.)\s+/).filter(Boolean).map(s => {
    for (const [a, b] of NYANG_ENDINGS) {
      if (s.endsWith(a)) { s = s.slice(0, -a.length) + b; break; }
    }
    if (!s.endsWith('냥') && !s.endsWith('냥.')) {
      // 마침표 없는 요약 줄(예: "수면 5.0시간 · 준비도 38")은 그대로 둔다.
      if (!s.endsWith('.')) return s;
      s = s.slice(0, -1) + '다냥.';
    }
    return s;
  }).join(' ');
}

function daysUntilRace(p) {
  const race = (p.week.days || []).find(d => d.kind_code === 'race');
  if (!race) return null;
  const ms = new Date(race.date + 'T00:00:00') - new Date(p.today.date + 'T00:00:00');
  return Math.round(ms / 86400000);
}

function coachCard(p) {
  const t = p.today;
  const lines = [];
  const planned = t.distance_km || 0;
  const ratio = planned > 0 && t.done ? Math.round(t.done_km / planned * 100) : null;
  const dRace = daysUntilRace(p);

  if (t.done && planned > 0) {
    lines.push(`오늘 ${t.done_km}km 뛰었다냥. 처방(${t.kind} ${planned}km)의 ${ratio}%다냥.`);
    if (ratio < 80) lines.push('처방의 80%도 못 채웠다냥. 이유를 대 보라냥.');
    else if (ratio > 130 && dRace !== null && dRace >= 0 && dRace <= 7)
      lines.push('테이퍼 기간에 처방보다 한참 더 뛰었다냥. 대회 전엔 피로를 빼야 한다냥. 남은 날은 처방 거리를 넘기지 마라냥.');
    else if (ratio > 130) lines.push('처방보다 30% 넘게 더 뛰었다냥. 욕심은 부상으로 돌아온다냥.');
    else lines.push('오늘 몫은 했다냥. 칭찬은 기록이 오르면 해 주겠다냥.');
  } else if (t.done) {
    lines.push(`쉬는 날인데 ${t.done_km}km 뛰었다냥. 회복도 훈련이다냥.`);
  } else if (planned > 0) {
    lines.push(`오늘 처방은 ${t.kind} ${planned}km${t.pace ? `, ${t.pace}/km` : ''}다냥. 핑계 없이 뛰라냥.`);
  } else {
    lines.push('오늘은 쉬는 날이다냥. 제대로 쉬는 것도 실력이다냥.');
  }

  if (t.level === 'red') lines.push('컨디션 신호가 빨강이다냥. 오늘은 강도를 빼라냥. 통증이 있으면 멈추고 전문가와 상담하라냥.');
  else if (t.level === 'yellow') lines.push('컨디션 신호가 노랑이다냥. 강도를 한 단계 낮췄다냥.');

  if (dRace !== null && dRace > 0 && dRace <= 14) lines.push(`대회까지 ${dRace}일 남았다냥.`);
  else if (dRace === 0) lines.push('오늘이 대회다냥. 연습한 만큼만 뛰고 오라냥.');

  return `
    <section class="card coach">
      <div class="coach-head"><span class="cat">🐱</span> 냥코치 한마디</div>
      <ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    </section>`;
}

function raceCard(r) {
  // 대회 3일 전~당일에만 plan.json 에 race_strategy 가 들어온다.
  if (!r) return '';
  const dday = r.days_left === 0 ? '오늘이 대회다냥' : `대회 ${r.days_left}일 전이다냥`;
  const reality = r.gap_sec > 0
    ? `훈련 기록으로 본 예상 기록(추정)은 ${r.predicted}다냥. 목표 ${r.target}보다 ${Math.floor(r.gap_sec / 60)}분 ${r.gap_sec % 60}초 느리다냥. 초반에 무리하면 후반에 무너진다냥.`
    : `예상 기록(추정) ${r.predicted}로 목표 ${r.target}은 해볼 만하다냥. 그래도 초반 과속은 금지다냥.`;
  const lines = [
    reality,
    `전반 ${r.first_half_km}km: ${r.first_half_pace[0]}~${r.first_half_pace[1]}/km로 참는다냥. 첫 1km가 ${r.first_km_floor}보다 빠르면 무조건 늦춘다냥.`,
    `${r.first_half_km}km 지점을 ${r.half_split} 안팎으로 지났고 숨이 남았으면, 후반은 ${r.second_half_pace[0]}~${r.second_half_pace[1]}/km로 올린다냥.`,
    `${r.first_half_km}km에서 이미 힘들면 플랜 B다냥. ${r.plan_b_pace}/km를 끝까지 지킨다냥.`,
    '마지막 1km에서 남은 힘을 다 쓴다냥.',
  ];
  const prep = [
    '전날 밤 7시간 이상 잔다냥. 시계는 폰과 동기화해 둔다냥.',
    '아침은 출발 2~3시간 전에, 평소 먹던 것으로 먹는다냥.',
    '출발 30분 전 조깅 10분, 그다음 20초 질주 4회로 몸을 깨운다냥.',
    '가슴 통증·어지럼·찌르는 통증이 오면 기록이고 뭐고 바로 멈춘다냥.',
  ];
  return `
    <section class="card race">
      <div class="coach-head"><span class="cat">🏁</span> 냥코치 대회 전략 · ${esc(dday)}</div>
      <div class="race-goal">${esc(r.distance_km)}km 목표 ${esc(r.target)} · 평균 ${esc(r.goal_pace)}/km</div>
      <ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="race-sub">준비</div>
      <ul>${prep.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    </section>`;
}

function todayCard(t) {
  const amount = t.distance_km > 0
    ? `총 ${t.distance_km}km` + (t.duration_min ? ` · 약 ${t.duration_min}분` : '')
    : '';
  const pace = t.pace ? `${t.pace} /km` : '';
  const lines = t.reasons.map(nyang);
  // 가민이 우리와 다르게 본 날에만 붙는다. 참고용이라 목록 끝에 둔다.
  if (t.garmin_note) lines.push(nyang(t.garmin_note));
  const reasons = lines.length
    ? `<div class="reasons"><ul>${lines.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`
    : '';

  return `
    <section class="card">
      <div class="head">
        <span>${esc(t.date.slice(5).replace('-', '월 '))}일 ${esc(t.weekday)}</span>
        <span class="dot ${esc(t.level)}">● ${esc(t.level_label)}</span>
      </div>
      <div class="kind">${esc(t.kind)}${t.strides ? ` + 질주 ${esc(t.strides)}회` : ''}</div>
      ${pace ? `<div class="pace">${esc(pace)}</div>` : ''}
      ${amount ? `<div class="amount">${esc(amount)}</div>` : ''}
      ${t.done ? `<div class="today-done">✓ 오늘 ${esc(t.done_km)}km 뛰었다냥</div>` : ''}
      ${reasons}
    </section>`;
}

// 운동 시간: 60분 미만은 "47분", 넘으면 "1시간 5분"
function minText(m) {
  return m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`;
}

function weekCard(w) {
  // 뛴 날은 실제 거리를, 계획 거리는 옆에 작게. 계획에 없던 날 뛴 것도 보인다.
  // 계획과 실제를 나란히. 표시: ✓ 계획의 80% 이상(초록) / △ 덜 뜀(노랑) / ✗ 지난 날인데 안 뜀(빨강).
  // 계획 없이 뛴 날은 회색 ✓. 오늘은 뛰었을 때만 표시한다(아직 하루가 남았다).
  const todayIdx = w.days.findIndex(d => d.is_today);
  const rows = w.days.map((d, i) => {
    const past = todayIdx >= 0 ? i < todayIdx : false;
    const planned = d.distance_km > 0;
    const ran = d.actual_km > 0;
    let mark = '';
    if (planned && d.done) mark = '<span class="mk ok">✓</span>';
    else if (planned && ran) mark = '<span class="mk warn">△</span>';
    else if (planned && past) mark = '<span class="mk bad">✗</span>';
    else if (ran) mark = '<span class="mk extra">✓</span>';
    return `
    <div class="wrow ${d.is_today ? 'today' : ''}">
      <span class="wd">${esc(d.weekday)}</span>
      <span class="wk">${esc(d.kind)}${d.strides ? `+질주` : ''}${d.pace ? ` · ${esc(d.pace)}` : ''}</span>
      <span class="num">${planned ? esc(d.distance_km) + 'km' : ''}</span>
      <span class="num act">${ran ? esc(+d.actual_km.toFixed(1)) + 'km' : (planned && past ? '0km' : '')}${
        d.actual_min ? `<span class="act-min">${esc(minText(d.actual_min))}</span>` : ''}</span>
      ${mark || '<span></span>'}
    </div>`;
  }).join('');
  const head = `
    <div class="wrow whead">
      <span></span><span></span><span class="num">계획</span><span class="num">실제</span><span></span>
    </div>`;

  return `
    <section class="card">
      <div class="week-head">
        <span>이번 주</span>
        <span>실제 ${esc(w.done_km)}km${w.actual_min ? ` · ${esc(minText(w.actual_min))}` : ''} / 계획 ${esc(w.planned_km)}km</span>
      </div>
      ${head}${rows}
      ${w.first_day && w.first_day.first_weekday
        ? `<p class="hint">한 주는 ${esc(w.first_day.first_weekday)}요일부터 (${esc(w.first_day.source)})</p>` : ''}
    </section>`;
}

function goalCard(g) {
  // 쓸 만한 기록이 없어 기본값으로 계산한 날은 그 사실을 붙인다.
  // 처음 쓰는 사람이 기본값을 자기 실력으로 오해하지 않게.
  const current = g.current_is_default
    ? `${esc(g.current)} <span class="hint">(기록이 모자라 기본값이다냥)</span>`
    : esc(g.current);
  return `
    <section class="card">
      <div class="goal-line"><span>목표</span><span>${esc(g.distance_km)}km ${esc(g.target)}</span></div>
      <div class="goal-line"><span>현재 실력 예상</span><span>${current}</span></div>
      <div class="goal-note">${esc(nyang(g.note))}</div>
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
  return `<p class="stale">${days}일 전에 만든 플랜이다냥. PC에서 갱신이 안 되고 있다냥.</p>`;
}

async function main() {
  const [p, t] = await Promise.all([fetchJson('plan.json'), fetchJson('today.json')]);
  if (!p) {
    root.innerHTML = '<p class="error">플랜을 못 불러왔다냥.</p>';
    return;
  }
  // 가민 일정은 없어도 된다(파일이 없거나 형식이 옛것). 그때는 카드만 빠진다.
  root.innerHTML =
    '<div class="byline">🐱 작성: 냥코치</div>'
    + raceCard(p.race_strategy) + coachCard(p) + todayCard(p.today) + garminCard(t) + weekCard(p.week) + trendCard(p.history)
    + goalCard(p.goal) + staleWarning(p.generated_for);
}

main();
