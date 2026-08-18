function normalizedAcademyRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "admin") return "responsabile";
  if (normalized === "commessa" || normalized === "operatore" || normalized === "utente" || normalized === "user") return "commesso";
  if (["aiuto commesso", "aiuto commessa", "aiuto_commessa"].includes(normalized)) return "aiuto_commesso";
  return normalized;
}

function validDatabaseId(value) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) && normalized !== "0" ? normalized : "";
}

export async function lockAcademyMutationUsers(db, { actorId, targetUserId } = {}) {
  if (!db || typeof db.query !== "function") throw new TypeError("Connessione database Academy non valida");
  const actorKey = validDatabaseId(actorId);
  const targetKey = validDatabaseId(targetUserId);
  if (!actorKey || !targetKey) return { actor: null, target: null };

  const ids = [...new Set([actorKey, targetKey])]
    .sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : BigInt(left) > BigInt(right) ? 1 : 0));
  const result = await db.query(
    `SELECT id, ruolo, negozio_id, attivo
     FROM utenti
     WHERE id = ANY($1::bigint[])
     ORDER BY id
     FOR UPDATE`,
    [ids]
  );
  const usersById = new Map((result.rows || []).map((row) => [String(row.id), row]));
  return {
    actor: usersById.get(actorKey) || null,
    target: usersById.get(targetKey) || null
  };
}

export function academyMutationAccessAllowed(lockedUsers = {}, options = {}) {
  const actor = lockedUsers.actor || null;
  const target = lockedUsers.target || null;
  if (!actor || !target || actor.attivo === false) return false;

  const role = normalizedAcademyRole(actor.ruolo);
  const evaluatorOnly = options.evaluatorOnly === true;
  if (evaluatorOnly && !["founder", "supervisore", "responsabile"].includes(role)) return false;
  if (["founder", "supervisore"].includes(role)) return true;
  if (role === "responsabile") {
    return actor.negozio_id != null
      && target.negozio_id != null
      && String(actor.negozio_id) === String(target.negozio_id);
  }
  return !evaluatorOnly && String(actor.id) === String(target.id);
}
