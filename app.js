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

  if (t.kind_code === 'check' && !t.done) lines.push('오늘은 기록 측정이다냥. 처음엔 참고 마지막에 올려라냥. 시계 자동 일시정지는 끄라냥.');
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
  const what = r.kind === 'check' ? '기록 측정' : '대회';
  const dday = r.days_left === 0 ? `오늘이 ${what}다냥` : `${what} ${r.days_left}일 전이다냥`;
  const reality = r.kind === 'check'
    ? `측정 목표 ${r.target}는 지금 실력 환산에 지구력 보정 4%를 붙인 값이다냥(추정). 처음 달리는 거리라 15km까지는 참는다냥.`
    : r.gap_sec > 0
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
      <div class="coach-head"><span class="cat">🏁</span> 냥코치 ${esc(what)} 전략 · ${esc(dday)}</div>
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
      ${t.kind_code === 'strength' ? '<a class="guide-link" href="#strength-guide">운동 설명과 그림은 아래 근력 운동 안내에 있다냥 ↓</a>' : ''}
      ${reasons}
    </section>`;
}

// ---------------------------------------------------------------- 근력 운동 안내 (2026-10-28)
// 시계 근력 워크아웃에는 운동 이름만 뜨고 시범이 없어(가민은 자기 기본 워크아웃에만 애니메이션을 붙인다)
// 여기서 자세·횟수·흔한 실수·러너에게 왜 필요한지를 설명한다. 그림은 인라인 SVG 막대 인물(외부 이미지 없음).
// 횟수·바퀴·휴식은 plan.json 의 strength(가민 워크아웃과 같은 상수에서 만든 것)를 쓰고, 없으면 기본값.

const STRENGTH_DEFAULT = {
  rounds: 3, rest_sec: 20, round_rest_sec: 60, warmup_sec: 180, cooldown_sec: 120, minutes: 30,
  menu: [
    { key: 'AIR_SQUAT', label: '맨몸 스쿼트 15회' },
    { key: 'LUNGE', label: '런지 좌우 10회씩' },
    { key: 'SINGLE_LEG_HIP_RAISE', label: '한 다리 힙 브리지 좌우 10회씩' },
    { key: 'SINGLE_LEG_STANDING_CALF_RAISE', label: '한 다리 카프 레이즈 좌우 12회씩' },
    { key: 'PLANK', label: '플랭크 45초' },
    { key: 'SIDE_PLANK', label: '사이드 플랭크 좌우 30초씩' },
    { key: 'DEAD_BUG', label: '데드버그 좌우 10회씩' },
  ],
};

// 막대 인물. 64x48 칸, 선 색은 글자 색(currentColor). 머리 = 원, 몸·팔·다리 = 꺾은선.
const SVG_HEAD = (x, y) => `<circle cx="${x}" cy="${y}" r="4"/>`;
const FIG = {
  warmup: `${SVG_HEAD(30, 8)}<path d="M30 12v16M30 16l-7 7M30 16l7 5M30 28l-6 16M30 28l12 7"/><path d="M38 40c4-2 8-6 9-11" stroke-dasharray="2 2"/>`,
  AIR_SQUAT: `${SVG_HEAD(26, 8)}<path d="M26 12l-2 14M24 26l14-4M24 26l12 6-2 12M22 44h18M24 26l-8 9 4 9"/>`,
  LUNGE: `${SVG_HEAD(28, 7)}<path d="M28 11v16M28 15l-6 8M28 15l6 8M28 27l-12 6 2 11M28 27l14 6-2 11M14 44h34"/>`,
  SINGLE_LEG_HIP_RAISE: `${SVG_HEAD(8, 36)}<path d="M12 38l18-10 10 2 4 14M30 28l16-10M4 44h56M12 38l10 4"/>`,
  SINGLE_LEG_STANDING_CALF_RAISE: `${SVG_HEAD(30, 7)}<path d="M30 11v16M30 15l-7 6M30 15l8 2M30 27l-2 11 4 4M30 27l10 5-4 8M20 44h22M40 44v-4h10"/>`,
  PLANK: `${SVG_HEAD(10, 24)}<path d="M14 26l36 6M18 27l-4 10h8M50 32l4 11M6 44h52"/>`,
  SIDE_PLANK: `${SVG_HEAD(14, 16)}<path d="M18 20l34 14M18 26l-4 10h6M18 20l4-10M52 34l6 8M6 44h52"/>`,
  DEAD_BUG: `${SVG_HEAD(12, 38)}<path d="M16 38h18l6-14M34 38l14 2M22 38l2-16M34 38l10-8M4 44h56"/>`,
  cooldown: `${SVG_HEAD(22, 12)}<path d="M24 16l6 10 12 2M30 26l-6 16M30 26l8 2 6 12M18 44h30M44 40v-6h10"/>`,
};

const STRENGTH_GUIDE = {
  AIR_SQUAT: {
    how: ['발은 어깨너비, 발끝은 살짝 바깥으로 둔다냥.', '엉덩이를 뒤로 빼며 앉고, 허벅지가 바닥과 평행할 때까지 내려간다냥.', '무릎은 발끝 방향, 가슴은 든 채 뒤꿈치로 밀어 일어난다냥.'],
    bad: '무릎이 안쪽으로 모이거나 뒤꿈치가 뜨면 틀린 자세다냥.',
    why: '허벅지 앞·엉덩이가 착지 충격을 받아 주고 무릎을 지킨다냥.',
  },
  LUNGE: {
    how: ['한 발을 크게 앞으로 내딛고 양 무릎을 90도까지 내린다냥.', '앞무릎은 발목 위, 뒷무릎은 바닥 가까이, 상체는 세운다냥.', '앞발 뒤꿈치로 밀어 제자리로 돌아온다냥.'],
    bad: '보폭이 짧아 앞무릎이 발끝을 한참 넘어가면 틀렸다냥.',
    why: '달리기는 한 다리씩 하는 운동이다냥. 좌우 힘 차이와 골반 흔들림을 줄인다냥.',
  },
  SINGLE_LEG_HIP_RAISE: {
    how: ['누워 무릎을 세우고 한 다리는 펴서 든다냥.', '뒤꿈치로 바닥을 밀어 어깨-엉덩이-무릎이 일직선이 될 때까지 올린다냥.', '꼭대기에서 1초 멈추고 천천히 내린다냥.'],
    bad: '허리를 젖혀 올리면 안 된다냥. 엉덩이가 아니라 허리가 뻐근하면 틀린 것이다냥.',
    why: '엉덩이가 약하면 햄스트링과 허리가 대신 일해서 다친다냥. 추진력은 엉덩이에서 나온다냥.',
  },
  SINGLE_LEG_STANDING_CALF_RAISE: {
    how: ['벽이나 의자에 손가락만 대고 한 발로 선다냥.', '뒤꿈치를 최대한 높이 올려 1초 버티고, 2~3초에 걸쳐 천천히 내린다냥.', '계단 끝에 서면 아래로 더 내려가 범위가 커진다냥.'],
    bad: '발목이 바깥으로 꺾이거나 반동으로 튕기면 안 된다냥.',
    why: '종아리와 아킬레스건은 달릴 때 체중의 몇 배를 받는다냥. 여기가 약하면 정강이·아킬레스가 아프다냥.',
  },
  PLANK: {
    how: ['팔꿈치는 어깨 바로 아래, 머리-어깨-엉덩이-뒤꿈치가 일직선이다냥.', '배꼽을 등 쪽으로 당기고 엉덩이를 살짝 조인다냥.', '숨은 멈추지 않는다냥.'],
    bad: '엉덩이가 처지거나 하늘로 솟으면 틀린 자세다냥.',
    why: '몸통이 단단해야 후반에 자세가 안 무너지고 다리 힘이 땅에 그대로 전달된다냥.',
  },
  SIDE_PLANK: {
    how: ['옆으로 누워 팔꿈치를 어깨 아래에 두고 발은 포개거나 앞뒤로 둔다냥.', '엉덩이를 들어 머리부터 발까지 일직선을 만든다냥.', '위쪽 손은 허리에 얹거나 하늘로 뻗는다냥.'],
    bad: '엉덩이가 뒤로 빠지거나 아래로 처지면 틀렸다냥.',
    why: '옆구리와 엉덩이 옆 근육이 한 발 착지 때 골반을 수평으로 잡는다냥. 무릎 바깥 통증의 예방이다냥.',
  },
  DEAD_BUG: {
    how: ['누워 팔은 천장으로, 무릎은 90도로 든다냥.', '허리를 바닥에 붙인 채 반대쪽 팔과 다리를 천천히 바닥 직전까지 뻗는다냥.', '내쉬며 뻗고 들이쉬며 돌아온다냥.'],
    bad: '허리가 바닥에서 뜨면 범위를 줄인다냥.',
    why: '팔다리가 반대로 움직일 때 몸통을 잡는 것, 그게 달리기 그 자체다냥.',
  },
};

function secText(s) {
  return s % 60 === 0 ? `${s / 60}분` : `${s}초`;
}

function figure(key) {
  const body = FIG[key] || '';
  return `<svg class="fig" viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function strengthCard(p, t) {
  const s = (p && p.strength && p.strength.menu && p.strength.menu.length) ? p.strength : STRENGTH_DEFAULT;
  const todayStrength = (p && p.today && p.today.kind_code === 'strength')
    || !!(t && t.today && (t.today.workouts || []).some(w => w.code === 'strength'));
  const items = s.menu.map(m => {
    const g = STRENGTH_GUIDE[m.key];
    if (!g) return `<li class="ex"><div>${figure(m.key)}</div><div><div class="ex-name">${esc(m.label)}</div></div></li>`;
    return `
      <li class="ex">
        <div>${figure(m.key)}</div>
        <div>
          <div class="ex-name">${esc(m.label)}</div>
          <ul class="ex-how">${g.how.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
          <div class="ex-bad">실수: ${esc(g.bad)}</div>
          <div class="ex-why">왜: ${esc(g.why)}</div>
        </div>
      </li>`;
  }).join('');
  return `
    <details class="card strength" id="strength-guide" ${todayStrength ? 'open' : ''}>
      <summary><span class="coach-head"><span class="cat">🐱</span> 근력 운동 안내</span>
        <span class="hint">맨몸 약 ${esc(s.minutes)}분 · ${esc(s.rounds)}바퀴</span></summary>
      <p class="goal-note">시계에는 운동 이름만 뜬다냥. 자세는 여기서 익히고 가라냥. 통증이 나면 그 운동은 빼고 전문가에게 보여라냥.</p>
      <ul class="ex-list">
        <li class="ex">
          <div>${figure('warmup')}</div>
          <div><div class="ex-name">준비 ${esc(secText(s.warmup_sec))}</div>
            <ul class="ex-how"><li>제자리 걷기, 다리 앞뒤 스윙 좌우 10회씩, 고관절 돌리기로 몸을 데운다냥.</li></ul></div>
        </li>
        ${items}
        <li class="ex">
          <div>${figure('cooldown')}</div>
          <div><div class="ex-name">마무리 ${esc(secText(s.cooldown_sec))}</div>
            <ul class="ex-how"><li>종아리·햄스트링·고관절 앞을 각 20~30초씩 늘린다냥. 반동 없이 숨을 길게 쉰다냥.</li></ul></div>
        </li>
      </ul>
      <p class="goal-note">7가지를 차례로 한 바퀴, ${esc(s.rounds)}바퀴 돈다냥. 운동 사이 ${esc(s.rest_sec)}초, 바퀴 사이 ${esc(s.round_rest_sec)}초 쉰다냥. 횟수를 못 채우면 자세를 지키는 데까지만 하고 다음 주에 채운다냥.</p>
    </details>`;
}

// 운동 시간: 60분 미만은 "47분", 넘으면 "1시간 5분"
function minText(m) {
  return m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`;
}

function weekCard(w) {
  // 뛴 날은 실제 거리를, 계획 거리는 옆에 작게. 계획에 없던 날 뛴 것도 보인다.
  // 계획과 실제를 나란히. 표시: ✓ 계획의 80% 이상(초록) / △ 덜 뜀(노랑) / ✗ 지난 날인데 안 뜀(빨강).
  // 계획 없이 뛴 날은 회색 ✓. 오늘은 뛰었을 때만 표시한다(아직 하루가 남았다).
  // 지난 날 계획은 그날 저장한 확정 처방(plan.json days[].fixed). 저장 전 날은 recomputed 라 * 를 붙인다.
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
      <span class="wk">${esc(d.kind)}${d.strides ? `+질주` : ''}${d.pace ? ` · ${esc(d.pace)}` : ''}${
        d.recomputed ? '<span class="rc">*</span>' : ''}</span>
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
      ${w.days.some(d => d.recomputed)
        ? '<p class="hint">* 그날 저장된 처방이 없어 지금 규칙으로 다시 계산한 계획이다냥. 그때 받은 처방과 다를 수 있다냥.</p>' : ''}
      ${w.first_day && w.first_day.first_weekday
        ? `<p class="hint">한 주는 ${esc(w.first_day.first_weekday)}요일부터 (${esc(w.first_day.source)})</p>` : ''}
    </section>`;
}

function garminPredLine(gp, km) {
  // 가민 레이스 예측(참고). 가민 계산식은 비공개라 엔진 예상과 나란히 보여 준다냥.
  if (!gp) return '';
  const key = km === 5 ? '5k' : km === 10 ? '10k' : (Math.abs(km - 21.0975) < 0.01 ? 'half' : null);
  if (!key || !gp[key]) return '';
  return `<div class="goal-line"><span>가민 예측 (참고)</span><span>${esc(gp[key])}</span></div>`;
}

function goalCard(g, gp) {
  // 쓸 만한 기록이 없어 기본값으로 계산한 날은 그 사실을 붙인다.
  // 처음 쓰는 사람이 기본값을 자기 실력으로 오해하지 않게.
  const current = g.current_is_default
    ? `${esc(g.current)} <span class="hint">(기록이 모자라 기본값이다냥)</span>`
    : esc(g.current);
  return `
    <section class="card">
      <div class="goal-line"><span>목표</span><span>${esc(g.distance_km)}km ${esc(g.target)}</span></div>
      <div class="goal-line"><span>현재 실력 예상</span><span>${current}</span></div>
      ${garminPredLine(gp, Number(g.distance_km))}
      <div class="goal-note">${esc(nyang(g.note))}</div>
    </section>`;
}

function longGoalCard(lg, gp) {
  // 장기목표(2026-10-24): 처방에는 안 쓰고 진행 상황만 보여 준다냥.
  if (!lg) return '';
  const gap = lg.gap_sec;
  const speed = gap === null || gap === undefined ? ''
    : gap <= 0 ? '속도는 이미 목표보다 빠르다냥. 남은 건 그 거리를 버티는 지구력이다냥.'
    : `속도로도 아직 ${Math.round(gap / 60)}분쯤 모자라다냥.`;
  const share = Math.round((lg.longest_share || 0) * 100);
  return `
    <section class="card">
      <div class="goal-line"><span>장기목표</span><span>${esc(lg.name || '')} ${esc(lg.target)}</span></div>
      <div class="goal-line"><span>지금 속도로 환산</span><span>${esc(lg.predicted || '-')}</span></div>
      ${garminPredLine(gp, Number(lg.distance_km))}
      <div class="goal-line"><span>최근 90일 최장</span><span>${esc(lg.longest_km)}km (${share}%)</span></div>
      <div class="goal-note">${esc(speed)} 환산은 지구력이 충분하다는 가정이라 실제보다 빠르게 나온다냥.</div>
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

function watchSyncLine(w) {
  // 시계 자동 반영 요약(날짜·건수만, 공개 저장소라 계정 번호는 없다냥).
  if (!w || !w.status) return '';
  const label = { applied: '시계에 반영했다냥', noop: '시계는 이미 처방과 같다냥', unchanged: '처방이 안 바뀌어 시계도 그대로다냥',
    skipped: '오늘은 시계 반영을 건너뛰었다냥', error: '시계 반영이 실패했다냥. 내일 다시 한다냥', partial: '시계에 일부만 반영됐다냥',
    off: '시계 자동 반영이 꺼져 있다냥' }[w.status] || '';
  if (!label) return '';
  return `<p class="stale">시계 반영 ${esc(w.date || '')} · ${esc(label)} (변경 ${esc(w.changes || 0)}건)</p>`;
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
    + raceCard(p.race_strategy) + coachCard(p) + todayCard(p.today) + garminCard(t) + weekCard(p.week)
    + strengthCard(p, t) + trendCard(p.history)
    + goalCard(p.goal, p.garmin_prediction) + longGoalCard(p.long_goal, p.garmin_prediction)
    + watchSyncLine(p.watch_sync) + staleWarning(p.generated_for);
}

main();
