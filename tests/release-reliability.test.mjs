import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
function fn(source, name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.notEqual(start, -1, name);
  const rest = source.slice(start);
  const next = rest.slice(1).search(/^(?:async )?function \w+\(/m);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function context(source, names, values) {
  const ctx = vm.createContext(values);
  vm.runInContext(names.map((name) => fn(source, name)).join("\n"), ctx);
  return ctx;
}
const element = () => ({ hidden: true, style: {}, classList: { add() {}, remove() {}, toggle() {} }, removeAttribute() {} });

test("capability requirement seed serializes concurrent startups and keeps existing policies", async () => {
  const queries = [];
  let transactions = 0;
  const db = { query: async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes("FROM academy_operational_capabilities")) return { rows: [{ id: 11 }] };
    if (sql.includes("FROM academy_competencies")) return { rows: values[0] === "KNOWN" ? [{ id: 22 }] : [] };
    return { rows: [], rowCount: 0 };
  } };
  const ctx = context(server, ["seedAcademyCapabilityRequirements"], {
    ACADEMY_CAPABILITY_REQUIREMENT_DEFINITIONS: { SALE: { competencies: ["KNOWN", "MISSING"], practicalRequired: true, managerApprovalRequired: false } },
    withDatabaseTransaction: async (work) => { transactions += 1; return work(db); },
  });
  await ctx.seedAcademyCapabilityRequirements();
  assert.equal(transactions, 1);
  assert.match(queries[0].sql, /pg_advisory_xact_lock/);
  const inserts = queries.filter(({ sql }) => sql.includes("INSERT INTO academy_capability_requirements"));
  assert.equal(inserts.length, 1);
  assert.deepEqual(Array.from(inserts[0].values), [11, 22, true, false]);
  assert.equal(queries.some(({ sql }) => /UPDATE|DELETE|TRUNCATE/.test(sql)), false);
});

test("capability requirement seed propagates a storage failure to its transaction", async () => {
  const failure = new Error("storage unavailable");
  const ctx = context(server, ["seedAcademyCapabilityRequirements"], {
    ACADEMY_CAPABILITY_REQUIREMENT_DEFINITIONS: {},
    withDatabaseTransaction: (work) => work({ query: async () => { throw failure; } }),
  });
  await assert.rejects(ctx.seedAcademyCapabilityRequirements(), (error) => error === failure);
});

test("Fusioni preserves melting view through the main menu and screen opening", async () => {
  const screen = element();
  const ctx = context(app, ["resolveSectionRoute", "enterSectionFromMainMenu", "openAppScreen"], {
    console: { info() {}, error() {} }, state: {},
    document: { getElementById: () => screen, body: element() },
    mainMenuScreen: element(), appShell: element(), splashScreen: element(),
    screens: [screen], navItems: [], getComputedStyle: () => ({ display: "block" }),
    syncNotificationPlacement() {}, setAurumSection() {}, updateAurumMascotVisibility() {},
    clearPracticeForFreshStart() {},
  });
  vm.runInContext(app.slice(app.indexOf("const SECTION_ROUTE_ALIASES ="), app.indexOf("const OROACTIVE_SCREEN_TARGETS =")), ctx);
  ctx.setScreen = (requestedSection) => {
    const route = ctx.resolveSectionRoute(requestedSection);
    if (route.fusionView) ctx.state.fusionView = route.fusionView;
    ctx.openAppScreen(route.screen, { requestedSection });
  };
  for (const [route, view] of [["fusioni", "melting"], ["giacenza", "stock"], ["melting", "melting"], ["fusion", "stock"]]) {
    await ctx.enterSectionFromMainMenu(route);
    assert.equal(ctx.state.fusionView, view, route);
    assert.equal(screen.hidden, false);
  }
});

test("Aurum captures the pressed button so pointer clicks retain their target", () => {
  const captures = [];
  const root = { ...element(), getBoundingClientRect: () => ({ left: 10, top: 20 }), setPointerCapture: () => captures.push("root") };
  const button = { setPointerCapture: () => captures.push("button") };
  const ctx = context(app, ["handleAurumPointerDown"], {
    state: {}, aurumMascotRoot: root, aurumChatPanel: null,
    shouldShowAurumMascot: () => true, isAurumResponsiveDock: () => false,
  });
  ctx.handleAurumPointerDown({ target: { closest: (selector) => selector === "#aurumMascotButton" ? button : null }, button: 0, pointerId: 7, clientX: 12, clientY: 22, preventDefault() {} });
  assert.deepEqual(captures, ["button"]);
  assert.equal(ctx.state.aurumDragState.moved, false);
});

function simulator(apiRequest) {
  const standard = { metal: "gold", purity_code: "18kt", horizon: "today", scenario: "standard", max_payable_per_gram: 74, recommended_payable_per_gram: 71, theoretical_value_per_gram: 89 };
  return context(app, ["findBuybackRow", "renderBuybackSimulation"], {
    state: { goldPredictionAvailable: true, buybackScenario: "standard", buybackCalculations: [standard], sessionGeneration: 1 },
    buybackSimulatorForm: {}, buybackSimulatorOutput: {},
    FormData: class { get(key) { return { metal: "gold", purity_code: "18kt", grams: "10", scenario: "prudente" }[key]; } },
    apiRequest, buybackMarketPrice: () => 70,
    buildPriceExplanationContext: (row, { scenario }) => ({ scenario, maximum: row.max_payable_per_gram }),
    escapeHtml: String, formatEuro: (value) => String(value), formatAurumNumber: String, formatGoldPerGram: String,
  });
}
test("simulator loads the requested scenario instead of substituting standard prices", async () => {
  let requested = "";
  const ctx = simulator(async (url) => {
    requested = url;
    return { calculations: [{ metal: "gold", purity_code: "18kt", horizon: "today", scenario: "prudente", max_payable_per_gram: 68 }] };
  });
  const result = await ctx.renderBuybackSimulation();
  assert.match(requested, /scenario=prudente/);
  assert.equal(result.scenario, "prudente");
  assert.equal(result.displayed_values.max_payable_total, 680);
  assert.equal(ctx.state.buybackScenario, "standard");
});
test("unavailable scenario never produces a standard scenario estimate", async () => {
  const ctx = simulator(async () => { throw new Error("offline"); });
  assert.equal(await ctx.renderBuybackSimulation(), null);
  assert.equal(ctx.state.buybackSimulationContext, null);
  assert.match(ctx.buybackSimulatorOutput.textContent, /non disponibile/i);
});
test("Store Health leaves an explicit error instead of an endless loading message", async () => {
  const ctx = context(app, ["loadStoreHealth"], {
    state: { storeHealth: [{ score: 100 }] }, storeHealthList: {},
    canViewControlSectionsUi: () => true, updateStoreHealthDateInputs() {}, storeHealthPeriodParams: () => ({}), queryString: () => "",
    apiRequest: async () => { throw new Error("database unavailable"); }, renderStoreHealth() {},
  });
  await assert.rejects(ctx.loadStoreHealth(), /database unavailable/);
  assert.match(ctx.storeHealthList.innerHTML, /non disponibile/i);
  assert.equal(ctx.state.storeHealth.length, 0);
});
test("Postgres sanitization removes unsupported Unicode while preserving valid text and arrays", () => {
  const ctx = context(server, ["sanitizeForPostgres"], {});
  const result = ctx.sanitizeForPostgres({ "pa\0ge": ["€/g 🪙", "x\0y", "a\uD800b"], nothing: undefined });
  assert.equal(result.page[0], "€/g 🪙");
  assert.equal(result.page[1], "xy");
  assert.equal(result.page[2], "a\uFFFDb");
  assert.equal(result.nothing, null);
  assert.equal(Array.isArray(result.page), true);
});

test("backup rejects an older dump client before any database export", async () => {
  const ctx = context(server, ["postgresToolMajorVersion", "assertPostgresBackupTools"], {
    pool: { query: async () => ({ rows: [{ server_version_num: "180004" }] }) },
    pgDumpPath: "pg_dump", pgRestorePath: "pg_restore",
    execFileAsync: async () => ({ stdout: "pg_dump (PostgreSQL) 16.15" }),
  });
  await assert.rejects(ctx.assertPostgresBackupTools({}), { code: "BACKUP_TOOL_VERSION_MISMATCH" });
  ctx.execFileAsync = async (tool) => ({ stdout: `${tool} (PostgreSQL) 18.4` });
  assert.equal((await ctx.assertPostgresBackupTools({})).pg_dump_major, 18);
  ctx.execFileAsync = async (tool) => ({ stdout: `${tool} (PostgreSQL) ${tool === "pg_restore" ? "16.15" : "18.4"}` });
  await assert.rejects(ctx.assertPostgresBackupTools({}), { code: "BACKUP_TOOL_VERSION_MISMATCH" });
});

test("bundle privacy update preserves old content, acceptances and custom active policies", async () => {
  for (const active of [[{ version: "v1.1" }], [{ version: "custom-v3" }], []]) {
    const queries = [];
    let released = false;
    const client = {
      async query(sql, values) {
        queries.push({ sql, values });
        return { rows: sql.startsWith("SELECT version") ? active : [] };
      }, release() { released = true; },
    };
    const ctx = context(server, ["bootstrapPrivacyPolicy", "sanitizeForPostgres"], {
      pool: { connect: async () => client }, privacyPolicyVersion: "v1.2", defaultPrivacyPolicyContent: { title: "Policy", controller: { company_name: "OroActive" } },
    });
    await ctx.bootstrapPrivacyPolicy();
    const insert = queries.find(({ sql }) => sql.includes("INSERT INTO privacy_policy_versions"));
    assert.match(insert.sql, /ON CONFLICT \(version\) DO NOTHING/);
    assert.equal(insert.values[0], "v1.2");
    assert.equal(queries.some(({ sql }) => sql.includes("UPDATE privacy_policy_versions")), active[0]?.version !== "custom-v3");
    assert.equal(queries.some(({ sql }) => /DELETE|acceptances|SET content/.test(sql)), false);
    assert.equal(queries.at(-1).sql, "COMMIT");
    assert.equal(released, true);
  }
});

test("course quiz seeding serializes JSON options and never deletes existing questions", async () => {
  const queries = [];
  const ctx = context(server, ["seedBundledCourseQuizzes", "sanitizeForPostgres"], {
    withDatabaseTransaction: (work) => work({ query: async (sql, values) => { queries.push({ sql, values }); return { rows: [] }; } }),
  });
  await ctx.seedBundledCourseQuizzes(42, { quiz: [{ question: "Test?", options: ["A", "B"], correct_answer: "B" }] });
  assert.equal(queries.length, 2);
  assert.match(queries[1].sql, /WHERE NOT EXISTS/);
  assert.equal(queries[1].values[2], '["A","B"]');
  assert.equal(queries.some(({ sql }) => /DELETE|UPDATE|TRUNCATE/.test(sql)), false);
});

test("pending scenario response cannot cross a logout/session boundary", async () => {
  let finish;
  const ctx = simulator(() => new Promise((resolve) => { finish = resolve; }));
  const pending = ctx.renderBuybackSimulation();
  ctx.state.sessionGeneration += 1;
  finish({ calculations: [{ metal: "gold", purity_code: "18kt", horizon: "today", scenario: "prudente", max_payable_per_gram: 68 }] });
  assert.equal(await pending, null);
  assert.equal(ctx.state.buybackCalculations.length, 1);
  assert.equal(ctx.state.buybackSimulationContext, null);
});

test("session form reset restores declared defaults rather than choosing the first scenario", () => {
  const select = { options: [{ defaultSelected: false }, { defaultSelected: true }, { defaultSelected: false }], selectedIndex: 2 };
  const name = { type: "text", defaultValue: "", value: "Previous user's name" };
  const grams = { type: "number", defaultValue: "20", value: "999" };
  const consent = { type: "checkbox", defaultChecked: false, checked: true };
  const ctx = context(app, ["resetAuthenticatedFormFields"], {});
  ctx.resetAuthenticatedFormFields({ querySelectorAll: (selector) => selector === "select" ? [select] : [name, grams, consent] });
  assert.equal(select.selectedIndex, 1);
  assert.equal(name.value, "");
  assert.equal(grams.value, "20");
  assert.equal(consent.checked, false);
});

test("Store Health binds JSON documents, including empty arrays, at the database boundary", async () => {
  let saved;
  const ctx = context(server, ["calculateStoreHealthScore", "sanitizeForPostgres", "storeHealthStoreCondition", "scorePenalty", "scoreBonus"], {
    actsTable: "atti_vendita", state: {},
    pool: { query: async (sql, values) => {
      if (sql.includes("INSERT INTO store_health_scores")) { saved = values; return { rows: [{ score: values[1] }] }; }
      return { rows: [] };
    } },
    storeHealthDateRange: () => ({ date_from: "2026-10-19", date_to: "2026-10-19" }),
    realCompletedStatusSql: () => "TRUE", suspendedStatusWhere: () => "TRUE",
    founderReportMaterials: () => ({ totals: { Oro: 0, Argento: 0, Platino: 0 } }),
    founderReportPayments: () => ({ missing_receipts: 0 }), activityCountByAction: () => ({}),
    storeHealthStatus: () => ({ status: "stabile" }), generateStoreHealthRecommendations: () => ["Verificare backup"],
    publicStoreHealthScore: (row) => row,
  });
  await ctx.calculateStoreHealthScore(1, {}, { store: { id: 1, nome: "Cassano Magnago" } });
  assert.equal(saved[0], 1);
  assert.equal(JSON.parse(saved[5]).store.name, "Cassano Magnago");
  for (const parameter of saved.slice(6)) assert.equal(Array.isArray(JSON.parse(parameter)), true);
  assert.ok(JSON.parse(saved[7]).length > 0);
  assert.deepEqual(JSON.parse(saved[8]), ["Verificare backup"]);
  ctx.pool.query = async () => { throw new Error("query unavailable"); };
  await assert.rejects(ctx.calculateStoreHealthScore(1, {}, { store: { id: 1, nome: "Cassano Magnago" } }), /query unavailable/);
});

test("advanced exams require an independent evaluator, practical confirmation and a written record", () => {
  const ctx = context(server, ["validateAdvancedCourseExam"], { oroactiveBaseCourseDefinitionFor: () => ({ isAdvancedPathCourse: true }) });
  const record = { note: "Prove previste svolte con esito documentato", practical_completed: true };
  assert.equal(ctx.validateAdvancedCourseExam({}, record, 1, 2), true);
  assert.throws(() => ctx.validateAdvancedCourseExam({}, record, 1, "1"), { status: 403 });
  assert.throws(() => ctx.validateAdvancedCourseExam({}, { note: "ok", practical_completed: true }, 1, 2), { status: 400 });
  assert.throws(() => ctx.validateAdvancedCourseExam({}, { ...record, practical_completed: false }, 1, 2), { status: 400 });
  ctx.oroactiveBaseCourseDefinitionFor = () => ({ isAdvancedPathCourse: false });
  assert.equal(ctx.validateAdvancedCourseExam({}, {}, 1, 1), false);
});

test("advanced course cards open a responsible evaluation and preserve prerequisite locks", () => {
  const ctx = context(app, ["renderCourseCard", "courseFinalExamQuestions", "courseExamPassed", "courseSlidesUrl", "isAdvancedPathCourseUi", "academyCourseCodeUi", "courseExamRetryMessage"], {
    state: { courseActiveTab: "catalog" }, escapeHtml: String, canManageCoursesUi: () => false,
  });
  const course = { id: 42, title: "Avanzato", advanced_path_course: true, prerequisites_satisfied: true, final_exam_questions: [] };
  const card = ctx.renderCourseCard(course);
  assert.match(card, /data-course-manual-exam="42"/);
  assert.match(card, /Esame con responsabile/);
  assert.doesNotMatch(card, /Esame non disponibile|Esame da configurare/);
  assert.doesNotMatch(ctx.renderCourseCard({ ...course, course_locked: true }), /data-course-manual-exam/);
});

test("server and fallback publish the company details supplied for the new privacy version", () => {
  const frontend = app.slice(app.indexOf("const PRIVACY_POLICY_FALLBACK ="), app.indexOf("\n};", app.indexOf("const PRIVACY_POLICY_FALLBACK =")) + 3);
  const backend = server.slice(server.indexOf("const defaultPrivacyPolicyContent ="), server.indexOf("\n};", server.indexOf("const defaultPrivacyPolicyContent =")) + 3);
  const a = vm.runInNewContext(`${frontend}; PRIVACY_POLICY_FALLBACK`);
  const b = vm.runInNewContext(`${backend}; defaultPrivacyPolicyContent`, { privacyPolicyVersion: "v1.2", privacyPolicyUpdatedAt: "2026-10-19" });
  assert.deepEqual(JSON.parse(JSON.stringify(a.controller)), JSON.parse(JSON.stringify(b.controller)));
  for (const policy of [a, b]) {
    assert.equal(policy.version, "v1.2");
    assert.equal(policy.controller.company_name, "OroActive Cassano Magnago Srl");
    assert.equal(policy.controller.legal_address, "viale Generale Armando Diaz, 9, Busto Arsizio");
    assert.equal(policy.controller.vat, "04168610121");
    assert.equal(policy.controller.privacy_email, "privacy@oroactive.it");
    assert.equal(policy.controller.pec, "oroactive.cassanomsrl@pec.it");
    assert.doesNotMatch(JSON.stringify(policy), /\[INSERIRE/);
  }
});

test("version lookup also supports relocated Git metadata and worktree .git files", async () => {
  const requests = [];
  const ctx = context(server, ["readGitCommitFromDisk"], {
    __dirname: "/workspace", path: { join: (...parts) => parts.join("/") },
    fs: { readFile: async () => { throw new Error("ENOTDIR: .git is a file"); } },
    readGitValue: async (args) => { requests.push(args.join(" ")); return "e868ff1d595ef78576b1b6df16716ac0c2fa2204"; },
  });
  assert.equal(await ctx.readGitCommitFromDisk(), "e868ff1d595ef78576b1b6df16716ac0c2fa2204");
  assert.deepEqual(requests, ["rev-parse HEAD"]);
});

test("failed competitor runs advance the displayed deadline without drifting the interval schedule", () => {
  const ctx = context(server, ["nextCompetitorAiRunAt"], {
    competitorAiExtractionState: { autoEnabled: true, timer: {}, nextRunAt: "2026-10-19T12:00:00Z" },
    competitorAiExtractionIntervalMinutes: 60,
  });
  assert.equal(ctx.nextCompetitorAiRunAt(Date.parse("2026-10-19T12:15:00Z")), "2026-10-19T13:00:00.000Z");
  assert.equal(ctx.nextCompetitorAiRunAt(Date.parse("2026-10-19T11:59:00Z")), "2026-10-19T12:00:00.000Z");
  ctx.competitorAiExtractionState.timer = null;
  assert.equal(ctx.nextCompetitorAiRunAt(), null);
});

test("advanced prerequisites recognize a responsible assessment, while the operative course still requires its quiz", async () => {
  let advanced = true;
  let certificate = true;
  let progress = true;
  const ctx = context(server, ["isCourseCompletedForUser", "academyProgressIsCompleted"], {
    academyCourseById: async () => ({ id: 42 }),
    oroactiveBaseCourseDefinitionFor: () => ({ isAdvancedPathCourse: advanced }),
    pool: { query: async (sql, values) => {
      if (sql.includes("FROM course_quiz_results")) {
        return { rows: sql.includes("academy_exam_results") && values[2] === true ? [{ id: 8, completed_at: "2026-10-19" }] : [] };
      }
      if (sql.includes("FROM user_course_progress")) return { rows: progress ? [{ percentuale: 100, status: "completed", completed_at: "2026-10-19" }] : [] };
      if (sql.includes("UNION ALL")) return { rows: certificate ? [{ id: 12, issued_at: "2026-10-19" }] : [] };
      return { rows: [], rowCount: 0 };
    } },
  });
  assert.equal((await ctx.isCourseCompletedForUser(7, 42)).completed, true);
  advanced = false;
  assert.equal((await ctx.isCourseCompletedForUser(7, 42)).completed, false);
  advanced = true;
  certificate = false;
  assert.equal((await ctx.isCourseCompletedForUser(7, 42)).completed, false);
  certificate = true;
  progress = false;
  assert.equal((await ctx.isCourseCompletedForUser(7, 42)).completed, false);
  progress = true;
  advanced = false;
  const originalQuery = ctx.pool.query;
  ctx.pool.query = async (sql, values) => sql.includes("FROM course_quiz_results")
    ? { rows: [{ id: 9, completed_at: "2026-09-08" }] }
    : originalQuery(sql, values);
  assert.equal((await ctx.isCourseCompletedForUser(7, 42)).completed, true);
});

test("restarting the gem catalog seed preserves existing founder material and tool edits", async () => {
  const mutations = [];
  const db = { query: async (sql, values = []) => {
    if (sql.includes("SELECT id FROM utenti")) return { rows: [{ id: 1 }] };
    if (sql.includes("SELECT id, name FROM academy_gem_tools")) return { rows: [{ id: 2, name: "Loupe" }] };
    if (sql.includes("INSERT INTO academy_gem_tools") && sql.includes("DO UPDATE")) mutations.push("tool overwritten");
    if (sql.includes("INSERT INTO academy_gem_materials")) {
      if (sql.includes("DO UPDATE")) { mutations.push("material overwritten"); return { rows: [{ id: 777 }] }; }
      return { rows: [] };
    }
    if (/DELETE FROM|INSERT INTO academy_gem_(?:media|sources|inclusions|analysis|comparisons|material_tools)/.test(sql)) mutations.push("existing child modified");
    return { rows: [] };
  } };
  const ctx = context(server, ["seedAcademyGemologicalLab", "seedAcademyGemologicalLabInTransaction"], {
    pool: db, withDatabaseTransaction: (work) => work(db),
    academyGemSeedValidation: () => [],
    ACADEMY_GEM_TOOLS: [{ name: "Loupe", description: "Bundled description" }],
    ACADEMY_GEM_MATERIAL_COLUMNS: ["slug", "name", "created_by"],
    ACADEMY_GEM_MATERIALS: [{ slug: "existing-gem", name: "Bundled title", common_simulants: [], operator_protocol: { title: "Protocol", steps: [], result_options: [], safety_notes: [] } }],
    academyGemMaterialValue: (material, key) => material[key] || null,
    fs: { readFile: async () => '{"materials":[]}', access: async () => { throw new Error("not present"); } },
    path: { join: (...parts) => parts.join("/") }, __dirname: "/app",
  });
  await ctx.seedAcademyGemologicalLab();
  assert.deepEqual(mutations, []);
});

test("normal application startup does not delete an existing legacy Academy course", async () => {
  const destructive = [];
  const ctx = context(server, ["initDatabase"], {
    assertPersistentUploadStorage: async () => {}, assertPersistentBackupStorage: async () => {},
    fs: { readFile: async () => "" }, path: { join: (...parts) => parts.join("/") }, __dirname: "/app",
    runDatabaseMigration: async () => {}, cleanupLegacyPollingAuditLogs: async () => {},
    setupAiVectorStorage: async () => {}, seedAurumBundledKnowledgeDocuments: async () => {},
    bootstrapStores: async () => {}, bootstrapAdminUser: async () => {}, seedAcademyGemologicalLab: async () => {},
    bootstrapPrivacyPolicy: async () => {}, seedDefaultCompetitorSources: async () => {}, seedDefaultCompetitorExtractionRules: async () => {},
    removeGoldMasterCourseAndFaculty: async () => destructive.push("legacy course removed"),
  });
  await ctx.initDatabase();
  assert.deepEqual(destructive, []);
});

test("bundled course materials only fill an empty seed slot and preserve existing IDs", async () => {
  const queries = [];
  const ctx = context(server, ["seedBundledCourseMaterials"], {
    withDatabaseTransaction: (work) => work({ query: async (sql, values) => { queries.push({ sql, values }); return { rows: [] }; } }),
  });
  await ctx.seedBundledCourseMaterials(42, 7, { title: "Corso" }, "/official.pdf", { seedCode: "ADV" });
  assert.equal(queries.length, 3);
  for (const query of queries.slice(1)) {
    assert.match(query.sql, /WHERE NOT EXISTS/);
    assert.match(query.sql, /sort_order = 1000/);
    assert.equal(/DELETE|UPDATE|TRUNCATE/.test(query.sql), false);
  }
  assert.equal(queries[1].values[0], 42);
  assert.equal(queries[2].values[0], 7);
  assert.equal(queries[2].values[1], 42);
});

test("advanced courses cannot award an automatic quiz result through a legacy client", async () => {
  let queried = false;
  const ctx = context(server, ["evaluateCourseFinalQuiz"], {
    academyCourseById: async () => ({ id: 42, active: true }),
    normalizeRole: () => "operatore",
    oroactiveBaseCourseDefinitionFor: () => ({ isAdvancedPathCourse: true }),
    assertAcademyCoursePrerequisites: async () => {},
    pool: { query: async () => { queried = true; throw new Error("legacy online grading reached"); } },
  });
  await assert.rejects(ctx.evaluateCourseFinalQuiz({ course_id: 42, answers: [] }, { id: 7 }), { code: "RESPONSIBLE_EXAM_REQUIRED", status: 409 });
  assert.equal(queried, false);
});
