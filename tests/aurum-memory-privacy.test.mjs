import assert from "node:assert/strict";
import test from "node:test";

import {
  AURUM_MEMORY_CONSENT_VERSION,
  decryptAurumMemoryValue,
  encryptAurumMemoryValue,
  normalizeAurumMemoryInput,
  redactAurumPrivateMemoryValues,
  selectAurumMemoriesForAi
} from "../services/aurum/memory.js";

test("nome preferito e compleanno vengono normalizzati e minimizzati", () => {
  const name = normalizeAurumMemoryInput({
    memory_type: "preferred_name",
    memory_value: "  Lia  ",
    explicit_consent: true
  });
  assert.equal(name.value, "Lia");
  assert.equal(name.memoryKey, "profile.preferred_name");
  assert.equal(name.sensitivity, "sensitive");

  const birthday = normalizeAurumMemoryInput({
    memory_type: "birthday",
    memory_value: "29/02/1992",
    explicit_consent: true
  });
  assert.equal(birthday.value, "29/02");
  assert.equal(birthday.memoryKey, "profile.birthday");
  assert.equal(birthday.sensitivity, "sensitive");
  assert.equal(birthday.consentVersion, AURUM_MEMORY_CONSENT_VERSION);
});

test("nessun ricordo viene accettato senza consenso granulare", () => {
  assert.throws(
    () => normalizeAurumMemoryInput({
      memory_type: "goal",
      memory_value: "Delegare meglio",
      automatic: true
    }),
    /consenso esplicito/i
  );
});

test("categorie particolari, credenziali e dati cliente non entrano in memoria", () => {
  for (const value of new Set([
    ...globalThis.OroActiveAurumPolicy.forbiddenMemoryCases,
    "La mia diagnosi è depressione",
    "Sono depresso",
    "Soffro di ansia",
    "Ho il diabete",
    "Sono HIV positivo",
    "Ho il cancro",
    "Sono incinta",
    "Ho una disabilità",
    "Ho avuto un infarto",
    "Ho la sclerosi multipla",
    "Sono celiaco",
    "Ho diverse allergie",
    "Sono autistico",
    "Ho l'ADHD",
    "Ho problemi al cuore",
    "Sono sieropositivo",
    "Ho l'epatite",
    "Prendo insulina",
    "Sto facendo chemioterapia",
    "Ho la leucemia",
    "Ho il morbo di Crohn",
    "Ho il lupus",
    "Sono in dialisi",
    "Porto un pacemaker",
    "Sono positivo al Covid",
    "Prendo cortisone",
    "Sono immunodepresso",
    "Ho avuto un trapianto",
    "Ho pensieri suicidi",
    "Mi taglio le vene",
    "Sono dipendente dal gioco",
    "Sono musulmano",
    "Sono gay",
    "Ho precedenti penali",
    "Sono cieco",
    "Sono sordo",
    "Ho una polmonite",
    "Ho una frattura",
    "Ho una protesi",
    "Sono stato condannato",
    "Prendo antidepressivi",
    "La mia salute è fragile",
    "La mia password è Segreta123",
    "Ricorda il codice fiscale RSSMRA80A01H501U",
    "Il cliente è Mario Rossi"
  ])) {
    assert.throws(
      () => normalizeAurumMemoryInput({
        memory_type: "reflection",
        memory_value: value,
        explicit_consent: true
      }),
      /non può essere salvata|non consentit/i,
      value
    );
  }
});

test("al provider arrivano soltanto memorie condivise e pertinenti alla domanda", () => {
  const memories = [
    { id: "name", memory_type: "preferred_name", memory_value: "Lia", share_with_ai: true },
    { id: "birthday", memory_type: "birthday", memory_value: "14/09", share_with_ai: true },
    { id: "goal", memory_type: "goal", memory_value: "Delegare meglio", share_with_ai: true },
    { id: "private", memory_type: "habit", memory_value: "Camminare ogni mattina", share_with_ai: false }
  ];

  assert.deepEqual(
    selectAurumMemoriesForAi(memories, {
      question: "Quanto vale l'oro 18 kt?",
      hasCoachingContext: false
    }),
    []
  );
  assert.deepEqual(
    selectAurumMemoriesForAi(memories, {
      question: "Aiutami a crescere come leader",
      hasCoachingContext: true
    }).map((memory) => memory.id),
    ["name", "goal"]
  );
  assert.deepEqual(
    selectAurumMemoriesForAi(memories, {
      question: "Quando è il mio compleanno?",
      hasCoachingContext: false
    }).map((memory) => memory.id),
    ["birthday"]
  );
});

test("il valore della memoria è cifrato e vincolato all'utente", () => {
  const secret = "segreto-di-test-lungo-e-stabile";
  const value = "Preferisco domande brevi e una alla volta";
  const encrypted = encryptAurumMemoryValue(value, {
    secret,
    userId: 42,
    memoryId: "0c19307d-1a06-4024-bde8-0e0f5a2f9a17",
    memoryType: "communication_preference"
  });
  assert.doesNotMatch(encrypted, /Preferisco|domande brevi/);
  assert.equal(decryptAurumMemoryValue(encrypted, {
    secret,
    userId: 42,
    memoryId: "0c19307d-1a06-4024-bde8-0e0f5a2f9a17",
    memoryType: "communication_preference"
  }), value);
  assert.throws(() => decryptAurumMemoryValue(encrypted, {
    secret,
    userId: 43,
    memoryId: "0c19307d-1a06-4024-bde8-0e0f5a2f9a17",
    memoryType: "communication_preference"
  }));
});

test("i ricordi privati non rientrano nella cronologia destinata al servizio AI", () => {
  const history = "Aurum: Lia, terrò presente il tuo obiettivo: delegare meglio. Da dove vuoi iniziare?";
  const redacted = redactAurumPrivateMemoryValues(history, [
    { memory_value: "Lia", share_with_ai: false },
    { memory_value: "delegare meglio", share_with_ai: false },
    { memory_value: "domande brevi", share_with_ai: true }
  ]);
  assert.doesNotMatch(redacted, /\bLia\b|delegare meglio/i);
  assert.match(redacted, /\[memoria privata omessa\]/);
  assert.equal(
    redactAurumPrivateMemoryValues("Preferisco domande brevi", [
      { memory_value: "domande brevi", share_with_ai: true }
    ]),
    "Preferisco domande brevi"
  );
});
