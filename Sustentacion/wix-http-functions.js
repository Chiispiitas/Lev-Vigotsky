/*
  ADD THIS TO THE SAME Wix Velo Backend > http-functions.js FILE USED BY QUIZ.
  Do not replace your existing Quiz functions. Paste this under them, publish the Wix site,
  and create/confirm the CMS collection named: Sustentacion

  Endpoints used by Sustentacion pages:
  - POST /_functions/sustentacion
  - GET  /_functions/sustentacion?courseId=tercero-tecnico-fct-2026
*/

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

const SUSTENTACION_COLLECTION = 'Sustentacion';

function sustentacionCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function sustentacionOk(body) {
  return ok({ headers: sustentacionCorsHeaders(), body });
}

function sustentacionBadRequest(message) {
  return badRequest({ headers: sustentacionCorsHeaders(), body: { ok: false, error: message } });
}

function sustentacionServerError(error) {
  return serverError({
    headers: sustentacionCorsHeaders(),
    body: { ok: false, error: error && error.message ? error.message : String(error) }
  });
}

function sustentacionText(value) {
  return String(value || '').trim();
}

function sustentacionNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sustentacionDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readSustentacionBody(request) {
  try {
    return await request.body.json();
  } catch (jsonError) {
    try {
      const text = await request.body.text();
      return JSON.parse(text || '{}');
    } catch (textError) {
      return {};
    }
  }
}

function sanitizeSustentacionRecord(raw, batchId) {
  const studentNumber = sustentacionNumber(raw.studentNumber, 0);
  const studentName = sustentacionText(raw.studentName);
  const scoreTotal = Math.round(sustentacionNumber(raw.scoreTotal, 0) * 100) / 100;
  const savedAtRaw = raw.savedAt || raw.submittedAt || new Date().toISOString();

  return {
    title: sustentacionText(raw.title) || `${studentNumber}. ${studentName} - ${scoreTotal} / 10`,
    localRecordKey: sustentacionText(raw.localRecordKey) || `${sustentacionText(raw.courseId)}-${studentNumber}-${savedAtRaw}`,
    batchId: sustentacionText(raw.batchId || batchId),
    courseId: sustentacionText(raw.courseId),
    courseLabel: sustentacionText(raw.courseLabel),
    course: sustentacionText(raw.course),
    specialty: sustentacionText(raw.specialty),
    period: sustentacionText(raw.period),
    institution: sustentacionText(raw.institution),
    activity: sustentacionText(raw.activity),
    evaluationDate: sustentacionText(raw.evaluationDate),
    studentNumber,
    studentName,
    status: sustentacionText(raw.status || 'Evaluado'),
    scoreTotal,
    scorePercent: Math.round(sustentacionNumber(raw.scorePercent, scoreTotal * 10)),
    criteriaJson: sustentacionText(raw.criteriaJson || '[]'),
    notesJson: sustentacionText(raw.notesJson || '[]'),
    notesText: sustentacionText(raw.notesText),
    comment: sustentacionText(raw.comment),
    source: sustentacionText(raw.source || 'Sustentacion rubric'),
    savedAt: sustentacionDate(raw.savedAt),
    submittedAt: new Date()
  };
}

async function upsertSustentacionRecord(item) {
  const existing = await wixData.query(SUSTENTACION_COLLECTION)
    .eq('localRecordKey', item.localRecordKey)
    .limit(1)
    .find({ suppressAuth: true });

  if (existing.items.length) {
    return wixData.update(SUSTENTACION_COLLECTION, { ...existing.items[0], ...item }, { suppressAuth: true });
  }

  return wixData.insert(SUSTENTACION_COLLECTION, item, { suppressAuth: true });
}

export function options_sustentacion(request) {
  return sustentacionOk({ ok: true });
}

export async function post_sustentacion(request) {
  try {
    const body = await readSustentacionBody(request);
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length) return sustentacionBadRequest('No records received.');

    const batchId = sustentacionText(body.batchId) || `sustentacion-${Date.now()}`;
    const saved = [];

    for (const raw of records) {
      const item = sanitizeSustentacionRecord(raw, batchId);
      if (!item.studentNumber || !item.studentName) continue;
      const result = await upsertSustentacionRecord(item);
      saved.push({
        _id: result._id,
        studentNumber: result.studentNumber,
        studentName: result.studentName,
        scoreTotal: result.scoreTotal
      });
    }

    return sustentacionOk({
      ok: true,
      collection: SUSTENTACION_COLLECTION,
      batchId,
      savedCount: saved.length,
      items: saved
    });
  } catch (error) {
    return sustentacionServerError(error);
  }
}

export async function get_sustentacion(request) {
  try {
    const courseId = sustentacionText(request.query.courseId);
    let query = wixData.query(SUSTENTACION_COLLECTION);
    if (courseId) query = query.eq('courseId', courseId);

    const result = await query
      .descending('submittedAt')
      .limit(1000)
      .find({ suppressAuth: true });

    return sustentacionOk({
      ok: true,
      collection: SUSTENTACION_COLLECTION,
      totalCount: result.totalCount,
      items: result.items
    });
  } catch (error) {
    return sustentacionServerError(error);
  }
}
