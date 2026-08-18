import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  academyMutationAccessAllowed,
  lockAcademyMutationUsers
} from "../services/academy/mutationAccess.js";

const server = await readFile(new URL("../server.js", import.meta.url), "utf8");

function sourceBlock(startMarker, endMarker) {
  const start = server.indexOf(startMarker);
  const end = server.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Blocco mancante: ${startMarker}`);
  assert.notEqual(end, -1, `Fine blocco mancante: ${endMarker}`);
  return server.slice(start, end);
}

test("i due download certificato cercano prima l'id e confinano il Responsabile al negozio A", () => {
  const courseCertificate = sourceBlock(
    "async function getCourseCertificate",
    "async function getAcademyCertificateForPdf"
  );
  const academyCertificate = sourceBlock(
    "async function getAcademyCertificateForPdf",
    "function writeCourseCertificatePdf"
  );

  for (const block of [courseCertificate, academyCertificate]) {
    assert.match(block, /const values = \[id\];[\s\S]*let where = "cert\.id = \$1::bigint"/);
    assert.match(block, /if \(role === "responsabile"\)[\s\S]*user\.negozio_id[\s\S]*u\.negozio_id = \$\$\{values\.length\}::bigint/);
    assert.match(block, /else if \(!\["founder", "supervisore"\]\.includes\(role\)\)[\s\S]*cert\.user_id = \$\$\{values\.length\}::bigint/);
    assert.ok(
      block.indexOf("cert.id = $1::bigint") < block.indexOf("u.negozio_id"),
      "il filtro sull'id deve precedere lo scope della sede"
    );
    assert.doesNotMatch(block, /\["founder", "responsabile"\]/);
  }

  assert.match(server, /app\.get\("\/api\/academy\/certificates\/:id\/download"[\s\S]{0,240}getAcademyCertificateForPdf\(request\.params\.id, request\.user\)/);
  assert.match(server, /app\.get\("\/api\/corsi\/certificati\/:id\/pdf"[\s\S]{0,240}getCourseCertificate\(request\.params\.id, request\.user\)/);
});

test("la revisione pratica è un update atomico ID-first e non può attraversare dal negozio A al negozio B", () => {
  const review = sourceBlock(
    'app.post("/api/academy/practical-attempts/:attemptId/review"',
    'app.get("/api/academy/practical-assessments/pending-review"'
  );

  assert.match(review, /const role = normalizeRole\(request\.user\.ruolo\)/);
  assert.match(review, /if \(!\["founder", "responsabile", "supervisore"\]\.includes\(role\)\)/);
  assert.match(review, /if \(role === "responsabile"\)[\s\S]*request\.user\.negozio_id/);
  assert.match(review, /UPDATE academy_practical_attempts pa[\s\S]*WHERE pa\.id = \$1::bigint[\s\S]*AND \$\{accessPredicate\}/);
  assert.match(review, /EXISTS \([\s\S]*FROM utenti target_user[\s\S]*target_user\.id = pa\.user_id[\s\S]*target_user\.negozio_id = \$\$\{values\.length\}::bigint/);
  assert.ok(
    review.indexOf("WHERE pa.id = $1::bigint") < review.indexOf("AND ${accessPredicate}"),
    "la mutazione deve risolvere l'id prima di applicare lo scope A/B"
  );
});

test("coda e dettaglio prove pratiche sono globali solo per Founder e Supervisore", () => {
  const pending = sourceBlock(
    'app.get("/api/academy/practical-assessments/pending-review"',
    'app.get("/api/academy/practical-attempts/:attemptId"'
  );
  const detail = sourceBlock(
    'app.get("/api/academy/practical-attempts/:attemptId"',
    'app.get("/api/academy/courses/:courseId/exam"'
  );

  assert.match(pending, /if \(role === "responsabile"\)[\s\S]*storePredicate = `u\.negozio_id = \$\$\{values\.length\}::bigint`/);
  assert.match(pending, /JOIN utenti u ON u\.id = pa\.user_id[\s\S]*AND \$\{storePredicate\}/);
  assert.doesNotMatch(pending, /LEFT JOIN utenti u/);

  assert.match(detail, /const values = \[request\.params\.attemptId\]/);
  assert.match(detail, /if \(role === "responsabile"\)[\s\S]*u\.negozio_id = \$\$\{values\.length\}::bigint/);
  assert.match(detail, /else if \(!\["founder", "supervisore"\]\.includes\(role\)\)[\s\S]*pa\.user_id = \$\$\{values\.length\}::bigint/);
  assert.match(detail, /WHERE pa\.id = \$1::bigint[\s\S]*AND \$\{accessPredicate\}/);
  assert.ok(detail.indexOf("pa.id = $1::bigint") < detail.indexOf("AND ${accessPredicate}"));
});

test("il risultato esame è owner-only salvo supervisione globale o Responsabile dello stesso negozio", () => {
  const result = sourceBlock(
    'app.get("/api/academy/exam-attempts/:attemptId/result"',
    'app.get("/api/academy/exam-attempts/history"'
  );

  assert.match(result, /const values = \[request\.params\.attemptId\]/);
  assert.match(result, /if \(role === "responsabile"\)[\s\S]*u\.negozio_id = \$\$\{values\.length\}::bigint/);
  assert.match(result, /else if \(!\["founder", "supervisore"\]\.includes\(role\)\)[\s\S]*a\.user_id = \$\$\{values\.length\}::bigint/);
  assert.match(result, /JOIN utenti u ON u\.id = a\.user_id[\s\S]*WHERE a\.id = \$1::bigint[\s\S]*AND \$\{accessPredicate\}/);
  assert.doesNotMatch(result, /OR \$3::text IN \('founder','responsabile','supervisore'\)/);
  assert.ok(result.indexOf("a.id = $1::bigint") < result.indexOf("AND ${accessPredicate}"));
});

test("il lock runtime ricontrolla attore e destinatario dal database in ordine stabile", async () => {
  const calls = [];
  const db = {
    async query(sql, values) {
      calls.push({ sql, values });
      return {
        rows: [
          { id: "10", ruolo: "commesso", negozio_id: "1", attivo: true },
          { id: "20", ruolo: "responsabile", negozio_id: "1", attivo: true }
        ]
      };
    }
  };

  const locked = await lockAcademyMutationUsers(db, { actorId: "20", targetUserId: "10" });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /FROM utenti[\s\S]*ORDER BY id[\s\S]*FOR UPDATE/);
  assert.deepEqual(calls[0].values, [["10", "20"]]);
  assert.equal(locked.actor.id, "20");
  assert.equal(locked.target.id, "10");
  assert.equal(academyMutationAccessAllowed(locked, { evaluatorOnly: true }), true);
});

test("la policy runtime blocca A→B, consente A→A e mantiene globali solo Founder e Supervisore", () => {
  const targetA = { id: "10", ruolo: "commesso", negozio_id: "1", attivo: true };
  const targetB = { id: "11", ruolo: "commesso", negozio_id: "2", attivo: true };
  const responsibleA = { id: "20", ruolo: "responsabile", negozio_id: "1", attivo: true };
  const founder = { id: "30", ruolo: "founder", negozio_id: null, attivo: true };
  const supervisor = { id: "31", ruolo: "supervisore", negozio_id: null, attivo: true };
  const clerkA = { id: "10", ruolo: "commesso", negozio_id: "1", attivo: true };

  assert.equal(academyMutationAccessAllowed({ actor: responsibleA, target: targetA }, { evaluatorOnly: true }), true);
  assert.equal(academyMutationAccessAllowed({ actor: responsibleA, target: targetB }, { evaluatorOnly: true }), false);
  assert.equal(academyMutationAccessAllowed({ actor: founder, target: targetB }, { evaluatorOnly: true }), true);
  assert.equal(academyMutationAccessAllowed({ actor: supervisor, target: targetB }, { evaluatorOnly: true }), true);
  assert.equal(academyMutationAccessAllowed({ actor: clerkA, target: targetA }), true);
  assert.equal(academyMutationAccessAllowed({ actor: clerkA, target: targetA }, { evaluatorOnly: true }), false);
  assert.equal(academyMutationAccessAllowed({ actor: clerkA, target: targetB }), false);
  assert.equal(academyMutationAccessAllowed({ actor: { ...responsibleA, attivo: false }, target: targetA }), false);
});

test("le quattro mutazioni Academy mantengono lock, autorizzazione e scritture nella stessa transazione", () => {
  const progress = sourceBlock("async function updateAcademyProgress", "async function getAcademyLessonNote");
  const exam = sourceBlock("async function evaluateCourseExam", "async function listAcademyExams");
  const certificate = sourceBlock("async function generateAcademyCertificate", "async function listAcademyBadges");
  const badge = sourceBlock("async function assignAcademyBadge", "async function revokeAcademyBadge");

  for (const block of [progress, exam, certificate, badge]) {
    assert.match(block, /withDatabaseTransaction\(async \(db\) =>/);
    assert.match(block, /lockAcademyMutationUsers\(db/);
    assert.match(block, /academyMutationAccessAllowed\(lockedUsers/);
    assert.match(block, /await db\.query/);
    assert.doesNotMatch(block, /await canViewAcademyUser/);
  }
  assert.match(progress, /SELECT user_id FROM academy_user_progress[\s\S]*lockAcademyMutationUsers\(db[\s\S]*user_id = \$2::bigint LIMIT 1 FOR UPDATE/);
  assert.match(exam, /academyMutationAccessAllowed\(lockedUsers, \{ evaluatorOnly: true \}\)[\s\S]*INSERT INTO course_exam_sessions/);
  assert.match(exam, /awardAcademyCourseCompletion\([\s\S]*\}, db\)/);
  assert.match(certificate, /academyMutationAccessAllowed\(lockedUsers, \{ evaluatorOnly: true \}\)[\s\S]*INSERT INTO academy_certificates[\s\S]*INSERT INTO course_certificates/);
  assert.match(certificate, /academy_certificates\.user_id = EXCLUDED\.user_id[\s\S]*academy_certificates\.course_id = EXCLUDED\.course_id/);
  assert.match(certificate, /course_certificates\.user_id = EXCLUDED\.user_id[\s\S]*course_certificates\.course_id = EXCLUDED\.course_id/);
  assert.match(certificate, /ACADEMY_CERTIFICATE_CODE_CONFLICT/);
  assert.match(badge, /academyMutationAccessAllowed\(lockedUsers, \{ evaluatorOnly: true \}\)[\s\S]*INSERT INTO academy_badges[\s\S]*recalculateAcademyOperatorLevel\(targetUserId, db\)/);

  const completion = sourceBlock("async function awardAcademyCourseCompletion", "async function evaluateCourseFinalQuiz");
  assert.match(completion, /\} = \{\}, db = pool\)/);
  assert.doesNotMatch(completion, /pool\.query/);
  assert.match(completion, /recalculateAcademyOperatorLevel\(userId, db\)/);
});
