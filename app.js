const KEY = 'jobswitch.v1';
const STATUSES = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Ghosted'];
const ACTIVE = ['Applied', 'Screening', 'Interview'];
const GOAL_CATS = ['Technical skill', 'Certification', 'Portfolio', 'Networking', 'Soft skill'];
const PREP_CATS = ['Technical', 'System design', 'Behavioural', 'Company research', 'Logistics'];

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const $ = id => document.getElementById(id);

/* ---------- data ---------- */
function seed() {
  const items = [
    ['Rewrite resume and LinkedIn headline for the new role', 'Logistics'],
    ['Write a 60-second "tell me about yourself" pitch', 'Behavioural'],
    ['Prepare 5 STAR stories (conflict, failure, leadership, deadline, win)', 'Behavioural'],
    ['Prepare a clear answer for "why are you leaving?"', 'Behavioural'],
    ['Practice core technical topics for your target role', 'Technical'],
    ['Do one mock interview with a friend', 'Technical'],
    ['Research the company, product and recent news before each interview', 'Company research'],
    ['Decide your salary range and notice-period answer', 'Logistics'],
    ['Prepare 5 questions to ask the interviewer', 'Company research']
  ];
  return { apps: [], resumes: [], goals: [], prep: items.map(([title, cat]) => ({ id: uid(), title, cat, done: false, notes: '' })) };
}
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.apps) return d; } catch (e) {}
  return seed();
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save. Browser storage may be full or blocked.'); }
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- forms ---------- */
const resumeOpts = () => [['', 'Not sent yet'], ...db.resumes.map(r => [r.id, r.name])];
const schemas = {
  apps: { name: 'application', fields: () => [
    { k: 'company', l: 'Company', req: 1 },
    { k: 'role', l: 'Role', req: 1 },
    { k: 'status', l: 'Status', t: 'select', o: STATUSES, d: 'Applied' },
    { k: 'applied', l: 'Date applied', t: 'date', d: today() },
    { k: 'resume', l: 'Resume sent', t: 'select', o: resumeOpts() },
    { k: 'followup', l: 'Follow up on', t: 'date' },
    { k: 'link', l: 'Job posting link', t: 'url' },
    { k: 'notes', l: 'Notes (contact, salary, questions asked)', t: 'textarea' }] },
  resumes: { name: 'resume', fields: () => [
    { k: 'name', l: 'Resume name (e.g. Backend v2)', req: 1 },
    { k: 'target', l: 'Meant for (role or company type)' },
    { k: 'link', l: 'File or Drive link', t: 'url' },
    { k: 'notes', l: 'What is different in this version', t: 'textarea' }] },
  goals: { name: 'learning goal', fields: () => [
    { k: 'title', l: 'Goal', req: 1 },
    { k: 'cat', l: 'Category', t: 'select', o: GOAL_CATS },
    { k: 'target', l: 'Target date', t: 'date' },
    { k: 'progress', l: 'Progress (%)', t: 'range', d: 0 },
    { k: 'notes', l: 'Notes or resources', t: 'textarea' }] },
  prep: { name: 'prep task', fields: () => [
    { k: 'title', l: 'Task', req: 1 },
    { k: 'cat', l: 'Category', t: 'select', o: PREP_CATS },
    { k: 'notes', l: 'Notes', t: 'textarea' }] }
};

function fieldHTML(f, v) {
  const val = v ?? f.d ?? '';
  let inp;
  if (f.t === 'select') {
    inp = `<select name="${f.k}">${f.o.map(x => {
      const [a, b] = Array.isArray(x) ? x : [x, x];
      return `<option value="${esc(a)}"${a == val ? ' selected' : ''}>${esc(b)}</option>`;
    }).join('')}</select>`;
  } else if (f.t === 'textarea') {
    inp = `<textarea name="${f.k}" rows="3">${esc(val)}</textarea>`;
  } else {
    inp = `<input name="${f.k}" type="${f.t || 'text'}" value="${esc(val)}"${f.req ? ' required' : ''}${f.t === 'range' ? ' min="0" max="100" step="5"' : ''}>`;
  }
  return `<label>${f.l}${inp}</label>`;
}

function openForm(type, id) {
  const s = schemas[type];
  const item = id ? db[type].find(x => x.id === id) : null;
  $('form').innerHTML = `<h3>${item ? 'Edit' : 'Add'} ${s.name}</h3>` +
    s.fields().map(f => fieldHTML(f, item ? item[f.k] : undefined)).join('') +
    `<div class="row"><button type="button" class="btn plain" id="cancel">Cancel</button><button class="btn">Save ${s.name}</button></div>`;
  $('cancel').onclick = () => $('dlg').close();
  $('form').onsubmit = e => {
    e.preventDefault();
    const data = {};
    s.fields().forEach(f => {
      const v = $('form').elements[f.k].value.trim();
      data[f.k] = f.t === 'range' ? Number(v) : v;
    });
    if (item) Object.assign(item, data); else db[type].push({ id: uid(), ...(type === 'prep' ? { done: false } : {}), ...data });
    save(); render(); $('dlg').close();
  };
  $('dlg').showModal();
}

/* ---------- views ---------- */
const badge = s => `<span class="badge" style="--c:var(--s-${s})">${s}</span>`;
const acts = (type, id) => `<span class="actions"><button class="link" data-act="edit" data-type="${type}" data-id="${id}">Edit</button><button class="link del" data-act="del" data-type="${type}" data-id="${id}">Delete</button></span>`;
const head = (title, type, label) => `<div class="head"><h2>${title}</h2><button class="btn" data-act="add" data-type="${type}">${label}</button></div>`;
const resumeName = id => (db.resumes.find(r => r.id === id) || {}).name;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

function renderDash() {
  const applied = db.apps.filter(a => a.status !== 'Wishlist');
  const responded = applied.filter(a => ['Screening', 'Interview', 'Offer', 'Rejected'].includes(a.status)).length;
  const count = s => db.apps.filter(a => a.status === s).length;
  const due = db.apps.filter(a => ACTIVE.includes(a.status) && a.followup && a.followup <= today()).sort((a, b) => a.followup.localeCompare(b.followup));
  const goals = db.goals.filter(g => g.progress < 100).sort((a, b) => (a.target || '9').localeCompare(b.target || '9')).slice(0, 4);
  const prepDone = db.prep.filter(p => p.done).length;
  const bar = db.apps.length
    ? `<div class="pipe">${STATUSES.filter(count).map(s => `<i style="flex:${count(s)};background:var(--s-${s})" title="${s}: ${count(s)}"></i>`).join('')}</div>
       <div class="legend">${STATUSES.filter(count).map(s => `<span style="--c:var(--s-${s})">${s} ${count(s)}</span>`).join('')}</div>`
    : `<p class="empty">No applications yet. Add your first one to see your pipeline here.</p>`;
  $('v-dash').innerHTML = `
    <div class="head"><h2>Dashboard</h2><button class="btn" data-act="add" data-type="apps">Add application</button></div>
    <div class="grid stats">
      <div class="panel stat"><b>${applied.length}</b><span>Applications sent</span></div>
      <div class="panel stat"><b>${count('Interview')}</b><span>In interview stage</span></div>
      <div class="panel stat"><b>${count('Offer')}</b><span>Offers</span></div>
      <div class="panel stat"><b>${pct(responded, applied.length)}%</b><span>Got a response</span></div>
    </div>
    <div class="panel"><h3>Pipeline</h3>${bar}</div>
    <div class="grid two">
      <div class="panel"><h3>Follow-ups due</h3>
        ${due.length ? `<ul class="list">${due.map(a => `<li><span>${esc(a.company)} <span class="muted">${esc(a.role)}</span></span><span class="due">${fmt(a.followup)}</span></li>`).join('')}</ul>` : `<p class="empty">Nothing due. Set a follow-up date on an application to see it here.</p>`}
      </div>
      <div class="panel"><h3>Learning goals in progress</h3>
        ${goals.length ? `<ul class="list">${goals.map(g => `<li><span>${esc(g.title)}</span><span class="muted">${g.progress}%</span></li>`).join('')}</ul>` : `<p class="empty">No open goals. Add one in Learning goals.</p>`}
      </div>
      <div class="panel"><h3>Interview prep</h3>
        <p class="empty">${prepDone} of ${db.prep.length} tasks done</p>
        <div class="bar" style="margin-top:10px"><i style="width:${pct(prepDone, db.prep.length)}%"></i></div>
      </div>
    </div>`;
}

let filter = { status: 'All', q: '' };
function appRows() {
  const q = filter.q.toLowerCase();
  const rows = db.apps
    .filter(a => (filter.status === 'All' || a.status === filter.status) && (a.company + ' ' + a.role).toLowerCase().includes(q))
    .sort((a, b) => (b.applied || '').localeCompare(a.applied || ''));
  if (!rows.length) return `<tr><td colspan="6" class="muted nomatch">${db.apps.length ? 'No applications match this filter.' : 'No applications yet. Use "Add application" to start tracking.'}</td></tr>`;
  return rows.map(a => `<tr>
    <td><b>${esc(a.company)}</b><small>${esc(a.role)}${a.link ? ` · <a href="${esc(a.link)}" target="_blank" rel="noopener">posting</a>` : ''}</small>${a.notes ? `<small>${esc(a.notes)}</small>` : ''}</td>
    <td data-label="Status"><select data-status="${a.id}" aria-label="Status">${STATUSES.map(s => `<option${s === a.status ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
    <td data-label="Applied">${fmt(a.applied)}</td>
    <td data-label="Resume">${esc(resumeName(a.resume) || '—')}</td>
    <td data-label="Follow up" class="${a.followup && a.followup <= today() && ACTIVE.includes(a.status) ? 'due' : ''}">${fmt(a.followup)}</td>
    <td>${acts('apps', a.id)}</td></tr>`).join('');
}
function renderApps() {
  const chip = (s, n) => `<button class="chip" data-act="chip" data-v="${s}" aria-pressed="${filter.status === s}">${s} ${n}</button>`;
  $('v-apps').innerHTML = head('Applications', 'apps', 'Add application') +
    `<div class="chips">${chip('All', db.apps.length)}${STATUSES.map(s => chip(s, db.apps.filter(a => a.status === s).length)).join('')}</div>
     <input class="search" id="q" type="search" placeholder="Search company or role" value="${esc(filter.q)}">
     <div class="tablewrap"><table><thead><tr><th>Company and role</th><th>Status</th><th>Applied</th><th>Resume sent</th><th>Follow up</th><th></th></tr></thead><tbody id="rows">${appRows()}</tbody></table></div>`;
  $('q').oninput = e => { filter.q = e.target.value; $('rows').innerHTML = appRows(); };
}

function renderResumes() {
  const used = id => db.apps.filter(a => a.resume === id).length;
  $('v-resumes').innerHTML = head('Resumes', 'resumes', 'Add resume') +
    (db.resumes.length ? `<div class="cards">${db.resumes.map(r => `<div class="panel card">
      <h3>${esc(r.name)}</h3>
      ${r.target ? `<p class="muted">For: ${esc(r.target)}</p>` : ''}
      <p>Used in ${used(r.id)} application${used(r.id) === 1 ? '' : 's'}</p>
      ${r.notes ? `<p>${esc(r.notes)}</p>` : ''}
      ${r.link ? `<p><a href="${esc(r.link)}" target="_blank" rel="noopener">Open file</a></p>` : ''}
      ${acts('resumes', r.id)}</div>`).join('')}</div>`
      : `<p class="empty">Add each resume version you use, then pick it when you log an application.</p>`);
}

function renderGoals() {
  $('v-goals').innerHTML = head('Learning goals', 'goals', 'Add goal') +
    (db.goals.length ? `<div class="cards">${db.goals.map(g => `<div class="panel card">
      <h3>${esc(g.title)}</h3>
      <p class="muted">${esc(g.cat)}${g.target ? ' · by ' + fmt(g.target) : ''}</p>
      <div class="bar"><i style="width:${g.progress}%"></i></div>
      <input type="range" min="0" max="100" step="5" value="${g.progress}" data-prog="${g.id}" aria-label="Progress for ${esc(g.title)}">
      <p>${g.progress}% done</p>
      ${g.notes ? `<p>${esc(g.notes)}</p>` : ''}
      ${acts('goals', g.id)}</div>`).join('')}</div>`
      : `<p class="empty">Set goals for skills you want before or during the switch, like a framework, a certification or a portfolio project.</p>`);
}

function renderPrep() {
  const done = db.prep.filter(p => p.done).length;
  const groups = PREP_CATS.map(c => [c, db.prep.filter(p => p.cat === c)]).filter(([, l]) => l.length);
  $('v-prep').innerHTML = head('Interview prep', 'prep', 'Add task') +
    `<div class="panel" style="margin-bottom:16px"><h3>${done} of ${db.prep.length} done</h3><div class="bar" style="margin-top:10px"><i style="width:${pct(done, db.prep.length)}%"></i></div></div>` +
    (groups.length ? groups.map(([c, list]) => `<div class="panel group"><h3>${c}</h3>${list.map(p => `
      <div class="task${p.done ? ' done' : ''}">
        <input type="checkbox" data-done="${p.id}" ${p.done ? 'checked' : ''} aria-label="Mark done">
        <div class="t"><b>${esc(p.title)}</b>${p.notes ? `<small>${esc(p.notes)}</small>` : ''}</div>
        ${acts('prep', p.id)}</div>`).join('')}</div>`).join('')
      : `<p class="empty">No prep tasks yet. Add one to start your checklist.</p>`);
}

function render() { renderDash(); renderApps(); renderResumes(); renderGoals(); renderPrep(); }

/* ---------- navigation ---------- */
function show() {
  const v = (location.hash.slice(1) || 'dash');
  document.querySelectorAll('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.view === v));
}
$('nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) location.hash = b.dataset.view; });
window.addEventListener('hashchange', show);

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, type, id } = b.dataset;
  if (act === 'add') openForm(type);
  if (act === 'edit') openForm(type, id);
  if (act === 'chip') { filter.status = b.dataset.v; renderApps(); }
  if (act === 'del' && confirm(`Delete this ${schemas[type].name}?`)) {
    db[type] = db[type].filter(x => x.id !== id);
    if (type === 'resumes') db.apps.forEach(a => { if (a.resume === id) a.resume = ''; });
    save(); render();
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.status) { db.apps.find(a => a.id === t.dataset.status).status = t.value; save(); render(); }
  if (t.dataset.done) { const p = db.prep.find(x => x.id === t.dataset.done); p.done = t.checked; save(); render(); }
  if (t.dataset.prog) { db.goals.find(g => g.id === t.dataset.prog).progress = Number(t.value); save(); render(); }
});

/* ---------- backup ---------- */
$('export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `job-tracker-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('import').onclick = () => $('file').click();
$('file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!['apps', 'resumes', 'goals', 'prep'].every(k => Array.isArray(d[k]))) throw 0;
      if (!confirm('Replace everything in this browser with the backup?')) return;
      db = d; save(); render(); toast('Backup imported');
    } catch (err) { toast('That file is not a valid backup.'); }
  };
  r.readAsText(f); e.target.value = '';
};

render(); show();
