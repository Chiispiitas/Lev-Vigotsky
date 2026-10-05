/* DOM/data-flow regressions (no live writes). Install jsdom@26.1.0, then run:
   node --test tests/regular-grading.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');

async function app(t, initial = [], activity = 'Regular grading') {
  const api = {
    items: new Map(initial.map(item => [item.studentNumber, item])),
    session: { sessionId: 'TEST-REGULAR', classId: 'decimo-c', classLabel: 'Class', title: 'Test', activity, status: 'open' },
    failWrite: false, failRead: false, requests: [], maxInFlight: 0, inFlight: 0, delay: 0
  };
  const storage = new Map();
  async function load(results = false) {
    const file = results ? 'results.html' : 'index.html';
    const dom = new JSDOM(await fs.readFile(path.join(root, 'Speaking', file), 'utf8'), {
      url: `https://lev-grading.test/Speaking/${file}`, runScripts: 'outside-only', pretendToBeVisual: true
    });
    t.after(() => dom.window.close());
    const w = dom.window;
    Object.defineProperty(w, 'localStorage', { value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    } });
    w.scrollTo = () => {};
    w.console.warn = () => {};
    w.console.error = () => {};
    w.fetch = async (url, options = {}) => {
      if (options.method === 'POST') {
        const payload = JSON.parse(options.body);
        api.requests.push(payload);
        if (api.failWrite) return { ok: false, status: 400, json: async () => ({ ok: false, error: 'Test save failure' }) };
        api.inFlight++;
        api.maxInFlight = Math.max(api.maxInFlight, api.inFlight);
        if (api.delay) await new Promise(resolve => setTimeout(resolve, api.delay));
        const record = payload.record;
        api.items.set(record.studentNumber, { ...record, rows: undefined, scoreTotal: record.total, criteriaJson: JSON.stringify(record.rows), updatedAt: new Date().toISOString() });
        api.inFlight--;
      } else if (api.failRead) {
        return { ok: false, status: 400, json: async () => ({ ok: false, error: 'Test read failure' }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, session: api.session, sessions: [api.session], items: [...api.items.values()], stats: { total: api.items.size, average: 999 } }) };
    };
    for (const script of ['class-data.js', 'regular-grades.js', results ? 'results.js' : 'script.js']) {
      vm.runInContext(await fs.readFile(path.join(root, 'Speaking', script), 'utf8'), dom.getInternalVMContext());
    }
    if (results) await w.loadSession(api.session.sessionId);
    else {
      w.saveActiveSpeakingSession(api.session);
      w.eval('currentAppMode = "regular"');
      await w.loadRegularGradesFromSession(api.session);
      w.openRegularGrading(api.session);
    }
    return w;
  }
  return { api, storage, load, w: await load() };
}
function input(w, el, value) {
  el.value = value;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
}
const titles = w => [...w.document.querySelectorAll('.regular-assignment-title')];
const cell = (w, student, column) => w.document.querySelectorAll(`#regularRoster [data-student-row="${student}"] .regular-assignment-cell`)[column];
const number = (w, student, column) => cell(w, student, column).querySelector('.regular-number-input');
const mark = (w, student, column, kind) => cell(w, student, column).querySelector(`[data-mark="${kind}"]`).click();
const add = w => w.document.querySelector('#addRegularAssignment').click();
const remove = (w, column) => w.document.querySelectorAll('.regular-remove-assignment')[column].click();

test('multiple assignments persist independently, including duplicate titles, zeros, and blanks', async t => {
  const { w, api, storage, load } = await app(t);
  input(w, titles(w)[0], 'Homework <1>');
  mark(w, 1, 0, 'check');
  add(w);
  assert.equal(titles(w).length, 2);
  assert.equal(titles(w)[1], w.document.activeElement);
  input(w, titles(w)[1], 'Quiz');
  input(w, number(w, 1, 1), '7.5');
  mark(w, 2, 0, 'x');
  input(w, number(w, 2, 1), '0');
  mark(w, 3, 1, 'check');
  mark(w, 3, 1, 'check');
  input(w, number(w, 4, 1), '11');
  assert.equal(number(w, 4, 1).classList.contains('invalid'), true);
  assert.equal(await w.flushRegularPublishes(), true);
  assert.equal(api.items.get(1).scoreTotal, 8.75);
  assert.equal(api.items.get(2).scoreTotal, 0);
  assert.equal(api.items.get(3).markedCriteria, 0);
  assert.equal(api.items.has(4), false);
  input(w, titles(w)[1], 'Homework <1>');
  await w.flushRegularPublishes();
  // No local drafts: another device must recover titles and grades from Wix alone.
  storage.clear();
  const reopened = await load();
  assert.equal(titles(reopened)[1].value, 'Homework <1>');
  assert.equal(number(reopened, 1, 1).value, '7.5');
  assert.equal(cell(reopened, 2, 0).querySelector('[data-mark="x"]').getAttribute('aria-pressed'), 'true');
  const results = await load(true);
  assert.deepEqual([...results.document.querySelectorAll('#entryTableHead th')].map(el => el.textContent), ['Student', 'Homework <1>', 'Homework <1>', 'Average', 'Updated', 'Details']);
  assert.equal(results.document.querySelector('#entryValue').textContent, '3');
  assert.equal(results.document.querySelector('#assessedValue').textContent, '2');
  assert.equal(results.document.querySelector('#averageValue').textContent, '4,38 / 10');
  assert.equal(results.document.querySelectorAll('.entry-row').length, 3);
  assert.deepEqual([...results.document.querySelectorAll('.entry-row:first-child td.score')].map(el => el.textContent), ['10 / 10', '7,5 / 10', '8,75 / 10']);
  results.document.querySelector('.expand-entry-button').click();
  assert.equal(results.document.querySelector('#entry-detail-0').hidden, false);
  assert.equal(results.document.querySelector('#entry-detail-0').textContent.includes('Assignment ID:'), false);
  assert.deepEqual(results.buildGradesClipboardText().split('\n').slice(0, 4), ['10', '0.02', '0.03', '0.03']);
  results.document.querySelector('#copyAssignmentSelect').selectedIndex = 1;
  assert.deepEqual(results.buildGradesClipboardText().split('\n').slice(0, 4), ['7.50', '0.02', '0.03', '0.03']);
});

test('assignments can be removed and disappear from grading and Results', async t => {
  const { w, api, load } = await app(t);
  input(w, titles(w)[0], 'Homework');
  input(w, number(w, 1, 0), '8');
  add(w);
  input(w, titles(w)[1], 'Quiz');
  input(w, number(w, 1, 1), '6');
  await w.flushRegularPublishes();

  assert.equal(w.document.querySelectorAll('.regular-remove-assignment').length, 2);
  remove(w, 1);
  assert.equal(titles(w).length, 1);
  assert.equal(titles(w)[0].value, 'Homework');
  assert.equal(w.document.querySelector('.regular-remove-assignment').disabled, true);
  assert.equal(number(w, 1, 0).value, '8');

  await w.flushRegularPublishes();
  const storedRows = JSON.parse(api.items.get(1).criteriaJson);
  assert.equal(storedRows.length, 1);
  assert.equal(storedRows[0].criterion, 'Homework');

  const results = await load(true);
  assert.deepEqual(
    [...results.document.querySelectorAll('#entryTableHead th')].map(el => el.textContent),
    ['Student', 'Homework', 'Updated', 'Details']
  );
  assert.deepEqual(
    [...results.document.querySelectorAll('.entry-row:first-child td.score')].map(el => el.textContent),
    ['8 / 10']
  );
});

test('legacy drafts migrate; legacy server sessions retain marks, and blank columns persist', async t => {
  const initial = [{ studentNumber: 1, studentName: 'Legacy student', scoreTotal: 10, markedCriteria: 1,
    criteriaJson: '[{"criterion":"Regular grade","max":10,"level":"✓ Checked","points":10}]' }];
  const { w, api, storage, load } = await app(t, initial, 'Regular grading · Checklist');
  storage.set('lv-regular-grade-TEST-REGULAR-decimo-c-2', JSON.stringify({ kind: 'number', value: 8.25 }));
  const legacy = await load();
  assert.equal(number(legacy, 2, 0).value, '8.25');
  assert.equal(cell(w, 1, 0).querySelector('[data-mark="check"]').getAttribute('aria-pressed'), 'true');
  add(w);
  await w.flushRegularPublishes();
  storage.clear();
  const reopened = await load();
  assert.equal(titles(reopened).length, 2);
  assert.equal(number(reopened, 1, 1).value, '');
  api.session.status = 'closed';
  const closed = await load();
  assert.equal(closed.document.querySelector('#addRegularAssignment').disabled, true);
  assert.equal(titles(closed)[0].disabled, true);
  assert.equal(number(closed, 1, 0).disabled, true);
  const results = await load(true);
  assert.equal(results.document.querySelector('#entryValue').textContent, '1');
  assert.deepEqual([...results.document.querySelectorAll('.entry-row td.score')].map(el => el.textContent), ['10 / 10', '—', '10 / 10']);
});

test('configuration-only sessions show columns without fake student entries', async t => {
  const { w, load } = await app(t);
  add(w);
  input(w, titles(w)[1], 'Empty assignment');
  await w.flushRegularPublishes();
  const results = await load(true);
  assert.equal(results.document.querySelector('#entryValue').textContent, '0');
  assert.equal(results.document.querySelectorAll('.entry-row').length, 0);
  assert.equal(results.document.querySelector('#entryTableHead').textContent.includes('Empty assignment'), true);
  assert.equal(results.buildGradesClipboardText().split('\n').every(value => value === '0.03'), true);
});

test('autosave serializes rapid writes and recovers failures from a persisted outbox after reload', async t => {
  const { w, api, load } = await app(t);
  api.delay = 20;
  input(w, number(w, 1, 0), '1');
  const saving = w.flushRegularPublishes();
  input(w, number(w, 1, 0), '9');
  await saving;
  await w.flushRegularPublishes();
  assert.equal(api.items.get(1).scoreTotal, 9);
  assert.equal(api.maxInFlight, 1);
  api.failWrite = true;
  input(w, number(w, 1, 0), '8');
  assert.equal(await w.flushRegularPublishes(), false);
  assert.match(w.document.querySelector('#regularSyncStatus').textContent, /Auto-save failed/);
  w.close();
  const stillOffline = await load();
  assert.equal(number(stillOffline, 1, 0).value, '8');
  stillOffline.close();
  api.failWrite = false;
  const reopened = await load();
  assert.equal(api.items.get(1).scoreTotal, 8);
  assert.equal(number(reopened, 1, 0).value, '8');
  api.failRead = true;
  const offline = await load();
  assert.equal(number(offline, 1, 0).value, '8');
});

test('Speaking and Participation results and clipboard exports retain their behavior', async t => {
  const { api, load } = await app(t);
  api.session.activity = 'Oral speaking assessment';
  api.items.set(1, { studentNumber: 1, studentName: 'Speaking student', scoreTotal: 8, markedCriteria: 7,
    criteriaJson: '[{"criterion":"Speaking criterion","level":"Excellent","points":1,"max":1.5}]' });
  let results = await load(true);
  assert.deepEqual([...results.document.querySelectorAll('#entryTableHead th')].map(el => el.textContent), ['Student', 'Score', 'Updated', 'Details']);
  assert.equal(results.document.querySelector('#assignmentExport').hidden, true);
  assert.equal(results.buildGradesClipboardText().split('\n')[0], '8');
  api.session.activity = 'Participation';
  api.items.clear();
  api.items.set(9999, { studentNumber: 9999, studentName: '__PARTICIPATION_CONFIG__', criteriaJson: '[{"points":5}]' });
  api.items.set(1, { studentNumber: 1, criteriaJson: '[{"level":"3 tallies","points":3}]' });
  results = await load(true);
  assert.equal(results.document.querySelector('.entry-row .score').textContent, '6 / 10');
  assert.equal(results.document.querySelector('#assignmentExport').hidden, true);
  assert.equal(results.buildGradesClipboardText().split('\n')[0], '6');
});
