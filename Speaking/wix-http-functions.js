/*
  SPEAKING SHARED-SESSIONS BACKEND FOR WIX VELO

  IMPORTANT:
  This repository file is a reference/copy. Wix does NOT execute this GitHub file.
  Paste these exports into the Wix site's Backend > http-functions.js file, then publish.

  Required CMS collections:
    - SpeakingSessions
    - SpeakingSubmissions

  Production endpoints:
    POST /_functions/speakingSession
    GET  /_functions/speakingSession?sessionId=SPK-XXXXXX
    POST /_functions/speakingSubmission
    GET  /_functions/speakingSubmission?sessionId=SPK-XXXXXX
*/

import { ok, badRequest, notFound, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

const SPEAKING_SESSION_COLLECTION = 'SpeakingSessions';
const SPEAKING_SUBMISSION_COLLECTION = 'SpeakingSubmissions';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function respondOk(body) {
  return ok({ headers: corsHeaders(), body });
}

function respondBadRequest(message) {
  return badRequest({ headers: corsHeaders(), body: { ok: false, error: message } });
}

function respondNotFound(message) {
  return notFound({ headers: corsHeaders(), body: { ok: false, error: message } });
}

function respondServerError(error) {
  return serverError({
    headers: corsHeaders(),
    body: { ok: false, error: error?.message || String(error) }
  });
}

function text(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value) {
  return Math.round(number(value) * 100) / 100;
}

function date(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSessionId(value) {
  return text(value).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
}

async function readBody(request) {
  try {
    return await request.body.json();
  } catch {
    try {
      return JSON.parse((await request.body.text()) || '{}');
    } catch {
      return {};
    }
  }
}

function randomSessionId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SPK-';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function findSession(sessionId) {
  const result = await wixData.query(SPEAKING_SESSION_COLLECTION)
    .eq('sessionId', sessionId)
    .limit(1)
    .find({ suppressAuth: true });
  return result.items[0] || null;
}

async function uniqueSessionId() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomSessionId();
    if (!(await findSession(candidate))) return candidate;
  }
  throw new Error('Could not generate a unique Speaking session ID.');
}

export function options_speakingSession() {
  return respondOk({ ok: true });
}

export async function post_speakingSession(request) {
  try {
    const body = await readBody(request);
    const action = text(body.action || 'create').toLowerCase();

    if (action === 'create') {
      let sessionId = normalizeSessionId(body.sessionId);
      if (!sessionId) sessionId = await uniqueSessionId();

      if (await findSession(sessionId)) {
        return respondBadRequest(`Session ${sessionId} already exists.`);
      }

      const now = new Date();
      const item = {
        title: text(body.title) || `${text(body.classLabel || body.classId || 'Speaking')} - ${text(body.activity || 'Oral speaking assessment')}`,
        sessionId,
        classId: text(body.classId),
        classLabel: text(body.classLabel),
        activity: text(body.activity) || 'Oral speaking assessment',
        status: 'open',
        createdBy: text(body.createdBy),
        createdAt: now,
        updatedAt: now,
        source: 'Lev Vigotsky Speaking Report Maker'
      };

      const saved = await wixData.insert(
        SPEAKING_SESSION_COLLECTION,
        item,
        { suppressAuth: true }
      );

      return respondOk({ ok: true, created: true, session: saved });
    }

    if (action === 'close' || action === 'reopen') {
      const sessionId = normalizeSessionId(body.sessionId);
      if (!sessionId) return respondBadRequest('sessionId is required.');

      const existing = await findSession(sessionId);
      if (!existing) return respondNotFound('Speaking session not found.');

      const session = await wixData.update(
        SPEAKING_SESSION_COLLECTION,
        {
          ...existing,
          status: action === 'close' ? 'closed' : 'open',
          updatedAt: new Date()
        },
        { suppressAuth: true }
      );

      return respondOk({ ok: true, session });
    }

    return respondBadRequest(`Unknown action: ${action}`);
  } catch (error) {
    return respondServerError(error);
  }
}

export async function get_speakingSession(request) {
  try {
    const sessionId = normalizeSessionId(request.query.sessionId);
    if (!sessionId) return respondBadRequest('sessionId is required.');

    const session = await findSession(sessionId);
    if (!session) return respondNotFound('Speaking session not found.');

    const submissions = await wixData.query(SPEAKING_SUBMISSION_COLLECTION)
      .eq('sessionId', sessionId)
      .limit(1000)
      .find({ suppressAuth: true });

    const assessed = submissions.items.filter(item => number(item.markedCriteria) > 0);
    const average = assessed.length
      ? assessed.reduce((sum, item) => sum + number(item.scoreTotal), 0) / assessed.length
      : 0;

    return respondOk({
      ok: true,
      session,
      stats: {
        submissionCount: submissions.totalCount,
        assessedCount: assessed.length,
        average: round(average)
      }
    });
  } catch (error) {
    return respondServerError(error);
  }
}

function sanitizeSubmission(raw, session, body) {
  const studentNumber = number(raw.studentNumber);
  const studentName = text(raw.studentName);
  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  const scoreTotal = round(raw.scoreTotal ?? raw.total);

  let markedCriteria = number(raw.markedCriteria, -1);
  if (markedCriteria < 0) {
    markedCriteria = rows.filter(row => text(row.level).toLowerCase() !== 'not marked').length;
  }

  const now = new Date();

  return {
    title: `${studentNumber}. ${studentName} - ${scoreTotal} / 10`,
    recordKey: `${session.sessionId}|${studentNumber}`,
    sessionId: session.sessionId,
    deviceId: text(raw.deviceId || body.deviceId),
    contributorName: text(raw.contributorName || body.contributorName),
    classId: text(raw.classId || session.classId),
    classLabel: text(raw.classLabel || session.classLabel),
    course: text(raw.course),
    section: text(raw.section),
    specialty: text(raw.specialty),
    tutor: text(raw.tutor),
    studentNumber,
    studentName,
    activity: text(raw.activity || session.activity),
    scoreTotal,
    scorePercent: Math.round(scoreTotal * 10),
    markedCriteria,
    criteriaJson: text(raw.criteriaJson) || JSON.stringify(rows),
    comment: text(raw.comment),
    status: text(raw.status) || (markedCriteria > 0 ? 'Assessed' : 'Pending'),
    evaluatedAt: date(raw.evaluatedAt || raw.createdAt) || now,
    submittedAt: date(raw.submittedAt) || now,
    updatedAt: now,
    source: text(raw.source) || 'Lev Vigotsky Speaking Report Maker'
  };
}

async function upsertSubmission(item) {
  const existingResult = await wixData.query(SPEAKING_SUBMISSION_COLLECTION)
    .eq('recordKey', item.recordKey)
    .limit(1)
    .find({ suppressAuth: true });

  if (existingResult.items.length) {
    const existing = existingResult.items[0];
    return wixData.update(
      SPEAKING_SUBMISSION_COLLECTION,
      { ...existing, ...item, _id: existing._id },
      { suppressAuth: true }
    );
  }

  try {
    return await wixData.insert(
      SPEAKING_SUBMISSION_COLLECTION,
      item,
      { suppressAuth: true }
    );
  } catch (insertError) {
    // Handles two devices attempting the same recordKey at nearly the same time.
    const afterRace = await wixData.query(SPEAKING_SUBMISSION_COLLECTION)
      .eq('recordKey', item.recordKey)
      .limit(1)
      .find({ suppressAuth: true });

    if (!afterRace.items.length) throw insertError;

    const existing = afterRace.items[0];
    return wixData.update(
      SPEAKING_SUBMISSION_COLLECTION,
      { ...existing, ...item, _id: existing._id },
      { suppressAuth: true }
    );
  }
}

export function options_speakingSubmission() {
  return respondOk({ ok: true });
}

export async function post_speakingSubmission(request) {
  try {
    const body = await readBody(request);
    const sessionId = normalizeSessionId(body.sessionId);
    if (!sessionId) return respondBadRequest('sessionId is required.');

    const session = await findSession(sessionId);
    if (!session) return respondNotFound('Speaking session not found.');
    if (text(session.status).toLowerCase() === 'closed') {
      return respondBadRequest('This Speaking session is closed.');
    }

    const records = Array.isArray(body.records)
      ? body.records
      : body.record && typeof body.record === 'object'
        ? [body.record]
        : [];

    if (!records.length) return respondBadRequest('No Speaking records received.');

    const saved = [];
    for (const raw of records) {
      const item = sanitizeSubmission(raw, session, body);
      if (!item.studentNumber || !item.studentName) continue;

      const result = await upsertSubmission(item);
      saved.push({
        _id: result._id,
        recordKey: result.recordKey,
        studentNumber: result.studentNumber,
        studentName: result.studentName,
        scoreTotal: result.scoreTotal,
        markedCriteria: result.markedCriteria
      });
    }

    await wixData.update(
      SPEAKING_SESSION_COLLECTION,
      { ...session, updatedAt: new Date() },
      { suppressAuth: true }
    );

    return respondOk({
      ok: true,
      sessionId,
      savedCount: saved.length,
      items: saved
    });
  } catch (error) {
    return respondServerError(error);
  }
}

export async function get_speakingSubmission(request) {
  try {
    const sessionId = normalizeSessionId(request.query.sessionId);
    if (!sessionId) return respondBadRequest('sessionId is required.');

    const session = await findSession(sessionId);
    if (!session) return respondNotFound('Speaking session not found.');

    const result = await wixData.query(SPEAKING_SUBMISSION_COLLECTION)
      .eq('sessionId', sessionId)
      .ascending('studentNumber')
      .limit(1000)
      .find({ suppressAuth: true });

    const assessed = result.items.filter(item => number(item.markedCriteria) > 0);
    const average = assessed.length
      ? assessed.reduce((sum, item) => sum + number(item.scoreTotal), 0) / assessed.length
      : 0;

    return respondOk({
      ok: true,
      session,
      stats: {
        total: result.totalCount,
        assessed: assessed.length,
        average: round(average)
      },
      items: result.items
    });
  } catch (error) {
    return respondServerError(error);
  }
}
