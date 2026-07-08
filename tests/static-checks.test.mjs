import { access, readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const file = (name) => readFile(new URL(name, root), "utf8");

test("frontend usa configurazione API condivisa e login con fallback", async () => {
  const [index, app, config] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("frontend-config.js")
  ]);

  assert.match(index, /frontend-config\.js/);
  assert.match(config, /https:\/\/app\.oroactive\.it/);
  assert.match(app, /window\.OroActiveConfig/);
  assert.match(app, /apiRequest\("\/login"/);
  assert.match(app, /\[OroActive Auth\] Login submit/);
  assert.match(app, /\[OroActive Auth\] Login success/);
  assert.match(app, /const token = data\?\.token \|\| data\?\.session/);
  assert.match(app, /state\.currentUser = normalizeAuthenticatedUserPayload\(data, "login"\)/);
  assert.match(app, /await saveStoredAuthToken\(token\)/);
  assert.match(app, /authAccepted = true/);
  assert.match(app, /forceShowMainMenuAfterLogin\(\{ renderMenus: false, phase: "login", error \}\)/);
  assert.doesNotMatch(app, /LOGIN API URL/);
  assert.doesNotMatch(app, /console\.log\("API_BASE_URL"/);
});

test("login form viene intercettato dopo l'avvio frontend", async () => {
  const app = await file("app.js");
  const bindStart = app.indexOf("function bindLoginForm");
  const submitStart = app.indexOf("async function handleLoginSubmit");
  const loginStart = app.indexOf("async function handleLogin(event)");
  const bindBlock = app.slice(bindStart, submitStart);
  const submitBlock = app.slice(submitStart, loginStart);

  assert.ok(bindStart !== -1, "bindLoginForm deve esistere");
  assert.ok(submitStart !== -1, "handleLoginSubmit deve esistere");
  assert.match(bindBlock, /form\.addEventListener\("submit", handleLoginSubmit\)/);
  assert.match(bindBlock, /window\.__OROACTIVE_LOGIN_FORM_BOUND__/);
  assert.match(submitBlock, /event\.preventDefault\(\)/);
  assert.match(submitBlock, /event\.stopPropagation\(\)/);
  assert.match(submitBlock, /return handleLogin\(event\)/);
  assert.match(app, /bindLoginForm\(\);/);
});

test("backend login accetta username e utenti migrati con email", async () => {
  const server = await file("server.js");

  assert.match(server, /LOWER\(username\) = LOWER\(\$1::text\)/);
  assert.match(server, /LOWER\(email\) = LOWER\(\$1::text\)/);
  assert.match(server, /app\.post\("\/api\/auth\/login"/);
  assert.match(server, /app\.post\("\/api\/login"/);
  assert.match(server, /function auditUserName\(user = \{\}\) \{[\s\S]*if \(!user\) return ""/);
  assert.match(server, /function permissionsForRole\(role\)/);
  assert.match(server, /normalized === "founder"[\s\S]*accessLevel: "full"[\s\S]*canUseFounderTools: true/);
  assert.match(server, /accessLevel: normalized === "commesso" \|\| normalized === "aiuto_commesso" \? "minimum" : "role"/);
  assert.match(server, /ok: true,[\s\S]*token,[\s\S]*session: token,[\s\S]*role: safeUser\.ruolo,[\s\S]*permissions: permissionsForRole\(safeUser\.ruolo\)/);
  assert.match(server, /app\.get\("\/api\/auth\/me"[\s\S]*ok: true,[\s\S]*permissions: permissionsForRole\(user\.ruolo\)/);
});

test("configurazione produzione non contiene password Founder reale", async () => {
  const envExample = await file(".env.example");
  const server = await file("server.js");

  assert.doesNotMatch(envExample, /Snoopdoggydogg/i);
  assert.match(envExample, /ADMIN_PASSWORD=INSERISCI_PASSWORD_FOUNDER/);
  assert.match(server, /JWT_SECRET obbligatorio/);
  assert.match(server, /ADMIN_PASSWORD obbligatoria/);
});

test("PWA non cachea API e dati sensibili", async () => {
  const [sw, app, server, index, version] = await Promise.all([
    file("service-worker.js"),
    file("app.js"),
    file("server.js"),
    file("index.html"),
    file("version.json")
  ]);

  assert.match(sw, /\/api\//);
  assert.match(sw, /cache: "no-store"/);
  assert.match(sw, /\/document/i);
  assert.match(sw, /\/pdf\//);
  assert.match(sw, /const BUILD_ID = "20260707-resilient-auth-boot-1"/);
  assert.match(sw, /const CACHE_NAME = `oroactive-cache-\$\{BUILD_ID\}`/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.match(sw, /keys\.filter\(shouldDeleteCache\)/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /HASHED_ASSET_PATTERN/);
  assert.match(sw, /NEVER_CACHE_PATHS = \[[\s\S]*"\/index\.html"/);
  assert.doesNotMatch(sw, /cache\.addAll|STATIC_ASSETS/);
  assert.match(server, /async function getBuildMetadata/);
  assert.match(server, /app\.get\("\/api\/version"/);
  assert.match(server, /app\.get\("\/version\.json"/);
  assert.match(server, /function setNoStoreHeaders/);
  assert.match(server, /function staticCacheHeaders/);
  assert.match(server, /isHashedStaticPath/);
  assert.match(server, /express\.static\(__dirname, \{[\s\S]*extensions: \["html"\],[\s\S]*setHeaders: staticCacheHeaders/);
  assert.match(app, /window\.__OROACTIVE_DIRTY_STATE__ = false/);
  assert.match(app, /window\.__OROACTIVE_VERSION__ = null/);
  assert.match(app, /const OROACTIVE_UPDATE_INTERVAL_MS = 30000/);
  assert.match(app, /async function checkForAppUpdate/);
  assert.match(app, /Nuova versione OroActive disponibile/);
  assert.match(app, /Salva la pratica prima di aggiornare l'app\./);
  assert.match(app, /data-app-update-now/);
  assert.match(app, /label: "Verifica aggiornamento app"/);
  assert.match(app, /visibilitychange/);
  assert.match(index, /app\.js\?v=20260707-resilient-auth-boot-1/);
  assert.match(index, /styles\.css\?v=20260707-resilient-auth-boot-1/);
  assert.match(version, /"ok": true/);
});

test("splash screen iniziale premium animata e senza ghost screen", async () => {
  const [index, app, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(index, /class="splash-screen hidden" id="splashScreen" aria-label="Avvio OroActive"/);
  assert.match(index, /Precisione\. Trasparenza\. Valore\./);
  assert.match(index, /Il gestionale intelligente per il compro oro\./);
  assert.match(index, /class="oa-splash-logo" src="oroactive-logo\.png" alt="OroActive"/);
  assert.match(index, /id="splashStatus" aria-live="polite"/);
  assert.doesNotMatch(index, /id="splashStatus" aria-live="polite">Verifica sessione/);
  assert.match(index, /id="splashRetry"/);
  assert.match(index, /id="splashLoginFallback"/);
  assert.doesNotMatch(index, /enterSoftware|splash-logo-button|splash-motto/);

  assert.match(styles, /\.splash-screen \{[\s\S]*z-index: 20000[\s\S]*min-height: 100dvh[\s\S]*isolation: isolate/);
  assert.match(styles, /radial-gradient\(circle at 50% 43%/);
  assert.match(styles, /\.oa-splash-logo-orbit-scan::before/);
  assert.match(styles, /@keyframes oaSplashScan/);
  assert.match(styles, /@keyframes oaSplashSheen/);
  assert.match(styles, /body\.splash-active \{[\s\S]*overflow: hidden/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);

  assert.match(app, /const OROACTIVE_SPLASH_SESSION_KEY = "oroactive_splash_seen"/);
  assert.match(app, /const OROACTIVE_SPLASH_MIN_MS = 5000/);
  assert.match(app, /const OROACTIVE_SPLASH_BRIEF_MS = 5000/);
  assert.match(app, /const SESSION_RESTORE_TIMEOUT_MS = 8000/);
  assert.match(app, /const BOOT_SPLASH_MAX_MS = 2000/);
  assert.match(app, /const OROACTIVE_AUTH_DAY_KEY = "oroactive-auth-day"/);
  assert.match(app, /function currentAuthDay/);
  assert.match(app, /authDay !== currentAuthDay\(\)/);
  assert.match(app, /saveDeviceStorage\(OROACTIVE_AUTH_DAY_KEY, token \? currentAuthDay\(\) : ""\)/);
  assert.match(app, /sessionStorage\.getItem\(OROACTIVE_SPLASH_SESSION_KEY\) === "true"/);
  assert.match(app, /sessionStorage\.setItem\(OROACTIVE_SPLASH_SESSION_KEY, "true"\)/);
  assert.match(app, /function showStartupSplash/);
  assert.match(app, /async function completeStartupSplash/);
  assert.match(app, /async function withSessionRestoreTimeout/);
  assert.match(app, /openMainMenuCleanly\(\{ keepSplash: true \}\)/);
  assert.match(app, /if \(!hasDailySession\) \{[\s\S]*showLogin\(\);[\s\S]*return;[\s\S]*\}/);
  assert.match(app, /showStartupSplash\(\);[\s\S]*await restoreSession\(\{ keepSplash: true, tokenLoaded: true \}\)/);
  assert.match(app, /withSessionRestoreTimeout\(loadStoredAuthToken\(\), "Lettura sessione"\)/);
  assert.match(app, /apiRequest\("\/auth\/me", \{ timeoutMs: keepSplash \? BOOT_SPLASH_MAX_MS : SESSION_RESTORE_TIMEOUT_MS, retries: 1 \}\)/);
  assert.match(app, /cache: "no-store"/);
  assert.match(app, /state\.currentUser = normalizeAuthenticatedUserPayload\(data, "session"\)/);
  assert.match(app, /\[OroActive Auth\] User loaded/);
  assert.match(app, /\[OroActive Auth\] Permissions loaded/);
  assert.match(app, /schedulePostLoginMenuGuard\("session"\)/);
  assert.match(app, /reportFrontendFailure\("session profile restore", error\)/);
  assert.match(app, /await clearStoredAuthToken\(\)/);
  assert.match(app, /showStartupSplashError/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("sezione OroActive Academy e certificazioni interne presenti", async () => {
  const [index, app, server, schema] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);

  assert.match(app, /label: "OroActive Academy"[\s\S]*section: "training"/);
  assert.match(app, /label: "OroActive Academy"[\s\S]*keywords: "academy formazione catalogo academy corsi certificazioni attestati badge training operatore gestione academy"/);
  assert.doesNotMatch(app, /\{ id: "my-courses"/);
  assert.doesNotMatch(app, /\{ id: "certifications"/);
  assert.doesNotMatch(app, /\{ id: "badges"/);
  assert.doesNotMatch(app, /\{ id: "training-history"/);
  assert.doesNotMatch(app, /\{ id: "operator-training"/);
  assert.doesNotMatch(app, /label: "Catalogo Academy"[\s\S]*courseTabShortcut/);
  assert.match(index, /Catalogo Academy/);
  assert.doesNotMatch(index, /I miei corsi/);
  assert.match(index, /data-course-tab="path">Il mio percorso/);
  assert.match(index, /data-course-tab="competencies">Matrice competenze/);
  assert.match(index, /Certificazioni/);
  assert.match(index, /Badge/);
  assert.match(index, /data-course-tab="exams">Esami/);
  assert.match(index, /data-course-tab="practicals">Prove pratiche/);
  assert.match(index, /data-course-tab="simulations">Laboratorio simulazioni/);
  assert.match(index, /Training Operatore/);
  assert.match(index, /data-course-tab="history">Storico formazione/);
  assert.match(index, /Gestione Academy/);
  assert.match(index, /data-course-tab="dashboard">Dashboard formazione/);
  assert.doesNotMatch(index, /data-course-tab="mine"/);
  assert.match(index, /id="courseCurrentLocation"/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_faculties/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_courses/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_lessons/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_certificates/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_badges/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_qualification_settings/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_learning_paths/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_competencies/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_practical_assessments/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_operational_capabilities/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_simulation_scenarios/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_course_versions/);
  assert.match(app, /apiRequest\("\/corsi"/);
  assert.match(app, /apiRequest\("\/academy\/facolta"/);
  assert.match(app, /apiRequest\("\/academy\/my-learning-path"/);
  assert.match(app, /apiRequest\("\/academy\/my-competencies"/);
  assert.match(app, /apiRequest\("\/academy\/my-practical-assessments"/);
  assert.match(app, /apiRequest\("\/academy\/my-operational-capabilities"/);
  assert.match(app, /apiRequest\("\/academy\/simulations"/);
  assert.match(app, /function renderMyLearningPath/);
  assert.match(app, /function renderCompetencyMatrix/);
  assert.match(app, /function renderPracticalAssessments/);
  assert.match(app, /function renderSimulationLab/);
  assert.match(app, /function renderFounderQualificationDashboard/);
  assert.match(server, /app\.get\("\/api\/corsi"/);
  assert.match(server, /ACADEMY_ENFORCEMENT_MODE/);
  assert.match(server, /async function seedAcademyQualificationSystem/);
  assert.match(server, /async function getUserLearningPath/);
  assert.match(server, /async function getCourseCompletionState/);
  assert.match(server, /async function computeUserCompetencyState/);
  assert.match(server, /async function checkCapability/);
  assert.match(server, /function requireOperationalQualification/);
  assert.match(server, /assertOperationalQualificationForFinalAct/);
  assert.match(server, /async function backfillAcademyQualificationData/);
  assert.match(server, /app\.get\("\/api\/academy\/my-learning-path"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-competencies"/);
  assert.match(server, /app\.post\("\/api\/academy\/capabilities\/check"/);
  assert.match(server, /app\.get\("\/api\/academy\/simulations"/);
  assert.match(server, /app\.post\("\/api\/academy\/practical-assessments\/:assessmentId\/request"/);
  assert.match(server, /app\.get\("\/api\/academy\/founder\/qualification-dashboard"/);
  assert.match(server, /app\.post\(\["\/api\/atti", "\/api\/acts"\]/);
  assert.match(server, /SALE_DEED_COMPLETE/);
  assert.match(server, /app\.post\("\/api\/giacenza\/trasferimenti", requireOperationalQualification\("STOCK_MANAGE"\)/);
  assert.match(server, /app\.post\("\/api\/fusioni\/lotti", requireOperationalQualification\("FUSION_CREATE"\)/);
  assert.match(server, /app\.post\("\/api\/academy\/facolta"/);
  assert.match(server, /app\.put\("\/api\/academy\/facolta\/:id"/);
  assert.match(server, /app\.delete\("\/api\/academy\/facolta\/:id"/);
  assert.match(server, /app\.get\("\/api\/academy\/faculties"/);
  assert.match(server, /app\.get\("\/api\/academy\/courses"/);
  assert.match(server, /app\.post\("\/api\/academy\/modules"/);
  assert.match(server, /app\.post\("\/api\/academy\/lessons"/);
  assert.match(server, /app\.post\("\/api\/academy\/materials"/);
  assert.match(server, /app\.post\("\/api\/academy\/progress\/complete-lesson"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-certificates"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-badges"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-level"/);
  assert.match(server, /app\.post\("\/api\/corsi\/esami"/);
  assert.match(server, /app\.delete\("\/api\/corsi\/:id"/);
  assert.match(server, /app\.delete\("\/api\/corsi\/materiali\/:id"/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS course_certificates/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS course_badges/);
});

test("Oro Master e facoltà generata vengono rimossi dal catalogo Academy", async () => {
  const [server, schema, generator, app, index, styles, migration] = await Promise.all([
    file("server.js"),
    file("schema.sql"),
    file("services/academy/goldMasterCourseGenerator.js"),
    file("app.js"),
    file("index.html"),
    file("styles.css"),
    file("migrations/20260612_remove_gold_master_course.sql")
  ]);

  assert.match(generator, /GOLD_MASTER_COURSE_CODE = "ORO-MASTER-001"/);
  assert.match(generator, /GOLD_MASTER_COURSE_TITLE = "Oro Master — Dalla Bilancia d’Oro"/);
  assert.match(schema, /ALTER TABLE courses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '\{\}'::jsonb/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_source_documents/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_lesson_source_refs/);
  assert.match(migration, /DELETE FROM courses/);
  assert.match(migration, /ORO-MASTER-001/);
  assert.match(migration, /OroActive Academy/);
  assert.match(server, /removeGoldMasterCourseAndFaculty/);
  assert.match(server, /Pulizia Oro Master non completata/);
  assert.match(server, /DELETE FROM courses WHERE id = ANY/);
  assert.match(server, /UPDATE courses SET faculty_id = NULL/);
  assert.doesNotMatch(server, /await ensureGoldMasterCourseInCatalog\(\)/);
  assert.doesNotMatch(server, /safeEnsureGoldMasterCourseForCatalog\(\{ forceVisible: true \}\)/);
  assert.doesNotMatch(server, /gold_master_status/);
  assert.doesNotMatch(server, /app\.post\("\/api\/academy\/gold-master\/ensure-visible"/);
  assert.doesNotMatch(server, /app\.post\("\/api\/academy\/gold-master\/generate-from-bilancia"/);
  assert.doesNotMatch(server, /app\.get\("\/api\/academy\/gold-master\/course"/);
  assert.match(server, /publishCourseDraft/);
  assert.match(server, /app\.post\("\/api\/corsi\/:id\/publish"/);
  assert.match(app, /metadata\.courseCode === "ORO-MASTER-001"/);
  assert.match(app, /filter\(\(course\) => !isGoldMasterCourse\(course\)\)/);
  assert.match(app, /filter\(\(faculty\) => String\(faculty\.name \|\| ""\)\.trim\(\) !== "OroActive Academy"\)/);
  assert.doesNotMatch(app, /ensureGoldMasterVisibleForAcademy/);
  assert.doesNotMatch(app, /restoreGoldMasterCourse/);
  assert.doesNotMatch(app, /goldMasterRestoring/);
  assert.match(app, /mergeTrainingCourseInState/);
  assert.doesNotMatch(app, /Rendi disponibile Oro Master/);
  assert.doesNotMatch(app, /renderGoldMasterRecoveryCard/);
  assert.doesNotMatch(app, /data-ensure-gold-master/);
  assert.match(app, /data-edit-course/);
  assert.doesNotMatch(app, /data-publish-course/);
  assert.match(app, /data-delete-course/);
  assert.doesNotMatch(app, /data-delete-course-material/);
  assert.doesNotMatch(app, /data-delete-course-section/);
  assert.doesNotMatch(index, /id="trainingCoursePreviewButton"/);
  assert.doesNotMatch(index, /Visualizza bozza/);
  assert.doesNotMatch(index, /Crea corso/);
  assert.doesNotMatch(index, /Nuovo corso/);
  assert.match(index, /id="trainingCourseEditHost"/);
  assert.match(index, /id="trainingCourseEditTemplate"/);
  assert.doesNotMatch(index, /id="trainingCourseForm" hidden/);
  assert.match(index, /Salva modifiche/);
  assert.match(index, /Chiudi modifica/);
  assert.match(app, /function ensureTrainingCourseEditForm/);
  assert.match(app, /function removeTrainingCourseEditForm/);
  assert.match(styles, /#trainingCourseEditHost:empty/);
  assert.doesNotMatch(app, /data-create-academy-faculty/);
  assert.doesNotMatch(app, /Crea facoltà/);
  assert.doesNotMatch(index, /trainingCoursePublishButton/);
  assert.match(styles, /\.academy-preview-modal/);
  assert.doesNotMatch(app, /academy-gold-master-strip/);
  assert.doesNotMatch(styles, /\.academy-gold-master-strip/);
});

test("corsi base PDF OroActive Academy sono consultabili e test finale assegna badge certificazione", async () => {
  const [server, app, styles, schema, migration, index] = await Promise.all([
    file("server.js"),
    file("app.js"),
    file("styles.css"),
    file("schema.sql"),
    file("migrations/20260616_academy_base_courses.sql"),
    file("index.html")
  ]);

  assert.match(server, /OROACTIVE_BASE_ACADEMY_COURSES/);
  assert.match(server, /OA-BASE-ORO/);
  assert.match(server, /OROACTIVE-BASE-ORO/);
  assert.match(server, /Corso Base sull'Oro — OroActive/);
  assert.match(server, /OA-BASE-ARGENTO/);
  assert.match(server, /OROACTIVE-BASE-ARGENTO/);
  assert.match(server, /Corso Base sull'Argento — OroActive/);
  assert.match(server, /OA-BASE-DIAMANTI/);
  assert.match(server, /OROACTIVE-BASE-DIAMANTI/);
  assert.match(server, /Corso Base sui Diamanti — OroActive/);
  assert.match(server, /OA-OPERATIVO-COMPLETO/);
  assert.match(server, /OROACTIVE-COMPLETO-COMPRO-ORO/);
  assert.match(server, /Corso Operativo Completo Compro Oro/);
  for (const code of [
    "OA-ADV-ANTIFRODE",
    "OA-ADV-INVESTIMENTO",
    "OA-ADV-PRICING",
    "OA-ADV-GIACENZA",
    "OA-ADV-NORMATIVA",
    "OA-ADV-COMUNICAZIONE"
  ]) {
    assert.match(server, new RegExp(code));
  }
  assert.match(server, /Percorso Avanzato Compro Oro/);
  assert.match(server, /isCourseCompletedForUser/);
  assert.match(server, /COURSE_PREREQUISITE_REQUIRED/);
  assert.match(server, /category: "Formazione Compro Oro"/);
  assert.match(server, /prerequisiteCourseCodes/);
  assert.match(server, /OA-BASE-ORO[\s\S]*OA-BASE-ARGENTO[\s\S]*OA-BASE-DIAMANTI/);
  assert.match(server, /ensureOroActiveBaseAcademyCourses/);
  assert.match(server, /oroactiveBaseCourseDefinitionFor/);
  assert.match(server, /oroactiveBaseCourseQuizQuestions/);
  assert.match(server, /academyCoursePrerequisiteStatus/);
  assert.match(server, /assertAcademyCoursePrerequisites/);
  assert.match(server, /completedOroActiveCourseCodesForUser/);
  assert.match(server, /storedExamQuestions\.length[\s\S]*oroactiveBaseCourseQuizQuestions\(course\)/);
  assert.match(server, /questions = oroactiveBaseCourseQuizQuestions\(course, \{ includeAnswers: true \}\)/);
  assert.match(server, /OROACTIVE_BASE_FINAL_EXAM_PASS_SCORE = 85/);
  assert.match(server, /OROACTIVE_BASE_FINAL_EXAM_REQUIRED_CORRECT = 17/);
  assert.match(server, /pdfRequiresFinalTest/);
  assert.match(server, /academyBaseSlidesRoute/);
  assert.match(server, /app\.get\("\/api\/academy\/courses\/:id\/slides\/download"/);
  assert.match(server, /evaluateCourseFinalQuiz/);
  assert.match(server, /awardAcademyCourseCompletion/);
  assert.match(server, /INTERVAL '48 hours'/);
  assert.match(server, /final_exam_retry_blocked/);
  assert.match(server, /final_exam_retry_available_at/);
  assert.match(server, /retry_available_at/);
  assert.match(server, /Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"/);
  assert.match(server, /app\.get\("\/service-worker\.js"/);
  assert.match(server, /course_quiz_results/);
  assert.match(server, /academy_certificates/);
  assert.match(server, /academy_badges/);
  assert.doesNotMatch(server, /Supera il test finale per sbloccare le slide PDF ufficiali/);
  for (const code of ["OA-BASE-ORO", "OA-BASE-ARGENTO", "OA-BASE-DIAMANTI"]) {
    const start = server.indexOf(`code: "${code}"`);
    assert.notEqual(start, -1);
    const nextCourse = server.indexOf('  {\n    code: "OA-BASE-', start + 1);
    const completeCourse = server.indexOf("code: OROACTIVE_OPERATIVE_COURSE_CODE", start + 1);
    const candidates = [nextCourse, completeCourse].filter((index) => index !== -1);
    const end = candidates.length ? Math.min(...candidates) : server.indexOf("const aurumBlocksDefaultQuestions", start);
    const block = server.slice(start, end);
    assert.equal((block.match(/question:/g) || []).length, 20);
  }
  const completeCourseStart = server.indexOf("code: OROACTIVE_OPERATIVE_COURSE_CODE");
  assert.notEqual(completeCourseStart, -1);
  const completeCourseBlock = server.slice(completeCourseStart, server.indexOf('code: "OA-ADV-ANTIFRODE"', completeCourseStart));
  assert.equal((completeCourseBlock.match(/question:/g) || []).length, 20);

  assert.match(app, /Sostieni test finale/);
  assert.match(app, /course_locked/);
  assert.match(app, /prerequisites_satisfied/);
  assert.match(app, /Percorso Avanzato Compro Oro/);
  assert.match(app, /Vai al corso propedeutico/);
  assert.match(app, /Esame non disponibile/);
  assert.match(app, /Test disponibile tra 48 ore/);
  assert.match(app, /Test finale richiesto per ottenere badge e certificazione/);
  assert.match(app, /Rispondi correttamente ad almeno/);
  assert.match(app, /courseExamRetryMessage/);
  assert.match(app, /Visualizza Corso/);
  assert.match(app, /data-view-course-slides/);
  assert.match(app, /data-download-course-slides/);
  assert.match(app, /data-submit-course-final-exam/);
  assert.match(app, /showCourseExamModal/);
  assert.match(app, /submitCourseFinalExam/);
  assert.match(app, /academyExamHashSeed/);
  assert.match(app, /academyExamMixedOptions/);
  assert.match(app, /data-academy-option-original-index/);
  assert.match(app, /options\[0\]\?\.originalIndex === 0/);
  assert.match(app, /downloadCourseSlides/);
  assert.match(app, /academy\/certificates\/\$\{encodeURIComponent\(certificateId\)\}\/download/);
  assert.doesNotMatch(app, /Visualizza slide PDF/);
  assert.doesNotMatch(app, /Apri materiale didattico/);
  assert.doesNotMatch(app, /Slide PDF bloccate/);
  assert.doesNotMatch(app, /sbloccare slide/);
  assert.doesNotMatch(app, /Stato: \$\{escapeHtml\(status\)\}/);
  assert.doesNotMatch(app, /Inizia corso/);
  assert.doesNotMatch(app, /Salva appunti/);
  assert.doesNotMatch(app, /Chiedi all'AI/);
  assert.doesNotMatch(app, /Segna esame superato/);
  assert.doesNotMatch(app, /data-course-progress/);
  assert.doesNotMatch(app, /class="course-progress"/);
  assert.doesNotMatch(app, /\$\{percent\}%/);
  assert.doesNotMatch(app, /Completamento medio/);
  assert.doesNotMatch(app, /courseSummary\.innerHTML = `[^`]*%/);
  assert.doesNotMatch(index, /<strong>0%<\/strong>/);
  assert.match(index, /<strong>Test finali<\/strong>/);
  assert.doesNotMatch(styles, /\.course-progress\s*\{/);
  assert.doesNotMatch(styles, /\.course-progress\s+span/);
  assert.match(styles, /\.academy-course-card \.course-progress,[\s\S]*\.academy-course-card \.course-progress-panel > strong[\s\S]*display: none !important/);
  assert.doesNotMatch(app, /data-save-academy-note/);
  assert.doesNotMatch(app, /data-course-ai/);
  assert.match(styles, /\.academy-exam-modal/);
  assert.match(schema, /ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '\{\}'::jsonb/);
  assert.match(migration, /ALTER TABLE course_quizzes[\s\S]*ADD COLUMN IF NOT EXISTS metadata/);
  await Promise.all([
    access(new URL("assets/academy/courses/corso-base-oro-oroactive.pdf", root)),
    access(new URL("assets/academy/courses/corso-base-argento-oroactive.pdf", root)),
    access(new URL("assets/academy/courses/corso-base-diamanti-oroactive.pdf", root)),
    access(new URL("assets/academy/courses/corso-completo-compro-oro.pdf", root)),
    access(new URL("assets/academy/courses/corso-avanzato-antifrode-falsi.pdf", root)),
    access(new URL("assets/academy/courses/corso-avanzato-monete-lingotti-metalli-investimento.pdf", root)),
    access(new URL("assets/academy/courses/corso-avanzato-quotazioni-margini-prezzo-massimo-pagabile.pdf", root)),
    access(new URL("assets/academy/courses/corso-avanzato-giacenza-fusione-rientro-economico.pdf", root)),
    access(new URL("assets/academy/courses/corso-avanzato-normativa-sicurezza-operativa.pdf", root)),
    access(new URL("assets/academy/courses/corso-avanzato-comunicazione-gestione-cliente.pdf", root))
  ]);
});

test("Elenco Monete è una sottosezione Formazione con riconoscimento foto backend", async () => {
  const [index, app, server, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("styles.css")
  ]);

  assert.match(app, /id: "gold-coin-encyclopedia"[\s\S]*label: "Elenco Monete"[\s\S]*section: "coinEncyclopedia"/);
  assert.match(app, /keywords: "elenco monete monete oro enciclopedia numismatica/);
  assert.match(index, /<section id="coinEncyclopedia" class="screen">/);
  assert.match(index, /id="coinCameraInput" type="file" accept="image\/\*" capture="environment"/);
  assert.match(index, /id="coinCatalogGrid"/);
  assert.match(index, /id="coinDetailPanel"/);
  assert.match(app, /const GOLD_COIN_CATALOG = \[/);
  assert.match(app, /sterlina-oro-sovrana/);
  assert.match(app, /marengo-20-lire-italia/);
  assert.match(app, /marengo-20-lire-vittorio-emanuele-ii/);
  assert.match(app, /Marengo 20 Lire Vittorio Emanuele II/);
  assert.match(app, /id: "marengo-20-lire-vittorio-emanuele-ii"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /marengo-20-lire-vittorio-emanuele-ii-regno-sardegna/);
  assert.match(app, /Marengo 20 Lire Vittorio Emanuele II Regno di Sardegna/);
  assert.match(app, /id: "marengo-20-lire-vittorio-emanuele-ii-regno-sardegna"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /marengo-20-lire-vittorio-emanuele-iii-aratrice/);
  assert.match(app, /Marengo 20 Lire Vittorio Emanuele III Aratrice/);
  assert.match(app, /id: "marengo-20-lire-vittorio-emanuele-iii-aratrice"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /100-lire-vittorio-emanuele-iii-fascione/);
  assert.match(app, /100 Lire Vittorio Emanuele III Fascione/);
  assert.match(app, /id: "100-lire-vittorio-emanuele-iii-fascione"[\s\S]*grossWeight: 32\.25,[\s\S]*fineGold: 29\.025,[\s\S]*diameter: 35/);
  assert.match(app, /40-lire-oro-napoleone-i/);
  assert.match(app, /40 Lire oro Napoleone I/);
  assert.match(app, /id: "40-lire-oro-napoleone-i"[\s\S]*grossWeight: 12\.9,[\s\S]*fineGold: 11\.61,[\s\S]*diameter: 26/);
  assert.match(app, /marengo-20-lire-carlo-alberto/);
  assert.match(app, /Marengo 20 Lire Carlo Alberto/);
  assert.match(app, /id: "marengo-20-lire-carlo-alberto"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /marengo-20-lire-carlo-felice/);
  assert.match(app, /Marengo 20 Lire Carlo Felice/);
  assert.match(app, /id: "marengo-20-lire-carlo-felice"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /napoleone-20-franchi-gallo-marianne/);
  assert.match(app, /Napoleone d'oro 20 Franchi Francesi/);
  assert.match(app, /marengo-20-franchi-napoleone-iii-testa-laureata/);
  assert.match(app, /Marengo 20 Franchi Napoleone III testa laureata/);
  assert.match(app, /NAPOLEON III EMPEREUR/);
  assert.match(app, /EMPIRE FRANCAIS/);
  assert.match(app, /id: "marengo-20-franchi-napoleone-iii-testa-laureata"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /100-franchi-napoleone-iii-francia/);
  assert.match(app, /100 Franchi Napoleone III \(Francia\)/);
  assert.match(app, /id: "100-franchi-napoleone-iii-francia"[\s\S]*grossWeight: 32\.25,[\s\S]*fineGold: 29\.025,[\s\S]*diameter: 35/);
  assert.match(app, /Zecca di Strasburgo|zecca di Strasburgo|strasburgo/);
  assert.match(app, /padiglione coronato/);
  assert.match(app, /5-franchi-napoleone-iii-francia/);
  assert.match(app, /5 Franchi Napoleone III \(Francia\)/);
  assert.match(app, /id: "5-franchi-napoleone-iii-francia"[\s\S]*grossWeight: 1\.629,[\s\S]*fineGold: 1\.466,[\s\S]*diameter: 16\.7/);
  assert.match(app, /5 FRANCS/);
  assert.match(app, /marengo-20-franchi-napoleone-iii-testa-nuda/);
  assert.match(app, /Marengo 20 Franchi Napoleone III testa nuda/);
  assert.match(app, /testa nuda/);
  assert.match(app, /id: "marengo-20-franchi-napoleone-iii-testa-nuda"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /marengo-austriaco-20-franchi/);
  assert.match(app, /Marengo 20 Franchi Francesco Giuseppe I \(Austria\)/);
  assert.match(app, /id: "marengo-austriaco-20-franchi"[\s\S]*mintYears: "1870-1916 \/ riconio 1892"[\s\S]*grossWeight: 6\.45,[\s\S]*diameter: 21/);
  assert.match(app, /FRANCISCVS IOSEPHVS I D G IMPERATOR ET REX/);
  assert.match(app, /IMPERIVM AVSTRIACVM/);
  assert.match(app, /krugerrand-1-oz/);
  assert.match(app, /maple-leaf-1-oz/);
  assert.match(app, /canada-maple-leaf-20-dollari/);
  assert.match(app, /Canada Foglia d'Acero d'oro 20 Dollari/);
  assert.match(app, /grossWeight: 15\.55/);
  assert.match(app, /diameter: 25/);
  assert.match(app, /canada-maple-leaf-50-dollari/);
  assert.match(app, /Canada Foglia d'Acero d'oro 50 Dollari/);
  assert.match(app, /id: "canada-maple-leaf-50-dollari"[\s\S]*grossWeight: 31\.1,[\s\S]*diameter: 30/);
  assert.match(app, /canada-maple-leaf-10-dollari/);
  assert.match(app, /Canada Foglia d'Acero d'oro 10 Dollari/);
  assert.match(app, /id: "canada-maple-leaf-10-dollari"[\s\S]*grossWeight: 7\.77,[\s\S]*diameter: 20/);
  assert.match(app, /canada-maple-leaf-5-dollari/);
  assert.match(app, /Canada Foglia d'Acero d'oro 5 Dollari/);
  assert.match(app, /id: "canada-maple-leaf-5-dollari"[\s\S]*grossWeight: 3\.11,[\s\S]*diameter: 16/);
  assert.match(app, /canada-maple-leaf-1-dollaro/);
  assert.match(app, /Canada Foglia d'Acero d'oro 1 Dollaro/);
  assert.match(app, /id: "canada-maple-leaf-1-dollaro"[\s\S]*grossWeight: 1\.55,[\s\S]*diameter: 13\.92/);
  assert.match(app, /filarmonica-vienna-2026-1-oz/);
  assert.match(app, /Filarmonica di Vienna 2026/);
  assert.match(app, /austria-100-euro-filarmonica-vienna-oro/);
  assert.match(app, /Austria 100 euro Filarmonica di Vienna d'oro/);
  assert.match(app, /id: "austria-100-euro-filarmonica-vienna-oro"[\s\S]*mintYears: "Anni misti"[\s\S]*grossWeight: 31\.1,[\s\S]*diameter: 38/);
  assert.match(app, /austria-100-euro-filarmonica-vienna-oro-fdc/);
  assert.match(app, /Austria 100 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(app, /id: "austria-100-euro-filarmonica-vienna-oro-fdc"[\s\S]*mintYears: "Anno corrente"[\s\S]*grossWeight: 31\.1,[\s\S]*diameter: 38/);
  assert.match(app, /REPUBLIK OSTERREICH/);
  assert.match(app, /WIENER PHILHARMONIKER/);
  assert.match(app, /austria-50-euro-filarmonica-vienna-oro/);
  assert.match(app, /Austria 50 euro Filarmonica di Vienna d'oro/);
  assert.match(app, /id: "austria-50-euro-filarmonica-vienna-oro"[\s\S]*grossWeight: 15\.55,[\s\S]*diameter: 28/);
  assert.match(app, /1\/2 UNZE GOLD 999\.9/);
  assert.match(app, /austria-50-euro-filarmonica-vienna-oro-fdc/);
  assert.match(app, /Austria 50 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(app, /id: "austria-50-euro-filarmonica-vienna-oro-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 15\.55,[\s\S]*diameter: 28/);
  assert.match(app, /austria-25-euro-filarmonica-vienna-oro/);
  assert.match(app, /Austria 25 euro Filarmonica di Vienna d'oro/);
  assert.match(app, /id: "austria-25-euro-filarmonica-vienna-oro"[\s\S]*grossWeight: 7\.77,[\s\S]*diameter: 22/);
  assert.match(app, /1\/4 UNZE GOLD 999\.9/);
  assert.match(app, /austria-25-euro-filarmonica-vienna-oro-fdc/);
  assert.match(app, /Austria 25 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(app, /id: "austria-25-euro-filarmonica-vienna-oro-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 7\.77,[\s\S]*diameter: 22/);
  assert.match(app, /austria-10-euro-filarmonica-vienna-oro/);
  assert.match(app, /Austria 10 euro Filarmonica di Vienna d'oro/);
  assert.match(app, /id: "austria-10-euro-filarmonica-vienna-oro"[\s\S]*grossWeight: 3\.11,[\s\S]*diameter: 16/);
  assert.match(app, /1\/10 UNZE GOLD 999\.9/);
  assert.match(app, /austria-10-euro-filarmonica-vienna-oro-fdc/);
  assert.match(app, /Austria 10 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(app, /id: "austria-10-euro-filarmonica-vienna-oro-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 3\.11,[\s\S]*diameter: 16/);
  assert.match(app, /austria-4-euro-filarmonica-vienna-oro/);
  assert.match(app, /Austria 4 euro Filarmonica di Vienna d'oro/);
  assert.match(app, /id: "austria-4-euro-filarmonica-vienna-oro"[\s\S]*grossWeight: 1\.24,[\s\S]*diameter: 13/);
  assert.match(app, /1\/25 UNZE GOLD 999\.9/);
  assert.match(app, /austria-4-euro-filarmonica-vienna-oro-fdc/);
  assert.match(app, /Austria 4 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(app, /id: "austria-4-euro-filarmonica-vienna-oro-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 1\.24,[\s\S]*diameter: 13/);
  assert.match(app, /somalia-elephant-2023-1-oz/);
  assert.match(app, /Somalia Elephant 2023/);
  assert.match(app, /arca-noe-armenia-2025-1-oz/);
  assert.match(app, /Arca di Noe Armenia 2025/);
  assert.match(app, /100-lire-vittorio-emanuele-iii-fascione/);
  assert.match(app, /100 Lire Vittorio Emanuele III Fascione/);
  assert.match(app, /american-buffalo-1-oz/);
  assert.match(app, /kangaroo-nugget-1-oz/);
  assert.match(app, /id: "kangaroo-nugget-1-oz"[\s\S]*name: "Australia Nugget d'oro \(Kangaroo\) 100 Dollari"[\s\S]*mintYears: "Anni misti \/ 1986-oggi"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 30/);
  assert.match(app, /Perth Mint realizzo anche una moneta d'oro da una tonnellata/);
  assert.match(app, /Australian Lunar Gold Bullion/);
  assert.match(app, /australia-nugget-kangaroo-100-dollari-fdc/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 100 Dollari \(FIOR DI CONIO\)/);
  assert.match(app, /id: "australia-nugget-kangaroo-100-dollari-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 30/);
  assert.match(app, /Ritratto di Carlo III con valore nominale 100 Dollars/);
  assert.match(app, /Big Maple Leaf/);
  assert.match(app, /australia-nugget-kangaroo-50-dollari/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 50 Dollari/);
  assert.match(app, /15\.59/);
  assert.match(app, /25\.08/);
  assert.match(app, /australia-nugget-kangaroo-50-dollari-fdc/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 50 Dollari \(Fior di Conio\)/);
  assert.match(app, /Fior di Conio \(FDC\)/);
  assert.match(app, /Carlo III/);
  assert.match(app, /australia-nugget-kangaroo-25-dollari/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 25 Dollari/);
  assert.match(app, /7\.77/);
  assert.match(app, /20\.08/);
  assert.match(app, /australia-nugget-kangaroo-25-dollari-fdc/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 25 Dollari \(FIOR DI CONIO\)/);
  assert.match(app, /id: "australia-nugget-kangaroo-25-dollari-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 7\.77,[\s\S]*diameter: 20\.08/);
  assert.match(app, /Ritratto di Carlo III con valore nominale 25 Dollars/);
  assert.match(app, /australia-nugget-kangaroo-15-dollari/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 15 Dollari/);
  assert.match(app, /3\.11/);
  assert.match(app, /diameter: 16/);
  assert.match(app, /australia-nugget-kangaroo-15-dollari-fdc/);
  assert.match(app, /Australia Nugget d'oro \(Kangaroo\) 15 Dollari \(FIOR DI CONIO\)/);
  assert.match(app, /id: "australia-nugget-kangaroo-15-dollari-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 3\.11,[\s\S]*diameter: 16/);
  assert.match(app, /Ritratto di Carlo III con valore nominale 15 Dollars/);
  assert.match(app, /libertad-1-oz/);
  assert.match(app, /Messico Libertad oro 1 oz/);
  assert.match(app, /id: "libertad-1-oz"[\s\S]*grossWeight: 31\.13,[\s\S]*fineGold: 31\.099,[\s\S]*diameter: 34\.5/);
  assert.match(app, /Senza valore nominale/);
  assert.match(app, /1 Onza Oro Puro Ley \.999/);
  assert.match(app, /messico-libertad-oro-1-2-oz/);
  assert.match(app, /Messico Libertad oro 1\/2 oz/);
  assert.match(app, /id: "messico-libertad-oro-1-2-oz"[\s\S]*grossWeight: 15\.58,[\s\S]*fineGold: 15\.564,[\s\S]*diameter: 29/);
  assert.match(app, /1\/2 Onza Oro Puro Ley \.999/);
  assert.match(app, /messico-libertad-oro-1-4-oz/);
  assert.match(app, /Messico Libertad oro 1\/4 oz/);
  assert.match(app, /id: "messico-libertad-oro-1-4-oz"[\s\S]*grossWeight: 7\.78,[\s\S]*fineGold: 7\.772,[\s\S]*diameter: 23/);
  assert.match(app, /1\/4 Onza Oro Puro Ley \.999/);
  assert.match(app, /messico-libertad-oro-1-10-oz/);
  assert.match(app, /Messico Libertad oro 1\/10 oz/);
  assert.match(app, /id: "messico-libertad-oro-1-10-oz"[\s\S]*grossWeight: 3\.11,[\s\S]*fineGold: 3\.107,[\s\S]*diameter: 16/);
  assert.match(app, /1\/10 Onza Oro Puro Ley \.999/);
  assert.match(app, /messico-libertad-oro-1-20-oz/);
  assert.match(app, /Messico Libertad oro 1\/20 oz/);
  assert.match(app, /id: "messico-libertad-oro-1-20-oz"[\s\S]*grossWeight: 1\.55,[\s\S]*fineGold: 1\.548,[\s\S]*diameter: 13/);
  assert.match(app, /1\/20 Onza Oro Puro Ley \.999/);
  assert.match(app, /cina-panda-oro-1-oz-30g/);
  assert.match(app, /Cina Panda oro 1 oz \| 30 grammi/);
  assert.match(app, /grossWeight: 31\.11/);
  assert.match(app, /fineGold: 31\.079/);
  assert.match(app, /cina-panda-oro-1-2-oz-15g/);
  assert.match(app, /Cina Panda oro 1\/2 oz \| 15 grammi/);
  assert.match(app, /grossWeight: 15\.55/);
  assert.match(app, /fineGold: 15\.534/);
  assert.match(app, /diameter: 27/);
  assert.match(app, /cina-panda-oro-1-20-oz-1g/);
  assert.match(app, /Cina Panda oro 1\/20 oz \| 1 grammo/);
  assert.match(app, /id: "cina-panda-oro-1-20-oz-1g"[\s\S]*grossWeight: 1\.55,[\s\S]*fineGold: 1\.548,[\s\S]*diameter: 17\.95/);
  assert.match(app, /cina-panda-oro-1-grammo-fdc/);
  assert.match(app, /Cina Panda oro 1 grammo \(Fior di Conio\)/);
  assert.match(app, /id: "cina-panda-oro-1-grammo-fdc"[\s\S]*grossWeight: 1,[\s\S]*fineGold: 0\.999,[\s\S]*diameter: 10/);
  assert.match(app, /cina-panda-oro-30g-fdc/);
  assert.match(app, /Cina Panda oro 30 grammi \(Fior di Conio\)/);
  assert.match(app, /id: "cina-panda-oro-30g-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 30,[\s\S]*fineGold: 29\.97,[\s\S]*diameter: 32/);
  assert.match(app, /30 g Au \.999/);
  assert.match(app, /cina-panda-oro-15g-fdc/);
  assert.match(app, /Cina Panda oro 15 grammi \(Fior di Conio\)/);
  assert.match(app, /id: "cina-panda-oro-15g-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 15,[\s\S]*fineGold: 14\.985,[\s\S]*diameter: 27/);
  assert.match(app, /15 g Au \.999/);
  assert.match(app, /cina-panda-oro-8g-fdc/);
  assert.match(app, /Cina Panda oro 8 grammi \(Fior di Conio\)/);
  assert.match(app, /id: "cina-panda-oro-8g-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 8,[\s\S]*fineGold: 7\.992,[\s\S]*diameter: 22/);
  assert.match(app, /8 g Au \.999/);
  assert.match(app, /cina-panda-oro-3g-fdc/);
  assert.match(app, /Cina Panda oro 3 grammi \(Fior di Conio\)/);
  assert.match(app, /id: "cina-panda-oro-3g-fdc"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 3,[\s\S]*fineGold: 2\.997,[\s\S]*diameter: 18/);
  assert.match(app, /3 g Au \.999/);
  assert.match(app, /cina-panda-oro-1-4-oz-8g/);
  assert.match(app, /Cina Panda oro 1\/4 oz \| 8 grammi/);
  assert.match(app, /id: "cina-panda-oro-1-4-oz-8g"[\s\S]*grossWeight: 8,[\s\S]*fineGold: 7\.992,[\s\S]*diameter: 21\.95/);
  assert.match(app, /100 yuan/);
  assert.match(app, /quarto d'oncia/);
  assert.match(app, /cina-panda-oro-1-10-oz-3g/);
  assert.match(app, /Cina Panda oro 1\/10 oz \| 3 grammi/);
  assert.match(app, /id: "cina-panda-oro-1-10-oz-3g"[\s\S]*grossWeight: 3\.1,[\s\S]*fineGold: 3\.097,[\s\S]*diameter: 17\.95/);
  assert.match(app, /50 yuan/);
  assert.match(app, /un decimo/);
  assert.match(app, /panda-cinese-30g/);
  assert.match(app, /id: "american-eagle-1-oz"[\s\S]*name: "America Aquila 50 Dollari d'oro"[\s\S]*mintYears: "Anni misti"[\s\S]*grossWeight: 33\.92,[\s\S]*diameter: 32\.7/);
  assert.match(app, /Gold Bullion Coin Act del 1985/);
  assert.match(app, /1 OZ FINE GOLD/);
  assert.match(app, /BILANCIA_DORO_COIN_IMAGE_BASE/);
  assert.match(app, /COIN_IMAGE_SOURCE_BY_COIN/);
  assert.match(app, /INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS/);
  assert.match(app, /"austria-100-euro-filarmonica-vienna-oro"[\s\S]*"austria-100-euro-filarmonica-vienna-oro-fdc"[\s\S]*"austria-50-euro-filarmonica-vienna-oro"[\s\S]*"austria-50-euro-filarmonica-vienna-oro-fdc"/);
  assert.match(app, /"austria-25-euro-filarmonica-vienna-oro"[\s\S]*"austria-25-euro-filarmonica-vienna-oro-fdc"[\s\S]*"austria-10-euro-filarmonica-vienna-oro"[\s\S]*"austria-10-euro-filarmonica-vienna-oro-fdc"/);
  assert.match(app, /"austria-4-euro-filarmonica-vienna-oro"[\s\S]*"austria-4-euro-filarmonica-vienna-oro-fdc"/);
  assert.match(app, /"britannia-1-oz"[\s\S]*"britannia-100-sterline-fdc"/);
  assert.match(app, /queens-beast-leone-inghilterra-2016/);
  assert.match(app, /Queen's Beast Leone d'Inghilterra 2016/);
  assert.match(app, /id: "queens-beast-leone-inghilterra-2016"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2016"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Lion of England/);
  assert.match(app, /Guglielmo il Conquistatore/);
  assert.match(app, /tudor-beasts-leone-inghilterra-2022/);
  assert.match(app, /Tudor Beasts Leone d'Inghilterra 2022/);
  assert.match(app, /id: "tudor-beasts-leone-inghilterra-2022"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2022"[\s\S]*grossWeight: 31\.21,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Hampton Court/);
  assert.match(app, /Jody Clark/);
  assert.match(app, /tudor-beasts-centricora-beaufort-2023/);
  assert.match(app, /Tudor Beasts Centicora di Beaufort 2023/);
  assert.match(app, /id: "tudor-beasts-centricora-beaufort-2023"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2023"[\s\S]*grossWeight: 31\.21,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Yale of Beaufort/);
  assert.match(app, /Jane Seymour/);
  assert.match(app, /queens-beast-grifone-edoardo-iii-2017/);
  assert.match(app, /Queen's Beast Grifone di Edoardo III 2017/);
  assert.match(app, /id: "queens-beast-grifone-edoardo-iii-2017"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2017"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Griffin of Edward III/);
  assert.match(app, /Guerra dei cent'anni/);
  assert.match(app, /queens-beast-drago-rosso-galles-2017/);
  assert.match(app, /Queen's Beast Drago Rosso del Galles 2017/);
  assert.match(app, /id: "queens-beast-drago-rosso-galles-2017"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2017"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Red Dragon of Wales/);
  assert.match(app, /Llywelyn il Grande/);
  assert.match(app, /queens-beast-unicorno-scozia-2018/);
  assert.match(app, /Queen's Beast Unicorno di Scozia 2018/);
  assert.match(app, /id: "queens-beast-unicorno-scozia-2018"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2018"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Unicorn of Scotland/);
  assert.match(app, /Giacomo VI di Scozia/);
  assert.match(app, /queens-beast-toro-nero-clarence-2018/);
  assert.match(app, /Queen's Beast Toro Nero di Clarence 2018/);
  assert.match(app, /id: "queens-beast-toro-nero-clarence-2018"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2018"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Black Bull of Clarence/);
  assert.match(app, /Guerra delle Rose/);
  assert.match(app, /queens-beast-centricora-beaufort-2019/);
  assert.match(app, /Queen's Beast Centicora di Beaufort 2019/);
  assert.match(app, /id: "queens-beast-centricora-beaufort-2019"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2019"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Yale of Beaufort/);
  assert.match(app, /Lady Margaret Beaufort/);
  assert.match(app, /queens-beast-falco-plantageneti-2019/);
  assert.match(app, /Queen's Beast Falco dei Plantageneti 2019/);
  assert.match(app, /id: "queens-beast-falco-plantageneti-2019"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2019"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /Falcon of the Plantagenets/);
  assert.match(app, /fetchlock/);
  assert.match(app, /queens-beast-leone-bianco-mortimer-2020/);
  assert.match(app, /Queen's Beast Leone Bianco di Mortimer 2020/);
  assert.match(app, /id: "queens-beast-leone-bianco-mortimer-2020"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\) \/ 2020"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /White Lion of Mortimer/);
  assert.match(app, /Edoardo IV/);
  assert.match(app, /queens-beast-completer-masterpiece/);
  assert.match(app, /Queen's Beast Completer Masterpiece/);
  assert.match(app, /id: "queens-beast-completer-masterpiece"[\s\S]*country: "Regno Unito"[\s\S]*mintYears: "Fior di Conio \(FDC\)"[\s\S]*grossWeight: 31\.10,[\s\S]*diameter: 32\.69/);
  assert.match(app, /James Woodford/);
  assert.match(app, /Hampton Court Palace/);
  assert.match(app, /"sterlina-oro-sovrana"[\s\S]*"american-eagle-1-oz"[\s\S]*"arca-noe-armenia-2025-1-oz"/);
  assert.doesNotMatch(app.slice(app.indexOf("const INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS"), app.indexOf("function bilanciaDoroCoinImages")), /"american-buffalo-1-oz"/);
  assert.match(app, /"centenario-50-pesos"[\s\S]*"ducato-austriaco"[\s\S]*"20-dollari-double-eagle"[\s\S]*"20-mark-germania"/);
  assert.match(app, /Austria 1 Ducato d'oro \(Francesco Giuseppe\)/);
  assert.match(app, /id: "ducato-austriaco"[\s\S]*mintYears: "1831-1915 \/ riconio 1915"[\s\S]*grossWeight: 3\.49,[\s\S]*fineGold: 3\.442,[\s\S]*diameter: 20/);
  assert.match(app, /FRANC IOS I D G AUSTRIAE IMPERATOR/);
  assert.match(app, /HUNGAR BOHEM GAL LOD ILL REX A A 1915/);
  assert.match(app, /"marengo-belga-20-franchi"[\s\S]*"sterlina-vecchio-conio"[\s\S]*"sudafrica-2-rand"[\s\S]*"cile-100-pesos"/);
  assert.match(app, /chile-50-pesos-oro/);
  assert.match(app, /Chile 50 Pesos oro/);
  assert.match(app, /id: "chile-50-pesos-oro"[\s\S]*grossWeight: 10\.17,[\s\S]*fineGold: 9\.153,[\s\S]*diameter: 24/);
  assert.match(app, /CINCUENTA PESOS/);
  assert.match(app, /CINCO CONDORES/);
  assert.doesNotMatch(app.slice(app.indexOf("const INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS"), app.indexOf("function bilanciaDoroCoinImages")), /"marengo-belga-20-franchi"/);
  assert.match(app, /"austria-100-corone"[\s\S]*"messico-20-pesos"[\s\S]*"messico-10-pesos-oro"[\s\S]*"austria-1000-scellini"[\s\S]*"ungheria-20-corone"/);
  assert.match(app, /Austria 100 Corone d'oro/);
  assert.match(app, /id: "austria-100-corone"[\s\S]*grossWeight: 33\.87,[\s\S]*fineGold: 30\.488,[\s\S]*diameter: 37/);
  assert.match(app, /FRANC IOS I D G IMP AVSTR REX BOH GAL ILL ETC ET AP REX HVNG/);
  assert.match(app, /C CORONAE MDCCCCXV/);
  assert.match(app, /austria-20-corone-oro/);
  assert.match(app, /Austria 20 Corone d'oro/);
  assert.match(app, /id: "austria-20-corone-oro"[\s\S]*grossWeight: 6\.77,[\s\S]*fineGold: 6\.093,[\s\S]*diameter: 21/);
  assert.match(app, /XX CORONAE MDCCCCXV/);
  assert.match(app, /austria-10-corone-oro/);
  assert.match(app, /Austria 10 Corone d'oro/);
  assert.match(app, /id: "austria-10-corone-oro"[\s\S]*grossWeight: 3\.38,[\s\S]*fineGold: 3\.042,[\s\S]*diameter: 19/);
  assert.match(app, /X CORONAE MDCCCCXII/);
  assert.match(app, /mezzo marengo/);
  assert.doesNotMatch(app.slice(app.indexOf("const INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS"), app.indexOf("function bilanciaDoroCoinImages")), /"4-ducati-austriaci"/);
  assert.match(app, /const frontSide = invertSides \? "back" : "front"/);
  assert.match(app, /const backSide = invertSides \? "front" : "back"/);
  assert.match(app, /Archivio OroActive/);
  assert.doesNotMatch(app, /id: "wiener-philharmoniker-1-oz"/);
  assert.doesNotMatch(app, /name: "Wiener Philharmoniker 1 oz"/);
  assert.match(app, /sterlina-vecchio-conio/);
  assert.match(app, /Marengo 20 Franchi Albert \(Belgio\)/);
  assert.match(app, /ALBERT ROI DES BELGES/);
  assert.match(app, /grossWeight: 6\.45/);
  assert.match(app, /marengo-20-franchi-leopold-belgio/);
  assert.match(app, /Marengo 20 Franchi Leopold \(Belgio\)/);
  assert.match(app, /LEOPOLD II ROI DES BELGES/);
  assert.match(app, /L'UNION FAIT LA FORCE/);
  assert.match(app, /id: "marengo-20-franchi-leopold-belgio"[\s\S]*grossWeight: 6\.45,[\s\S]*fineGold: 5\.805,[\s\S]*diameter: 21/);
  assert.match(app, /4-ducati-austriaci/);
  assert.match(app, /Austria 4 Ducati d'oro \(Francesco Giuseppe\)/);
  assert.match(app, /Cecco Beppe/);
  assert.match(app, /fineGold: 13\.7773/);
  assert.match(app, /diameter: 39\.5/);
  assert.match(app, /messico-20-pesos/);
  assert.match(app, /messico-10-pesos-oro/);
  assert.match(app, /Messico 10 Pesos oro/);
  assert.match(app, /grossWeight: 8\.33/);
  assert.match(app, /fineGold: 7\.5/);
  assert.match(app, /diameter: 22\.5/);
  assert.match(app, /messico-2-5-pesos-oro/);
  assert.match(app, /Messico 2,5 Pesos oro/);
  assert.match(app, /id: "messico-2-5-pesos-oro"[\s\S]*grossWeight: 2\.08,[\s\S]*fineGold: 1\.872,[\s\S]*diameter: 15\.5/);
  assert.match(app, /Dos y Medio Pesos/);
  assert.match(app, /messico-2-pesos-oro/);
  assert.match(app, /Messico 2 Pesos oro/);
  assert.match(app, /id: "messico-2-pesos-oro"[\s\S]*grossWeight: 1\.66,[\s\S]*fineGold: 1\.494,[\s\S]*diameter: 13/);
  assert.match(app, /DOS PESOS/);
  assert.match(server, /messico-10-pesos-oro/);
  assert.match(server, /Messico 10 Pesos oro/);
  assert.match(server, /messico-2-5-pesos-oro/);
  assert.match(server, /Messico 2,5 Pesos oro/);
  assert.match(server, /dos y medio pesos/i);
  assert.match(server, /messico-2-pesos-oro/);
  assert.match(server, /Messico 2 Pesos oro/);
  assert.match(server, /dos pesos/i);
  assert.match(server, /Messico Libertad oro 1 oz/);
  assert.match(server, /ley \.999/i);
  assert.match(server, /messico-libertad-oro-1-2-oz/);
  assert.match(server, /Messico Libertad oro 1\/2 oz/);
  assert.match(server, /messico-libertad-oro-1-4-oz/);
  assert.match(server, /Messico Libertad oro 1\/4 oz/);
  assert.match(server, /messico-libertad-oro-1-10-oz/);
  assert.match(server, /Messico Libertad oro 1\/10 oz/);
  assert.match(server, /messico-libertad-oro-1-20-oz/);
  assert.match(server, /Messico Libertad oro 1\/20 oz/);
  assert.match(app, /Foto fronte\/retro estratte da/);
  assert.match(app, /function renderCoinEncyclopedia/);
  assert.match(app, /function groupedCoinsByCountry/);
  assert.match(app, /groupedCoinsByCountry\(visibleCoins\)\.map\(coinCountryGroupMarkup\)/);
  assert.match(app, /localeCompare\(String\(b\.country \|\| ""\), "it"\)/);
  assert.match(app, /async function identifyCoinFromCamera/);
  assert.match(app, /apiRequest\("\/training\/gold-coins\/identify"/);
  assert.match(server, /const GOLD_COIN_AI_CATALOG = \[/);
  assert.match(server, /marengo-20-lire-vittorio-emanuele-ii/);
  assert.match(server, /Marengo 20 Lire Vittorio Emanuele II/);
  assert.match(server, /marengo-20-lire-vittorio-emanuele-ii-regno-sardegna/);
  assert.match(server, /Marengo 20 Lire Vittorio Emanuele II Regno di Sardegna/);
  assert.match(server, /marengo-20-lire-vittorio-emanuele-iii-aratrice/);
  assert.match(server, /Marengo 20 Lire Vittorio Emanuele III Aratrice/);
  assert.match(server, /100-lire-vittorio-emanuele-iii-fascione/);
  assert.match(server, /100 Lire Vittorio Emanuele III Fascione/);
  assert.match(server, /40-lire-oro-napoleone-i/);
  assert.match(server, /40 Lire oro Napoleone I/);
  assert.match(server, /marengo-20-lire-carlo-alberto/);
  assert.match(server, /Marengo 20 Lire Carlo Alberto/);
  assert.match(server, /marengo-20-lire-carlo-felice/);
  assert.match(server, /Marengo 20 Lire Carlo Felice/);
  assert.match(server, /napoleone-20-franchi-gallo-marianne/);
  assert.match(server, /marengo-20-franchi-napoleone-iii-testa-laureata/);
  assert.match(server, /Marengo 20 Franchi Napoleone III testa laureata/);
  assert.match(server, /NAPOLEON III EMPEREUR/);
  assert.match(server, /EMPIRE FRANCAIS 20 FR/);
  assert.match(server, /100-franchi-napoleone-iii-francia/);
  assert.match(server, /100 Franchi Napoleone III \(Francia\)/);
  assert.match(server, /EMPIRE FRANCAIS 100 FR/);
  assert.match(server, /5-franchi-napoleone-iii-francia/);
  assert.match(server, /5 Franchi Napoleone III \(Francia\)/);
  assert.match(server, /EMPIRE FRANCAIS 5 FRANCS/);
  assert.match(server, /marengo-20-franchi-napoleone-iii-testa-nuda/);
  assert.match(server, /Marengo 20 Franchi Napoleone III testa nuda/);
  assert.match(server, /Marengo 20 Franchi Francesco Giuseppe I \(Austria\)/);
  assert.match(server, /imperivm avstriacvm/i);
  assert.match(server, /8 Fl 20 Fr 1892/);
  assert.match(server, /filarmonica-vienna-2026-1-oz/);
  assert.match(server, /austria-100-euro-filarmonica-vienna-oro/);
  assert.match(server, /Austria 100 euro Filarmonica di Vienna d'oro/);
  assert.match(server, /Wiener Philharmoniker arpa violini corno fagotto violoncello/);
  assert.match(server, /austria-100-euro-filarmonica-vienna-oro-fdc/);
  assert.match(server, /Austria 100 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(server, /fior di conio/);
  assert.match(server, /austria-50-euro-filarmonica-vienna-oro/);
  assert.match(server, /Austria 50 euro Filarmonica di Vienna d'oro/);
  assert.match(server, /1\/2 Unze Gold 999\.9 50 Euro/);
  assert.match(server, /austria-50-euro-filarmonica-vienna-oro-fdc/);
  assert.match(server, /Austria 50 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(server, /austria-25-euro-filarmonica-vienna-oro/);
  assert.match(server, /Austria 25 euro Filarmonica di Vienna d'oro/);
  assert.match(server, /1\/4 Unze Gold 999\.9 25 Euro/);
  assert.match(server, /austria-25-euro-filarmonica-vienna-oro-fdc/);
  assert.match(server, /Austria 25 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(server, /austria-10-euro-filarmonica-vienna-oro/);
  assert.match(server, /Austria 10 euro Filarmonica di Vienna d'oro/);
  assert.match(server, /1\/10 Unze Gold 999\.9 10 Euro/);
  assert.match(server, /austria-10-euro-filarmonica-vienna-oro-fdc/);
  assert.match(server, /Austria 10 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(server, /austria-4-euro-filarmonica-vienna-oro/);
  assert.match(server, /Austria 4 euro Filarmonica di Vienna d'oro/);
  assert.match(server, /1\/25 Unze Gold 999\.9 4 Euro/);
  assert.match(server, /austria-4-euro-filarmonica-vienna-oro-fdc/);
  assert.match(server, /Austria 4 euro Filarmonica di Vienna d'oro \(FIOR DI CONIO\)/);
  assert.match(server, /somalia-elephant-2023-1-oz/);
  assert.match(server, /arca-noe-armenia-2025-1-oz/);
  assert.match(server, /canada-maple-leaf-20-dollari/);
  assert.match(server, /maple leaf 20 dollars/);
  assert.match(server, /canada-maple-leaf-50-dollari/);
  assert.match(server, /maple leaf 50 dollars/);
  assert.match(server, /canada-maple-leaf-10-dollari/);
  assert.match(server, /maple leaf 10 dollars/);
  assert.match(server, /canada-maple-leaf-5-dollari/);
  assert.match(server, /maple leaf 5 dollars/);
  assert.match(server, /canada-maple-leaf-1-dollaro/);
  assert.match(server, /maple leaf 1 dollar/);
  assert.match(server, /Austria 1 Ducato d'oro \(Francesco Giuseppe\)/);
  assert.match(server, /FRANC IOS I D G AUSTRIAE IMPERATOR/);
  assert.match(server, /HUNGAR BOHEM GAL LOD ILL REX A A 1915/);
  assert.match(server, /Austria 100 Corone d'oro/);
  assert.match(server, /C CORONAE MDCCCCXV 100 COR 1915/);
  assert.match(server, /austria-20-corone-oro/);
  assert.match(server, /Austria 20 Corone d'oro/);
  assert.match(server, /XX CORONAE MDCCCCXV 20 COR 1915/);
  assert.match(server, /austria-10-corone-oro/);
  assert.match(server, /Austria 10 Corone d'oro/);
  assert.match(server, /X CORONAE MDCCCCXII 10 COR 1912/);
  assert.match(server, /America Aquila 50 Dollari d'oro/);
  assert.match(server, /gold bullion coin act/);
  assert.match(server, /1 oz fine gold/);
  assert.match(server, /australia-nugget-kangaroo-100-dollari-fdc/);
  assert.match(server, /kangaroo 100 dollars fdc/);
  assert.match(server, /Carlo III Australia 100 Dollars/);
  assert.match(server, /australia-nugget-kangaroo-50-dollari/);
  assert.match(server, /kangaroo 50 dollars/);
  assert.match(server, /australia-nugget-kangaroo-50-dollari-fdc/);
  assert.match(server, /kangaroo 50 dollars fdc/);
  assert.match(server, /australia-nugget-kangaroo-25-dollari/);
  assert.match(server, /kangaroo 25 dollars/);
  assert.match(server, /australia-nugget-kangaroo-25-dollari-fdc/);
  assert.match(server, /kangaroo 25 dollars fdc/);
  assert.match(server, /Carlo III Australia 25 Dollars/);
  assert.match(server, /australia-nugget-kangaroo-15-dollari/);
  assert.match(server, /kangaroo 15 dollars/);
  assert.match(server, /australia-nugget-kangaroo-15-dollari-fdc/);
  assert.match(server, /kangaroo 15 dollars fdc/);
  assert.match(server, /Carlo III Australia 15 Dollars/);
  assert.match(server, /cina-panda-oro-1-oz-30g/);
  assert.match(server, /Cina Panda oro 1 oz \| 30 grammi/);
  assert.match(server, /1oz au \.999/);
  assert.match(server, /cina-panda-oro-1-2-oz-15g/);
  assert.match(server, /Cina Panda oro 1\/2 oz \| 15 grammi/);
  assert.match(server, /200 yuan/);
  assert.match(server, /1\/2 oz/);
  assert.match(server, /cina-panda-oro-1-20-oz-1g/);
  assert.match(server, /Cina Panda oro 1\/20 oz \| 1 grammo/);
  assert.match(server, /20 yuan/);
  assert.match(server, /1\/20 oz/);
  assert.match(server, /cina-panda-oro-1-grammo-fdc/);
  assert.match(server, /Cina Panda oro 1 grammo \(Fior di Conio\)/);
  assert.match(server, /10 yuan/);
  assert.match(server, /1g au \.999/);
  assert.match(server, /100-lire-vittorio-emanuele-iii-fascione/);
  assert.doesNotMatch(server, /id: "wiener-philharmoniker-1-oz"/);
  assert.doesNotMatch(server, /name: "Wiener Philharmoniker 1 oz"/);
  assert.match(server, /GOLD_COIN_AI_CATALOG\.push/);
  assert.match(server, /sterlina-vecchio-conio/);
  assert.match(server, /Marengo 20 Franchi Albert \(Belgio\)/);
  assert.match(server, /albert roi/);
  assert.match(server, /marengo-20-franchi-leopold-belgio/);
  assert.match(server, /Marengo 20 Franchi Leopold \(Belgio\)/);
  assert.match(server, /roi des belges/);
  assert.match(server, /union fait la force/);
  assert.match(server, /chile-50-pesos-oro/);
  assert.match(server, /Chile 50 Pesos oro/);
  assert.match(server, /cincuenta pesos/);
  assert.match(server, /cinco condores/);
  assert.match(server, /cina-panda-oro-1-4-oz-8g/);
  assert.match(server, /Cina Panda oro 1\/4 oz \| 8 grammi/);
  assert.match(server, /100 yuan/);
  assert.match(server, /cina-panda-oro-1-10-oz-3g/);
  assert.match(server, /Cina Panda oro 1\/10 oz \| 3 grammi/);
  assert.match(server, /50 yuan/);
  assert.match(server, /cina-panda-oro-30g-fdc/);
  assert.match(server, /Cina Panda oro 30 grammi \(Fior di Conio\)/);
  assert.match(server, /30 g au \.999/);
  assert.match(server, /cina-panda-oro-15g-fdc/);
  assert.match(server, /Cina Panda oro 15 grammi \(Fior di Conio\)/);
  assert.match(server, /15 g au \.999/);
  assert.match(server, /cina-panda-oro-8g-fdc/);
  assert.match(server, /Cina Panda oro 8 grammi \(Fior di Conio\)/);
  assert.match(server, /8 g au \.999/);
  assert.match(server, /cina-panda-oro-3g-fdc/);
  assert.match(server, /Cina Panda oro 3 grammi \(Fior di Conio\)/);
  assert.match(server, /3 g au \.999/);
  assert.match(server, /Austria 4 Ducati d'oro \(Francesco Giuseppe\)/);
  assert.match(server, /cecco beppe/);
  assert.match(server, /const goldCoinIdentificationSchema/);
  assert.match(server, /async function identifyGoldCoinWithOpenAi/);
  assert.match(server, /app\.post\("\/api\/training\/gold-coins\/identify"/);
  assert.match(server, /gold_coin_identify/);
  assert.match(styles, /\.coin-encyclopedia-shell/);
  assert.match(styles, /\.coin-face/);
  assert.match(styles, /\.coin-photo-frame/);
  assert.match(styles, /\.coin-photo-image/);
  assert.match(app, /<span class="coin-photo-image">/);
  assert.match(styles, /\.coin-country-group/);
  assert.match(styles, /\.coin-country-heading/);
  assert.match(styles, /\.coin-country-grid[\s\S]*grid-template-columns: repeat\(auto-fill, minmax\(260px, 1fr\)\)/);
  assert.match(styles, /\.coin-card[\s\S]*grid-template-rows: auto minmax\(108px, 1fr\) auto/);
  assert.match(styles, /\.coin-card > \.ghost-button[\s\S]*justify-self: stretch/);
  assert.match(styles, /\.coin-card h3[\s\S]*-webkit-line-clamp: 2/);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*\.coin-encyclopedia-shell/);
  await Promise.all([
    access(new URL("assets/coins/bilancia-oro/sterlina-oro-sovrana-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/sterlina-oro-sovrana-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-italia-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-vittorio-emanuele-ii-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-vittorio-emanuele-ii-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-vittorio-emanuele-ii-regno-sardegna-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-vittorio-emanuele-ii-regno-sardegna-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-vittorio-emanuele-iii-aratrice-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-vittorio-emanuele-iii-aratrice-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/100-lire-vittorio-emanuele-iii-fascione-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/100-lire-vittorio-emanuele-iii-fascione-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/40-lire-oro-napoleone-i-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/40-lire-oro-napoleone-i-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-carlo-alberto-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-carlo-alberto-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-carlo-felice-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-lire-carlo-felice-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/napoleone-20-franchi-gallo-marianne-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/napoleone-20-franchi-gallo-marianne-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-franchi-napoleone-iii-testa-laureata-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-franchi-napoleone-iii-testa-laureata-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/100-franchi-napoleone-iii-francia-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/100-franchi-napoleone-iii-francia-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/5-franchi-napoleone-iii-francia-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/5-franchi-napoleone-iii-francia-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-franchi-napoleone-iii-testa-nuda-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-franchi-napoleone-iii-testa-nuda-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-austriaco-20-franchi-francesco-giuseppe-i-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-austriaco-20-franchi-francesco-giuseppe-i-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/filarmonica-vienna-2026-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/filarmonica-vienna-2026-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-100-euro-filarmonica-vienna-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-100-euro-filarmonica-vienna-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-100-euro-filarmonica-vienna-oro-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-100-euro-filarmonica-vienna-oro-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-50-euro-filarmonica-vienna-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-50-euro-filarmonica-vienna-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-50-euro-filarmonica-vienna-oro-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-50-euro-filarmonica-vienna-oro-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-25-euro-filarmonica-vienna-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-25-euro-filarmonica-vienna-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-25-euro-filarmonica-vienna-oro-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-25-euro-filarmonica-vienna-oro-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-10-euro-filarmonica-vienna-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-10-euro-filarmonica-vienna-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-10-euro-filarmonica-vienna-oro-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-10-euro-filarmonica-vienna-oro-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-4-euro-filarmonica-vienna-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-4-euro-filarmonica-vienna-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-4-euro-filarmonica-vienna-oro-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-4-euro-filarmonica-vienna-oro-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/somalia-elephant-2023-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/somalia-elephant-2023-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/arca-noe-armenia-2025-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/arca-noe-armenia-2025-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/britannia-100-sterline-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/britannia-100-sterline-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-leone-inghilterra-2016-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-leone-inghilterra-2016-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/tudor-beasts-leone-inghilterra-2022-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/tudor-beasts-leone-inghilterra-2022-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/tudor-beasts-centricora-beaufort-2023-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/tudor-beasts-centricora-beaufort-2023-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-grifone-edoardo-iii-2017-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-grifone-edoardo-iii-2017-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-drago-rosso-galles-2017-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-drago-rosso-galles-2017-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-unicorno-scozia-2018-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-unicorno-scozia-2018-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-toro-nero-clarence-2018-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-toro-nero-clarence-2018-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-centricora-beaufort-2019-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-centricora-beaufort-2019-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-falco-plantageneti-2019-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-falco-plantageneti-2019-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-leone-bianco-mortimer-2020-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-leone-bianco-mortimer-2020-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-completer-masterpiece-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/queens-beast-completer-masterpiece-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-belga-20-franchi-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-belga-20-franchi-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-franchi-leopold-belgio-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/marengo-20-franchi-leopold-belgio-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/ducato-austriaco-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/ducato-austriaco-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-20-corone-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-20-corone-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-10-corone-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/austria-10-corone-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/4-ducati-austriaci-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/4-ducati-austriaci-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/american-eagle-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/american-eagle-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/american-buffalo-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/american-buffalo-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/maple-leaf-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/maple-leaf-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-20-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-20-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-50-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-50-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-10-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-10-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-5-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-5-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-1-dollaro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/canada-maple-leaf-1-dollaro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/chile-50-pesos-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/chile-50-pesos-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-4-oz-8g-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-4-oz-8g-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-10-oz-3g-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-10-oz-3g-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-30g-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-30g-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-15g-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-15g-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-8g-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-8g-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-3g-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-3g-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/kangaroo-nugget-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/kangaroo-nugget-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-100-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-100-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-100-dollari-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-100-dollari-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-50-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-50-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-50-dollari-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-50-dollari-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-25-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-25-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-25-dollari-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-25-dollari-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-15-dollari-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-15-dollari-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-15-dollari-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/australia-nugget-kangaroo-15-dollari-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/libertad-1-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/libertad-1-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-2-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-2-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-4-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-4-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-10-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-10-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-20-oz-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-libertad-oro-1-20-oz-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-2-5-pesos-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-2-5-pesos-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-2-pesos-oro-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/messico-2-pesos-oro-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-oz-30g-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-oz-30g-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-2-oz-15g-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-2-oz-15g-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-20-oz-1g-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-20-oz-1g-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-grammo-fdc-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/cina-panda-oro-1-grammo-fdc-back.png", root)),
    access(new URL("assets/coins/bilancia-oro/panda-cinese-30g-front.png", root)),
    access(new URL("assets/coins/bilancia-oro/panda-cinese-30g-back.png", root))
  ]);
});

test("immagini Bilancia d'Oro sono inizializzate prima del catalogo monete", async () => {
  const app = await file("app.js");
  const baseIndex = app.indexOf("const BILANCIA_DORO_COIN_IMAGE_BASE");
  const invertedIndex = app.indexOf("const INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS");
  const imageFunctionIndex = app.indexOf("function bilanciaDoroCoinImages");
  const wrapperFunctionIndex = app.indexOf("function withBilanciaDoroImages");
  const catalogIndex = app.indexOf("const GOLD_COIN_CATALOG = [");
  const firstRuntimeCallIndex = app.indexOf("withBilanciaDoroImages({");

  assert.ok(baseIndex !== -1, "base path immagini Bilancia d'Oro mancante");
  assert.ok(invertedIndex !== -1, "set monete invertite mancante");
  assert.ok(imageFunctionIndex !== -1, "bilanciaDoroCoinImages mancante");
  assert.ok(wrapperFunctionIndex !== -1, "withBilanciaDoroImages mancante");
  assert.ok(catalogIndex !== -1, "catalogo monete mancante");
  assert.ok(firstRuntimeCallIndex !== -1, "prima chiamata runtime a withBilanciaDoroImages mancante");
  assert.equal(app.indexOf("const INVERTED_BILANCIA_DORO_IMAGE_COIN_IDS", invertedIndex + 1), -1);
  assert.ok(baseIndex < invertedIndex, "base immagini deve precedere il set invertito");
  assert.ok(invertedIndex < imageFunctionIndex, "set invertito deve precedere bilanciaDoroCoinImages");
  assert.ok(imageFunctionIndex < wrapperFunctionIndex, "bilanciaDoroCoinImages deve precedere withBilanciaDoroImages");
  assert.ok(wrapperFunctionIndex < catalogIndex, "helper immagini deve precedere il catalogo");
  assert.ok(invertedIndex < firstRuntimeCallIndex, "set invertito deve precedere ogni chiamata runtime");
});

test("CRM e Backup hanno gestione modifica eliminazione e dettagli", async () => {
  const [app, server, schema, migration, nixpacks, dockerfile] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_verifiable_manual_backups.sql"),
    file("nixpacks.toml"),
    file("Dockerfile")
  ]);

  assert.match(app, /data-save-crm-client/);
  assert.match(app, /data-delete-crm-client/);
  assert.match(app, /data-view-backup/);
  assert.match(app, /data-verify-backup/);
  assert.match(app, /data-test-restore-backup/);
  assert.match(app, /data-download-backup/);
  assert.match(app, /data-delete-backup/);
  assert.match(app, /apiRequest\("\/backups\/create"/);
  assert.match(app, /async function verifyBackup/);
  assert.match(app, /async function testRestoreBackup/);
  assert.match(server, /app\.put\("\/api\/crm\/clienti\/:id"/);
  assert.match(server, /app\.delete\("\/api\/crm\/clienti\/:id"/);
  assert.match(server, /function backupToolUnavailableMessage/);
  assert.match(server, /async function createPostgresBackup/);
  assert.match(server, /backupToolUnavailableMessage\("pg_dump"\)/);
  assert.match(server, /non disponibile nel container\. Installare PostgreSQL client tools/);
  assert.match(server, /async function createManualBackup/);
  assert.match(server, /async function verifyBackup/);
  assert.match(server, /async function testRestoreBackup/);
  assert.match(server, /app\.post\("\/api\/backups\/create"/);
  assert.match(server, /app\.post\("\/api\/backups\/:id\/verify"/);
  assert.match(server, /app\.post\("\/api\/backups\/:id\/test-restore", requireFounder/);
  assert.match(server, /app\.get\("\/api\/backups\/:id"/);
  assert.match(server, /app\.get\("\/api\/backups\/:id\/download", requireFounder/);
  assert.match(server, /app\.delete\("\/api\/backups\/:id", requireFounder/);
  assert.match(server, /status = 'deleted'/);
  assert.match(server, /CREATE DATABASE \$\{quoteIdentifier\(testDatabaseName\)\}/);
  assert.match(server, /DROP DATABASE IF EXISTS \$\{quoteIdentifier\(testDatabaseName\)\}/);
  assert.match(server, /Backup automatici disabilitati/);
  assert.doesNotMatch(server, /runDailyBackupIfNeeded/);
  assert.doesNotMatch(server, /runMonthlyBackupIfNeeded/);
  assert.match(schema, /ALTER TABLE clienti ADD COLUMN IF NOT EXISTS archiviato/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS backups/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS backup_logs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS backup_restore_tests/);
  assert.match(schema, /idx_backups_status/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS backups/);
  assert.match(migration, /idx_backup_logs_backup_id/);
  assert.match(nixpacks, /postgresql_16/);
  assert.match(dockerfile, /postgresql-client/);
});

test("quotazioni utenti copia cliente e refresh app aggiornati", async () => {
  const [index, app, server, schema, goldPredictionMigration, metalBuybackMigration, competitorMigration, competitorAiMigration, oroExpressMigration, oroDOroMigration, amicoOroMigration, prontoGoldMigration, bordinMigration, bordinGoldStandardMigration, oroInEuroMigration, gruppoOro24kMigration, competitorExtractionRulesMigration, bullionVaultProvider, aiCompetitorExtractor, oroExpressExtractor, oroDOroExtractor, amicoOroExtractor, prontoGoldExtractor, bordinExtractor, goldStandardExtractor, oroInEuroExtractor, gruppoOro24kExtractor, competitorExtractionTrainer] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260605_gold_price_prediction.sql"),
    file("migrations/20260605_metal_buyback_pricing.sql"),
    file("migrations/20260606_metal_competitor_quotes.sql"),
    file("migrations/20260606_competitor_ai_extraction.sql"),
    file("migrations/20260606_oro_express_hourly_extractor.sql"),
    file("migrations/20260606_oro_doro_hourly_extractor.sql"),
    file("migrations/20260606_amico_oro_hourly_extractor.sql"),
    file("migrations/20260606_pronto_gold_hourly_extractor.sql"),
    file("migrations/20260606_bordin_hourly_extractor.sql"),
    file("migrations/20260606_fix_bordin_and_gold_standard_extractors.sql"),
    file("migrations/20260606_oro_in_euro_hourly_extractor.sql"),
    file("migrations/20260607_gruppo_oro_24k_hourly_extractor.sql"),
    file("migrations/20260606_competitor_extraction_rules.sql"),
    file("services/marketData/bullionVaultProvider.js"),
    file("services/competitors/aiCompetitorQuoteExtractor.js"),
    file("services/competitors/extractors/oroExpressExtractor.js"),
    file("services/competitors/extractors/oroDOroExtractor.js"),
    file("services/competitors/extractors/amicoOroExtractor.js"),
    file("services/competitors/extractors/prontoGoldExtractor.js"),
    file("services/competitors/extractors/bordinExtractor.js"),
    file("services/competitors/extractors/goldStandardExtractor.js"),
    file("services/competitors/extractors/oroInEuroExtractor.js"),
    file("services/competitors/extractors/gruppoOro24kExtractor.js"),
    file("services/competitors/competitorExtractionTrainer.js")
  ]);

  assert.doesNotMatch(index, /Quotazioni e andamento di oro, argento, platino e diamanti/);
  assert.doesNotMatch(index, /<span>Diamanti<\/span><strong>Da configurare<\/strong>/);
  assert.doesNotMatch(app, /Quotazione diamanti da configurare/);
  assert.match(index, /id="mainMenuLogoRefresh"/);
  assert.match(index, /main-menu-top-logo-button/);
  assert.match(app, /async function refreshApp/);
  assert.match(app, /function triggerLogoRefresh/);
  assert.match(app, /logo-refresh-clicked/);
  assert.match(app, /registration\.update/);
  assert.match(app, /customer-copy-logo/);
  const styles = await file("styles.css");
  assert.match(styles, /customer-copy-logo/);
  assert.match(styles, /logo-refresh-clicked/);
  assert.match(styles, /logo-heartbeat/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(index, /id="userEmail"/);
  assert.match(index, /id="userEmailLabel" class="founder-email-only" hidden/);
  assert.match(index, /id="userPhone"/);
  assert.match(index, /id="userActive"/);
  assert.match(server, /telefono, note, attivo/);
  assert.match(schema, /ALTER TABLE utenti ADD COLUMN IF NOT EXISTS telefono/);
  assert.match(index, /Analisi di mercato/);
  assert.match(index, /id="goldPredictionPanel"/);
  assert.doesNotMatch(index, /Scenari mercato|Storico prezzi|Giorni storico/);
  assert.match(index, /id="runGoldPrediction"/);
  assert.match(index, /id="syncGoldHistory"/);
  assert.match(index, /id="askAurumGoldPrediction"/);
  assert.match(index, /id="goldPredictionSettingsForm"/);
  assert.match(index, /id="buybackScenarioSelect"/);
  assert.match(index, /id="buybackSimulatorForm"/);
  assert.match(index, /id="buybackSimulatorOutput"/);
  assert.match(index, /id="explainBuybackSimulation"/);
  assert.match(index, /id="buybackPolicyEditor"/);
  assert.match(index, /id="competitorSourceForm"/);
  assert.match(index, /id="competitorQuoteForm"/);
  assert.match(index, /id="competitorCsvForm"/);
  assert.match(index, /id="competitorQuotesList"/);
  assert.match(index, /id="competitorExtractionTrainerPanel"/);
  assert.match(index, /id="competitorExtractionTrainerList"/);
  assert.match(index, /Configura estrazione/);
  assert.match(index, /competitor_name,website_url,metal,purity_code,price_per_gram,currency,quote_date,confidence,url/);
  assert.match(index, /value="amico_oro_parser"/);
  assert.match(index, /value="oro_doro_parser"/);
  assert.doesNotMatch(index, /value="banco_preziosi_parser"|Parser Banco Preziosi/);
  assert.match(index, /value="bordin_parser"/);
  assert.match(index, /value="gold_standard_parser"/);
  assert.match(index, /value="oro_in_euro_parser"/);
  assert.match(index, /value="gruppo_oro_24k_parser"/);
  assert.match(index, /name="market_match_delta_per_gram"/);
  assert.match(index, /name="competitor_data_max_age_hours"/);
  assert.match(index, /Policy Prezzi Compro Oro/);
  assert.match(index, /Confronto competitor/);
  assert.match(index, /Simulatore prezzo di acquisto/);
  assert.match(index, /Oro 18kt/);
  assert.match(index, /Argento 925/);
  assert.match(app, /async function loadGoldPredictionPanel/);
  assert.match(app, /function renderGoldPredictionChart/);
  assert.match(app, /function buybackTableHtml/);
  assert.match(app, /function renderBuybackSimulation/);
  assert.match(app, /function buildPriceExplanationContext/);
  assert.match(app, /function buildGeneralPriceExplanationContext/);
  assert.match(app, /function gruppoOro24kSummaryHtml/);
  assert.match(app, /async function forceGruppoOro24kSync/);
  assert.match(app, /data-force-gruppo-oro-24k-sync/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/gruppo-oro-24k\/sync"/);
  assert.match(app, /gruppo_oro_24k_quote/);
  assert.match(app, /gruppo_oro_24k_quotes/);
  assert.match(app, /function generateLocalPriceExplanation/);
  assert.match(app, /async function explainPriceWithAurum/);
  assert.match(app, /function openAurumPanel/);
  assert.match(app, /mode: "price_explanation"/);
  assert.match(app, /Simulatore: calcolo visualizzato/);
  assert.match(app, /displayed_values/);
  assert.match(app, /return state\.buybackSimulationContext/);
  assert.match(app, /immediateLocal: true/);
  assert.match(app, /skipRemote: true/);
  assert.match(app, /buybackSimulatorForm\?\.addEventListener\("click", \(event\) => \{/);
  assert.match(app, /event\.target\.closest\("#explainBuybackSimulation"\)/);
  assert.match(app, /function renderCompetitorQuotes/);
  assert.match(app, /function competitorNameKey/);
  assert.match(app, /function competitorDisplayName/);
  assert.match(app, /function isUnsupportedCompetitorBuybackQuote/);
  assert.match(app, /HIDDEN_COMPETITOR_KEYS = new Set\(\["banco preziosi"\]\)/);
  assert.match(app, /function isHiddenCompetitorName/);
  assert.match(app, /if \(normalized === "oro d oro" \|\| normalized === "oro d'oro"\) return "oro d'oro"/);
  assert.match(app, /if \(key === "oro d'oro"\) return "Oro D'oro"/);
  assert.match(app, /function competitorNamesForMetal/);
  assert.match(app, /function latestCompetitorQuoteForPurity/);
  assert.match(app, /function competitorQuoteMatrixValue/);
  {
    const start = app.indexOf("function buybackTableHtml");
    assert.notEqual(start, -1, "buybackTableHtml deve esistere");
    const nextFunction = app.indexOf("\nfunction ", start + 10);
    const body = app.slice(start, nextFunction === -1 ? app.length : nextFunction);
    assert.match(body, /<th>Competitor<\/th>/);
    assert.match(body, /gold-prediction-purity-code/);
    assert.match(body, /Purezza \$\{escapeHtml\(formatPredictionPercent\(row\.purity_value\)\)\}/);
    assert.match(body, /competitorNamesForMetal\(metal\)/);
    assert.match(body, /latestCompetitorQuoteForPurity\(name, metal, row\.purity_code\)/);
    assert.doesNotMatch(body, /<th>Caratura<\/th>|<th>Purezza<\/th>|Teorico oggi|Previsione 24h|Previsione 7g|Max pagabile oggi|Prezzo OroActive consigliato|Media competitor|Miglior competitor|Prezzo migliore di mercato|Scostamento vs|Stato competitività|Margine stimato|Scenario|Trend|Aurum|data-explain-price-row/);
  }
  assert.match(app, /function marketStatusLabel/);
  assert.match(app, /function buybackMarketPrice/);
  assert.match(app, /Miglior prezzo mercato stimato/);
  assert.match(app, /async function saveCompetitorSource/);
  assert.match(app, /async function saveCompetitorQuote/);
  assert.match(app, /async function importCompetitorCsv/);
  assert.match(app, /function competitorAutoSyncSummaryHtml/);
  assert.match(app, /async function forceCompetitorAutoSync/);
  assert.match(app, /async function toggleCompetitorAutoSync/);
  assert.match(app, /function competitorAiExtractionSummaryHtml/);
  assert.match(app, /async function runAiCompetitorExtraction/);
  assert.match(app, /function oroExpressSummaryHtml/);
  assert.match(app, /async function forceOroExpressSync/);
  assert.match(app, /function oroDOroSummaryHtml/);
  assert.match(app, /async function forceOroDOroSync/);
  assert.match(app, /function latestOroDOroQuote/);
  assert.match(app, /oro_doro_quote/);
  assert.match(app, /oro_doro_quotes/);
  assert.match(app, /function amicoOroSummaryHtml/);
  assert.match(app, /async function forceAmicoOroSync/);
  assert.match(app, /function latestAmicoOroQuote/);
  assert.match(app, /amico_oro_quote/);
  assert.match(app, /amico_oro_quotes/);
  assert.doesNotMatch(app, /function bancoPreziosiSummaryHtml|async function forceBancoPreziosiSync|function latestBancoPreziosiQuote/);
  assert.doesNotMatch(app, /banco_preziosi_quote|banco_preziosi_quotes/);
  assert.match(app, /function renderCompetitorExtractionTrainer/);
  assert.match(app, /function collectExtractionRulesForSource/);
  assert.match(app, /async function saveExtractionRules/);
  assert.match(app, /async function testExtractionSource/);
  assert.match(app, /data-force-competitor-sync/);
  assert.match(app, /data-force-oro-express-sync/);
  assert.match(app, /data-force-oro-doro-sync/);
  assert.match(app, /data-force-amico-oro-sync/);
  assert.doesNotMatch(app, /data-force-banco-preziosi-sync/);
  assert.match(app, /data-toggle-competitor-auto-sync/);
  assert.match(app, /data-run-ai-competitor-extract/);
  assert.match(app, /data-save-extraction-rules/);
  assert.match(app, /data-test-extraction-source/);
  assert.match(app, /data-ai-assisted-extraction/);
  assert.match(app, /competitorAiStatus/);
  assert.match(app, /competitorAiQuotes/);
  assert.match(app, /competitorExtractionRules/);
  assert.match(app, /evidence_text/);
  assert.match(app, /quote_type/);
  assert.match(app, /function isCompetitorBuybackQuote/);
  assert.match(app, /quote_type=customer_buyback/);
  {
    const start = app.indexOf("function renderCompetitorQuotes");
    assert.notEqual(start, -1, "renderCompetitorQuotes deve esistere");
    const nextFunction = app.indexOf("\nfunction ", start + 10);
    const body = app.slice(start, nextFunction === -1 ? app.length : nextFunction);
    assert.doesNotMatch(body, /Fonti competitor preconfigurate|Quotazioni competitor rilevate|rilevazioni competitor negli ultimi 30 giorni/);
  }
  for (const functionName of ["prontoGoldSummaryHtml", "goldStandardSummaryHtml", "buildPriceExplanationContext", "buildGeneralPriceExplanationContext", "competitorExplanation", "generateGeneralPriceExplanation"]) {
    const start = app.indexOf(`function ${functionName}`);
    assert.notEqual(start, -1, `${functionName} deve esistere`);
    const nextFunction = app.indexOf("\nfunction ", start + 10);
    const body = app.slice(start, nextFunction === -1 ? app.length : nextFunction);
    assert.doesNotMatch(body, /reference_market_|reference_official_|sell_price/);
  }
  assert.match(app, /function collectBuybackPolicyRows/);
  assert.match(app, /function askAurumGoldPrediction/);
  assert.match(app, /apiRequest\("\/quotazioni\/metals\/status"/);
  assert.match(app, /quotazioni\/metals\/history\?metals=gold,silver&days=30&currency=/);
  assert.match(app, /quotazioni\/metals\/predictions\/latest\?metals=gold,silver&currency=/);
  assert.match(app, /apiRequest\("\/quotazioni\/buyback-calculate"/);
  assert.match(app, /apiRequest\("\/quotazioni\/metals\/sync-bullionvault"/);
  assert.match(app, /apiRequest\("\/quotazioni\/buyback-policy"/);
  assert.match(app, /apiRequest\(`\/quotazioni\/competitors\/quotes\?days=30&limit=500&quote_type=customer_buyback&currency=/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/sources"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/quotes\/manual"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/quotes\/import-csv"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/ai-extract\/status"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/ai-extract\/run"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/oro-express\/sync"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/oro-doro\/sync"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/amico-oro\/sync"/);
  assert.doesNotMatch(app, /apiRequest\("\/quotazioni\/competitors\/banco-preziosi\/sync"/);
  assert.match(app, /apiRequest\("\/quotazioni\/competitors\/extraction-rules"/);
  assert.match(app, /\/quotazioni\/competitors\/sources\/\$\{encodeURIComponent\(sourceId\)\}\/extraction-rules/);
  assert.match(app, /\/quotazioni\/competitors\/sources\/\$\{encodeURIComponent\(sourceId\)\}\/\$\{endpoint\}/);
  assert.match(app, /quotazioni\/competitors\/quotes\/ai\?days=30&currency=/);
  assert.match(app, /apiRequest\("\/quotazioni\/gold-prediction\/settings"/);
  assert.match(server, /import \{ fetchBullionVaultSpotPrice \}/);
  assert.match(server, /function calculateGoldPrediction/);
  assert.match(server, /function calculateMetalBuyback/);
  assert.match(server, /function buybackPurityCatalog/);
  assert.match(server, /function calculateBuybackRow/);
  assert.match(server, /async function syncBullionVaultMetalHistory/);
  assert.match(server, /price_explanation/);
  assert.match(server, /CONTESTO PREZZO AURUM/);
  assert.match(server, /async function competitorQuoteStats/);
  assert.match(server, /createAiCompetitorQuoteExtractor/);
  assert.match(server, /AI_COMPETITOR_EXTRACTION_ENABLED/);
  assert.match(server, /COMPETITOR_AI_AUTO_EXTRACTION_ENABLED/);
  assert.match(server, /ORO_EXPRESS_AUTO_SYNC_ENABLED/);
  assert.match(server, /ORO_EXPRESS_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /ORO_EXPRESS_SILVER_USED_MAPPING/);
  assert.match(server, /ORO_DORO_AUTO_SYNC_ENABLED/);
  assert.match(server, /ORO_DORO_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /ORO_DORO_USE_AI_FALLBACK/);
  assert.match(server, /AMICO_ORO_AUTO_SYNC_ENABLED/);
  assert.match(server, /AMICO_ORO_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /AMICO_ORO_USE_AI_VISION_FALLBACK/);
  assert.match(server, /BANCO_PREZIOSI_AUTO_SYNC_ENABLED/);
  assert.match(server, /BANCO_PREZIOSI_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /BANCO_PREZIOSI_QUOTE_URL/);
  assert.match(server, /BORDIN_AUTO_SYNC_ENABLED/);
  assert.match(server, /BORDIN_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /BORDIN_USE_AI_FALLBACK/);
  assert.match(server, /GOLD_STANDARD_AUTO_SYNC_ENABLED/);
  assert.match(server, /GOLD_STANDARD_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /GOLD_STANDARD_USE_AI_FALLBACK/);
  assert.match(server, /ORO_IN_EURO_AUTO_SYNC_ENABLED/);
  assert.match(server, /ORO_IN_EURO_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /ORO_IN_EURO_USE_AI_FALLBACK/);
  assert.match(server, /GRUPPO_ORO_24K_AUTO_SYNC_ENABLED/);
  assert.match(server, /GRUPPO_ORO_24K_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /GRUPPO_ORO_24K_USE_AI_FALLBACK/);
  assert.match(server, /PRONTO_GOLD_AUTO_SYNC_ENABLED/);
  assert.match(server, /PRONTO_GOLD_SYNC_INTERVAL_MINUTES/);
  assert.match(server, /PRONTO_GOLD_USE_AI_FALLBACK/);
  assert.match(server, /createOroExpressExtractor/);
  assert.match(server, /createOroDOroExtractor/);
  assert.match(server, /createAmicoOroExtractor/);
  assert.match(server, /createProntoGoldExtractor/);
  assert.match(server, /HIDDEN_COMPETITOR_NAMES/);
  assert.match(server, /Competitor rimosso dal confronto OroActive/);
  assert.match(server, /createBordinExtractor/);
  assert.match(server, /createGoldStandardExtractor/);
  assert.match(server, /createOroInEuroExtractor/);
  assert.match(server, /createGruppoOro24kExtractor/);
  assert.match(server, /source_type: "oro_express_parser"/);
  assert.match(server, /source_type: "oro_doro_parser"/);
  assert.match(server, /source_type: "amico_oro_parser"/);
  assert.match(server, /source_type: "pronto_gold_parser"/);
  assert.doesNotMatch(server, /name: "Banco Preziosi"[\s\S]{0,260}source_type: "banco_preziosi_parser"/);
  assert.match(server, /hiddenCompetitorSql\("competitor_name"\)/);
  assert.match(index, /value="pronto_gold_parser"/);
  assert.match(server, /source_type: "bordin_parser"/);
  assert.match(server, /source_type: "gold_standard_parser"/);
  assert.match(server, /source_type: "oro_in_euro_parser"/);
  assert.match(server, /source_type: "gruppo_oro_24k_parser"/);
  assert.match(server, /startOroExpressHourlySync/);
  assert.match(server, /runOroExpressHourlySync/);
  assert.match(server, /startOroDOroHourlySync/);
  assert.match(server, /runOroDOroHourlySync/);
  assert.match(server, /oroDOroSyncPublicStatus/);
  assert.match(server, /startAmicoOroHourlySync/);
  assert.match(server, /runAmicoOroHourlySync/);
  assert.match(server, /amicoOroSyncPublicStatus/);
  assert.match(server, /startProntoGoldHourlySync/);
  assert.match(server, /runProntoGoldHourlySync/);
  assert.match(server, /prontoGoldSyncPublicStatus/);
  assert.doesNotMatch(server, /startBancoPreziosiHourlySync\(\);/);
  assert.match(server, /startGruppoOro24kHourlySync/);
  assert.match(server, /runGruppoOro24kHourlySync/);
  assert.match(server, /gruppoOro24kSyncPublicStatus/);
  assert.match(server, /startBordinHourlySync/);
  assert.match(server, /runBordinHourlySync/);
  assert.match(server, /bordinSyncPublicStatus/);
  assert.match(server, /startGoldStandardHourlySync/);
  assert.match(server, /runGoldStandardHourlySync/);
  assert.match(server, /goldStandardSyncPublicStatus/);
  assert.match(server, /startOroInEuroHourlySync/);
  assert.match(server, /runOroInEuroHourlySync/);
  assert.match(server, /oroInEuroSyncPublicStatus/);
  assert.match(server, /reference_official_gold_price/);
  assert.match(server, /reference_market_gold_price/);
  assert.match(server, /sell_price/);
  assert.match(server, /async function runAiCompetitorQuoteExtraction/);
  assert.match(server, /async function saveAiExtractedCompetitorQuotes/);
  assert.match(server, /competitor_ai_extraction_runs/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/ai-extract\/run"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/ai-extract\/status"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/ai-extract\/runs"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/ai-extract\/runs\/:id"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/quotes\/ai"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/oro-express\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/oro-doro\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/amico-oro\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/pronto-gold\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/banco-preziosi\/sync"[\s\S]*response\.status\(410\)/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/bordin\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/gold-standard\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/oro-in-euro\/sync"/);
  assert.match(server, /DEFAULT_COMPETITOR_SOURCES/);
  assert.match(server, /Oro Express/);
  assert.match(server, /Oro D'Oro/);
  assert.match(server, /Amico Oro/);
  assert.match(server, /Pronto Gold/);
  assert.match(server, /Banco Preziosi è stato rimosso dai competitor OroActive/);
  assert.match(server, /Bordin/);
  assert.match(server, /Gold Standard/);
  assert.match(server, /Oro in Euro/);
  assert.match(server, /seedDefaultCompetitorSources/);
  assert.match(server, /function calculateBestMarketClientPrice/);
  assert.match(server, /best_market_client_price_per_gram/);
  assert.match(server, /competitor_median_price/);
  assert.match(server, /best_competitor_name/);
  assert.match(server, /async function insertCompetitorQuote/);
  assert.match(server, /async function importCompetitorQuotesCsv/);
  assert.match(server, /COMPETITOR_AUTO_SYNC_ENABLED/);
  assert.match(server, /function parseItalianPriceToNumber/);
  assert.match(server, /function normalizePurityCode/);
  assert.match(server, /async function extractCompetitorQuotes/);
  assert.match(server, /async function syncSingleCompetitorSource/);
  assert.match(server, /async function runCompetitorAutoSyncNow/);
  assert.match(server, /function startCompetitorAutoSync/);
  assert.match(server, /async function calculateCompetitorMarketSummary/);
  assert.match(server, /createCompetitorExtractionTrainer/);
  assert.match(server, /async function seedDefaultCompetitorExtractionRules/);
  assert.match(server, /async function saveCompetitorExtractionRules/);
  assert.match(server, /async function testCompetitorExtractionForSource/);
  assert.match(server, /guided_extraction_rules/);
  assert.match(server, /async function runMetalPredictions/);
  assert.match(server, /async function fetchAlphaVantageMetalPrice/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/gold-prediction\/status"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/gold-history"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/gold-history\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/gold-prediction\/run"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/gold-prediction\/latest"/);
  assert.match(server, /app\.put\("\/api\/quotazioni\/gold-prediction\/settings", requireFounder/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/metals\/status"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/metals\/history"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/metals\/sync"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/metals\/sync-bullionvault"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/metals\/predict"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/metals\/predictions\/latest"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/buyback-policy"/);
  assert.match(server, /app\.put\("\/api\/quotazioni\/buyback-policy", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/buyback-calculate"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/buyback-latest"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/sources"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/sources", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/quotes\/manual", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/quotes\/import-csv", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/sync-configured", requireFounder/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/sync-status"/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/auto-sync\/run", requireFounder/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/auto-sync\/logs", requireFounder/);
  assert.match(server, /app\.put\("\/api\/quotazioni\/competitors\/sources\/:id\/auto-sync", requireFounder/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/market-summary"/);
  assert.match(server, /app\.get\("\/api\/quotazioni\/competitors\/extraction-rules", requireFounder/);
  assert.match(server, /app\.put\("\/api\/quotazioni\/competitors\/sources\/:id\/extraction-rules", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/sources\/:id\/extraction-test", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/sources\/:id\/extraction-ai-assisted", requireFounder/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/competitors\/extraction-rules\/:id\/test", requireFounder/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS metal_price_history/);
  assert.match(schema, /price_per_kg NUMERIC\(18,6\)/);
  assert.match(schema, /raw_payload JSONB DEFAULT '\{\}'::jsonb/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gold_price_predictions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gold_prediction_settings/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS metal_price_predictions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS metal_buyback_policy_settings/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS metal_buyback_calculations/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS competitor_quote_sources/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS competitor_buyback_quotes/);
  assert.match(schema, /ai_extracted BOOLEAN DEFAULT false/);
  assert.match(schema, /ai_confidence TEXT DEFAULT 'medium'/);
  assert.match(schema, /evidence_text TEXT NULL/);
  assert.match(schema, /quote_type TEXT DEFAULT 'customer_buyback'/);
  assert.match(schema, /source_url TEXT NULL/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS competitor_ai_extraction_runs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS competitor_ai_extraction_page_logs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS competitor_extraction_rules/);
  assert.match(schema, /idx_competitor_extraction_rules_source_id/);
  assert.match(schema, /idx_competitor_extraction_rules_competitor/);
  assert.match(schema, /last_test_status TEXT DEFAULT 'not_tested'/);
  assert.match(schema, /auto_sync_enabled BOOLEAN DEFAULT true/);
  assert.match(schema, /extraction_config JSONB DEFAULT '\{\}'::jsonb/);
  assert.match(schema, /last_sync_error TEXT NULL/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS competitor_quote_sync_logs/);
  assert.match(schema, /last_sync_status TEXT DEFAULT 'not_synced'/);
  assert.match(schema, /idx_competitor_quotes_competitor/);
  assert.match(goldPredictionMigration, /CREATE TABLE IF NOT EXISTS metal_price_history/);
  assert.match(metalBuybackMigration, /ALTER TABLE metal_price_history ADD COLUMN IF NOT EXISTS price_per_kg/);
  assert.match(metalBuybackMigration, /CREATE TABLE IF NOT EXISTS metal_price_predictions/);
  assert.match(metalBuybackMigration, /CREATE TABLE IF NOT EXISTS metal_buyback_policy_settings/);
  assert.match(metalBuybackMigration, /CREATE TABLE IF NOT EXISTS metal_buyback_calculations/);
  assert.match(competitorMigration, /ALTER TABLE metal_price_history ADD COLUMN IF NOT EXISTS raw_payload/);
  assert.match(competitorMigration, /CREATE TABLE IF NOT EXISTS competitor_quote_sources/);
  assert.match(competitorMigration, /CREATE TABLE IF NOT EXISTS competitor_buyback_quotes/);
  assert.match(competitorMigration, /ai_extracted BOOLEAN DEFAULT false/);
  assert.match(competitorMigration, /evidence_text TEXT NULL/);
  assert.match(competitorMigration, /source_url TEXT NULL/);
  assert.match(competitorMigration, /CREATE TABLE IF NOT EXISTS competitor_ai_extraction_runs/);
  assert.match(competitorMigration, /auto_sync_enabled BOOLEAN DEFAULT true/);
  assert.match(competitorMigration, /next_sync_at TIMESTAMPTZ NULL/);
  assert.match(competitorMigration, /CREATE TABLE IF NOT EXISTS competitor_quote_sync_logs/);
  assert.match(competitorMigration, /last_sync_status TEXT DEFAULT 'not_synced'/);
  assert.match(competitorMigration, /idx_competitor_quotes_competitor/);
  assert.match(competitorAiMigration, /ALTER TABLE competitor_buyback_quotes/);
  assert.match(competitorAiMigration, /ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT false/);
  assert.match(competitorAiMigration, /ADD COLUMN IF NOT EXISTS evidence_text TEXT NULL/);
  assert.match(competitorAiMigration, /ADD COLUMN IF NOT EXISTS source_url TEXT NULL/);
  assert.match(competitorAiMigration, /CREATE TABLE IF NOT EXISTS competitor_ai_extraction_runs/);
  assert.match(competitorAiMigration, /CREATE TABLE IF NOT EXISTS competitor_ai_extraction_page_logs/);
  assert.match(oroExpressMigration, /source_type = 'oro_express_parser'/);
  assert.match(oroExpressMigration, /sync_interval_minutes = 60/);
  assert.match(oroExpressMigration, /silver_used_mapping/);
  assert.match(oroDOroMigration, /source_type = 'oro_doro_parser'/);
  assert.match(oroDOroMigration, /sync_interval_minutes = 60/);
  assert.match(oroDOroMigration, /oro_doro_gold_24kt/);
  assert.match(oroDOroMigration, /oro_doro_gold_22kt/);
  assert.match(oroDOroMigration, /oro_doro_gold_21kt/);
  assert.match(oroDOroMigration, /oro_doro_gold_20kt/);
  assert.match(oroDOroMigration, /oro_doro_gold_18kt/);
  assert.match(oroDOroMigration, /oro_doro_gold_14kt/);
  assert.match(oroDOroMigration, /oro_doro_gold_9kt/);
  assert.match(oroDOroMigration, /oro_doro_silver_999/);
  assert.match(oroDOroMigration, /oro_doro_silver_925/);
  assert.match(oroDOroMigration, /oro_doro_silver_800/);
  assert.match(amicoOroMigration, /source_type = 'amico_oro_parser'/);
  assert.match(amicoOroMigration, /sync_interval_minutes = 60/);
  assert.match(amicoOroMigration, /amico_oro_gold_24kt/);
  assert.match(amicoOroMigration, /amico_oro_gold_18kt/);
  assert.match(amicoOroMigration, /amico_oro_gold_14kt/);
  assert.match(bordinMigration, /source_type = 'bordin_parser'/);
  assert.match(bordinMigration, /sync_interval_minutes = 60/);
  assert.match(bordinMigration, /bordin_gold_24kt/);
  assert.match(bordinMigration, /bordin_gold_18kt/);
  assert.match(bordinMigration, /bordin_gold_14kt/);
  assert.match(bordinMigration, /min_quantity_grams/);
  assert.match(bordinGoldStandardMigration, /https:\/\/oroemetallipreziosi\.com/);
  assert.match(bordinGoldStandardMigration, /bordin_silver_925/);
  assert.match(bordinGoldStandardMigration, /source_type = 'gold_standard_parser'/);
  assert.match(bordinGoldStandardMigration, /gold_standard_gold_24kt_reference/);
  assert.match(bordinGoldStandardMigration, /gold_standard_gold_18kt_buyback/);
  assert.match(oroInEuroMigration, /source_type = 'oro_in_euro_parser'/);
  assert.match(oroInEuroMigration, /sync_interval_minutes = 60/);
  assert.match(oroInEuroMigration, /oro_in_euro_gold_18kt/);
  assert.match(oroInEuroMigration, /oro_in_euro_gold_24kt/);
  assert.match(oroInEuroMigration, /oro_in_euro_silver_999/);
  assert.match(oroInEuroMigration, /https:\/\/www\.quotazioneritirooro\.it/);
  assert.match(gruppoOro24kMigration, /source_type = 'gruppo_oro_24k_parser'/);
  assert.match(gruppoOro24kMigration, /sync_interval_minutes = 60/);
  assert.match(gruppoOro24kMigration, /gruppo_oro_24k_gold_24kt/);
  assert.match(gruppoOro24kMigration, /gruppo_oro_24k_gold_18kt/);
  assert.match(gruppoOro24kMigration, /gruppo_oro_24k_silver_999/);
  assert.match(gruppoOro24kMigration, /gruppo_oro_24k_silver_800/);
  assert.match(gruppoOro24kMigration, /https:\/\/www\.comprooromilano\.org/);
  assert.match(competitorExtractionRulesMigration, /CREATE TABLE IF NOT EXISTS competitor_extraction_rules/);
  assert.match(competitorExtractionRulesMigration, /gold_24kt/);
  assert.match(competitorExtractionRulesMigration, /gold_18kt/);
  assert.match(competitorExtractionRulesMigration, /silver_999/);
  assert.match(competitorExtractionRulesMigration, /silver_used_generic/);
  assert.match(bullionVaultProvider, /export async function fetchBullionVaultSpotPrice/);
  assert.match(aiCompetitorExtractor, /export function createAiCompetitorQuoteExtractor/);
  assert.match(aiCompetitorExtractor, /async function discoverRelevantQuotePages/);
  assert.match(aiCompetitorExtractor, /async function extractQuotesWithAi/);
  assert.match(aiCompetitorExtractor, /function normalizeAiQuote/);
  assert.match(aiCompetitorExtractor, /function validateExtractedQuotes/);
  assert.match(aiCompetitorExtractor, /Non devi inventare dati/);
  assert.match(aiCompetitorExtractor, /json_schema/);
  assert.match(aiCompetitorExtractor, /customer_buyback/);
  assert.match(oroExpressExtractor, /export function createOroExpressExtractor/);
  assert.match(oroExpressExtractor, /export function parseItalianEuroPrice/);
  assert.match(oroExpressExtractor, /extractOroExpressQuotesFromText/);
  assert.match(oroExpressExtractor, /getValoreOroWp/);
  assert.match(oroExpressExtractor, /getValoreArgentoWp/);
  assert.match(oroExpressExtractor, /used_generic/);
  assert.match(oroExpressExtractor, /auto_oro_express_parser/);
  assert.match(oroDOroExtractor, /export function createOroDOroExtractor/);
  assert.match(oroDOroExtractor, /export function parseItalianEuroPrice/);
  assert.match(oroDOroExtractor, /extractOroDOroQuotesFromText/);
  assert.match(oroDOroExtractor, /ORO 24kt/);
  assert.match(oroDOroExtractor, /ORO 20kt/);
  assert.match(oroDOroExtractor, /ARGENTO 925/);
  assert.match(oroDOroExtractor, /auto_oro_doro_parser/);
  assert.match(oroDOroExtractor, /AI fallback Oro D'Oro/);
  assert.match(amicoOroExtractor, /export function createAmicoOroExtractor/);
  assert.match(amicoOroExtractor, /export function parseItalianEuroPrice/);
  assert.match(amicoOroExtractor, /extractAmicoOroQuotesFromText/);
  assert.match(amicoOroExtractor, /24K al gr/);
  assert.match(amicoOroExtractor, /18K al gr/);
  assert.match(amicoOroExtractor, /14K al gr/);
  assert.match(amicoOroExtractor, /auto_amico_oro_parser/);
  assert.match(amicoOroExtractor, /AI vision fallback non disponibile/);
  assert.match(prontoGoldMigration, /source_type = 'pronto_gold_parser'/);
  assert.match(prontoGoldMigration, /sync_interval_minutes = 60/);
  assert.match(prontoGoldMigration, /pronto_gold_reference_gold/);
  assert.match(prontoGoldMigration, /pronto_gold_gold_24kt_buy/);
  assert.match(prontoGoldMigration, /pronto_gold_gold_18kt_range/);
  assert.match(prontoGoldMigration, /pronto_gold_silver_925/);
  assert.match(prontoGoldMigration, /https:\/\/www\.prontogold\.com\/quotazioni/);
  assert.match(prontoGoldExtractor, /export function createProntoGoldExtractor/);
  assert.match(prontoGoldExtractor, /export function parseItalianEuroPrice/);
  assert.match(prontoGoldExtractor, /extractProntoGoldQuotesFromText/);
  assert.match(prontoGoldExtractor, /Valore dell'ORO/);
  assert.match(prontoGoldExtractor, /ORO PURO 24k/);
  assert.match(prontoGoldExtractor, /Compro ORO usato 18k/);
  assert.match(prontoGoldExtractor, /ARGENTO PURO/);
  assert.match(prontoGoldExtractor, /sell_price/);
  assert.match(prontoGoldExtractor, /price_kind/);
  assert.match(prontoGoldExtractor, /range_min_per_gram/);
  assert.match(prontoGoldExtractor, /auto_pronto_gold_parser/);
  assert.match(prontoGoldExtractor, /AI fallback Pronto Gold/);
  assert.match(server, /competitorName: request\.query\.competitor_name/);
  assert.match(app, /competitor_name=\$\{encodeURIComponent\("Pronto Gold"\)\}/);
  assert.ok(
    server.indexOf("method === \"pronto_gold_parser\"") < server.indexOf("const guidedRules = await listCompetitorExtractionRules"),
    "il parser dedicato Pronto Gold deve avere precedenza sulle regole guidate salvate"
  );
  assert.match(bordinExtractor, /export function createBordinExtractor/);
  assert.match(bordinExtractor, /export function parseItalianEuroPrice/);
  assert.match(bordinExtractor, /extractBordinQuotesFromText/);
  assert.match(bordinExtractor, /Oro 24kt - 999,9‰/);
  assert.match(bordinExtractor, /https:\/\/oroemetallipreziosi\.com/);
  assert.match(bordinExtractor, /Argento 925/);
  assert.match(bordinExtractor, /min_quantity_grams/);
  assert.match(bordinExtractor, /auto_bordin_parser/);
  assert.match(bordinExtractor, /AI fallback Bordin/);
  assert.match(goldStandardExtractor, /export function createGoldStandardExtractor/);
  assert.match(goldStandardExtractor, /export function parseItalianEuroPrice/);
  assert.match(goldStandardExtractor, /extractGoldStandardQuotesFromText/);
  assert.match(goldStandardExtractor, /Quotazione dell'oro in borsa/);
  assert.match(goldStandardExtractor, /reference_market_gold_price/);
  assert.match(goldStandardExtractor, /auto_gold_standard_parser/);
  assert.match(goldStandardExtractor, /AI fallback Gold Standard/);
  assert.match(oroInEuroExtractor, /export function createOroInEuroExtractor/);
  assert.match(oroInEuroExtractor, /export function parseItalianEuroPrice/);
  assert.match(oroInEuroExtractor, /extractOroInEuroQuotesFromText/);
  assert.match(oroInEuroExtractor, /Oro 750\/1000/);
  assert.match(oroInEuroExtractor, /Oro 999\/1000/);
  assert.match(oroInEuroExtractor, /Argento 999\/1000/);
  assert.match(oroInEuroExtractor, /fineness_per_mille/);
  assert.match(oroInEuroExtractor, /auto_oro_in_euro_parser/);
  assert.match(oroInEuroExtractor, /AI fallback Oro in Euro/);
  assert.match(gruppoOro24kExtractor, /export function createGruppoOro24kExtractor/);
  assert.match(gruppoOro24kExtractor, /export function parseItalianEuroPrice/);
  assert.match(gruppoOro24kExtractor, /extractGruppoOro24kQuotesFromText/);
  assert.match(gruppoOro24kExtractor, /ORO 24 Carati/);
  assert.match(gruppoOro24kExtractor, /ORO 18 Carati/);
  assert.match(gruppoOro24kExtractor, /Argento 999/);
  assert.match(gruppoOro24kExtractor, /Argento 800/);
  assert.match(gruppoOro24kExtractor, /Quotazioni in tempo reale/);
  assert.match(gruppoOro24kExtractor, /auto_gruppo_oro_24k_parser/);
  assert.match(gruppoOro24kExtractor, /AI fallback Gruppo Oro 24K/);
  assert.match(competitorExtractionTrainer, /export function createCompetitorExtractionTrainer/);
  assert.match(competitorExtractionTrainer, /extractByCssSelector/);
  assert.match(competitorExtractionTrainer, /extractByXPath/);
  assert.match(competitorExtractionTrainer, /extractByAnchorRegex/);
  assert.match(competitorExtractionTrainer, /extractQuoteWithAiFallback/);
  assert.match(competitorExtractionTrainer, /nearbyTextForAnchor/);
  assert.match(competitorExtractionTrainer, /Non inventare dati/);
  assert.match(competitorExtractionTrainer, /guided_oro_express_parser/);
  assert.match(competitorExtractionTrainer, /guided_oro_doro_parser/);
  assert.match(competitorExtractionTrainer, /guided_amico_oro_parser/);
  assert.match(competitorExtractionTrainer, /guided_pronto_gold_parser/);
  assert.match(competitorExtractionTrainer, /guided_bordin_parser/);
  assert.match(competitorExtractionTrainer, /guided_gold_standard_parser/);
  assert.match(competitorExtractionTrainer, /guided_oro_in_euro_parser/);
  assert.match(competitorExtractionTrainer, /guided_gruppo_oro_24k_parser/);
  assert.doesNotMatch(index + app, /ALPHA_VANTAGE_API_KEY/);
  assert.doesNotMatch(index + app, /OPENAI_API_KEY/);
  assert.match(styles, /gold-prediction-panel/);
  assert.match(styles, /oro-in-euro-card/);
  assert.match(styles, /pronto-gold-card/);
  assert.match(styles, /buyback-simulator-form/);
  assert.match(styles, /buyback-policy-grid/);
  assert.match(styles, /competitor-extraction-trainer/);
  assert.match(styles, /competitor-auto-sync-card/);
  assert.match(styles, /competitor-ai-sync-card/);
  assert.match(styles, /gold-standard-card/);
  assert.match(styles, /competitor-ai-evidence/);
  assert.match(styles, /oro-express-card/);
  assert.match(styles, /oro-doro-card/);
  assert.match(styles, /amico-oro-card/);
  assert.doesNotMatch(styles, /banco-preziosi-card|banco-preziosi-grid/);
  assert.match(styles, /bordin-card/);
  assert.match(styles, /gruppo-oro-24k-card/);
  assert.match(styles, /competitor-quote-form/);
});

test("salvataggio atti mostra errori specifici e non generici", async () => {
  const [app, server] = await Promise.all([
    file("app.js"),
    file("server.js")
  ]);

  assert.match(server, /friendlyDatabaseError/);
  assert.match(server, /Numero atto già presente/);
  assert.match(server, /Formato data non valido/);
  assert.match(server, /Errore database durante il salvataggio dell'atto/);
  assert.equal(app.includes('showToast("Errore nel salvataggio dell\\\'atto. Controllare i campi compilati."'), false);
  assert.match(app, /showToast\(error\.message \|\| "Errore nel salvataggio dell'atto\."/);
});

test("sezione utenti usa endpoint e messaggi propri", async () => {
  const [index, app, server, schema] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);
  const saveUserStart = app.indexOf("async function saveUser");
  const saveUserEnd = app.indexOf("function editUser", saveUserStart);
  const saveUserBlock = app.slice(saveUserStart, saveUserEnd);
  const createUserStart = server.indexOf("async function createUser");
  const updateUserEnd = server.indexOf("async function listUsers", createUserStart);
  const userBackendBlock = server.slice(createUserStart, updateUserEnd);

  assert.match(server, /app\.get\(\["\/api\/utenti", "\/api\/users"\]/);
  assert.match(server, /listUsersForActor/);
  assert.match(server, /minimalPublicUser/);
  assert.match(server, /last_seen >= NOW\(\) - INTERVAL '2 minutes'/);
  assert.match(server, /app\.get\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /app\.get\(\["\/api\/utenti\/:id\/activity", "\/api\/users\/:id\/activity"\]/);
  assert.match(server, /app\.post\(\["\/api\/utenti", "\/api\/users"\]/);
  assert.match(server, /app\.put\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /app\.patch\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /app\.delete\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /Email\/username già presente/);
  assert.match(server, /Nome utente obbligatorio/);
  assert.match(server, /Ruolo utente obbligatorio/);
  assert.match(server, /Negozio assegnato non valido/);
  assert.doesNotMatch(userBackendBlock, /practiceNumber|Numero atto/);
  assert.match(app, /Utente creato correttamente/);
  assert.match(app, /Utente aggiornato correttamente/);
  assert.match(app, /data-user-activity/);
  assert.match(app, /function canCreateUsersUi/);
  assert.match(app, /function canDeleteUserRow[\s\S]*isFounder\(\)/);
  assert.match(app, /data-delete-user/);
  assert.match(app, /Elimina utente/);
  assert.match(app, /Sei sicuro di voler eliminare questo utente/);
  assert.match(app, /Nessuna attività registrata/);
  assert.match(app, /displayMenuUserName/);
  assert.match(app, /displayUserFullName/);
  assert.match(app, /function isFounderUser/);
  assert.match(app, /if \(isFounderUser\(user\)\) return "Elite"/);
  assert.match(app, /loggedUserName\.textContent = `\$\{displayMenuUserName/);
  assert.match(app, /sessionUsername\.textContent = displayMenuUserName/);
  assert.match(app, /mainUserMenuButton\.textContent = displayMenuUserName\(state\.currentUser\)/);
  assert.match(index, /id="mainUserMenuButton"[^>]*>Elite<\/button>/);
  assert.doesNotMatch(index, /Account OroActive/);
  assert.doesNotMatch(index, /id="mainUserMenuButton"[^>]*>Utente<\/button>/);
  assert.match(index, /<option value="founder">Founder<\/option>/);
  assert.match(app, /emailLabel\.hidden = !emailAllowed/);
  assert.match(app, /if \(role === "founder"\)[\s\S]*payload\.email/);
  assert.match(app, /isFounderUser\(user\) && user\.email/);
  assert.match(app, /roleSelect\.disabled = editingFounder/);
  assert.match(app, /state\.currentUser = \{ \.\.\.state\.currentUser, \.\.\.savedUser \}/);
  assert.match(server, /email: role === "founder" \? row\.email : ""/);
  assert.match(server, /if \(!targetIsFounder\)[\s\S]*delete input\.email/);
  assert.match(server, /function canUseRequestedRoleForUpdate/);
  assert.match(server, /targetRole === "founder"[\s\S]*normalizedRequestedRole === "founder"/);
  assert.match(server, /unauthorized_user_create_attempt/);
  assert.match(server, /unauthorized_user_delete_attempt/);
  assert.match(server, /actorRole !== "founder"/);
  assert.match(server, /Non puoi eliminare il tuo stesso utente\./);
  assert.match(server, /Non puoi eliminare l'unico Founder attivo\./);
  assert.match(server, /UPDATE utenti[\s\S]*SET attivo = FALSE/);
  assert.match(server, /user_deleted/);
  assert.match(server, /user_deactivated/);
  assert.match(server, /Utente eliminato correttamente/);
  assert.match(server, /COALESCE\(attivo, TRUE\) = TRUE/);
  assert.match(app, /return ROLE_LEVELS\.find\(\(level\) => level\.role === normalizeRole\(user\?\.ruolo\)\) \|\| null/);
  assert.match(app, /Fondatore OroActive/);
  assert.match(app, /userSaveErrorMessage/);
  assert.doesNotMatch(saveUserBlock, /Numero atto|numerazione della pratica/);
  assert.match(saveUserBlock, /saveButton\.disabled = true/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_activity_logs/);
  assert.match(schema, /ALTER TABLE utenti ADD COLUMN IF NOT EXISTS updated_at/);
});

test("elenco atti ha solo apri modifica riapri elimina e query operative escludono eliminati", async () => {
  const [app, server, schema] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);
  const actionsStart = app.indexOf("function archiveRowActionsMarkup");
  const actionsEnd = app.indexOf("function dateParts", actionsStart);
  const actionsBlock = app.slice(actionsStart, actionsEnd);
  const archiveRenderStart = app.indexOf("function renderArchiveGroups");
  const archiveRenderEnd = app.indexOf("function archivePaginationMarkup", archiveRenderStart);
  const archiveRenderBlock = app.slice(archiveRenderStart, archiveRenderEnd);

  assert.match(actionsBlock, /data-open-act/);
  assert.match(actionsBlock, /data-edit-act/);
  assert.match(actionsBlock, /data-delete-act/);
  assert.doesNotMatch(actionsBlock, /Completa pratica|approve-delete|request-delete/);
  assert.match(archiveRenderBlock, /Pratica<\/span><span>Negozio<\/span><span>Cliente<\/span><span>Date<\/span><span>Stato<\/span><span>Totale<\/span><span>Operatore<\/span><span>Azioni/);
  assert.match(archiveRenderBlock, /workflowStatusListLabel/);
  assert.match(app, /Sei sicuro di voler eliminare definitivamente questo atto/);
  assert.match(app, /loadDashboard\(\)/);
  assert.match(server, /deleted_by = \$2::bigint/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /visibleRealActStatusSql/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_by/);
});

test("antifrode non mostra atti eliminati e sincronizza gli alert collegati", async () => {
  const server = await file("server.js");
  const listStart = server.indexOf("async function listAntifraudAlerts");
  const listEnd = server.indexOf("async function updateAntifraudAlert", listStart);
  const listBlock = server.slice(listStart, listEnd);
  const deleteStart = server.indexOf("async function deleteAct");
  const deleteEnd = server.indexOf("async function createUser", deleteStart);
  const deleteBlock = server.slice(deleteStart, deleteEnd);
  const scanStart = server.indexOf("async function scanAntifraud");
  const scanEnd = server.indexOf("async function listAntifraudAlerts", scanStart);
  const scanBlock = server.slice(scanStart, scanEnd);

  assert.match(listBlock, /LEFT JOIN \$\{actsTable\} a ON a\.id = af\.atto_id/);
  assert.match(listBlock, /af\.atto_id IS NULL OR/);
  assert.match(listBlock, /a\.deleted_at IS NULL/);
  assert.match(listBlock, /COALESCE\(a\.status, ''\) NOT ILIKE 'deleted'/);
  assert.match(deleteBlock, /UPDATE antifrode_alerts/);
  assert.match(deleteBlock, /stato = 'atto_eliminato'/);
  assert.match(scanBlock, /FROM antiriciclaggio_alerts ar/);
  assert.match(scanBlock, /LEFT JOIN \$\{actsTable\} a ON a\.id = ar\.atto_id/);
  assert.match(scanBlock, /normalizeWorkflowStatus\(existing\.status\) === "deleted"/);
});

test("feedback AI approvato sparisce dalla coda e si puo eliminare", async () => {
  const [app, server, schema, migration] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260526_ai_feedback_review_workflow.sql")
  ]);
  const feedbackListStart = server.indexOf("async function listAiFeedback");
  const feedbackListEnd = server.indexOf("async function createAiFeedback", feedbackListStart);
  const feedbackListBlock = server.slice(feedbackListStart, feedbackListEnd);
  const feedbackToKnowledgeStart = server.indexOf("async function feedbackToKnowledge");
  const feedbackToKnowledgeEnd = server.indexOf("async function searchAiChunksBySource", feedbackToKnowledgeStart);
  const feedbackToKnowledgeBlock = server.slice(feedbackToKnowledgeStart, feedbackToKnowledgeEnd);
  const notesStart = app.indexOf("function renderKnowledgeNotes");
  const notesEnd = app.indexOf("async function loadKnowledgeNotes", notesStart);
  const notesBlock = app.slice(notesStart, notesEnd);

  assert.match(feedbackListBlock, /COALESCE\(status, 'da_valutare'\) = 'da_valutare'/);
  assert.match(feedbackToKnowledgeBlock, /SET status = 'approvato'/);
  assert.match(feedbackToKnowledgeBlock, /knowledge_note_id = \$2::bigint/);
  assert.match(server, /async function deleteAiFeedback/);
  assert.match(server, /app\.delete\("\/api\/ai\/feedback\/:id"/);
  assert.match(app, /data-delete-ai-feedback/);
  assert.match(app, /async function deleteAiFeedback/);
  assert.doesNotMatch(notesBlock, /data-reject-knowledge|>Rifiuta</);
  assert.match(schema, /ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'da_valutare'/);
  assert.match(migration, /ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'da_valutare'/);
});

test("strumenti contiene collegamento verificabile al sito OroActive", async () => {
  const [index, app] = await Promise.all([
    file("index.html"),
    file("app.js")
  ]);

  assert.match(index, /id="mainMenuActions"/);
  assert.match(index, /id="brandDropdown"/);
  assert.match(app, /label: "Sito web OroActive"[\s\S]*action: "website"/);
  assert.match(app, /data-menu-action="\$\{escapeHtml\(item\.action\)\}"/);
  assert.match(app, /const OROACTIVE_WEBSITE_URL = "http:\/\/wcfme33owxz0wfkr0ysnzthy\.188\.213\.161\.151\.sslip\.io\/"/);
  assert.match(app, /function openOroActiveWebsite/);
  assert.match(app, /window\.open\(OROACTIVE_WEBSITE_URL, "_blank", "noopener,noreferrer"\)/);
});

test("mascotte Aurum interattiva usa gufo dorato, flag e AI esistente", async () => {
  const [index, app, styles, server, schema, migration, quizMigration, repliesMigration, directMessagesMigration] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("styles.css"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_aurum_interaction_memory.sql"),
    file("migrations/20260527_aurum_memories_messages_quiz.sql"),
    file("migrations/20260527_aurum_message_replies.sql"),
    file("migrations/20260527_direct_user_messages.sql")
  ]);
  const aurumNormativeDocuments = [
    "Decreto Legislativo n.92 del 25 Maggio 2017.pdf",
    "Decreto Legislativo n.211 del 10 Dicembre 2024.pdf",
    "Elenco Monete d'Oro.pdf",
    "Normativa e legislazione 2017.pdf",
    "Normativa e legislazione 2023.pdf"
  ];
  await Promise.all(aurumNormativeDocuments.map((filename) => (
    access(new URL(`assets/aurum-knowledge/normative/${filename}`, root))
  )));

  assert.match(index, /id="aurumMascotRoot"/);
  assert.match(index, /aria-label="Aurum Assistente OroActive"/);
  assert.match(index, /gufo dorato AI OroActive/);
  assert.match(index, /Aurum — Assistente OroActive/);
  assert.match(index, /Mascotte AI ufficiale/);
  assert.match(index, /id="aurumManagementPanel"/);
  assert.match(index, /Gestione Aurum/);
  assert.match(app, /label: "Gestione Aurum"[\s\S]*section: "aurumAdmin"/);
  assert.match(index, /id="userMessagesPanel"/);
  assert.match(index, /id="userMessageRecipient"/);
  assert.match(index, /id="aurumMessageRecipient"/);
  assert.match(index, /id="aurumConsentPanel"/);
  assert.match(index, /id="aurumMemoriesList"/);
  assert.match(index, /Memorie Aurum per utente/);
  assert.doesNotMatch(index, /id="aurumUserMemoryToggle"|id="aurumUserMemories"/);
  assert.doesNotMatch(index, /id="aurumTutorToolbar"|id="aurumPriceToolbar"/);
  assert.doesNotMatch(index, /data-aurum-price-followup|data-aurum-tutorial|data-aurum-field-help|data-aurum-quiz/);
  assert.doesNotMatch(styles, /\.aurum-tutor-toolbar|\.aurum-price-toolbar|\.aurum-quick-actions/);
  assert.match(index, /Sì, ricordalo/);
  assert.doesNotMatch(index, /<section class="main-menu-screen"[\s\S]*id="aurumMascotRoot"[\s\S]*<\/section>\s*<div class="app-shell">/);
  assert.doesNotMatch(index, /id="aurumFounderTestPanel"|Test Mascotte AI|Funzione sperimentale/);
  assert.doesNotMatch(app, /ENABLE_AURUM_MASCOT_TEST|AURUM_MASCOT_STORAGE_KEY|setAurumMascotTestActive/);
  assert.match(app, /const ENABLE_AURUM_MASCOT = true/);
  assert.match(app, /AURUM_SECTION_TIPS/);
  assert.match(app, /OROACTIVE_APP_GUIDE/);
  assert.match(app, /AURUM_FIELD_HELP/);
  assert.match(app, /AURUM_LIVE_TUTORIALS/);
  assert.match(app, /tutorial_stampa_copia_aziendale/);
  assert.match(app, /AURUM_DEFAULT_SETTINGS/);
  assert.match(app, /function maybeShowAurumDailyGreeting/);
  assert.match(app, /aurum_greeting_/);
  assert.match(app, /function classifyAurumMood/);
  assert.match(app, /function startAurumTutorial/);
  assert.match(app, /function handleAurumTutorRequest/);
  assert.match(app, /function isAurumNormativeQuestion/);
  assert.match(app, /function buildAurumNormativeAnswer/);
  assert.match(app, /function isAurumFieldHelpQuestion/);
  assert.match(app, /normativa_operativa/);
  assert.match(app, /Decreto Legislativo 25 maggio 2017, n\. 92/);
  assert.match(app, /Decreto Legislativo 10 dicembre 2024, n\. 211/);
  const askAurumStart = app.indexOf("async function askAurum");
  const askAurumEnd = app.indexOf("function sendAssistantFeedback", askAurumStart);
  const askAurumBlock = app.slice(askAurumStart, askAurumEnd > askAurumStart ? askAurumEnd : undefined);
  assert.match(askAurumBlock, /const normativeQuestion = isAurumNormativeQuestion\(question\)/);
  assert.match(askAurumBlock, /!normativeQuestion && handleAurumTutorRequest\(question\)/);
  assert.match(app, /function ensureAurumHelpAttributes/);
  assert.match(app, /tutorial_operativo/);
  assert.match(app, /function sendAurumDirectMessage/);
  assert.match(app, /function renderAurumMessageRecipients/);
  assert.match(app, /function aurumMessageDirectionLabel/);
  assert.match(app, /function saveAurumMemory/);
  assert.match(app, /function recordAurumInteractionMemory/);
  assert.match(app, /function loadAurumAllMemories/);
  assert.match(app, /function resetAurumVisibleChat/);
  const resetAurumChatStart = app.indexOf("function resetAurumVisibleChat");
  const resetAurumChatEnd = app.indexOf("function closeAurumChat", resetAurumChatStart);
  const resetAurumChatBlock = app.slice(resetAurumChatStart, resetAurumChatEnd);
  assert.match(resetAurumChatBlock, /state\.aurumMessages = \[\]/);
  assert.match(resetAurumChatBlock, /state\.aurumLastUserMessage = ""/);
  assert.doesNotMatch(resetAurumChatBlock, /aurumMemories\s*=/);
  assert.doesNotMatch(resetAurumChatBlock, /aurumAllMemories\s*=/);
  assert.match(app, /function startAurumCuriosityQuiz/);
  assert.match(app, /function evaluateAurumQuizAnswer/);
  assert.match(app, /function renderUserMessages/);
  assert.match(app, /function replyAurumMessage/);
  assert.match(app, /function deleteAurumMessage/);
  assert.match(app, /data-reply-aurum-message/);
  assert.match(app, /data-delete-aurum-message/);
  assert.match(app, /recipient_user_id: recipientId/);
  assert.match(app, /Solo visualizzazione Founder/);
  assert.match(app, /AURUM_COMPRO_ORO_QUIZ/);
  assert.match(app, /function updateAurumMascotVisibility/);
  assert.match(app, /function askAurum/);
  assert.match(app, /apiRequest\("\/ai\/assistente"/);
  assert.match(app, /interface: "aurum_operational_tutor"/);
  assert.match(app, /visibleFields: visibleAurumFields\(\)/);
  assert.match(app, /availableActions: visibleAurumActions\(\)/);
  assert.match(app, /apiRequest\("\/aurum\/memories"/);
  assert.match(app, /apiRequest\("\/aurum\/memories\/all"/);
  assert.match(app, /apiRequest\("\/aurum\/support-requests"/);
  assert.match(server, /Sei Aurum, assistente operativo intelligente di OroActive/);
  assert.match(server, /function isComproOroNormativeQuestion/);
  assert.match(server, /function buildComproOroNormativeAnswer/);
  assert.match(server, /normativa_operativa/);
  assert.match(server, /Decreto Legislativo 25 maggio 2017, n\. 92/);
  assert.match(server, /Decreto Legislativo 10 dicembre 2024, n\. 211/);
  assert.match(server, /Non trasformare una domanda normativa in una spiegazione di un campo app/);
  assert.match(server, /aurumBundledKnowledgeDocuments/);
  assert.match(server, /seedAurumBundledKnowledgeDocuments/);
  assert.match(server, /aurum-bundled-knowledge:\$\{source\.filename\}/);
  assert.match(server, /documentKind: "normativa"/);
  assert.match(server, /Normativa e documentazione OroActive/);
  assert.match(server, /Tutorial operativo\. Rispondi con guida concreta/);
  assert.match(server, /app\.get\("\/api\/aurum\/memories"/);
  assert.match(server, /app\.get\("\/api\/aurum\/memories\/all", requireFounder/);
  assert.match(server, /app\.post\("\/api\/aurum\/memories"/);
  assert.match(server, /app\.post\("\/api\/aurum\/support-requests"/);
  assert.match(server, /app\.patch\("\/api\/aurum\/support-requests\/:id\/reply"/);
  assert.match(server, /app\.delete\("\/api\/aurum\/support-requests\/:id"/);
  assert.match(server, /function replyAurumSupportRequest/);
  assert.match(server, /function deleteAurumSupportRequest/);
  assert.match(server, /recipient_user_id/);
  assert.match(server, /founder_observer/);
  assert.match(server, /can_reply: isRecipient/);
  assert.match(server, /sanitizeAurumMemoryText/);
  assert.match(server, /Memoria non salvata: contiene dati personali o sensibili/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_support_requests/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_user_memories/);
  assert.match(schema, /aurum_user_memories_type_idx/);
  assert.match(schema, /response_message TEXT/);
  assert.match(schema, /recipient_user_id BIGINT/);
  assert.match(schema, /aurum_support_requests_recipient_idx/);
  assert.match(schema, /aurum_support_requests_deleted_idx/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS aurum_support_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS aurum_user_memories/);
  assert.match(quizMigration, /aurum_user_memories_type_idx/);
  assert.match(quizMigration, /aurum_support_requests_role_idx/);
  assert.match(repliesMigration, /response_message TEXT/);
  assert.match(repliesMigration, /aurum_support_requests_deleted_idx/);
  assert.match(directMessagesMigration, /recipient_user_id BIGINT/);
  assert.match(directMessagesMigration, /aurum_support_requests_recipient_idx/);
  assert.match(styles, /\.aurum-mascot-root/);
  assert.match(styles, /\.aurum-mascot-root \{[\s\S]*z-index: 8000/);
  assert.match(styles, /\.main-menu-screen:not\(\[hidden\]\) ~ \.aurum-mascot-root \{[\s\S]*opacity: 1[\s\S]*pointer-events: none/);
  assert.doesNotMatch(styles, /\.main-menu-screen:not\(\[hidden\]\) ~ \.aurum-mascot-root:not\(\.aurum-panel-open\)[\s\S]*opacity: 0/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-panel-open/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-positioned/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-dragging/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-compact:not\(\.aurum-panel-open\)/);
  assert.match(styles, /\.aurum-chat-panel[\s\S]*position: fixed/);
  assert.match(styles, /\.aurum-chat-panel[\s\S]*z-index: 8001/);
  assert.match(styles, /\[data-aurum-avoid="true"\][\s\S]*z-index: 9000/);
  assert.match(styles, /\.aurum-chat-panel[\s\S]*max-height: min\(720px, calc\(100vh - 32px\)\)/);
  assert.match(styles, /\.aurum-chat-header[\s\S]*flex-shrink: 0/);
  assert.match(styles, /\.aurum-chat-header[\s\S]*cursor: grab/);
  assert.match(styles, /\.aurum-chat-log[\s\S]*overscroll-behavior: contain/);
  assert.match(index, /id="aurumResetPosition"[\s\S]*Ripristina posizione Aurum/);
  assert.match(app, /AURUM_FLOATING_POSITION_KEY = "aurum_floating_position"/);
  assert.match(app, /AURUM_AVOID_EVENT = "aurum:avoid-elements-updated"/);
  assert.match(app, /function handleAurumPointerDown/);
  assert.match(app, /function updateAurumAvoidance/);
  assert.match(app, /function resetAurumFloatingPosition/);
  assert.match(app, /function constrainAurumTipToViewport\(\)[\s\S]*mascotRect = aurumMascotRoot\.getBoundingClientRect\(\)/);
  assert.match(app, /&& \(!aurumTipBubble \|\| aurumTipBubble\.hidden\)/);
  assert.match(app, /--aurum-tip-offset-y/);
  assert.match(styles, /\.aurum-tip \{[\s\S]*position: absolute[\s\S]*right: calc\(100% \+ var\(--aurum-tip-gap\)\)/);
  assert.match(styles, /\.aurum-tip\.aurum-tip-side-right \{[\s\S]*left: calc\(100% \+ var\(--aurum-tip-gap\)\)/);
  assert.match(app, /aurumResetPosition\?\.addEventListener\("click"/);
  assert.doesNotMatch(styles, /#aurumUserMemories|\.aurum-memory-details|\.assistant-source/);
  assert.doesNotMatch(app, /assistant-source|Fonte: \$\{escapeHtml\(message\.source\)\}/);
  assert.match(styles, /\.aurum-list-row span[\s\S]*overflow-wrap: anywhere/);
  assert.match(styles, /\.aurum-list-row textarea/);
  assert.match(styles, /#aurumAskButton/);
  assert.match(styles, /\.aurum-chat-form label/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-roaming/);
  assert.match(styles, /\.aurum-owl/);
  assert.match(styles, /\.aurum-body/);
  assert.match(styles, /\.aurum-wing-left/);
  assert.match(styles, /@keyframes aurum-breath/);
  assert.match(styles, /@keyframes aurum-blink/);
  assert.match(styles, /@keyframes aurum-wing-soft/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(app, /aurum-panel-open/);
  assert.match(app, /Nessuna memoria Aurum registrata/);
  assert.match(app, /event\.key === "Escape"[\s\S]*closeAurumChat/);
});

test("Aurum Shield calcola risk score e integra atti dashboard antifrode CRM", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_aurum_shield_risk_scoring.sql"),
    file("styles.css")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_shield_scores/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_shield_alerts/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_shield_settings/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_score/);
  assert.match(migration, /cash_limit_amount/);
  assert.match(migration, /idx_aurum_shield_alerts_status/);

  assert.match(server, /defaultAurumShieldSettings/);
  assert.match(server, /function calculateAurumShieldRisk/);
  assert.match(server, /function persistAurumShieldForAct/);
  assert.match(server, /function dashboardAurumShieldStats/);
  assert.match(server, /app\.post\("\/api\/aurum-shield\/evaluate"/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/settings"/);
  assert.match(server, /app\.put\("\/api\/aurum-shield\/settings", requireFounder/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/sale-deed\/:id"/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/client\/:id"/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/alerts"/);
  assert.match(server, /app\.put\("\/api\/aurum-shield\/alerts\/:id\/review"/);
  assert.match(server, /status = 'atto_eliminato'/);
  assert.match(server, /cash_over_limit/);
  assert.match(server, /Math\.max\(score, 85\)/);
  assert.match(server, /LEFT JOIN LATERAL \(/);

  assert.match(index, /id="aurumShieldCard"/);
  assert.match(index, /id="aurumShieldSettingsForm"/);
  assert.match(app, /label: "Aurum Shield"[\s\S]*section: "aurumShield"/);
  assert.match(app, /function scheduleAurumShieldEvaluation/);
  assert.match(app, /function confirmAurumShieldBeforeFinalSave/);
  assert.match(app, /apiRequest\("\/aurum-shield\/evaluate"/);
  assert.match(app, /apiRequest\("\/aurum-shield\/alerts"/);
  assert.match(app, /apiRequest\("\/aurum-shield\/settings"/);
  assert.match(app, /aurumShieldBadgeMarkup\(act\.aurumShield\)/);
  assert.match(app, /detail\.aurum_shield/);
  assert.match(app, /Shield medio/);
  assert.match(app, /showAurumTip\("Questa pratica merita un controllo in più/);
  assert.match(styles, /\.aurum-shield-card/);
  assert.match(styles, /\.aurum-shield-badge\.risk-critical/);
});

test("controllo qualità guidato blocca completamento e stampe finali", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_guided_quality_check.sql"),
    file("styles.css")
  ]);

  assert.match(index, /id="guidedQualityPanel"/);
  assert.match(index, /Controllo Qualità Guidato/);
  assert.match(index, /id="guidedQualityList"/);
  assert.match(styles, /\.guided-quality-panel/);
  assert.match(styles, /\.quality-target-highlight/);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS quality_checks/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_status/);
  assert.match(schema, /idx_quality_checks_sale_deed_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS quality_checks/);
  assert.match(migration, /idx_quality_checks_status/);

  assert.match(server, /async function validateQualityChecklist/);
  assert.match(server, /async function assertQualityAllowsFinalSave/);
  assert.match(server, /async function saveQualityCheckResult/);
  assert.match(server, /app\.post\("\/api\/quality-check\/validate"/);
  assert.match(server, /app\.post\("\/api\/quality-check\/save"/);
  assert.match(server, /Pratica non completabile/);
  assert.match(server, /quality_check_status = \$2::text/);
  assert.match(server, /persistQualityCheckForAct/);

  assert.match(app, /function renderGuidedQualityCheck/);
  assert.match(app, /async function validateQualityChecklist/);
  assert.match(app, /async function ensureGuidedQualityAllows/);
  assert.match(app, /apiRequest\("\/quality-check\/validate"/);
  assert.match(app, /data-quality-target/);
  assert.match(app, /focusQualityTarget/);
  assert.match(app, /showAurumTip\(`Aurum ha controllato la pratica:/);
  assert.match(app, /async function validateSaleDeedForCompletion/);
  assert.match(app, /function showSaleDeedValidationModal/);
  assert.match(app, /data-quality-completion-choice="suspend"/);
  assert.match(app, /ensureGuidedQualityAllows\(isCompletion \? "complete" : "archive"/);
  assert.match(app, /ensureGuidedQualityAllows\("print"/);

  const archiveStart = app.indexOf("async function archiveCurrentPractice");
  const archiveEnd = app.indexOf("function compactActForAi", archiveStart);
  const archiveBlock = app.slice(archiveStart, archiveEnd);
  assert.match(archiveBlock, /requestedStatus !== "draft"/);
  assert.match(archiveBlock, /ensureGuidedQualityAllows/);

  const completeStart = app.indexOf("async function completeCurrentPractice");
  const completeEnd = app.indexOf("navItems.forEach", completeStart);
  const completeBlock = app.slice(completeStart, completeEnd);
  assert.match(completeBlock, /archiveCurrentPractice\("completed"\)/);
  assert.doesNotMatch(completeBlock, /runAiActCheck|Controllo AI/);
  assert.doesNotMatch(completeBlock, /archiviato\. Potrai completarlo da Elenco/);
});

test("OroActive Audit Trail traccia azioni utenti e ha UI Founder", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_oroactive_audit_trail.sql"),
    file("styles.css")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(schema, /user_name TEXT/);
  assert.match(schema, /before_data JSONB DEFAULT NULL/);
  assert.match(schema, /after_data JSONB DEFAULT NULL/);
  assert.match(schema, /idx_audit_logs_action/);
  assert.match(schema, /idx_audit_logs_store_id/);
  assert.match(migration, /ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'api_request'/);
  assert.match(migration, /idx_audit_logs_entity_type/);

  assert.match(server, /async function writeAuditLog/);
  assert.match(server, /function compactAuditPayload/);
  assert.match(server, /function listAuditLogs/);
  assert.match(server, /function getAuditLogDetail/);
  assert.match(server, /function dashboardAuditSummary/);
  assert.match(server, /AUDIT LOG ERROR/);
  assert.match(server, /app\.get\("\/api\/audit-logs"/);
  assert.match(server, /app\.get\("\/api\/audit-logs\/:id"/);
  assert.match(server, /action: "login"/);
  assert.match(server, /action: "login_failed"/);
  assert.match(server, /action: "delete_act"/);
  assert.match(server, /action: "modify_payment"/);
  assert.match(server, /action: "change_user_role"/);
  assert.match(server, /action: "download_backup"/);
  assert.match(server, /action: "risk_score_calculated"/);
  assert.match(server, /quality_check_executed/);
  assert.match(server, /FROM audit_logs al/);
  assert.match(server, /audit_summary: auditSummary/);

  assert.match(index, /id="auditTrail"/);
  assert.match(app, /label: "Audit Trail"[\s\S]*section: "auditTrail"/);
  assert.match(index, /id="auditTrailFilters"/);
  assert.match(index, /id="auditTrailList"/);
  assert.match(app, /async function loadAuditTrail/);
  assert.match(app, /function renderAuditTrail/);
  assert.match(app, /function viewAuditLog/);
  assert.match(app, /apiRequest\(`\/audit-logs/);
  assert.match(app, /apiRequest\(`\/audit-logs\/\$\{encodeURIComponent\(id\)\}`/);
  assert.match(app, /Oggi nell'app/);
  assert.match(styles, /\.audit-trail-filters/);
  assert.match(styles, /\.audit-action-badge/);
  assert.match(styles, /\.audit-detail-grid/);
});

test("workflow autorizzazioni blocca pratiche rischiose e traccia Audit Trail", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_sale_deed_approval_workflow.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_status/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_request_id/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS approval_requests/);
  assert.match(schema, /idx_approval_requests_sale_deed_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS approval_requests/);
  assert.match(migration, /idx_approval_requests_status/);

  assert.match(server, /async function assertApprovalAllowsFinalSave/);
  assert.match(server, /async function createApprovalRequest/);
  assert.match(server, /async function reviewApprovalRequest/);
  assert.match(server, /app\.get\("\/api\/approvals"/);
  assert.match(server, /app\.post\("\/api\/approvals\/request"/);
  assert.match(server, /app\.post\("\/api\/approvals\/:id\/approve"/);
  assert.match(server, /app\.post\("\/api\/approvals\/:id\/reject"/);
  assert.match(server, /approval_required = true/);
  assert.match(server, /approval_required_blocked_completion/);
  assert.match(server, /sale_deed_completed_after_approval/);

  assert.match(index, /id="approvals"/);
  assert.match(app, /label: "Autorizzazioni"[\s\S]*section: "approvals"/);
  assert.match(index, /id="approvalsList"/);
  assert.match(app, /async function loadApprovals/);
  assert.match(app, /function renderApprovals/);
  assert.match(app, /async function requestApprovalForCurrentPractice/);
  assert.match(app, /function shouldRequestApprovalForQuality/);
  assert.match(app, /function hasApprovedApprovalForCurrentAct/);
  assert.match(app, /confirmAurumShieldBeforeFinalSave\(shield, options = \{\}\)/);
  assert.match(app, /apiRequest\("\/approvals\/request"/);
  assert.match(app, /data-approve-approval/);
  assert.match(app, /In attesa autorizzazione/);
  assert.match(styles, /\.approvals-table/);
  assert.match(styles, /\.approval-status\.approval-approved/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("notifiche interne hanno schema API UI e polling leggero", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_internal_notifications.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS notifications/);
  assert.match(schema, /idx_notifications_user_id/);
  assert.match(schema, /idx_notifications_read_at/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS notifications/);
  assert.match(migration, /idx_notifications_created_at/);

  assert.match(server, /async function createNotification/);
  assert.match(server, /async function listNotifications/);
  assert.match(server, /async function notificationUnreadCount/);
  assert.match(server, /app\.get\("\/api\/notifications"/);
  assert.match(server, /app\.get\("\/api\/notifications\/unread-count"/);
  assert.match(server, /app\.put\("\/api\/notifications\/read-all"/);
  assert.match(server, /app\.put\("\/api\/notifications\/:id\/read"/);
  assert.match(server, /app\.delete\("\/api\/notifications\/:id"/);
  assert.match(server, /notification_created/);
  assert.match(server, /approval_request/);
  assert.match(server, /aurum_shield_alert/);
  assert.match(server, /quality_check_failed/);
  assert.match(server, /backup_created/);
  assert.match(server, /deed_deleted/);
  assert.match(server, /aurum_support_request/);
  assert.match(server, /academy_course_assigned/);

  assert.match(index, /id="notificationCenter"/);
  assert.match(index, /id="notificationBell"/);
  assert.match(index, /id="notificationDropdown"/);
  assert.match(index, /id="notifications"/);
  assert.match(app, /viewAllNotifications\?\.addEventListener\("click"[\s\S]*setScreen\("notifications"\)/);
  assert.match(app, /NOTIFICATION_POLL_INTERVAL_MS = 60000/);
  assert.match(app, /async function loadNotificationDropdown/);
  assert.match(app, /apiRequest\("\/notifications\?limit=6&page=1&unread=true"/);
  assert.match(app, /function renderNotificationDropdownEmpty/);
  assert.match(app, /renderNotificationDropdownEmpty\("Tutte le notifiche sono state lette\."\)/);
  assert.match(app, /async function loadNotificationsPage/);
  assert.match(app, /function renderNotificationsPage/);
  assert.match(app, /function positionNotificationDropdown/);
  assert.match(app, /positionNotificationDropdown\(\);[\s\S]*await loadNotificationDropdown\(\);[\s\S]*positionNotificationDropdown\(\);/);
  assert.match(app, /apiRequest\("\/notifications\/unread-count"/);
  assert.match(app, /apiRequest\(`\/notifications\?\$\{notificationFilterParams/);
  assert.match(app, /setScreen\("notifications"\)/);
  assert.match(styles, /\.notification-center/);
  assert.match(styles, /\.notification-bell/);
  assert.match(styles, /\.notification-dropdown/);
  assert.match(styles, /\.notification-dropdown\.is-viewport-anchored/);
  assert.match(styles, /\.notifications-table/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("pratiche sospese hanno schema API UI e non contaminano elenco giacenza", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_suspended_practices.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reason/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reasons/);
  assert.match(schema, /ALTER TABLE atti_vendita ALTER COLUMN status SET DEFAULT 'draft'/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS suspended_practice_logs/);
  assert.match(schema, /status = 'suspended'/);
  assert.match(schema, /idx_suspended_practice_logs_sale_deed_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS suspended_practice_logs/);
  assert.match(migration, /atti_vendita_suspended_status_idx/);

  assert.match(server, /function reservedActNumberStatusSql/);
  assert.match(server, /function suspendedStatusWhere/);
  assert.match(server, /async function listSuspendedPractices/);
  assert.match(server, /async function suspendPractice/);
  assert.match(server, /async function resolveSuspendedPractice/);
  assert.match(server, /async function deleteSuspendedPractice/);
  assert.match(server, /app\.get\("\/api\/suspended-practices"/);
  assert.match(server, /app\.post\("\/api\/suspended-practices\/:id\/suspend"/);
  assert.match(server, /app\.post\("\/api\/suspended-practices\/:id\/resolve-check"/);
  assert.match(server, /app\.delete\("\/api\/suspended-practices\/:id"/);
  assert.match(server, /sale_deed_suspended/);
  assert.match(server, /suspended_practice_created/);
  assert.match(server, /dashboardSuspendedPracticeStats/);

  assert.match(index, /id="suspendedPractices"/);
  assert.match(app, /label: "Pratiche sospese"[\s\S]*section: "suspendedPractices"/);
  assert.match(index, /id="archiveIncludeSuspended"/);
  assert.match(index, /id="saveSuspendedPractice"/);
  assert.match(index, /id="suspendedPracticesList"/);
  assert.match(app, /async function loadSuspendedPractices/);
  assert.match(app, /function renderSuspendedPractices/);
  assert.match(app, /async function saveCurrentPracticeAsSuspended/);
  assert.match(app, /function archiveShowsSuspended/);
  assert.match(app, /includeSuspended: archiveShowsSuspended\(\)/);
  assert.match(app, /apiRequest\(`\/suspended-practices/);
  assert.match(app, /isCompletedWorkflowStatus\(status\) \|\| \(archiveShowsSuspended\(\) && suspendedStatus\)/);
  assert.match(app, /\.filter\(\(act\) => isCompletedWorkflowStatus\(act\.status\)\)/);
  assert.match(styles, /\.suspended-practices-table/);
  assert.match(styles, /\.status-suspended/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("nuovo atto si apre senza attendere la numerazione remota", async () => {
  const app = await file("app.js");
  const enterStart = app.indexOf("async function enterSectionFromMainMenu");
  const enterEnd = app.indexOf("async function clearPracticeForFreshStart", enterStart);
  const enterBlock = app.slice(enterStart, enterEnd);
  const metaStart = app.indexOf("async function setPracticeMeta");
  const metaEnd = app.indexOf("async function updatePracticeNumber", metaStart);
  const metaBlock = app.slice(metaStart, metaEnd);

  assert.match(enterBlock, /route\.screen === "practice"[\s\S]*setScreen\(route\.screen\);[\s\S]*clearPracticeForFreshStart\(\{ deferPracticeNumber: true \}\)/);
  assert.match(metaBlock, /deferPracticeNumber/);
  assert.match(metaBlock, /In assegnazione/);
  assert.match(app, /if \(!fieldValue\("#practiceNumber"\)\) await updatePracticeNumber\(\)/);
});

test("errori database sono separati per modulo", async () => {
  const server = await file("server.js");
  const friendlyStart = server.indexOf("function friendlyDatabaseError");
  const friendlyEnd = server.indexOf("app.use((error", friendlyStart);
  const friendlyBlock = server.slice(friendlyStart, friendlyEnd);

  assert.match(friendlyBlock, /utenti\|users/);
  assert.match(friendlyBlock, /Email\/username già presente/);
  assert.match(friendlyBlock, /api.*atti/);
  assert.match(friendlyBlock, /api.*acts/);
  assert.match(friendlyBlock, /Numero atto già presente/);
  assert.match(friendlyBlock, /Errore database durante il salvataggio CRM/);
  assert.match(friendlyBlock, /Errore database durante il backup/);
  assert.match(friendlyBlock, /Errore database durante il salvataggio Academy/);
});

test("qualita generale protegge click doppi messaggi tecnici e caricamenti sezione", async () => {
  const [index, app, server, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("service-worker.js")
  ]);
  const loginStart = app.indexOf("async function handleLogin");
  const loginEnd = app.indexOf("function bytesToBase64Url", loginStart);
  const loginBlock = app.slice(loginStart, loginEnd);
  const toastStart = app.indexOf("function showToast");
  const toastEnd = app.indexOf("function showLogin", toastStart);
  const toastBlock = app.slice(toastStart, toastEnd);
  const setScreenStart = app.indexOf("function setScreen");
  const setScreenEnd = app.indexOf("async function handleScreenDataLoad", setScreenStart);
  const setScreenBlock = app.slice(setScreenStart, setScreenEnd);
  const errorStart = server.indexOf("function friendlyDatabaseError");
  const errorBlock = server.slice(errorStart);

  assert.match(app, /loggingIn: false/);
  assert.match(loginBlock, /if \(state\.loggingIn\) return/);
  assert.match(loginBlock, /submitButton\.disabled = true/);
  assert.match(loginBlock, /submitButton\.textContent = "Accesso\.\.\."/);
  assert.match(loginBlock, /faceIdLoginButton\.disabled = true/);
  assert.match(app, /function isLoginRequestPath\(path = ""\)/);
  assert.match(app, /return path === "\/auth\/login" \|\| path === "\/login";/);
  assert.match(app, /function protectAuthenticatedTransition/);
  assert.match(app, /function shouldReturnToLoginOnUnauthorized/);
  assert.match(app, /response\.status === 401 && shouldReturnToLoginOnUnauthorized\(path\)/);
  assert.match(app, /Unauthorized background request ignored during authenticated transition/);
  assert.match(loginBlock, /let authAccepted = false/);
  assert.match(loginBlock, /const token = data\?\.token \|\| data\?\.session/);
  assert.match(loginBlock, /if \(!data\?\.user \|\| !token\)/);
  assert.match(loginBlock, /state\.authToken = token;\s*authAccepted = true;\s*protectAuthenticatedTransition\(\);/);
  assert.match(loginBlock, /await saveStoredAuthToken\(token\)\.catch\(\(storageError\) => \{[\s\S]*state\.authToken = token;[\s\S]*\}\);/);
  assert.match(loginBlock, /console\.info\("\[OroActive Auth\] login submit"\)/);
  assert.match(loginBlock, /timeoutMs: 8000/);
  assert.match(loginBlock, /console\.info\("\[OroActive Auth\] login success"/);
  assert.match(loginBlock, /await bootAuthenticatedApp\("login"\);\s*schedulePostLoginMenuGuard\("login"\);\s*loginForm\.reset\(\);/);
  assert.match(loginBlock, /if \(authAccepted\) \{[\s\S]*reportFrontendFailure\("login", error\)[\s\S]*forceShowMainMenuAfterLogin\(\{ renderMenus: false, phase: "login", error \}\)/);
  assert.doesNotMatch(loginBlock, /login authenticated startup[\s\S]*await clearStoredAuthToken\(\)/);
  assert.match(loginBlock, /Connessione al server non disponibile\. Riprova tra qualche secondo\./);
  assert.match(app, /function cleanUserMessage/);
  assert.match(app, /Failed to fetch\|NetworkError\|Load failed/);
  assert.match(toastBlock, /cleanUserMessage\(message\)/);
  assert.match(app, /function withButtonBusy/);
  assert.match(setScreenBlock, /handleScreenDataLoad\(id\)\.catch/);
  assert.match(setScreenBlock, /sectionLoadErrorMessage/);
  assert.match(server, /function publicErrorMessage/);
  assert.match(server, /function looksTechnicalErrorMessage/);
  assert.match(server, /function safeRouteErrorMessage/);
  assert.doesNotMatch(errorBlock, /payload\.code/);
  assert.doesNotMatch(server, /UPDATE PAYLOAD|ATTO ID/);
  assert.match(index, /app\.js\?v=20260707-resilient-auth-boot-1/);
  assert.match(index, /styles\.css\?v=20260707-resilient-auth-boot-1/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
  const sectionIds = new Set([...index.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]));
  const menuTargets = [...new Set([...index.matchAll(/data-section="([^"]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(menuTargets.filter((target) => !sectionIds.has(target)), []);
});

test("design system OroActive centralizza tema componenti e stati UI", async () => {
  const [index, styles, worker] = await Promise.all([
    file("index.html"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(styles, /OroActive Design System/);
  assert.match(styles, /--oa-black: #050505/);
  assert.match(styles, /--oa-bg-main: #050505/);
  assert.match(styles, /--oa-card-soft: #f8f6f2/i);
  assert.match(styles, /--oa-orange-soft: rgba\(255, 106, 0, 0\.12\)/);
  assert.match(styles, /--oa-orange: #ff6a00/i);
  assert.match(styles, /--oa-gold: #d4af37/i);
  assert.match(styles, /--oa-radius-lg: 16px/);
  assert.match(styles, /--oa-shadow-panel:/);
  assert.match(styles, /--orange: var\(--oa-orange\)/);
  assert.match(styles, /--muted: var\(--oa-muted\)/);
  assert.match(styles, /:where\(button, input, select, textarea, a, \[role="button"\]\):focus-visible/);
  assert.match(styles, /\.oa-glass-panel/);
  assert.match(styles, /\.oa-chip/);
  assert.match(styles, /\.oa-status\.danger/);
  assert.match(styles, /\.primary-button \{[\s\S]*var\(--oa-orange\)[\s\S]*var\(--oa-orange-2\)/);
  assert.match(styles, /\.form-panel,[\s\S]*\.side-panel > div \{[\s\S]*border-radius: var\(--oa-radius-md\)/);
  assert.match(styles, /\.dashboard-card,[\s\S]*\.dashboard-panel \{[\s\S]*border-radius: var\(--oa-radius-md\)/);
  assert.match(styles, /\.toast\.error \{[\s\S]*background: var\(--oa-danger\)/);
  assert.match(styles, /OroActive internal sections phase 2/);
  assert.match(styles, /\.workspace \{[\s\S]*var\(--oa-bg-main\)/);
  assert.match(styles, /\.topbar \{[\s\S]*linear-gradient\(135deg, rgba\(17, 17, 17, 0\.98\)/);
  assert.match(styles, /\.practice-meta,[\s\S]*\.notification-filters \{[\s\S]*linear-gradient\(180deg, #fffaf6 0%, #fff4ec 100%\)/);
  assert.match(styles, /input:focus,[\s\S]*\.date-input-frame:focus-within \{[\s\S]*border-color: var\(--oa-orange\)/);
  assert.match(styles, /\.table-row\.head \{[\s\S]*linear-gradient\(135deg, #17110d 0%, #23160e 100%\)/);
  assert.match(styles, /\.preview-dialog \{[\s\S]*max-height: calc\(100dvh - 32px/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*\.settings-list button \{[\s\S]*width: 100%/);
  assert.match(styles, /Header sezioni interne: contrasto alto su sfondo dark tech OroActive/);
  assert.match(styles, /\.oa-section-header,[\s\S]*\.archive-header,[\s\S]*\.course-hero,[\s\S]*\.settings-grid > div:first-child/);
  assert.match(styles, /\.archive-header h1,[\s\S]*\.archive-header h2,[\s\S]*\.course-hero h1,[\s\S]*\.course-hero h2[\s\S]*color: #fff/);
  assert.match(styles, /\.archive-header \.muted,[\s\S]*\.archive-header p:not\(\.eyebrow\)[\s\S]*rgba\(255, 255, 255, 0\.82\)/);
  assert.match(styles, /\.archive-header label,[\s\S]*\.founder-report-actions label,[\s\S]*\.store-health-filters label[\s\S]*rgba\(255, 255, 255, 0\.9\)/);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.archive-header,[\s\S]*padding: 20px[\s\S]*font-size: 28px/);
  assert.match(index, /styles\.css\?v=20260707-resilient-auth-boot-1/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("menu principale usa macroaree centralizzate e permessi ruolo", async () => {
  const [index, app, server, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(index, /id="mainMenuQuickActions"/);
  assert.match(index, /id="mainMenuSearch"/);
  assert.match(index, /id="mainMenuSearchResults"/);
  assert.match(index, /id="mainMenuActions"/);
  assert.match(index, /id="mainMenuNotificationSlot"/);
  assert.match(index, /OroActive Control Center/);
  assert.doesNotMatch(index, /main-menu-control-sidebar|id="mainMenuSidebarActions"|id="mainMenuQuickJump"|id="mainMenuSidebarUserName"/);
  assert.match(index, /<aside class="sidebar" aria-label="Navigazione principale">/);
  assert.match(index, /id="mainMenuFounderKpis"/);
  assert.doesNotMatch(index, /id="mainMenuAurumButton"/);
  assert.match(index, /Bentornato, \[Nome Utente\]|Bentornato, Elite/);
  assert.match(index, /id="brandDropdown" hidden><\/div>/);
  assert.match(app, /const MENU_GROUPS = \[/);
  assert.match(app, /label: "Operatività"/);
  assert.match(app, /description: "Atti, giacenza, fusioni e quotazioni\."/);
  assert.match(app, /id: "stock"[\s\S]*label: "Giacenza"[\s\S]*section: "giacenza"/);
  assert.match(app, /id: "melting"[\s\S]*label: "Fusioni"[\s\S]*section: "fusioni"/);
  assert.match(app, /const SECTION_ROUTE_ALIASES = \{[\s\S]*giacenza: \{ screen: "fusion", fusionView: "stock" \}[\s\S]*fusioni: \{ screen: "fusion", fusionView: "melting" \}/);
  assert.match(app, /function updateFusionScreenCopy/);
  assert.match(app, /icon: "Atti"/);
  assert.match(app, /order: 10/);
  assert.match(app, /label: "Clienti"/);
  assert.match(app, /label: "Formazione"/);
  assert.match(app, /label: "Controllo"/);
  assert.match(app, /label: "Direzione"[\s\S]*roles: MENU_ROLES\.founder/);
  assert.match(app, /label: "Amministrazione"[\s\S]*roles: MENU_ROLES\.administration/);
  assert.match(app, /const MENU_QUICK_ACTIONS = \[/);
  assert.match(app, /label: "Nuovo atto"[\s\S]*section: "practice"/);
  assert.match(app, /label: "Elenco atti"[\s\S]*section: "archive"/);
  assert.match(app, /label: "Pratiche sospese"[\s\S]*section: "suspendedPractices"/);
  assert.doesNotMatch(app, /id: "quick-aurum"|id: "quick-notifications"/);
  assert.doesNotMatch(app, /id: "aurum-assistant"[\s\S]*section: "assistant"|id: "notifications"[\s\S]*section: "notifications"/);
  assert.match(app, /id: "search-open-aurum"[\s\S]*action: "aurum"/);
  assert.match(app, /function renderRoleBasedMenus/);
  assert.match(app, /function renderMainMenuFallback/);
  assert.match(app, /function runSafeStartupTask/);
  assert.match(app, /function runSafeUiTask/);
  assert.match(app, /function hydrateAuthenticatedAppInBackground/);
  assert.match(app, /async function bootAuthenticatedApp\(reason = "login"\)/);
  assert.match(app, /function showMainMenuShell\(\)/);
  assert.match(app, /function renderMainMenuMinimum\(\)/);
  assert.match(app, /function userSeesAllStores\(user = state\.currentUser\)/);
  assert.match(app, /mainMenuHeroStore\.textContent = userSeesAllStores\(user\) \? "Tutti i negozi"/);
  assert.doesNotMatch(app, /roleSeesAllStores\(/);
  assert.match(app, /inventory: \{ screen: "fusion", fusionView: "stock" \}/);
  assert.match(app, /quotes: \{ screen: "quotazione" \}/);
  assert.match(app, /academy: \{ screen: "training" \}/);
  assert.match(app, /async function enterSectionFromMainMenu\(section\)[\s\S]*const route = resolveSectionRoute\(section\)[\s\S]*setScreen\(route\.screen\)/);
  assert.match(app, /async function safeStartModule\(name, fn\)/);
  assert.match(app, /function startBootWatchdog\(\)/);
  assert.match(app, /await bootAuthenticatedApp\("login"\)/);
  assert.match(app, /await bootAuthenticatedApp\("session-restore"\)/);
  assert.match(app, /mainMenuScreen\.hidden = false;[\s\S]*mainMenuScreen\.removeAttribute\("hidden"\)/);
  assert.match(app, /data-safe-boot-menu="minimum"/);
  assert.match(app, /showBootRecoveryPanel\(error\)/);
  assert.match(app, /safeStartModule\("notifications", initNotifications\)/);
  assert.match(app, /safeStartModule\("aurum", initAurum\)/);
  assert.match(app, /safeStartModule\("academy", initAcademy\)/);
  assert.match(app, /safeStartModule\("dashboard", initDashboard\)/);
  assert.match(app, /safeStartModule\("operational-background", initOperationalBackground\)/);
  assert.match(app, /await loadCriticalUserDataSafely\(\);[\s\S]*renderMainMenu\(\);[\s\S]*startNonCriticalModulesSafely\(\);/);
  assert.match(app, /showMainMenuShell\(\);[\s\S]*renderMainMenuMinimum\(\);[\s\S]*markBootStage\("main-menu-visible"\);[\s\S]*await loadCriticalUserDataSafely\(\)/);
  assert.doesNotMatch(app, /await safeStartModule\(/);
  assert.match(app, /withTimeout\(Promise\.resolve\(\)\.then\(\(\) => applyRolePermissions\(\)\), PERMISSIONS_BOOT_TIMEOUT_MS, "permissions"\)/);
  assert.match(app, /withTimeout\(loadAvailableStores\(\), STORE_BOOT_TIMEOUT_MS, "stores\/config"\)/);
  assert.match(app, /const NON_CRITICAL_MODULE_TIMEOUT_MS = 4000/);
  assert.match(app, /function withTimeout\(promise, ms, label\)/);
  assert.match(app, /console\.info\("\[OroActive Auth\] session restore start"/);
  assert.match(app, /BOOT_SPLASH_MAX_MS/);
  assert.match(app, /cache: "no-store"/);
  assert.match(app, /"Cache-Control": "no-cache"/);
  assert.match(app, /runSafeUiTask\("main menu render", renderRoleBasedMenus\)/);
  assert.match(app, /renderMainMenuFallback\(\)/);
  assert.match(app, /function getMainMenuConfigForRole/);
  assert.match(app, /function syncNotificationPlacement/);
  assert.match(app, /function cleanupUiBeforeMainMenu/);
  assert.match(app, /function openMainMenuCleanly/);
  assert.match(app, /function forceShowMainMenuAfterLogin/);
  assert.match(app, /loginScreen\) loginScreen\.hidden = true/);
  assert.match(app, /splashScreen\.hidden = true/);
  assert.match(app, /mainMenuScreen\.hidden = false/);
  assert.match(app, /mainMenuScreen\.style\.display = "block"/);
  assert.match(app, /document\.body\.classList\.add\("main-menu-active", "authenticated"\)/);
  assert.match(app, /function schedulePostLoginMenuGuard/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*state\.currentUser && mainMenuScreen\?\.hidden[\s\S]*forceShowMainMenuAfterLogin\(\{ phase \}\)/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*hasUser && \(!mainMenuScreen \|\| mainMenuScreen\.hidden\)[\s\S]*renderMainMenuMinimum\(\)/);
  assert.match(app, /Errore caricamento interfaccia OroActive\. Riprova o contatta il Founder\./);
  assert.match(app, /data-auth-recovery="retry"/);
  assert.match(app, /data-auth-recovery="menu"/);
  assert.match(app, /function handleAuthRecoveryAction/);
  assert.match(app, /function prepareInternalSectionLayout/);
  assert.match(app, /document\.body\.classList\.toggle\("main-menu-active", active\)/);
  assert.match(app, /screens\.forEach\(\(screen\) => screen\.classList\.remove\("active-screen"\)\)/);
  assert.match(app, /appShell\.hidden = active/);
  assert.match(app, /appShell\.hidden = false/);
  assert.match(app, /mainMenuNotificationSlot[\s\S]*notificationDefaultParent/);
  assert.match(app, /notificationCenter\.classList\.toggle\("is-main-menu-docked"/);
  assert.match(app, /showFounderMetrics: role === "founder"/);
  assert.match(app, /menuItemMatchesSearch/);
  assert.match(app, /function renderMainMenuSearchResults/);
  assert.match(app, /function visibleMainMenuSearchItems/);
  assert.match(app, /function menuGroupMarkup/);
  assert.match(app, /data-main-menu-toggle="\$\{escapeHtml\(submenuId\)\}"/);
  assert.doesNotMatch(app, /mainMenuSidebarActions|mainMenuQuickJump|mainMenuSidebarUserName/);
  assert.match(app, /function renderFounderMenuKpis/);
  assert.match(app, /Store Health medio/);
  assert.match(app, /mainMenuFounderKpis\.hidden = !isFounder\(\)/);
  assert.match(app, /Nessun dato operativo disponibile oggi/);
  assert.match(app, /data-brand-submenu-toggle="\$\{escapeHtml\(`brandMenu-\$\{group\.id\}`\)\}"/);
  assert.match(app, /return \["founder", "supervisore", "responsabile"\]\.includes\(normalizeRole\(state\.currentUser\?\.ruolo\)\)/);
  assert.match(app, /Dashboard Founder è riservata al Founder/);
  assert.match(server, /app\.get\("\/api\/dashboard"[\s\S]*normalizeRole\(request\.user\?\.ruolo\) !== "founder"[\s\S]*Non autorizzato/);
  assert.match(styles, /\.main-menu-control-shell/);
  assert.match(styles, /\.main-menu-control-shell \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)[\s\S]*width: min\(100%, 1320px\)/);
  assert.match(styles, /\.main-menu-quick-actions \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.notification-center\.is-main-menu-docked \{[\s\S]*position: relative/);
  assert.match(styles, /\.notification-center\.is-main-menu-docked \{[\s\S]*width: 44px[\s\S]*height: 44px/);
  assert.match(index, /class="main-menu-notification-row"[\s\S]*class="main-menu-notification-pill"[\s\S]*id="mainMenuNotificationSlot"/);
  assert.match(styles, /\.main-menu-notification-slot \{/);
  assert.match(styles, /\.main-menu-notification-row \{[\s\S]*justify-content: flex-end/);
  assert.match(styles, /\.main-menu-notification-pill \{[\s\S]*border-radius: 999px/);
  assert.match(styles, /\.main-menu-topbar \{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) max-content/);
  assert.match(styles, /\.main-menu-top-actions \{[\s\S]*display: flex[\s\S]*justify-content: end/);
  assert.match(styles, /\.main-user-button \{[\s\S]*max-width: 170px[\s\S]*text-overflow: ellipsis/);
  assert.match(styles, /\.main-menu-search-results/);
  assert.match(styles, /\.main-menu-hero/);
  assert.match(styles, /\.main-menu-founder-kpis/);
  assert.match(styles, /\.main-menu-screen \{[\s\S]*isolation: isolate[\s\S]*overflow-y: auto[\s\S]*linear-gradient\(180deg, #080808 0%, #050505 100%\)/);
  assert.match(styles, /body\.main-menu-active \{[\s\S]*background: #17130d[\s\S]*min-height: 100vh/);
  assert.match(styles, /body\.main-menu-active \.main-menu-screen \{[\s\S]*display: block !important[\s\S]*visibility: visible !important[\s\S]*opacity: 1 !important/);
  assert.match(styles, /body\.main-menu-active \.login-screen,[\s\S]*body\.main-menu-active \.splash-screen \{[\s\S]*display: none !important/);
  assert.match(styles, /body\.main-menu-active \.app-shell \{[\s\S]*display: none !important[\s\S]*pointer-events: none !important/);
  assert.match(styles, /\.app-shell\[hidden\],[\s\S]*body\.main-menu-active \.app-shell/);
  assert.match(styles, /\.main-menu-inner \{[\s\S]*grid-template-rows: auto[\s\S]*overflow: visible/);
  assert.match(styles, /\.main-menu-submenu \{[\s\S]*position: relative[\s\S]*scroll-margin-bottom: 150px/);
  assert.match(styles, /\.main-menu-founder-kpis \{[\s\S]*position: relative[\s\S]*z-index: 1/);
  assert.match(styles, /\.main-menu-screen:not\(\[hidden\]\) ~ \.aurum-mascot-root \{[\s\S]*opacity: 1/);
  assert.match(styles, /\.aurum-mascot-root \{[\s\S]*z-index: 1200[\s\S]*pointer-events: auto/);
  assert.match(styles, /\.notification-center \{[\s\S]*z-index: 1100[\s\S]*max-width: min\(390px, calc\(100vw - 24px\)\)[\s\S]*pointer-events: auto/);
  assert.match(app, /submenu\.scrollIntoView\(\{ block: "nearest", behavior: "smooth" \}\)/);
  assert.match(styles, /@keyframes control-center-orbit/);
  assert.match(styles, /\.main-menu-quick-actions/);
  assert.match(styles, /\.main-menu-search/);
  assert.match(styles, /\.main-menu-empty/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("Founder Daily Report ha backend UI PDF audit e conteggi sicuri", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_founder_daily_report.sql"),
    file("styles.css")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS founder_daily_reports/);
  assert.match(schema, /UNIQUE\(report_date\)/);
  assert.match(schema, /quality_data JSONB/);
  assert.match(migration, /idx_founder_daily_reports_date/);
  assert.match(migration, /idx_founder_daily_reports_status/);
  assert.match(server, /async function generateFounderDailyReport/);
  assert.match(server, /function writeFounderDailyReportPdf/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /suspendedStatusWhere\("a"\)/);
  assert.match(server, /app\.get\("\/api\/founder-daily-report", requireFounder/);
  assert.match(server, /app\.get\("\/api\/founder-daily-report\/:date", requireFounder/);
  assert.match(server, /app\.post\("\/api\/founder-daily-report\/generate", requireFounder/);
  assert.match(server, /app\.get\("\/api\/founder-daily-report\/:date\/pdf", requireFounder/);
  assert.match(server, /app\.post\("\/api\/founder-daily-report\/:date\/send", requireFounder/);
  assert.match(server, /founder_daily_report_generated/);
  assert.match(server, /founder_daily_report_downloaded/);
  assert.match(server, /Founder Daily Report generato/);
  assert.match(server, /Invio email non configurato/);
  assert.match(server, /actionUrl: "#founderDailyReport"/);
  assert.match(server, /Controllo pratica non completato|Founder Daily Report non completato/);
  assert.match(index, /id="founderDailyReport" class="screen founder-only"/);
  assert.match(app, /label: "Founder Daily Report"[\s\S]*section: "founderDailyReport"/);
  assert.match(index, /id="generateFounderReport"/);
  assert.match(index, /id="downloadFounderReportPdf"/);
  assert.match(index, /id="sendFounderReport"/);
  assert.match(app, /founderReports: \[\]/);
  assert.match(app, /founderReport: null/);
  assert.match(app, /Founder Daily Report è riservato al Founder/);
  assert.match(app, /async function loadFounderDailyReport/);
  assert.match(app, /async function generateFounderDailyReport/);
  assert.match(app, /async function downloadFounderDailyReportPdf/);
  assert.match(app, /async function sendFounderDailyReport/);
  assert.match(app, /apiRequest\("\/founder-daily-report\/generate"/);
  assert.match(app, /founder-daily-report\/\$\{encodeURIComponent\(date\)\}\/pdf/);
  assert.match(app, /Founder Daily Report generato\./);
  assert.match(styles, /founder-report-actions/);
  assert.match(styles, /founder-report-history-item/);
});

test("Store Health Score ha schema API UI dashboard e report Founder", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_store_health_score.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS store_health_scores/);
  assert.match(schema, /store_id BIGINT NOT NULL/);
  assert.match(schema, /store_health_scores_store_date_unique/);
  assert.match(schema, /store_health_data JSONB/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS store_health_scores/);
  assert.match(migration, /idx_store_health_scores_store_id/);
  assert.match(migration, /store_health_scores_store_date_unique/);
  assert.match(migration, /ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS store_health_data/);

  assert.match(server, /function canViewStoreHealth/);
  assert.match(server, /async function calculateStoreHealthScore/);
  assert.match(server, /function generateStoreHealthRecommendations/);
  assert.match(server, /async function storeHealthNetworkSummary/);
  assert.match(server, /app\.get\("\/api\/store-health"/);
  assert.match(server, /app\.post\("\/api\/store-health\/calculate"/);
  assert.match(server, /app\.get\("\/api\/store-health\/:storeId\/history"/);
  assert.match(server, /app\.get\("\/api\/store-health\/:storeId"/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /suspendedStatusWhere\("a"\)/);
  assert.match(server, /store_health_score_calculated/);
  assert.match(server, /store_health_data/);
  assert.match(server, /Salute Negozio non caricata/);

  assert.match(index, /id="storeHealth" class="screen control-only"/);
  assert.match(app, /label: "Salute Negozio \/ Performance negozi"[\s\S]*section: "storeHealth"/);
  assert.match(index, /id="storeHealthFilters"/);
  assert.match(index, /id="storeHealthSummary"/);
  assert.match(index, /id="storeHealthList"/);
  assert.match(app, /storeHealth: \[\]/);
  assert.match(app, /storeHealthDateRange: null/);
  assert.match(app, /function renderStoreHealth/);
  assert.match(app, /async function loadStoreHealth/);
  assert.match(app, /async function recalculateStoreHealth/);
  assert.match(app, /async function openStoreHealthDetail/);
  assert.match(app, /data-open-store-health/);
  assert.match(app, /Salute negozi/);
  assert.match(app, /store_health_data/);
  assert.match(app, /Store Health Score ricalcolato/);
  assert.match(styles, /\.store-health-card/);
  assert.match(styles, /\.store-health-score/);
  assert.match(styles, /\.store-health-detail/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("Customer Trust Pack genera PDF protetto solo per atti completati", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_customer_trust_pack.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS customer_trust_packs/);
  assert.match(schema, /sale_deed_id BIGINT NOT NULL/);
  assert.match(schema, /trust_pack_code TEXT UNIQUE NOT NULL/);
  assert.match(schema, /idx_customer_trust_packs_sale_deed_id/);
  assert.match(migration, /customer_trust_packs_code_unique/);
  assert.match(migration, /idx_customer_trust_packs_generated_at/);

  assert.match(server, /async function assertCustomerTrustPackEligible/);
  assert.match(server, /async function generateCustomerTrustPack/);
  assert.match(server, /async function writeCustomerTrustPackPdf/);
  assert.match(server, /drawPdfHeader\(doc,[\s\S]*Customer Trust Pack OroActive[\s\S]*centerLogo: true/);
  assert.match(server, /Il Customer Trust Pack può essere generato solo per pratiche completate o archiviate/);
  assert.match(server, /customer_trust_pack_generated/);
  assert.match(server, /customer_trust_pack_downloaded/);
  assert.match(server, /customer_trust_pack_sent_whatsapp/);
  assert.match(server, /customer_trust_pack_regenerated/);
  assert.match(server, /Content-Disposition/);
  assert.match(server, /private_uploads", "customer-trust-packs"/);
  const pdfStart = server.indexOf("async function writeCustomerTrustPackPdf");
  const pdfEnd = server.indexOf("async function generateCustomerTrustPack", pdfStart);
  const pdfBlock = server.slice(pdfStart, pdfEnd);
  assert.doesNotMatch(pdfBlock, /risk_score|aurum_shield|audit|margine|utile|autorizzazione/i);

  assert.match(app, /function canUseCustomerTrustPack/);
  assert.match(app, /function customerTrustPackButtonsMarkup/);
  assert.match(app, /async function generateCustomerTrustPackForAct/);
  assert.match(app, /async function downloadCustomerTrustPack/);
  assert.match(app, /data-open-trust-pack/);
  assert.match(app, /data-generate-trust-pack/);
  assert.match(app, /data-download-trust-pack/);
  assert.match(app, /data-email-trust-pack/);
  assert.match(app, /data-whatsapp-trust-pack/);
  assert.match(app, /detail\.trust_packs/);
  assert.match(app, /customer_trust_pack: \{/);
  assert.match(app, /Customer Trust Pack può essere generato solo per pratiche completate o archiviate/);
  assert.match(styles, /\.trust-pack-panel/);
  assert.match(styles, /\.crm-trust-pack-list/);
  assert.match(index, /app\.js\?v=20260707-resilient-auth-boot-1/);
  assert.match(index, /styles\.css\?v=20260707-resilient-auth-boot-1/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("Centro Privacy OroActive espone policy, presa visione e riferimenti cliente", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260529_privacy_center.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS privacy_policy_versions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS privacy_policy_acceptances/);
  assert.match(schema, /idx_privacy_policy_versions_version/);
  assert.match(schema, /idx_privacy_policy_acceptances_user_id/);
  assert.match(schema, /idx_privacy_policy_acceptances_user_version/);
  assert.match(migration, /privacy_policy_versions/);
  assert.match(migration, /privacy_policy_acceptances/);

  assert.match(server, /const privacyPolicyVersion = "v1\.0"/);
  assert.match(server, /async function bootstrapPrivacyPolicy/);
  assert.match(server, /function writePrivacyPolicyPdf/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/current"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/versions"/);
  assert.match(server, /app\.post\("\/api\/privacy-policy\/accept"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/my-acceptance"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/current\/pdf"/);
  assert.match(server, /app\.post\("\/api\/privacy-policy\/customer-notice\/viewed"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/acceptances", requireFounder/);
  assert.match(server, /privacy_policy_viewed/);
  assert.match(server, /privacy_policy_accepted/);
  assert.match(server, /customer_privacy_notice_viewed/);

  assert.match(app, /PRIVACY_POLICY_FALLBACK/);
  assert.match(app, /label: "Centro Privacy"[\s\S]*section: "privacyCenter"/);
  assert.match(app, /async function loadPrivacyPolicyState/);
  assert.match(app, /async function acceptPrivacyPolicy/);
  assert.match(app, /async function downloadPrivacyPolicyPdf/);
  assert.match(app, /async function maybeShowPrivacyPolicyNotice/);
  assert.match(app, /data-user-privacy/);
  assert.match(app, /data-login-privacy/);
  assert.match(app, /data-open-customer-privacy/);
  assert.match(app, /customerPrivacyAcknowledged/);

  assert.match(index, /id="privacyCenter"/);
  assert.match(index, /Centro Privacy OroActive/);
  assert.match(index, /data-user-privacy/);
  assert.match(index, /data-login-privacy/);
  assert.match(index, /Informativa privacy cliente/);
  assert.match(index, /id="customerPrivacyAcknowledged"/);

  assert.match(styles, /\.privacy-center-layout/);
  assert.match(styles, /\.privacy-accordion/);
  assert.match(styles, /\.customer-privacy-box/);
  assert.match(index, /app\.js\?v=20260707-resilient-auth-boot-1/);
  assert.match(index, /styles\.css\?v=20260707-resilient-auth-boot-1/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("Training Operatore simula atti demo senza effetti operativi reali", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_operator_training_mode.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS training_scenarios/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS training_sessions/);
  assert.match(schema, /user_id BIGINT NOT NULL/);
  assert.match(schema, /idx_training_sessions_user_id/);
  assert.match(schema, /idx_training_sessions_started_at/);
  assert.match(migration, /cliente_standard/);
  assert.match(migration, /documento_scaduto/);
  assert.match(migration, /contabile_mancante/);
  assert.match(migration, /limite_contanti/);
  assert.match(migration, /alto_rischio/);
  assert.match(migration, /firme_mancanti/);
  assert.match(migration, /preziosi_incompleti/);
  assert.match(migration, /training_completo/);

  assert.match(server, /operatorTrainingScenarioBlueprints/);
  assert.match(server, /async function startOperatorTrainingSession/);
  assert.match(server, /function evaluateTrainingSession/);
  assert.match(server, /async function completeOperatorTrainingSession/);
  assert.match(server, /app\.get\("\/api\/training\/scenarios"/);
  assert.match(server, /app\.post\("\/api\/training\/start"/);
  assert.match(server, /app\.get\("\/api\/training\/session\/:id"/);
  assert.match(server, /app\.post\("\/api\/training\/session\/:id\/save-progress"/);
  assert.match(server, /app\.post\("\/api\/training\/session\/:id\/complete"/);
  assert.match(server, /app\.get\("\/api\/training\/my-results"/);
  assert.match(server, /app\.get\("\/api\/training\/team-results"/);
  assert.match(server, /app\.get\("\/api\/training\/results\/:id"/);
  assert.match(server, /training_started/);
  assert.match(server, /training_completed/);
  assert.match(server, /training_passed/);
  assert.match(server, /training_failed/);
  assert.match(server, /academy_practical_training: true/);
  assert.match(server, /no_real_sale_deed: true/);
  assert.match(server, /no_crm_update: true/);
  assert.match(server, /no_stock_update: true/);
  assert.match(server, /no_real_trust_pack: true/);
  const trainingBackendStart = server.indexOf("async function startOperatorTrainingSession");
  const trainingBackendEnd = server.indexOf("async function crmClients", trainingBackendStart);
  const trainingBackendBlock = server.slice(trainingBackendStart, trainingBackendEnd);
  assert.doesNotMatch(trainingBackendBlock, /INSERT INTO atti_vendita|INSERT INTO clienti|INSERT INTO fusion/i);
  assert.doesNotMatch(trainingBackendBlock, /generateCustomerTrustPack|completeSaleDeed|updateStock/i);

  assert.match(index, /data-course-tab="operatorTraining">Training Operatore/);
  assert.doesNotMatch(app, /\{ id: "operator-training"/);
  assert.match(app, /label: "OroActive Academy"[\s\S]*training operatore/);
  assert.match(app, /operatorTrainingResults: \[\]/);
  assert.match(app, /function renderOperatorTraining/);
  assert.match(app, /function currentTrainingFormData/);
  assert.match(app, /async function startOperatorTraining/);
  assert.match(app, /async function saveOperatorTrainingProgress/);
  assert.match(app, /async function completeOperatorTraining/);
  assert.match(app, /async function openOperatorTrainingResult/);
  assert.match(app, /apiRequest\("\/training\/start"/);
  assert.match(app, /apiRequest\("\/training\/scenarios"/);
  assert.match(app, /apiRequest\("\/training\/my-results"/);
  assert.match(app, /apiRequest\("\/training\/team-results"/);
  assert.match(app, /data-start-operator-training/);
  assert.match(app, /data-complete-operator-training/);
  assert.match(app, /MODALITÀ TRAINING — dati simulati/);
  assert.match(app, /Questa pratica non crea atti reali, clienti CRM, giacenza, fusioni, PDF cliente o Trust Pack reali/);

  assert.match(styles, /\.operator-training-shell/);
  assert.match(styles, /\.training-mode-badge/);
  assert.match(styles, /\.operator-training-live/);
  assert.match(styles, /\.operator-training-result\.passed/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
});

test("app ripulita da dipendenze e bridge Capacitor", async () => {
  const [pkg, lock, index, app, server] = await Promise.all([
    file("package.json"),
    file("package-lock.json"),
    file("index.html"),
    file("app.js"),
    file("server.js")
  ]);
  const combined = `${pkg}\n${lock}\n${index}\n${app}\n${server}`;

  assert.doesNotMatch(combined, /@capacitor/i);
  assert.doesNotMatch(combined, /capacitor-native/i);
  assert.doesNotMatch(combined, /OroActiveNative/);
  assert.doesNotMatch(combined, /capacitor:\/\/localhost/);
  assert.doesNotMatch(combined, /ios:prepare|ios:sync|ios:open|ios:add/);
});

test("Aurum Blocks arcade formativo è integrato in Formazione senza dati operativi", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260604_aurum_blocks.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.doesNotMatch(app, /label: "Aurum Blocks"[\s\S]*section: "aurumBlocks"/);
  assert.match(app, /label: "Gaming OroActive"[\s\S]*section: "gaming"/);
  assert.match(app, /roles: MENU_ROLES\.all/);
  assert.match(index, /data-gaming-open="aurumBlocks"/);
  assert.match(index, /id="aurumBlocks"/);
  assert.match(index, /Arcade Libero/);
  assert.match(index, /Sfida Giornaliera/);
  assert.match(index, /Training Carature/);
  assert.match(index, /data-aurum-blocks-control="rotate"/);
  assert.match(index, /aurum-blocks-keyboard-hint/);
  assert.match(index, /aurum-blocks-pause-hero/);
  assert.match(index, /id="aurumBlocksLegend"/);
  assert.match(index, /Lingotti in gioco/);
  assert.match(app, /const AURUM_BLOCKS_WIDTH = 10/);
  assert.match(app, /const AURUM_BLOCKS_HEIGHT = 20/);
  assert.match(app, /full: "ORO 24K"/);
  assert.match(app, /full: "AG 925"/);
  assert.match(app, /full: "PT 950"/);
  assert.match(app, /function aurumBlocksMetalCellData/);
  assert.match(app, /function aurumBlocksLineBonus/);
  assert.match(app, /function renderAurumBlocksLegend/);
  assert.match(app, /aurum-ingot-cell/);
  assert.match(app, /aurum-molten-sweep/);
  assert.match(app, /BONUS 24K \+15%/);
  assert.match(app, /aurum-blocks-record-burst/);
  assert.match(app, /function aurumBlocksHardDrop/);
  assert.match(app, /function maybeShowAurumBlocksQuestion/);
  assert.match(app, /function updateAurumBlocksUiState/);
  assert.match(app, /function triggerGoldLineClearEffect/);
  assert.match(app, /AURUM_BLOCKS_LINE_EFFECTS/);
  assert.match(app, /pendingLineEffect/);
  assert.match(app, /aurumBlocksBestScore/);
  assert.match(app, /Nuovo record personale/);
  assert.match(app, /is-current-user/);
  assert.match(app, /aurum-blocks-playing/);
  assert.match(app, /requestAnimationFrame\(aurumBlocksTick\)/);
  assert.match(app, /apiRequest\("\/aurum-blocks\/session\/start"/);
  assert.match(app, /apiRequest\(`\/aurum-blocks\/session\/\$\{encodeURIComponent\(game\.sessionId\)\}\/finish`/);
  assert.match(server, /app\.get\("\/api\/aurum-blocks\/config"/);
  assert.match(server, /app\.get\("\/api\/aurum-blocks\/questions"/);
  assert.match(server, /app\.post\("\/api\/aurum-blocks\/session\/start"/);
  assert.match(server, /app\.post\("\/api\/aurum-blocks\/session\/:id\/finish"/);
  assert.match(server, /app\.get\("\/api\/aurum-blocks\/my-scores"/);
  assert.match(server, /app\.get\("\/api\/aurum-blocks\/leaderboard"/);
  assert.match(server, /app\.get\("\/api\/aurum-blocks\/my-badges"/);
  assert.match(server, /INSERT INTO aurum_blocks_scores/);
  assert.match(server, /is_new_personal_record/);
  assert.match(server, /best_score/);
  assert.match(server, /PARTITION BY s\.user_id/);
  assert.match(server, /user_score_rank = 1/);
  assert.match(server, /aurum_blocks_started/);
  assert.match(server, /aurum_blocks_finished/);
  assert.match(server, /aurum_blocks_badge_awarded/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_blocks_sessions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_blocks_scores/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_blocks_training_questions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_blocks_badges/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_blocks_user_badges/);
  assert.match(migration, /idx_aurum_blocks_scores_user_id/);
  assert.match(migration, /primo_lingotto/);
  assert.match(migration, /aurum_arcade_pro/);
  assert.match(styles, /\.aurum-blocks-board/);
  assert.match(styles, /\.aurum-blocks-touch-controls/);
  assert.match(styles, /grid-template-areas:[\s\S]*"board hud"/);
  assert.match(styles, /body\.aurum-blocks-playing \.aurum-mascot-root/);
  assert.match(styles, /\.aurum-effects-layer/);
  assert.match(styles, /\.aurum-ingot-cell/);
  assert.match(styles, /\.aurum-ingot-label/);
  assert.match(styles, /\.aurum-ingot-landed/);
  assert.match(styles, /\.aurum-molten-sweep/);
  assert.match(styles, /\.aurum-gold-particle/);
  assert.match(styles, /\.aurum-gold-star/);
  assert.match(styles, /\.aurum-gold-fragment/);
  assert.match(styles, /\.aurum-blocks-metal-legend/);
  assert.match(styles, /\.aurum-metal-swatch/);
  assert.match(styles, /\.aurum-bonus-banner\.aurum-bonus-24k/);
  assert.match(styles, /\.aurum-blocks-record-burst/);
  assert.match(styles, /\.aurum-blocks-record-banner/);
  assert.match(styles, /\.aurum-blocks-list article\.is-current-user/);
  assert.match(styles, /@keyframes aurumMoltenSweep/);
  assert.match(styles, /@keyframes aurumMetalLand/);
  assert.match(styles, /@keyframes aurumRecordBurst/);
  assert.match(styles, /@keyframes aurumParticleRise/);
  assert.match(styles, /@keyframes aurumLineGoldClear/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.metal-oro24/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
  assert.doesNotMatch(`${index}\n${app}\n${styles}`, /Tetris/i);
  const leaderboardBlock = server.slice(server.indexOf("async function listAurumBlocksLeaderboard"), server.indexOf("async function listAurumBlocksBadges"));
  assert.doesNotMatch(leaderboardBlock, /s\.user_id\s*=/);
  const startBlock = server.slice(server.indexOf("async function startAurumBlocksSession"), server.indexOf("function courseCode"));
  assert.doesNotMatch(startBlock, /INSERT INTO atti_vendita|INSERT INTO clienti|INSERT INTO fusion/i);
});

test("Gaming OroActive contiene solo Aurum Blocks", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260605_gaming_oroactive.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(index, /id="gaming"/);
  assert.match(index, /Gaming OroActive/);
  assert.match(index, /Area arcade formativa OroActive/);
  assert.match(index, /Aurum Blocks/);
  assert.match(index, /data-gaming-open="aurumBlocks"/);
  assert.match(app, /label: "Gaming OroActive"[\s\S]*section: "gaming"/);
  assert.doesNotMatch(app, /label: "Aurum Blocks"[\s\S]*section: "aurumBlocks"/);
  assert.match(app, /async function loadGamingOroActive/);
  assert.match(app, /apiRequest\("\/aurum-blocks\/my-scores"/);
  assert.match(app, /apiRequest\("\/aurum-blocks\/leaderboard"/);
  assert.match(app, /apiRequest\("\/aurum-blocks\/my-badges"/);
  assert.match(server, /app\.get\("\/api\/gaming\/overview"/);
  assert.doesNotMatch(server, /\/api\/gaming\/gold-run/);
  assert.doesNotMatch(server, /INSERT INTO gaming_gold_run_scores/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_sections/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_user_progress/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_aurum_blocks_scores/);
  assert.doesNotMatch(schema, /CREATE TABLE IF NOT EXISTS gaming_gold_run_scores/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_daily_challenges/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_rewards/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_badges/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS gaming_achievements/);
  assert.match(migration, /'aurum_blocks', 'Aurum Blocks'/);
  assert.match(styles, /\.gaming-game-card/);
  assert.match(styles, /\.gaming-overview-grid/);
  assert.match(worker, /20260707-resilient-auth-boot-1/);
  assert.doesNotMatch(
    `${index}\n${app}\n${server}\n${schema}\n${migration}\n${styles}`,
    /La corsa all['’]oro|corsa all['’]oro|gold-run|goldRun|GOLD_RUN|gaming_gold_run_scores|gaming\/gold-run|Runner OroActive|Christian Runner|Founder Runner|Michele il Re|Mirko il Dio|Falsario Supremo|Super Mario|Nintendo/i
  );
});

test("deploy Coolify e aggiornamento PWA espongono versione e cache sicura", async () => {
  const [workflow, server, app, index, styles, worker, dockerfile, docs] = await Promise.all([
    file(".github/workflows/deploy-coolify.yml"),
    file("server.js"),
    file("app.js"),
    file("index.html"),
    file("styles.css"),
    file("service-worker.js"),
    file("Dockerfile"),
    file("docs/deploy-oroactive-coolify.md")
  ]);

  assert.match(workflow, /COOLIFY_WEBHOOK/);
  assert.match(workflow, /COOLIFY_TOKEN/);
  assert.match(workflow, /OROACTIVE_HEALTH_URL/);
  assert.match(workflow, /OROACTIVE_EXPECTED_BRANCH/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /curl --fail[\s\S]*COOLIFY_WEBHOOK/);
  assert.doesNotMatch(workflow, /Verify deployed health|health\.json|Health check|seq 1 36|Waiting for deployed app health|version\?\.commit|jq -e|python3|grep -q/);
  assert.doesNotMatch(workflow, /deployment\/|coolify\.|https:\/\/app\.oroactive\.it/);

  assert.match(dockerfile, /ARG GIT_COMMIT/);
  assert.match(dockerfile, /ARG SOURCE_COMMIT/);
  assert.match(dockerfile, /ARG SOURCE_BRANCH/);
  assert.match(dockerfile, /postgresql-client git/);
  assert.match(dockerfile, /OROACTIVE_GIT_COMMIT/);
  assert.match(dockerfile, /OROACTIVE_BUILD_TIME/);
  assert.match(dockerfile, /OROACTIVE_BUILD_NUMBER/);
  assert.match(dockerfile, /fs\.writeFileSync\("version\.json"/);
  assert.match(dockerfile, /rev-list --count HEAD/);
  assert.match(dockerfile, /buildNumber/);
  assert.match(dockerfile, /shortCommit/);

  assert.match(server, /async function getBuildMetadata/);
  assert.match(server, /function firstUsefulBuildValue/);
  assert.match(server, /async function readGitCommitFromDisk/);
  assert.match(server, /async function readGitValue/);
  assert.match(server, /process\.env\.SOURCE_COMMIT/);
  assert.match(server, /process\.env\.SOURCE_BRANCH/);
  assert.match(server, /rev-list", "--count", "HEAD"/);
  assert.match(server, /buildNumber[\s\S]*git-\$\{commitShort\}/);
  assert.match(server, /app\.get\("\/api\/version"/);
  assert.match(server, /ok: true[\s\S]*app: version\.app[\s\S]*commit: version\.commit[\s\S]*buildNumber: version\.buildNumber/);
  assert.match(server, /app\.get\("\/api\/health"[\s\S]*version/);
  assert.match(server, /setNoStoreHeaders/);
  assert.match(server, /requestPath\.startsWith\("\/api\/"\)/);
  assert.match(server, /public, max-age=31536000, immutable/);

  assert.match(worker, /BUILD_ID/);
  assert.match(worker, /CACHE_NAME/);
  assert.match(worker, /HASHED_ASSET_PATTERN/);
  assert.match(worker, /skipWaiting/);
  assert.match(worker, /clients\.claim/);
  assert.match(worker, /cache: "no-store"/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /NEVER_CACHE_PATHS[\s\S]*"\/index\.html"/);
  assert.doesNotMatch(worker, /STATIC_ASSETS|cache\.addAll/);

  assert.match(app, /async function checkForAppUpdate/);
  assert.match(app, /const APP_VERSION_CHECK_INTERVAL_MS = 30000/);
  assert.match(app, /function normalizeAppVersion/);
  assert.match(app, /fetchAppVersion/);
  assert.match(app, /\/version/);
  assert.match(app, /showAppUpdateBanner/);
  assert.match(app, /Nuova versione OroActive disponibile/);
  assert.match(app, /Aggiornamento disponibile\. Salva la pratica prima di aggiornare\./);
  assert.match(app, /autoReload/);
  assert.match(app, /handleAppUpdateNow/);
  assert.match(app, /performAppUpdateReload/);
  assert.match(app, /isCriticalUnsavedWorkflow/);
  assert.match(app, /data-user-check-update/);
  assert.match(app, /function removeFooterBuildMetadata/);
  assert.match(app, /removeFooterBuildMetadata\(\)/);
  assert.match(app, /#git-\|·\\s\*main/);
  assert.doesNotMatch(app, /founderFooterBuilds/);
  assert.match(index, /id="appVersionPanel"/);
  assert.match(index, /data-user-check-update/);
  assert.match(index, /id="appUpdateBanner"/);
  assert.match(index, /Aggiorna ora/);
  assert.doesNotMatch(index, /data-founder-footer-build|app-footer-build/);
  assert.match(styles, /\.app-update-banner/);
  assert.match(styles, /\.app-version-panel/);
  assert.doesNotMatch(styles, /\.app-footer-build/);
  assert.match(docs, /Deploy OroActive su Coolify/);
  assert.match(docs, /Include Source Commit in Build/);
  assert.match(docs, /Healthcheck configurato in Coolify/);
  assert.doesNotMatch(docs, /OROACTIVE_HEALTH_URL|commit esposto da \/api\/health.*unknown|Attende che \/api\/health/);
  assert.doesNotMatch(docs, /Bearer\s+[A-Za-z0-9]/);
});
