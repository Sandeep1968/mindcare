/* MindCare public catalog — SoulUp-style IA, original USA clinic copy */
const MC_GROUPS = [
  { id: 'anxiety', name: 'Anxiety Support Group', blurb: 'Weekly space for worry, panic, and everyday pressure.', tags: ['Anxiety', 'Adults'], when: 'Tuesdays 6:30pm ET', format: 'Virtual' },
  { id: 'depression', name: 'Depression & Mood Group', blurb: 'Steady company when energy and hope feel low.', tags: ['Depression', 'Adults'], when: 'Wednesdays 12:00pm ET', format: 'Virtual' },
  { id: 'grief', name: 'Grief Support Group', blurb: 'Loss, mourning, and learning to live alongside it.', tags: ['Grief'], when: 'Thursdays 7:00pm ET', format: 'Virtual + in-person' },
  { id: 'trauma', name: 'Trauma & PTSD Group', blurb: 'Pace-sensitive support after overwhelming experiences.', tags: ['Trauma', 'PTSD'], when: 'Mondays 5:30pm ET', format: 'Virtual' },
  { id: 'adhd', name: 'ADHD Support Group', blurb: 'Focus, shame spirals, and systems that actually stick.', tags: ['ADHD', 'Neurodivergence'], when: 'Sundays 4:00pm ET', format: 'Virtual' },
  { id: 'ocd', name: 'OCD Support Group', blurb: 'Intrusive thoughts, rituals, and reclaiming time.', tags: ['OCD'], when: 'Fridays 6:00pm ET', format: 'Virtual' },
  { id: 'relationships', name: 'Relationships Group', blurb: 'Communication, conflict, and connection.', tags: ['Relationships'], when: 'Thursdays 6:00pm ET', format: 'Virtual' },
  { id: 'divorce', name: 'Divorce & Separation Group', blurb: 'Practical and emotional support through a split.', tags: ['Life decisions'], when: 'Saturdays 10:00am ET', format: 'Virtual' },
  { id: 'caregivers', name: 'Caregiver Stress Group', blurb: 'For people holding someone else’s care.', tags: ['Caregiving'], when: 'Wednesdays 7:30pm ET', format: 'Virtual' },
  { id: 'burnout', name: 'Work Burnout Group', blurb: 'Exhaustion, boundaries, and rebuilding a livable pace.', tags: ['Work'], when: 'Tuesdays 12:15pm ET', format: 'Virtual' },
  { id: 'women', name: 'Women’s Circle', blurb: 'Women-only weekly sharing, therapist-facilitated.', tags: ['Women'], when: 'Mondays 7:00pm ET', format: 'In-person' },
  { id: 'couples', name: 'Couples Skills Workshop', blurb: 'Six-week skills group for partners who want tools.', tags: ['Couples', 'Workshop'], when: 'Starts Sep 8', format: 'Virtual' }
];

const MC_ASSESSMENTS = [
  { id: 'anxiety', cat: 'Mental health', name: 'Anxiety check-in', blurb: 'A short reflection on worry, restlessness, and tension.' },
  { id: 'mood', cat: 'Mental health', name: 'Mood & energy check-in', blurb: 'Notice low mood, interest, and daily energy.' },
  { id: 'trauma', cat: 'Mental health', name: 'After something overwhelming', blurb: 'How your body and mind are responding since a hard event.' },
  { id: 'relationship', cat: 'Relationships', name: 'Relationship quality', blurb: 'Safety, repair, and whether the connection still feels mutual.' },
  { id: 'breakup', cat: 'Relationships', name: 'After a breakup', blurb: 'Grief, identity, and how much the split is taking over the day.' },
  { id: 'couples', cat: 'Relationships', name: 'Couples communication', blurb: 'Fight cycles, listening, and whether conversations go anywhere.' },
  { id: 'burnout', cat: 'Work & life', name: 'Work burnout', blurb: 'Exhaustion, cynicism, and whether rest actually restores you.' },
  { id: 'grief', cat: 'Work & life', name: 'Grief & loss', blurb: 'How loss is showing up in sleep, meaning, and connection.' },
  { id: 'caregiving', cat: 'Work & life', name: 'Caregiving load', blurb: 'The hidden cost of looking after someone else.' },
  { id: 'regulation', cat: 'Growth', name: 'Emotional regulation', blurb: 'How quickly feelings spike — and how you come back down.' },
  { id: 'selfesteem', cat: 'Growth', name: 'Self-worth', blurb: 'Inner critic, comparison, and how you treat yourself.' },
  { id: 'parenting', cat: 'Family', name: 'Parenting stress', blurb: 'Capacity, guilt, and support while raising kids or teens.' }
];

const MC_ASSESS_Q = {
  anxiety: ['I feel on edge or unable to relax.', 'Worry is hard to turn off.', 'My body stays tense (jaw, chest, stomach).', 'I avoid things because they might spike anxiety.', 'Sleep is broken by racing thoughts.', 'I need extra reassurance to feel okay.'],
  mood: ['I have little interest in things I used to enjoy.', 'I feel down, empty, or hopeless.', 'Getting started on basic tasks takes huge effort.', 'I am harder on myself than I would be on a friend.', 'Rest does not restore me.', 'I pull away from people even when I want company.'],
  trauma: ['Reminders of what happened still hit hard.', 'I feel jumpy, numb, or both.', 'Sleep or nightmares are disrupted.', 'I avoid places, people, or talks linked to it.', 'I blame myself more than the facts support.', 'I feel unsafe even when I am physically safe.'],
  relationship: ['I can bring up hard topics without it exploding.', 'We repair after conflict.', 'I feel emotionally safe with this person.', 'Affection and effort feel reasonably mutual.', 'I walk on eggshells more than I want to admit.', 'I can be myself, not a managed version of me.'],
  breakup: ['Thoughts of the relationship take over my day.', 'I swing between missing them and being angry.', 'Daily routines (sleep, food, work) are off.', 'I feel unrecognizable to myself.', 'Contact or social media still hooks me.', 'I am not sure who I am without the relationship.'],
  couples: ['The same fight keeps looping.', 'One of us shuts down while the other pursues.', 'We listen to win more than to understand.', 'Appreciation has gone quiet.', 'Intimacy (emotional or physical) feels strained.', 'We still want to be on the same team.'],
  burnout: ['I feel exhausted even after time off.', 'Work leaves me cynical or numb.', 'Small requests feel like too much.', 'I have little left for people I care about.', 'I dread the start of the week.', 'I cannot remember the last time work felt meaningful.'],
  grief: ['Waves of missing them still knock me over.', 'The world feels muted or unreal.', 'I feel guilty for moments of okay-ness.', 'Anniversaries and reminders are especially hard.', 'People expect me to be “over it.”', 'I am not sure how to keep living a life that includes this loss.'],
  caregiving: ['I put their needs ahead of mine until I am depleted.', 'I feel resentful and then guilty for feeling it.', 'There is little backup if I get sick.', 'I have dropped hobbies, friends, or health care.', 'I am always “on.”', 'I do not know who I am besides the caregiver.'],
  regulation: ['Feelings go from 2 to 9 quickly.', 'Once upset, it takes a long time to come back.', 'I say or do things I regret in the heat of it.', 'I numb out with screens, food, or work.', 'Other people seem to handle the same stress more easily.', 'I want tools, not just insight.'],
  selfesteem: ['My inner critic runs the show.', 'I compare myself and come up short.', 'Compliments bounce off; criticism sticks.', 'I struggle to ask for what I need.', 'I feel like an imposter in rooms I earned.', 'Being kind to myself feels unnatural.'],
  parenting: ['I feel I am failing even when I am trying.', 'There is little adult backup.', 'I lose patience faster than I want.', 'I have no time that is just mine.', 'Worry about my child crowds out sleep.', 'I need a place to talk that is not “just venting to a partner.”']
};

const MC_SCALE = ['Never', 'Sometimes', 'Often', 'Most days'];

function mcGroupCard(g) {
  return `<article class="mc-card">
    <div class="mc-card-tag">${esc(g.format)}</div>
    <h3>${esc(g.name)}</h3>
    <p>${esc(g.blurb)}</p>
    <p class="mc-meta">${esc(g.when)}</p>
    <div class="mc-tags">${g.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
    <button type="button" class="btn btn-primary btn-sm" onclick="openMatchQuiz(null,{service:'${g.tags[0] === 'Relationships' ? 'Relationships' : g.tags[0] === 'Trauma' || g.tags[0] === 'PTSD' ? 'Trauma & Recovery' : 'Anxiety & Stress'}'})">Join waitlist</button>
  </article>`;
}

function mcAssessCard(a) {
  return `<article class="mc-card mc-assess-card">
    <div class="mc-card-tag">${esc(a.cat)}</div>
    <h3>${esc(a.name)}</h3>
    <p>${esc(a.blurb)}</p>
    <button type="button" class="btn btn-primary btn-sm" onclick="openAssessment('${a.id}')">Take the test</button>
  </article>`;
}

function renderMcCatalogs() {
  const gHome = document.getElementById('mc-home-groups');
  const gAll = document.getElementById('mc-all-groups');
  const aHome = document.getElementById('mc-home-assess');
  const aAll = document.getElementById('mc-all-assess');
  if (gHome) gHome.innerHTML = MC_GROUPS.slice(0, 8).map(mcGroupCard).join('');
  if (gAll) gAll.innerHTML = MC_GROUPS.map(mcGroupCard).join('');
  if (aHome) aHome.innerHTML = MC_ASSESSMENTS.slice(0, 6).map(mcAssessCard).join('');
  if (aAll) {
    const cats = [...new Set(MC_ASSESSMENTS.map(a => a.cat))];
    aAll.innerHTML = cats.map(cat => `<div class="mc-assess-cat">
      <h3>${esc(cat)}</h3>
      <div class="mc-grid">${MC_ASSESSMENTS.filter(a => a.cat === cat).map(mcAssessCard).join('')}</div>
    </div>`).join('');
  }
}

function showMcView(id) {
  document.querySelectorAll('.mc-view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== id));
  document.querySelectorAll('.mc-nav-link').forEach(a => a.classList.toggle('active', a.dataset.view === id));
  closeMcMenus();
  closeMcSearch();
  if (id !== 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
  const map = { home: '#', groups: '#groups', therapy: '#therapy', assessments: '#assessments', resources: '#resources', community: '#community', partners: '#partners', guides: '#guides' };
  if (map[id] && location.hash !== map[id]) history.replaceState(null, '', map[id] === '#' ? location.pathname : map[id]);
}

function routeMcHash() {
  const h = (location.hash || '#').replace('#', '');
  if (h.startsWith('test-')) {
    showMcView('assessments');
    openAssessment(h.slice(5));
    return;
  }
  const known = ['groups', 'therapy', 'assessments', 'resources', 'community', 'partners', 'guides'];
  showMcView(known.includes(h) ? h : 'home');
}

function toggleMcMenu(id, btn) {
  const panel = document.getElementById(id);
  const open = !panel.classList.contains('open');
  closeMcMenus();
  if (open) {
    panel.classList.add('open');
    btn?.setAttribute('aria-expanded', 'true');
  }
}

function closeMcMenus() {
  document.querySelectorAll('.mc-mega').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.mc-nav-item > button').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

function toggleMcSearch(force) {
  const box = document.getElementById('mc-search-panel');
  if (!box) return;
  const open = force === true || (force !== false && box.classList.contains('hidden'));
  box.classList.toggle('hidden', !open);
  if (open) document.getElementById('mc-search-input')?.focus();
}
function closeMcSearch() {
  document.getElementById('mc-search-panel')?.classList.add('hidden');
}

function runMcSearch(q) {
  q = (q || '').toLowerCase().trim();
  const out = document.getElementById('mc-search-results');
  if (!out) return;
  if (q.length < 2) { out.innerHTML = '<p class="muted">Type at least 2 characters.</p>'; return; }
  const hits = [
    ...MC_GROUPS.filter(g => (g.name + g.blurb + g.tags.join(' ')).toLowerCase().includes(q)).map(g => ({ t: g.name, d: 'Support group', go: "showMcView('groups')" })),
    ...MC_ASSESSMENTS.filter(a => (a.name + a.blurb + a.cat).toLowerCase().includes(q)).map(a => ({ t: a.name, d: 'Assessment', go: `openAssessment('${a.id}')` })),
    { t: 'Get matched', d: 'Therapy matching', go: 'openMatchQuiz()' },
    { t: 'Meet therapists', d: 'Directory', go: "showMcView('therapy')" }
  ].filter(x => x.t.toLowerCase().includes(q) || x.d.toLowerCase().includes(q) || x.go.includes('openAssessment') || x.go.includes('groups'));
  const unique = [];
  hits.forEach(h => { if (!unique.some(u => u.t === h.t)) unique.push(h); });
  out.innerHTML = unique.slice(0, 8).map(h => `<button type="button" class="mc-search-hit" onclick="${h.go};closeMcSearch()"><strong>${esc(h.t)}</strong><span>${esc(h.d)}</span></button>`).join('') || '<p class="muted">No matches. Try anxiety, grief, or burnout.</p>';
}

let assessId = null, assessStep = 0, assessScores = [];

function openAssessment(id) {
  const a = MC_ASSESSMENTS.find(x => x.id === id);
  const qs = MC_ASSESS_Q[id];
  if (!a || !qs) return;
  assessId = id; assessStep = 0; assessScores = [];
  const modal = document.getElementById('assess-quiz');
  document.getElementById('assess-title').textContent = a.name;
  document.getElementById('assess-blurb').textContent = a.blurb + ' This is a self-reflection tool, not a diagnosis.';
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderAssessStep();
}

function closeAssessment() {
  document.getElementById('assess-quiz')?.classList.add('hidden');
  document.body.style.overflow = '';
}

function renderAssessStep() {
  const qs = MC_ASSESS_Q[assessId] || [];
  const body = document.getElementById('assess-body');
  const bar = document.getElementById('assess-bar');
  const nav = document.getElementById('assess-nav');
  if (!body) return;
  if (assessStep >= qs.length) {
    const total = assessScores.reduce((s, n) => s + n, 0);
    const max = qs.length * 3;
    const pct = max ? total / max : 0;
    const level = pct < 0.34 ? 'lower' : pct < 0.67 ? 'moderate' : 'higher';
    const copy = {
      lower: 'These answers suggest a lighter load right now. If something still feels off, you can still talk with a therapist.',
      moderate: 'There is enough here to take seriously. A therapist or group can help you sort what to do next.',
      higher: 'This is taking up real space in your life. You do not have to hold it alone — matching with a clinician is a solid next step.'
    };
    const tool = MC_ASSESSMENTS.find(x => x.id === assessId);
    const result = { id: assessId, name: tool?.name || assessId, total, max, level, at: new Date().toISOString() };
    window.lastMcAssessment = result;
    try { sessionStorage.setItem('mc.lastAssessment', JSON.stringify(result)); } catch (_) {}
    if (typeof syncAssessmentHidden === 'function') syncAssessmentHidden();
    if (bar) bar.style.width = '100%';
    body.innerHTML = `<div class="assess-result">
      <p class="pub-kicker">Your reflection</p>
      <h3>A ${level} level of strain in this area</h3>
      <p>${copy[level]}</p>
      <p class="muted small">Not a medical diagnosis. If you are in crisis, call 911 or 988.</p>
      <div class="pub-hero-ctas">
        <button type="button" class="btn btn-primary" onclick="closeAssessment();openMatchQuiz(null,{service:'${assessId === 'relationship' || assessId === 'couples' || assessId === 'breakup' ? 'Relationships' : assessId === 'trauma' ? 'Trauma & Recovery' : assessId === 'mood' ? 'Depression & Mood' : 'Anxiety & Stress'}'})">Get matched</button>
        <button type="button" class="btn" onclick="closeAssessment();showMcView('groups')">See support groups</button>
      </div>
    </div>`;
    if (nav) nav.innerHTML = `<button type="button" class="btn" onclick="closeAssessment()">Close</button>`;
    return;
  }
  if (bar) bar.style.width = `${(assessStep / qs.length) * 100}%`;
  body.innerHTML = `<p class="match-q">${esc(qs[assessStep])}</p>
    <p class="muted small">Question ${assessStep + 1} of ${qs.length}</p>
    <div class="match-options">${MC_SCALE.map((lab, i) => `<button type="button" class="match-opt" onclick="answerAssess(${i})"><strong>${esc(lab)}</strong></button>`).join('')}</div>`;
  if (nav) nav.innerHTML = `<button type="button" class="btn" ${assessStep === 0 ? 'disabled' : ''} onclick="assessStep=Math.max(0,assessStep-1);assessScores.pop();renderAssessStep()">Back</button>
    <button type="button" class="btn" onclick="closeAssessment()">Cancel</button>`;
}

function answerAssess(score) {
  assessScores[assessStep] = score;
  assessStep += 1;
  renderAssessStep();
}

function slideMcRow(id, dir) {
  const el = document.getElementById(id);
  if (!el) return;
  const card = el.querySelector('article');
  const gap = 16;
  const step = card ? card.getBoundingClientRect().width + gap : Math.min(320, el.clientWidth * 0.8);
  el.scrollBy({ left: dir * step, behavior: 'smooth' });
}

function syncMcStatsNav() {
  const el = document.getElementById('mc-stats');
  const prev = document.getElementById('mc-stats-prev');
  const next = document.getElementById('mc-stats-next');
  const viewport = el?.closest('.mc-stats-viewport');
  if (!el || !prev || !next) return;
  const max = el.scrollWidth - el.clientWidth;
  const atStart = el.scrollLeft <= 4;
  const atEnd = el.scrollLeft >= max - 4;
  prev.disabled = atStart;
  next.disabled = atEnd;
  viewport?.classList.toggle('is-start', atStart);
  viewport?.classList.toggle('is-end', atEnd);
}

let mcBound = false;
function bindMcChrome() {
  if (mcBound) return;
  mcBound = true;
  renderMcCatalogs();
  routeMcHash();
  window.addEventListener('hashchange', routeMcHash);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mc-nav-item')) closeMcMenus();
  });
  document.getElementById('mc-search-input')?.addEventListener('input', (e) => runMcSearch(e.target.value));
  document.getElementById('assess-quiz')?.addEventListener('click', (e) => {
    if (e.target.id === 'assess-quiz') closeAssessment();
  });
  const stats = document.getElementById('mc-stats');
  if (stats) {
    stats.addEventListener('scroll', syncMcStatsNav, { passive: true });
    window.addEventListener('resize', syncMcStatsNav);
    stats.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); slideMcRow('mc-stats', 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); slideMcRow('mc-stats', -1); }
    });
    syncMcStatsNav();
  }
  const rotate = document.getElementById('hero-rotate');
  if (rotate) {
    const words = ['right support', 'right group', 'right clinician', 'right pace'];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      rotate.style.opacity = '0';
      setTimeout(() => { rotate.textContent = words[i]; rotate.style.opacity = '1'; }, 220);
    }, 2600);
  }
}

document.addEventListener('DOMContentLoaded', bindMcChrome);
if (document.readyState !== 'loading') bindMcChrome();
