const VERIFIED_AT = "2026-07-30";

// Obblighi legali e controlli OroActive sono distinti in ogni voce del registro.
const SOURCE_CATALOG = Object.freeze({
  dlgs92: Object.freeze({
    id: "dlgs92",
    title: "D.Lgs. 25 maggio 2017, n. 92 — disciplina dei compro oro",
    authority: "Normattiva / Gazzetta Ufficiale",
    url: "https://www.normattiva.it/eli/id/2017/06/20/17G00109/CONSOLIDATED",
    scope: "Identificazione, scheda progressiva, tracciabilità, fotografie, ricevuta e conservazione.",
    verifiedAt: VERIFIED_AT
  }),
  dlgs231: Object.freeze({
    id: "dlgs231",
    title: "D.Lgs. 21 novembre 2007, n. 231 — antiriciclaggio",
    authority: "Normattiva",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2007-11-21;231!vig=",
    scope: "Dati identificativi, adeguata verifica, valutazione del rischio e conservazione.",
    verifiedAt: VERIFIED_AT
  }),
  gdpr: Object.freeze({
    id: "gdpr",
    title: "Regolamento (UE) 2016/679 — GDPR",
    authority: "EUR-Lex",
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=it",
    scope: "Liceità, trasparenza, minimizzazione, esattezza, sicurezza e responsabilizzazione.",
    verifiedAt: VERIFIED_AT
  }),
  privacyCode: Object.freeze({
    id: "privacyCode",
    title: "D.Lgs. 30 giugno 2003, n. 196 — Codice privacy, testo vigente",
    authority: "Normattiva",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196!vig=",
    scope: "Disciplina nazionale integrativa in materia di protezione dei dati personali.",
    verifiedAt: VERIFIED_AT
  }),
  oroactive: Object.freeze({
    id: "oroactive",
    title: "Contratto dati corrente dell’atto OroActive",
    authority: "OroActive",
    path: "index.html; app.js; server.js",
    scope: "Campi UI, payload API, controlli di completamento e composizione PDF rilevati nel codice.",
    verifiedAt: VERIFIED_AT
  })
});

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function field(definition) {
  const result = {
    id: definition.id,
    label: definition.label,
    category: definition.category,
    payloadPaths: unique(definition.paths),
    uiSelectors: unique(definition.ui),
    aliases: unique([definition.label, definition.id, ...(definition.aliases || [])]),
    purpose: definition.purpose,
    completion: definition.completion,
    requirement: Object.freeze({
      legal: definition.legal || "Non qualificato come obbligo autonomo in questo registry.",
      oroActive: definition.oro || "Facoltativo nel contratto corrente.",
      condition: definition.when || "Sempre applicabile."
    }),
    controls: unique(definition.controls),
    privacy: Object.freeze({
      classification: definition.privacy || "operativo",
      handling: definition.handling || "Trattare secondo ruolo, necessità e conservazione autorizzata."
    }),
    commonErrors: unique(definition.errors),
    nature: unique(definition.nature || ["procedura_oroactive"]),
    sources: unique(definition.sources || ["oroactive"]),
    implemented: definition.implemented !== false,
    ambiguity: definition.ambiguity || ""
  };
  return Object.freeze({
    ...result,
    payloadPaths: Object.freeze(result.payloadPaths),
    uiSelectors: Object.freeze(result.uiSelectors),
    aliases: Object.freeze(result.aliases),
    controls: Object.freeze(result.controls),
    commonErrors: Object.freeze(result.commonErrors),
    nature: Object.freeze(result.nature),
    sources: Object.freeze(result.sources)
  });
}

export const SALE_DEED_FIELD_KNOWLEDGE = Object.freeze([
  field({
    id: "record_id", label: "Identificativo record", category: "metadati",
    paths: ["id", "clienteId", "cliente_id"], aliases: ["id atto", "id pratica"],
    purpose: "Collega in modo univoco atto, cliente, allegati e audit.",
    completion: "È assegnato dal sistema; non va digitato né riutilizzato.",
    oro: "Automatico alla persistenza.", controls: ["Intero/identificativo non modificabile dall’operatore."],
    privacy: "identificativo_indiretto", errors: ["Copiare l’ID di un altro atto."], sources: ["oroactive"]
  }),
  field({
    id: "practice_number", label: "Numero atto", category: "metadati",
    paths: ["practiceNumber", "actYear", "actNumber", "numeroAttoNegozio"], ui: ["#practiceNumber"],
    aliases: ["numero pratica", "atto di vendita n", "progressivo"],
    purpose: "Identifica la scheda progressiva e ne permette ricerca e tracciabilità.",
    completion: "Lascia generare il formato OA-NEGOZIO-ANNO-NUMERO; non correggerlo manualmente.",
    legal: "Scheda numerata progressivamente.", oro: "Obbligatorio anche per il salvataggio.",
    controls: ["Formato OA-CODICE-AAAA-N.", "Unicità tra atti attivi."],
    errors: ["Numero mancante, duplicato o con negozio/anno errato."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "store", label: "Negozio", category: "metadati",
    paths: ["store", "storeCode", "negozio_id", "codice_negozio"], ui: ["#storeCode"],
    aliases: ["sede", "punto vendita", "codice negozio"],
    purpose: "Attribuisce l’operazione alla sede e al relativo progressivo.",
    completion: "Seleziona la sede reale; il backend riallinea sede e codice ai permessi dell’utente.",
    oro: "Obbligatorio nel controllo stampa; imposto dal ruolo.", controls: ["Sede esistente e accessibile al ruolo."],
    privacy: "organizzativo", errors: ["Sede diversa da quella dell’operatore."], sources: ["oroactive"]
  }),
  field({
    id: "act_date", label: "Data operazione", category: "metadati",
    paths: ["date", "data_atto"], ui: ["#practiceDate"], aliases: ["data atto", "data compilazione"],
    purpose: "Colloca temporalmente l’operazione e i controlli collegati.",
    completion: "Inserisci la data civile effettiva in formato AAAA-MM-GG.",
    legal: "La scheda deve recare data dell’operazione.", oro: "Obbligatoria nel controllo stampa.",
    controls: ["Data ISO valida e coerente con l’operazione."], errors: ["Data vuota o diversa dal giorno effettivo."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "act_time", label: "Ora operazione", category: "metadati",
    paths: ["time"], ui: ["#practiceTime"], aliases: ["ora atto", "ora compilazione"],
    purpose: "Distingue cronologicamente operazioni anche nella stessa giornata.",
    completion: "Registra l’ora effettiva in formato HH:MM.",
    legal: "La scheda deve recare ora dell’operazione.", oro: "Obbligatoria nel controllo stampa.",
    controls: ["Ora valida 00:00–23:59."], errors: ["Ora mancante o precompilata non verificata."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "operator_identity", label: "Operatore", category: "metadati",
    paths: ["operatorId", "operatorUsername", "operatorName", "operatore_id"],
    aliases: ["commesso", "utente operatore", "firma operatore"],
    purpose: "Attribuisce compilazione, controlli e salvataggio a un utente autenticato.",
    completion: "È derivato dalla sessione; verificare di usare il proprio account.",
    oro: "Automatico e richiesto per responsabilità interna.", controls: ["Account attivo, ruolo e negozio autorizzati."],
    privacy: "personale_dipendente", errors: ["Condividere credenziali o operare con account altrui."], sources: ["oroactive"]
  }),
  field({
    id: "workflow_status", label: "Stato atto", category: "workflow",
    paths: ["status", "createdAt", "completedAt", "archivedAt", "deletedAt", "updatedAt"],
    aliases: ["bozza", "sospesa", "completata", "archiviata", "eliminata"],
    purpose: "Governa modificabilità, archiviazione, giacenza e audit.",
    completion: "Usa bozza/sospesa finché mancano controlli; completa solo dopo esito positivo.",
    oro: "Automatico o selezionato dal flusso.", controls: ["Transizioni autorizzate; atto completato non liberamente modificabile."],
    privacy: "operativo", errors: ["Completare dati incompleti o confondere archiviato con completato."], sources: ["oroactive"]
  }),
  field({
    id: "approval", label: "Approvazione responsabile", category: "workflow",
    paths: ["approvalStatus", "approvalRequestId", "approvalRequiredAt"],
    aliases: ["autorizzazione", "override responsabile", "richiesta approvazione"],
    purpose: "Documenta l’escalation di pratiche con blocchi o rischio critico.",
    completion: "Non forzare: invia la richiesta e attendi l’esito registrato.",
    oro: "Condizionata da controlli bloccanti o rischio.", when: "Solo quando il motore richiede approvazione.",
    controls: ["Ruolo autorizzato, motivazione ed esito tracciati."], errors: ["Trattare l’approvazione come sostituto dei dati mancanti."],
    privacy: "operativo_rischio", sources: ["oroactive"]
  }),
  field({
    id: "suspension", label: "Sospensione pratica", category: "workflow",
    paths: ["suspendedReason", "suspendedReasons", "suspendedAt", "suspendedBy", "resumedAt", "resumedBy"],
    aliases: ["pratica sospesa", "motivo sospensione", "ripresa pratica"],
    purpose: "Conserva motivi e cronologia di una pratica non completabile.",
    completion: "Registra motivi concreti; rimuovili solo dopo la correzione verificata.",
    oro: "Condizionata allo stato sospeso.", controls: ["Almeno un motivo coerente con qualità/rischio."],
    privacy: "operativo_rischio", errors: ["Motivo generico o contenente dati sensibili non necessari."], sources: ["oroactive"]
  }),
  field({
    id: "legal_integrity", label: "Integrità e copia archiviata", category: "workflow",
    paths: ["legalSignature", "readOnlyHtml"],
    aliases: ["hash sha256", "anti tamper", "geolocalizzazione", "audit trail", "copia sola lettura"],
    purpose: "Conserva hash, autore, tempo, audit e rappresentazione archiviata.",
    completion: "È generato al salvataggio finale; non inserire valori manuali.",
    legal: "La conservazione deve tutelare integrità e non alterabilità.", oro: "Automatico al salvataggio finale.",
    controls: ["Hash presente, timestamp e operatore coerenti; posizione solo se disponibile e giustificata."],
    privacy: "audit_e_geolocalizzazione", handling: "Accesso ristretto; non esporre geolocalizzazione o hash nella risposta Aurum.",
    errors: ["Assumere che il flag antiTamper copra dati non inclusi nel hash."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "gdpr", "oroactive"]
  }),
  field({
    id: "customer_name", label: "Nome cliente", category: "cliente",
    paths: ["name", "cliente_nome"], ui: ["[name='nome']"], aliases: ["nome venditore", "nome cedente"],
    purpose: "Identifica la persona che compie l’operazione.",
    completion: "Trascrivi dal documento valido, senza soprannomi.",
    legal: "Dato identificativo del cliente.", oro: "Obbligatorio al completamento.",
    controls: ["Presente e coerente con documento e codice fiscale."], privacy: "identificativo",
    errors: ["Nome abbreviato, invertito o discordante."], nature: ["obbligo_legale", "procedura_oroactive"],
    sources: ["dlgs92", "dlgs231", "oroactive"]
  }),
  field({
    id: "customer_surname", label: "Cognome cliente", category: "cliente",
    paths: ["surname", "cliente_cognome"], ui: ["[name='cognome']"], aliases: ["cognome venditore", "cognome cedente"],
    purpose: "Completa l’identificazione anagrafica del cliente.",
    completion: "Trascrivi tutti i cognomi come risultano dal documento.",
    legal: "Dato identificativo del cliente.", oro: "Obbligatorio al completamento.",
    controls: ["Presente e coerente con documento e codice fiscale."], privacy: "identificativo",
    errors: ["Omettere un cognome o usare il cognome coniugale non documentato."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "oroactive"]
  }),
  field({
    id: "birth_date", label: "Data di nascita", category: "cliente",
    paths: ["birthDate"], ui: ["[name='nascita']"], aliases: ["nascita", "data nascita"],
    purpose: "Distingue omonimi e concorre alla verifica dell’identità.",
    completion: "Trascrivi la data dal documento in formato AAAA-MM-GG.",
    legal: "Dato identificativo del cliente.", oro: "Obbligatorio al completamento.",
    controls: ["Data valida, non futura e coerente con codice fiscale."], privacy: "identificativo",
    errors: ["Invertire giorno e mese; non verificare la maggiore età se rilevante."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "oroactive"]
  }),
  field({
    id: "birth_place", label: "Luogo di nascita", category: "cliente",
    paths: ["birthPlace"], ui: ["[name='luogo']"], aliases: ["comune nascita", "stato nascita"],
    purpose: "Completa i dati identificativi e il riscontro del codice fiscale.",
    completion: "Inserisci comune o Stato estero come da documento.",
    legal: "Dato identificativo del cliente.", oro: "Obbligatorio al completamento.",
    controls: ["Presente e coerente con documento."], privacy: "identificativo",
    errors: ["Confondere comune con provincia; omettere lo Stato estero."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "oroactive"]
  }),
  field({
    id: "birth_province", label: "Provincia di nascita", category: "cliente",
    paths: ["birthProvince"], ui: ["[name='provinciaNascita']"], aliases: ["provincia nascita", "sigla provincia nascita"],
    purpose: "Normalizza il luogo di nascita per anagrafica e controlli.",
    completion: "Usa la sigla di due lettere; per estero applica la convenzione aziendale documentata.",
    legal: "Dettaglio di supporto al luogo di nascita.", oro: "Obbligatorio al completamento.",
    controls: ["Sigla coerente con il luogo."], privacy: "identificativo",
    errors: ["Usare una provincia attuale non coerente con il documento storico."], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "fiscal_code", label: "Codice fiscale", category: "cliente",
    paths: ["fiscalCode", "codice_fiscale"], ui: ["[name='cf']"], aliases: ["cf", "tessera sanitaria"],
    purpose: "Identifica il cliente e collega storico, controlli contanti e CRM.",
    completion: "Inserisci 16 caratteri senza spazi, verificandoli sul documento fiscale.",
    legal: "Dato identificativo ove assegnato.", oro: "Obbligatorio al completamento.",
    controls: ["OroActive controlla oggi solo lunghezza e caratteri; serve anche riscontro documentale e, quando disponibile, verifica del carattere di controllo."],
    privacy: "identificativo_forte", errors: ["Accettare un codice di 16 caratteri senza verificarne la correttezza."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "phone", label: "Telefono", category: "cliente",
    paths: ["phone", "telefono"], ui: ["[name='telefono']"], aliases: ["cellulare", "numero telefono", "whatsapp"],
    purpose: "Consente contatto operativo e preparazione dell’invio cliente.",
    completion: "Inserisci prefisso internazionale e numero verificato.",
    oro: "Obbligatorio nel controllo stampa corrente, non nel gate backend finale.",
    controls: ["Formato telefonico plausibile; consenso/canale appropriato per comunicazioni."],
    privacy: "contatto", errors: ["Numero senza prefisso, di terzi o usato per marketing senza base adeguata."],
    sources: ["gdpr", "oroactive"]
  }),
  field({
    id: "email", label: "Email", category: "cliente",
    paths: ["email"], ui: ["[name='email']"], aliases: ["posta elettronica", "mail cliente"],
    purpose: "Prepara l’invio della copia cliente.",
    completion: "Inserisci solo un indirizzo confermato dal cliente.",
    oro: "Facoltativo; necessario solo per preparare l’invio email.",
    controls: ["Sintassi email e verifica del destinatario prima dell’invio."], privacy: "contatto",
    errors: ["Indirizzo errato, condiviso o copiato nelle note."], sources: ["gdpr", "oroactive"]
  }),
  field({
    id: "citizenship", label: "Cittadinanza", category: "cliente",
    paths: ["citizenship"], ui: ["[name='cittadinanza']"], aliases: ["nazionalità", "nazionalita"],
    purpose: "Completa l’anagrafica e può supportare la valutazione del rischio.",
    completion: "Indica la cittadinanza dichiarata/documentata, non il luogo di nascita.",
    oro: "Facoltativa nel gate finale corrente.", controls: ["Terminologia coerente e non discriminatoria."],
    privacy: "identificativo", errors: ["Confondere cittadinanza, residenza e nazionalità."], sources: ["dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "sex", label: "Sesso", category: "cliente",
    paths: ["sex"], ui: ["[name='sesso']"], aliases: ["M F", "genere anagrafico"],
    purpose: "Supporta coerenza anagrafica e codice fiscale.",
    completion: "Se richiesto, seleziona il dato anagrafico documentato.",
    oro: "Facoltativo nel gate finale corrente.", controls: ["Valori previsti M/F nel modulo attuale."],
    privacy: "identificativo", errors: ["Dedurre il dato dall’aspetto o usarlo per finalità non necessarie."],
    sources: ["gdpr", "oroactive"]
  }),
  field({
    id: "residence_address", label: "Indirizzo di residenza", category: "cliente",
    paths: ["address"], ui: ["[name='indirizzo']"], aliases: ["residenza", "via civico città", "domicilio"],
    purpose: "Registra la residenza anagrafica del cliente.",
    completion: "Scrivi via, numero civico e comune; distingue il domicilio se diverso e necessario.",
    legal: "Dato identificativo del cliente.", oro: "Obbligatorio al completamento.",
    controls: ["Indirizzo completo e coerente con la fonte acquisita."], privacy: "identificativo",
    errors: ["Omettere civico/comune; confondere residenza e domicilio."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "residence_province", label: "Provincia di residenza", category: "cliente",
    paths: ["residenceProvince"], ui: ["[name='provinciaResidenza']"], aliases: ["provincia residenza", "sigla provincia"],
    purpose: "Normalizza la localizzazione della residenza.",
    completion: "Usa la sigla corretta collegata al comune di residenza.",
    legal: "Dettaglio di supporto alla residenza.", oro: "Obbligatorio al completamento.",
    controls: ["Sigla coerente con il comune."], privacy: "identificativo",
    errors: ["Provincia non coerente o lasciata al valore precedente."], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "document_type", label: "Tipo documento", category: "documento",
    paths: ["documentType"], ui: ["#documentType"], aliases: ["carta identità", "patente", "passaporto"],
    purpose: "Indica il documento usato per verificare l’identità.",
    completion: "Seleziona il documento realmente esibito e fotografato.",
    legal: "Gli estremi del documento rientrano nei dati identificativi.", oro: "Obbligatorio al completamento.",
    controls: ["Tipo ammesso e coerente con gli allegati."], privacy: "documento_identita",
    errors: ["Selezionare un tipo diverso dalle immagini caricate."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "document_number", label: "Numero documento", category: "documento",
    paths: ["documentNumber"], ui: ["[name='numeroDocumento']"], aliases: ["estremi documento", "numero carta identità"],
    purpose: "Rende verificabile il documento di identificazione.",
    completion: "Trascrivi esattamente lettere e numeri, senza aggiungere spazi arbitrari.",
    legal: "Gli estremi del documento rientrano nei dati identificativi.", oro: "Obbligatorio al completamento.",
    controls: ["Presenza e coerenza con fronte/retro."], privacy: "documento_identita",
    errors: ["Confondere numero documento con numero tessera sanitaria."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "document_issue_date", label: "Data rilascio documento", category: "documento",
    paths: ["documentIssueDate"], ui: ["[name='dataRilascioDocumento']"], aliases: ["rilascio documento", "data emissione"],
    purpose: "Completa gli estremi del documento e aiuta a verificarne la cronologia.",
    completion: "Trascrivi la data di rilascio in formato AAAA-MM-GG.",
    legal: "Dettaglio degli estremi del documento.", oro: "Facoltativo nel gate finale corrente.",
    controls: ["Data non futura e precedente alla scadenza."], privacy: "documento_identita",
    errors: ["Data successiva alla scadenza o non coerente con la foto."], sources: ["dlgs92", "gdpr", "oroactive"]
  }),
  field({
    id: "document_expiry", label: "Scadenza documento", category: "documento",
    paths: ["documentExpiry"], ui: ["[name='scadenzaDocumento']"], aliases: ["validità documento", "data scadenza"],
    purpose: "Verifica che l’identificazione avvenga con documento valido.",
    completion: "Trascrivi la scadenza; se scaduto chiedi un documento valido.",
    legal: "Supporta l’identificazione tramite documento valido.", oro: "Obbligatorio e bloccante se scaduto.",
    controls: ["Data valida; avviso entro 30 giorni; errore se anteriore a oggi."],
    privacy: "documento_identita", errors: ["Ignorare l’avviso o usare la data di rilascio."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "profession", label: "Professione", category: "cliente",
    paths: ["profession"], ui: ["[name='professione']"], aliases: ["lavoro", "attività lavorativa", "occupazione"],
    purpose: "Supporta profilo operativo e valutazione del rischio.",
    completion: "Seleziona la categoria dichiarata; non dedurla dall’aspetto.",
    oro: "Obbligatoria nel controllo stampa corrente, non nel gate backend finale.",
    controls: ["Categoria coerente; approfondire solo se necessario e autorizzato."],
    privacy: "profilazione_rischio", errors: ["Lasciare il valore predefinito senza domandare."], sources: ["dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "privacy_acknowledgement", label: "Presa visione privacy", category: "privacy",
    paths: ["customerPrivacyAcknowledged"], ui: ["#customerPrivacyAcknowledged"],
    aliases: ["cliente informato", "informativa privacy", "presa visione"],
    purpose: "Registra che l’informativa è stata resa consultabile prima della chiusura.",
    completion: "Spunta solo dopo aver messo l’informativa a disposizione del cliente.",
    legal: "Supporta trasparenza e accountability; non equivale automaticamente a consenso.",
    oro: "Campo presente ma non bloccante nel gate corrente.",
    controls: ["Versione informativa, momento e modalità di consegna dovrebbero essere tracciabili."],
    privacy: "prova_trasparenza", errors: ["Confondere presa visione, consenso e base giuridica."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["gdpr", "privacyCode", "oroactive"]
  }),
  field({
    id: "item_description", label: "Descrizione oggetto", category: "oggetti",
    paths: ["items[].description"], ui: ["#cededItemsTable input"], aliases: ["oggetto ceduto", "descrizione prezioso"],
    purpose: "Distingue sinteticamente ogni oggetto prezioso usato.",
    completion: "Una riga per oggetto o insieme omogeneo: tipologia, quantità e segni utili senza giudizi non verificati.",
    legal: "La scheda deve descrivere caratteristiche, natura e qualità dell’oggetto.",
    oro: "Almeno una riga; descrizione obbligatoria per ogni riga.",
    controls: ["Descrizione specifica e coerente con foto, metallo e titolo."],
    privacy: "bene_evidenza", errors: ["Scrivere solo “oro”; raggruppare oggetti non omogenei."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "item_metal", label: "Metallo oggetto", category: "oggetti",
    paths: ["items[].metal"], ui: [".ceded-item-row select:first-of-type"],
    aliases: ["oro", "argento", "platino", "natura metallo"],
    purpose: "Classifica la natura del materiale per valutazione, giacenza e foto.",
    completion: "Seleziona Oro, Argento o Platino solo dopo verifica operativa.",
    legal: "Parte della natura/qualità dell’oggetto.", oro: "Obbligatorio per ogni riga.",
    controls: ["Coerenza con test, titolo, peso e fotografia."], privacy: "bene_evidenza",
    errors: ["Confondere colore apparente con metallo verificato."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "item_title", label: "Titolo o caratura", category: "oggetti",
    paths: ["items[].title", "items[].titolo", "items[].caratura"], ui: [".ceded-item-row select:nth-of-type(2)"],
    aliases: ["titolo", "caratura", "18 kt", "925", "purezza"],
    purpose: "Registra la purezza dichiarata/verificata del metallo.",
    completion: "Seleziona il titolo coerente con metallo e riscontro; documenta in note eventuali limiti del test.",
    legal: "Parte delle qualità e della valutazione dell’oggetto.", oro: "Obbligatorio per ogni riga.",
    controls: ["Valore ammesso per il metallo; non confondere marchio con risultato definitivo."],
    privacy: "bene_evidenza", errors: ["Applicare carati dell’oro ad argento/platino; fidarsi solo del punzone."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "material_lot", label: "Lotto metallo e titolo", category: "valutazione",
    paths: ["materials[].metal", "materials[].title", "materials[].key"],
    aliases: ["lotto peso", "raggruppamento metallo titolo"],
    purpose: "Raggruppa il peso per coppia metallo/titolo e alimenta giacenza.",
    completion: "Il sistema lo deriva dalle righe oggetto; verifica che non unisca beni con titolo diverso.",
    oro: "Generato per ogni combinazione attiva.", controls: ["Coppia metallo/titolo univoca e collegabile agli oggetti."],
    privacy: "bene_evidenza", errors: ["Perdere il legame tra lotto aggregato e singolo oggetto."], sources: ["oroactive"]
  }),
  field({
    id: "lot_weight", label: "Peso lotto", category: "valutazione",
    paths: ["materials[].weight"], ui: ["#totalWeightFields input[data-metal-weight]"],
    aliases: ["peso metallo", "grammi lotto", "peso per titolo"],
    purpose: "Registra i grammi per metallo e titolo.",
    completion: "Inserisci il peso misurato in grammi con bilancia idonea; chiarisci se lordo, netto o fino.",
    legal: "Elemento operativo della descrizione e valutazione.", oro: "Almeno un lotto con peso maggiore di zero.",
    controls: ["Numero > 0, step 0,01 g, coerenza con oggetti e strumento."],
    privacy: "bene_evidenza", errors: ["Peso zero; confondere peso lordo con fino; sommare titoli diversi."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "total_weight", label: "Peso totale", category: "valutazione",
    paths: ["weight"], aliases: ["peso complessivo", "grammi totali"],
    purpose: "Espone la somma dei lotti per controlli e archivio.",
    completion: "È calcolato dal sistema a due decimali; confrontalo con i pesi di lotto.",
    oro: "Derivato e bloccante se non maggiore di zero.", controls: ["Somma numerica dei materials[].weight."],
    privacy: "bene_evidenza", errors: ["Usare il totale senza verificare i lotti che lo compongono."], sources: ["oroactive"]
  }),
  field({
    id: "material_amount_split", label: "Ripartizione importo per metallo", category: "valutazione",
    paths: ["materialAmounts[].metal", "materialAmounts[].amount"], ui: ["#materialAmountFields"],
    aliases: ["di cui oro", "importo argento", "ripartizione totale"],
    purpose: "Spiega come il totale è ripartito tra metalli differenti.",
    completion: "Se sono presenti più metalli, inserisci un importo positivo per ciascuno.",
    oro: "Condizionata a più metalli; richiesta dal controllo locale.",
    when: "Solo con almeno due metalli attivi.",
    controls: ["Ogni importo > 0; somma uguale al totale entro 0,01 euro."],
    privacy: "finanziario", errors: ["Somma diversa dal totale; ripartizione per metallo anziché per lotto non chiarita."],
    sources: ["oroactive"]
  }),
  field({
    id: "print_weight_customer", label: "Peso sulla copia cliente", category: "stampa",
    paths: ["printWeightCustomer"], ui: ["#printWeightCustomer"],
    aliases: ["stampa peso", "mostra peso cliente"],
    purpose: "Autorizza l’esposizione del peso nella copia cliente locale.",
    completion: "Spunta solo quando il peso deve apparire nella copia consegnata.",
    oro: "Facoltativo.", controls: ["La scelta deve essere rispettata da ogni generatore PDF."],
    privacy: "dato_commerciale", errors: ["Presumere che il PDF server rispetti il flag: nel codice corrente non lo fa."],
    sources: ["oroactive"]
  }),
  field({
    id: "valuation_quote", label: "Quotazione e valutazione applicata", category: "valutazione",
    paths: ["bullionQuotes[]", "quotazione", "quote", "valuation"],
    aliases: ["quotazione metallo", "valutazione oggetto", "prezzo al grammo", "fonte quotazione"],
    purpose: "Registra fonte indipendente, valore del metallo al momento dell’operazione e valutazione dell’oggetto.",
    completion: "Acquisire fonte, timestamp, metallo/titolo, valore unitario, criteri e risultato della valutazione.",
    legal: "La scheda deve riportare quotazione rilevata da fonte affidabile e indipendente e valutazione.",
    oro: "Gap: colonne backend esistono, ma il modulo corrente non acquisisce né stampa il dato.",
    controls: ["Fonte, valuta/unità, timestamp e formula verificabili."], privacy: "commerciale",
    errors: ["Lasciare zero; usare quotazione pura come prezzo pagato senza criteri; fonte non tracciata."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"], implemented: false
  }),
  field({
    id: "subsequent_destination", label: "Destinazione successiva dell’oggetto", category: "oggetti",
    paths: ["destination", "destinationParty", "destinationDate"],
    aliases: ["destinazione preziosi", "cessionario", "raffineria", "successiva cessione"],
    purpose: "Integra la scheda con la destinazione data al bene e i dati identificativi del destinatario.",
    completion: "Registrare tipo destinazione, data e soggetto destinatario quando l’oggetto viene ceduto o lavorato.",
    legal: "La scheda deve essere integrata con le informazioni sulla destinazione.",
    oro: "Gap: nessun campo nell’atto corrente; flussi giacenza/fusione non integrano questa scheda.",
    controls: ["Collegamento all’atto, destinatario identificato, data e audit."], privacy: "commerciale_e_identificativo",
    errors: ["Annotare la destinazione solo in note o in un sistema non collegato."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"], implemented: false
  }),
  field({
    id: "payment_method", label: "Metodo di pagamento", category: "pagamento",
    paths: ["paymentMethod", "payment_method"], ui: ["#paymentMethod"],
    aliases: ["bonifico", "contanti", "assegno", "mezzo pagamento"],
    purpose: "Documenta come è corrisposto l’importo e attiva i controlli di tracciabilità.",
    completion: "Seleziona il mezzo effettivo; per soglie/casi previsti usa un mezzo tracciabile e riconducibile al disponente.",
    legal: "La scheda deve riportare il mezzo di pagamento; da 500 euro si applica la regola specifica di tracciabilità del D.Lgs. 92/2017.",
    oro: "Obbligatorio al completamento.", controls: ["Valore ammesso; controllo contanti cumulato; prova per bonifico/assegno."],
    privacy: "finanziario", errors: ["Selezionare contanti senza verificare soglia e frazionamento; metodo diverso dalla prova."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "oroactive"]
  }),
  field({
    id: "total_amount", label: "Totale corrisposto", category: "pagamento",
    paths: ["amount", "totale"], ui: ["#saleTotal"], aliases: ["importo", "prezzo complessivo", "totale vendita"],
    purpose: "Registra il corrispettivo complessivo dell’operazione.",
    completion: "Inserisci l’importo effettivamente corrisposto in euro, con due decimali.",
    legal: "La scheda deve riportare l’importo corrisposto.", oro: "Obbligatorio e maggiore di zero.",
    controls: ["Numero > 0; coerenza con ripartizione, pagamento e valutazione."], privacy: "finanziario",
    errors: ["Importo zero/negativo; discordanza con contabile o ripartizione."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "oroactive"]
  }),
  field({
    id: "iban", label: "IBAN", category: "pagamento",
    paths: ["iban"], ui: ["#paymentIban"], aliases: ["conto destinazione", "coordinate bancarie"],
    purpose: "Individua il conto usato per il bonifico e supporta la riconducibilità del pagamento.",
    completion: "Inserisci l’IBAN completo senza spazi solo per bonifico.",
    legal: "Dato strumentale alla tracciabilità del pagamento.", oro: "Obbligatorio se metodo = Bonifico.",
    when: "Solo per bonifico.", controls: ["OroActive controlla oggi solo il formato; occorrono anche checksum MOD-97 e coerenza con intestatario e contabile."],
    privacy: "finanziario", handling: "Mascherare nelle viste non necessarie e non copiarlo nelle note.",
    errors: ["Controllare solo la regex; IBAN di terzi senza verifica; IBAN omesso dal PDF."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "gdpr", "oroactive"]
  }),
  field({
    id: "account_holder", label: "Intestatario del conto", category: "pagamento",
    paths: ["accountHolder", "intestatario_conto"], ui: ["#paymentAccountHolder"],
    aliases: ["beneficiario bonifico", "titolare iban", "disponente"],
    purpose: "Consente di verificare la riconducibilità del conto al cliente e rilevare IBAN condivisi.",
    completion: "Trascrivi l’intestatario risultante dalla documentazione bancaria e verifica eventuali difformità.",
    legal: "Supporta la riconducibilità univoca del mezzo di pagamento al disponente.",
    oro: "Gap: Aurum Shield legge il selettore, ma il campo non esiste nel modulo atto corrente.",
    when: "Rilevante per bonifico e casi di conto non intestato al cliente.",
    controls: ["Confronto normalizzato con nome/cognome; escalation se conto di terzi."], privacy: "finanziario_identificativo",
    errors: ["Lasciare vuoto; presumere corrispondenza dal solo IBAN."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"], implemented: false
  }),
  field({
    id: "payment_proof", label: "Prova del pagamento", category: "allegati",
    paths: ["captures[]", "captureAttachments[key^='pagamento-']"],
    ui: ["#paymentCaptureSection"], aliases: ["contabile", "ricevuta bonifico", "foto assegno"],
    purpose: "Collega all’atto l’evidenza del pagamento tracciabile.",
    completion: "Carica immagine o PDF leggibile, coerente con importo, data, mezzo e destinatario.",
    legal: "Evidenza operativa della tracciabilità.", oro: "Obbligatoria per Bonifico o Assegno.",
    when: "Solo per bonifico o assegno.", controls: ["Chiave coerente col metodo; file integro e accessibile ai soli autorizzati."],
    privacy: "finanziario_documentale", errors: ["File illeggibile; prova di altra operazione; PDF non incluso nel PDF aziendale corrente."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "gdpr", "oroactive"]
  }),
  field({
    id: "identity_attachments", label: "Allegati documento e tessera fiscale", category: "allegati",
    paths: ["captures[]", "captureAttachments[]"],
    ui: [".capture-grid"], aliases: ["documento fronte retro", "tessera sanitaria fronte retro", "foto codice fiscale"],
    purpose: "Conserva evidenza del documento usato e del codice fiscale.",
    completion: "Carica fronte e retro del documento selezionato e della tessera fiscale, leggibili e non tagliati.",
    legal: "Supporta identificazione e conservazione dei dati acquisiti.", oro: "Quattro acquisizioni obbligatorie al completamento.",
    controls: ["Chiavi documento-fronte/retro e codice-fiscale-fronte/retro; tipo coerente; qualità leggibile."],
    privacy: "documento_identita_ad_alto_rischio", handling: "Accesso minimo, cifratura/controlli adeguati e nessuna esposizione nelle risposte Aurum.",
    errors: ["Fronte/retro scambiati; documento diverso dai dati; foto sfocata o eccessiva."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "dlgs231", "gdpr", "oroactive"]
  }),
  field({
    id: "precious_photos", label: "Fotografie degli oggetti", category: "allegati",
    paths: ["captures[]", "captureAttachments[key^='preziosi-']"],
    ui: ["#preciousCaptureGrid"], aliases: ["foto preziosi", "due prospettive", "foto oggetto"],
    purpose: "Documenta visivamente ciascun oggetto da prospettive differenti.",
    completion: "Acquisisci due fotografie digitali per ogni oggetto, nitide, complete e riconducibili alla riga.",
    legal: "Due fotografie digitali dell’oggetto da prospettive diverse.", oro: "UI crea due foto per metallo; backend corrente accetta anche una sola foto complessiva.",
    controls: ["Due prospettive per oggetto, collegamento alla riga, nessun volto/dato estraneo."],
    privacy: "bene_evidenza", errors: ["Foto per metallo anziché per oggetto; sfondo irrilevante; una sola foto; bene tagliato."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "gdpr", "oroactive"]
  }),
  field({
    id: "operator_notes", label: "Note operatore", category: "note",
    paths: ["operatorNotes"], ui: [".textarea-label textarea"], aliases: ["note vendita", "annotazioni interne"],
    purpose: "Registra fatti operativi non rappresentabili nei campi strutturati.",
    completion: "Scrivi solo elementi oggettivi, pertinenti e necessari; usa i campi strutturati quando esistono.",
    oro: "Facoltativo.", controls: ["Linguaggio professionale; nessun dato sensibile superfluo."],
    privacy: "testo_libero_alto_rischio", errors: ["Giudizi personali; dati sanitari; quotazione, destinazione o controlli annotati solo qui."],
    sources: ["gdpr", "oroactive"]
  }),
  field({
    id: "signatures", label: "Firme atto", category: "firme",
    paths: ["signatures[]", "signatureImages[]"],
    ui: [".signature-grid"], aliases: ["firma", "firma_cliente", "firma vendita", "firma dichiarazioni", "firma privacy", "firma operatore"],
    purpose: "Acquisisce quattro firme distinte: cessione, dichiarazioni, privacy/presa visione e operatore.",
    completion: "Mostra prima i testi pertinenti, identifica il firmatario e acquisisci ogni firma nel riquadro corretto.",
    legal: "Prova documentale da coordinare con dichiarazioni e informativa; non sostituisce la corretta base giuridica privacy.",
    oro: "Tutte e quattro obbligatorie al completamento.",
    controls: ["Quattro presenze e immagini corrispondenti; testo firmato incluso nella copia; niente riuso tra pratiche."],
    privacy: "firma_grafica", handling: "Protezione elevata; Aurum non deve mai riprodurre l’immagine né trattarla per inferire caratteristiche biometriche.",
    errors: ["Firma nel riquadro errato; firma senza testo visibile; chiamare consenso ciò che è presa visione; tre/four incoerenti in UI."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs92", "gdpr", "privacyCode", "oroactive"]
  }),
  field({
    id: "quality_and_risk", label: "Controllo qualità e rischio", category: "workflow",
    paths: ["qualityReview", "qualityCheck", "aurumShield", "amlCashCheck", "academyQualification"],
    aliases: ["controllo qualità", "aurum shield", "risk score", "antiriciclaggio", "qualifica operatore"],
    purpose: "Riunisce esiti, avvisi, fattori di rischio e requisiti operativi prima del completamento.",
    completion: "Risolvi gli errori; documenta feedback negativo; tratta gli avvisi come richiesta di verifica, non come diagnosi.",
    legal: "Supporta presidi antiriciclaggio e tracciabilità, senza sostituire la valutazione umana dovuta.",
    oro: "Controllo automatico al completamento; review manuale dipendente dal ruolo.",
    controls: ["Nessun errore bloccante; rischio critico autorizzato; feedback negativo risolto; qualifica valida."],
    privacy: "profilazione_rischio", handling: "Accesso per ruolo; spiegare i fattori senza esporre storico o dati di altri clienti.",
    errors: ["Considerare il punteggio una decisione automatica definitiva; ignorare warning o indisponibilità del controllo."],
    nature: ["obbligo_legale", "procedura_oroactive"], sources: ["dlgs231", "gdpr", "oroactive"]
  })
]);

const fieldById = new Map(SALE_DEED_FIELD_KNOWLEDGE.map((entry) => [entry.id, entry]));

const STOP_WORDS = new Set([
  "a", "al", "alla", "che", "come", "con", "cosa", "da", "de", "dei", "del", "della",
  "di", "e", "il", "in", "lo", "mi", "nel", "o", "per", "questo", "su", "un", "una"
]);

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function terms(value = "") {
  return unique(normalize(value).split(/\s+/).filter((term) => term.length > 1 && !STOP_WORDS.has(term)));
}

function scoreField(entry, query, queryTerms) {
  const id = normalize(entry.id);
  const label = normalize(entry.label);
  const aliases = entry.aliases.map(normalize);
  const paths = entry.payloadPaths.map(normalize);
  const body = normalize([
    entry.category, entry.purpose, entry.completion, entry.requirement.legal,
    entry.requirement.oroActive, ...entry.controls, ...entry.commonErrors
  ].join(" "));
  let score = 0;
  if (query === id || query === label || aliases.includes(query) || paths.includes(query)) score += 100;
  if (id.includes(query) || label.includes(query)) score += 36;
  if (aliases.some((alias) => alias.includes(query))) score += 30;
  if (paths.some((path) => path.includes(query))) score += 24;
  for (const term of queryTerms) {
    if (id.split(" ").includes(term)) score += 16;
    if (label.split(" ").includes(term)) score += 14;
    if (aliases.some((alias) => alias.split(" ").includes(term))) score += 12;
    if (paths.some((path) => path.includes(term))) score += 9;
    if (body.includes(term)) score += 3;
  }
  return score;
}

export function searchSaleDeedKnowledge(question = "", options = {}) {
  const query = normalize(question);
  if (!query) return [];
  const queryTerms = terms(query);
  const limit = Math.max(1, Math.min(20, Number(options.limit || 5)));
  const category = options.category ? normalize(options.category) : "";
  return SALE_DEED_FIELD_KNOWLEDGE
    .filter((entry) => !category || normalize(entry.category) === category)
    .map((entry) => ({ field: entry, score: scoreField(entry, query, queryTerms) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.field.id.localeCompare(right.field.id, "it"))
    .slice(0, limit)
    .map((match) => Object.freeze({
      ...match,
      matchedTerms: Object.freeze(queryTerms.filter((term) => normalize([
        match.field.id, match.field.label, ...match.field.aliases, ...match.field.payloadPaths
      ].join(" ")).includes(term)))
    }));
}

export function findSaleDeedFieldById(fieldId = "") {
  return fieldById.get(String(fieldId || "").trim()) || null;
}

function asMatches(input, options = {}) {
  if (typeof input === "string") return searchSaleDeedKnowledge(input, options);
  if (!Array.isArray(input)) return [];
  return input.map((item) => item?.field ? item : { field: item, score: 0 }).filter((item) => item.field?.id);
}

export function selectSaleDeedKnowledgeMatches(input, options = {}) {
  const matches = asMatches(input, options);
  if (!matches.length) return [];
  const topScore = Number(matches[0].score || 0);
  if (topScore <= 0) return matches.slice(0, 1);
  const threshold = Math.max(24, topScore * 0.7, topScore - 20);
  const selected = matches.filter((match) => Number(match.score || 0) >= threshold).slice(0, 3);
  return selected.length ? selected : matches.slice(0, 1);
}

export function saleDeedKnowledgeSources(input = SALE_DEED_FIELD_KNOWLEDGE) {
  const matches = asMatches(input);
  const entries = matches.length ? matches.map((match) => match.field) : Array.isArray(input) ? input : SALE_DEED_FIELD_KNOWLEDGE;
  const sourceIds = unique(entries.flatMap((entry) => entry.sources || []));
  return sourceIds.map((id) => SOURCE_CATALOG[id]).filter(Boolean);
}

export function formatSaleDeedKnowledgeContext(input, options = {}) {
  const matches = selectSaleDeedKnowledgeMatches(input, options)
    .slice(0, Math.max(1, Math.min(10, Number(options.limit || 5))));
  if (!matches.length) return "";
  return matches.map(({ field: entry }) => [
    `[${entry.id}] ${entry.label}`,
    `Percorsi: ${entry.payloadPaths.join(", ") || "nessuno"}`,
    `Scopo: ${entry.purpose}`,
    `Compilazione: ${entry.completion}`,
    `Obbligatorietà legale: ${entry.requirement.legal}`,
    `Procedura OroActive: ${entry.requirement.oroActive}`,
    `Condizione: ${entry.requirement.condition}`,
    `Controlli: ${entry.controls.join(" | ") || "nessuno specifico"}`,
    `Privacy: ${entry.privacy.classification} — ${entry.privacy.handling}`,
    `Errori: ${entry.commonErrors.join(" | ") || "nessuno specifico"}`,
    `Natura: ${entry.nature.join(", ")}`,
    `Stato: ${entry.implemented ? "implementato" : "gap da implementare"}`,
    `Fonti: ${entry.sources.join(", ")}`
  ].join("\n")).join("\n\n---\n\n");
}

export function buildSaleDeedKnowledgeAnswer(question = "", matches = searchSaleDeedKnowledge(question)) {
  const selected = selectSaleDeedKnowledgeMatches(matches);
  if (!selected.length) {
    return {
      risposta: "Non ho individuato un campo preciso dell’atto. Indica il nome del campo o il dubbio operativo, ad esempio «IBAN», «foto oggetti», «quotazione» o «scadenza documento». Non inserire nella domanda dati personali reali del cliente.",
      fields: [],
      sources: []
    };
  }
  const entries = selected.map((match) => match.field);
  const sources = saleDeedKnowledgeSources(entries);
  const lines = [];
  entries.forEach((entry, index) => {
    if (index) lines.push("", "---", "");
    lines.push(
      entry.label,
      "",
      entry.purpose,
      `Come compilare: ${entry.completion}`,
      `Obbligatorietà: ${entry.requirement.legal} Procedura OroActive: ${entry.requirement.oroActive}`,
      `Quando: ${entry.requirement.condition}`,
      `Controlli: ${entry.controls.join("; ") || "nessun controllo specifico registrato"}.`,
      `Privacy: ${entry.privacy.handling}`,
      `Evita: ${entry.commonErrors.join("; ") || "errori di trascrizione e dati non necessari"}.`,
      entry.implemented ? "Stato OroActive: campo disponibile." : "Stato OroActive: gap noto, da implementare prima di considerare completa la scheda."
    );
  });
  lines.push(
    "",
    `Fonti verificate il ${VERIFIED_AT}:`,
    ...sources.map((source, index) => (
      `${index + 1}. ${source.title} — ${source.url || "procedura interna OroActive verificata"}`
    )),
    "",
    "Indicazione operativa generale: applica il testo vigente, le procedure autorizzate e l’eventuale verifica del responsabile o del professionista competente. Aurum non deve ricevere né ripetere dati personali reali non necessari."
  );
  return {
    risposta: lines.join("\n"),
    fields: entries.map((entry) => entry.id),
    sources
  };
}

const categories = SALE_DEED_FIELD_KNOWLEDGE.reduce((result, entry) => {
  result[entry.category] = (result[entry.category] || 0) + 1;
  return result;
}, {});

export const AURUM_SALE_DEED_STATS = Object.freeze({
  verifiedAt: VERIFIED_AT,
  totalFields: SALE_DEED_FIELD_KNOWLEDGE.length,
  implementedFields: SALE_DEED_FIELD_KNOWLEDGE.filter((entry) => entry.implemented).length,
  knownGaps: SALE_DEED_FIELD_KNOWLEDGE.filter((entry) => !entry.implemented).length,
  legalFields: SALE_DEED_FIELD_KNOWLEDGE.filter((entry) => entry.nature.includes("obbligo_legale")).length,
  oroActiveProcedureFields: SALE_DEED_FIELD_KNOWLEDGE.filter((entry) => entry.nature.includes("procedura_oroactive")).length,
  categories: Object.freeze({ ...categories }),
  sourceCount: Object.keys(SOURCE_CATALOG).length
});
