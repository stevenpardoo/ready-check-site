// Ready Check engine. Pure functions, no Forge imports: the same code runs in the
// issue panel resolver, in the workflow validator and in the unit tests.
//
// Input (normalised issue):
//   { summary, text, acText, urls, attachments: [{ mimeType, filename }],
//     storyPoints: number | null | undefined, issueType }
//   storyPoints === undefined means the site has no story points field (check is skipped).
//
// Output:
//   { score, ready, threshold, checks: [{ id, status: 'pass'|'fail'|'na', weight, params }],
//     suggestions: [{ id, covered }] }

import { CHECK_IDS, mergeSettings } from './defaults.js';

// Lower-case and strip accents so one regex matches "aceptación" and "aceptacion".
export const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Remove list bullets, numbering, quote marks and markdown emphasis from a line start.
const cleanLine = (line) => line
  .replace(/^[\s>*\-•·#\d.)\]]+/, '')
  .replace(/^(\*\*|__)/, '')
  .replace(/\*\*|__/g, '')
  .trim();

// ---------- Gherkin ----------
const RE_SCENARIO = /^(scenario outline|scenario|example|escenario|esquema del escenario|ejemplo)\b/;
const RE_GIVEN = /^(given|dado que|dado|dada|dados|dadas|teniendo en cuenta que|teniendo)\b/;
const RE_WHEN = /^(when|cuando)\b/;
const RE_THEN = /^(then|entonces)\b/;
const RE_AND = /^(and|but|y|e|pero)\b/;
const RE_INLINE_WHEN = /\b(when|cuando)\b/;
const RE_INLINE_THEN = /\b(then|entonces)\b/;

export function parseScenarios(text) {
  const blocks = [];
  let current = null;
  let lastStep = null;
  const start = (title) => {
    current = { title: title || '', given: false, when: false, then: false, lines: [] };
    blocks.push(current);
    lastStep = null;
  };

  for (const raw of (text || '').split('\n')) {
    const line = cleanLine(raw);
    if (!line) continue;
    const f = fold(line);

    if (RE_SCENARIO.test(f)) { start(line); current.lines.push(f); continue; }

    let step = null;
    if (RE_GIVEN.test(f)) step = 'given';
    else if (RE_WHEN.test(f)) step = 'when';
    else if (RE_THEN.test(f)) step = 'then';
    else if (RE_AND.test(f) && lastStep) step = 'and';
    if (!step) continue;

    const complete = current && current.when && current.then;
    if (!current || (step === 'given' && complete)) start('');
    if (step === 'given') {
      current.given = true;
      // "Given X when Y then Z" written on a single line.
      if (RE_INLINE_WHEN.test(f)) current.when = true;
      if (RE_INLINE_THEN.test(f)) current.then = true;
    } else if (step === 'when') {
      current.when = true;
      if (RE_INLINE_THEN.test(f)) current.then = true;
    } else if (step === 'then') {
      current.then = true;
    }
    if (step !== 'and') lastStep = step;
    current.lines.push(f);
  }
  return blocks.filter((b) => b.given || b.when || b.then);
}

// ---------- Vocabulary ----------
const RE_AC_HEADING = /(acceptance criteria|criterios? de aceptacion|definition of done|definicion de (hecho|terminado))/;

const RE_NEGATIVE = new RegExp('\\b(' + [
  'error', 'errores', 'invalid\\w*', 'invalido\\w*', 'fail\\w*', 'falla\\w*', 'fallo', 'empty', 'vaci\\w*',
  'missing', 'falta\\w*', 'without', 'sin', 'not', 'no', 'cannot', 'denied', 'deneg\\w*', 'rechaz\\w*',
  'reject\\w*', 'unauthori\\w*', 'expire\\w*', 'expir\\w*', 'vencid\\w*', 'timeout', 'exceed\\w*', 'exced\\w*',
  'duplicat\\w*', 'duplicad\\w*', 'incorrect\\w*', 'wrong', 'cancel\\w*', 'limit\\w*', 'limite', 'offline',
  'bloque\\w*', 'block\\w*', 'unavailable', 'no disponible',
].join('|') + ')\\b');

const OPEN_QUESTION_TERMS = [
  'tbd', 'tbc', 'todo', 'to be defined', 'to be confirmed', 'pending definition', 'por definir',
  'pendiente de definir', 'pendiente por definir', 'a definir', 'por confirmar', 'pendiente de confirmar',
  'pendiente por confirmar', 'xxx',
];

const AMBIGUOUS_TERMS = [
  'etc', 'and so on', 'user friendly', 'user-friendly', 'intuitive', 'easy to use', 'fast', 'quickly',
  'as needed', 'as appropriate', 'seamless', 'seamlessly', 'robust', 'optimal', 'efficient', 'flexible',
  'entre otros', 'amigable', 'intuitivo', 'intuitiva', 'facil de usar', 'rapido', 'rapida', 'rapidamente',
  'segun sea necesario', 'cuando aplique', 'adecuado', 'adecuada', 'optimo', 'optima', 'eficiente',
  'robusto', 'robusta',
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findTerms = (folded, terms) => {
  const found = [];
  for (const term of terms) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(term)}([^a-z0-9]|$)`);
    if (re.test(folded)) found.push(term);
  }
  return found;
};

const RE_STORY_EN = /\bas an?\b[\s\S]{1,200}?\bi\s+(want|need|would like|can)\b[\s\S]{1,300}?\b(so that|so i|so we|in order to)\b/;
const RE_STORY_ES = /\bcomo\b[\s\S]{1,200}?\b(quiero|necesito|deseo|requiero|puedo)\b[\s\S]{1,300}?\b(para|con el fin de|de modo que|de forma que|asi)\b/;
const RE_ROLE_WANT_EN = /\bas an?\b[\s\S]{1,200}?\bi\s+(want|need|would like|can)\b/;
const RE_ROLE_WANT_ES = /\bcomo\b[\s\S]{1,200}?\b(quiero|necesito|deseo|requiero|puedo)\b/;

const RE_DESIGN_URL = /(figma\.com|miro\.com|invisionapp\.com|zeplin\.io|lucid\.app|lucidchart\.com|sketch\.com|canva\.com|whimsical\.com|balsamiq)/i;

// ---------- "What if...?" library ----------
// trigger: when the story talks about this topic. cover: when the criteria already answer it.
export const WHAT_IF_RULES = [
  { id: 'form', trigger: /\b(forms?|fields?|inputs?|formulario\w*|campos?)\b/, cover: /(required|mandatory|obligatori\w*|empty|vaci\w*|invalid\w*|formato)/ },
  { id: 'upload', trigger: /\b(upload\w*|files?|attach\w*|archivos?|adjunt\w*|cargar|subir)\b/, cover: /(size|tamano|peso|\bmb\b|formats?|formato|extension)/ },
  { id: 'payment', trigger: /\b(pay|pays|paid|payments?|cards?|checkout|charges?|pagos?|pagar|tarjetas?|cobros?|cobrar|pse)\b/, cover: /(declin\w*|rechaz\w*|fail\w*|falla\w*|timeout|insufficient|insuficiente)/ },
  { id: 'email', trigger: /\b(e-?mails?|correos?)\b/, cover: /(invalid\w*|invalido\w*|bounce\w*|rebot\w*|no llega|not delivered|formato)/ },
  { id: 'date', trigger: /\b(dates?|deadlines?|calendar|fechas?|plazos?|vencimiento|calendario)\b/, cover: /(past|pasad\w*|future|futur\w*|timezone|time zone|zona horaria|anterior|posterior|feriado|holiday)/ },
  { id: 'search', trigger: /\b(search\w*|filter\w*|busca\w*|busqueda\w*|filtr\w*)\b/, cover: /(no results|sin resultados|no encuentra|not found|ningun\w*)/ },
  { id: 'list', trigger: /\b(lists?|tables?|grids?|listas?|tablas?|listados?)\b/, cover: /(empty|vaci\w*|paginat\w*|pagina\w*|thousands|miles|scroll)/ },
  { id: 'permission', trigger: /\b(roles?|permissions?|admins?|administrators?|profiles?|rol|permisos?|perfil\w*|administrador\w*)\b/, cover: /(unauthori\w*|no autorizad\w*|sin permiso\w*|without permission|denied|deneg\w*|no tiene permiso\w*)/ },
  { id: 'session', trigger: /\b(login|log in|sign in|passwords?|sessions?|sesion\w*|contrasena\w*|iniciar sesion)\b/, cover: /(expir\w*|vencid\w*|bloque\w*|lock\w*|intentos|attempts)/ },
  { id: 'notification', trigger: /\b(notif\w*|alerts?|alertas?|avisos?)\b/, cover: /(disabled|desactiv\w*|\bread\b|leid\w*|duplicad\w*|duplicat\w*)/ },
  { id: 'import', trigger: /\b(import\w*|export\w*|excel|csv|xlsx|importa\w*|exporta\w*)\b/, cover: /(empty|vaci\w*|columns?|columnas?|large|grande|limit\w*|limite|max\w*)/ },
  { id: 'integration', trigger: /\b(api|apis|integrations?|integracion\w*|services?|servicios?|webhooks?|external|extern\w*|third[- ]party|terceros)\b/, cover: /(down|caido|no responde|not respond\w*|timeout|unavailable|no disponible|retry|reintent\w*)/ },
  { id: 'delete', trigger: /\b(delete\w*|remove\w*|eliminar|elimina\w*|borrar|borra\w*|anular)\b/, cover: /(confirm\w*|in use|en uso|asociad\w*|related|undo|deshacer|papelera|trash)/ },
  { id: 'edit', trigger: /\b(edit\w*|updat\w*|modif\w*|actualiz\w*)\b/, cover: /(concurren\w*|simultane\w*|same time|mismo tiempo|conflict\w*|conflicto\w*|otro usuario|another user)/ },
  { id: 'amount', trigger: /\b(prices?|amounts?|totals?|money|currency|precios?|montos?|valor\w*|monedas?|descuentos?|discounts?|impuestos?|tax\w*)\b/, cover: /(zero|cero|negativ\w*|decimal\w*|rounding|redonde\w*)/ },
  { id: 'mobile', trigger: /\b(mobile|movil\w*|celular\w*|responsive|tablets?)\b/, cover: /(small screen|pantalla pequena|offline|sin conexion|landscape|horizontal)/ },
];
const GENERIC_RULE = { id: 'cancel', trigger: /./, cover: /(cancel\w*|abandon\w*|interrump\w*|interrupt\w*|go back|atras|volver)/ };
const MAX_SUGGESTIONS = 6;

// ---------- Evaluation ----------
export function evaluate(issue, rawSettings) {
  const settings = mergeSettings(rawSettings);
  const summary = issue.summary || '';
  const text = issue.text || '';
  const acText = issue.acText || '';
  const allFolded = fold([summary, text, acText].join('\n'));

  const scenarios = parseScenarios([text, acText].join('\n'));

  // Lines that make up the acceptance criteria when they are not written as Gherkin.
  const textLines = text.split('\n').map(cleanLine).filter(Boolean);
  const headingIdx = textLines.findIndex((l) => RE_AC_HEADING.test(fold(l)));
  const acLinesFromText = headingIdx >= 0 ? textLines.slice(headingIdx + 1, headingIdx + 31) : [];
  const acFieldLines = acText.split('\n').map(cleanLine).filter((l) => l.split(/\s+/).length >= 3);
  const criteriaLines = [...acLinesFromText, ...acFieldLines].filter((l) => !RE_AC_HEADING.test(fold(l)));

  const cases = scenarios.length
    ? scenarios.map((s) => s.lines.join(' '))
    : criteriaLines.map(fold);
  const casesFolded = cases.join('\n');

  const results = {};

  // 1. Story format: role, need and benefit.
  {
    const head = fold(`${summary}\n${text.slice(0, 1200)}`);
    const full = RE_STORY_EN.test(head) || RE_STORY_ES.test(head);
    const partial = !full && (RE_ROLE_WANT_EN.test(head) || RE_ROLE_WANT_ES.test(head));
    results.storyFormat = { status: full ? 'pass' : 'fail', params: { missing: full ? null : partial ? 'benefit' : 'all' } };
  }

  // 2. Acceptance criteria present.
  {
    const has = scenarios.length > 0 || criteriaLines.length > 0;
    results.acceptanceCriteria = { status: has ? 'pass' : 'fail', params: { count: scenarios.length || criteriaLines.length } };
  }

  // 3. Gherkin scenarios are complete (Given / When / Then).
  {
    const incomplete = scenarios.filter((s) => !(s.given && s.when && s.then)).length;
    const pass = scenarios.length > 0 && incomplete === 0;
    results.gherkin = { status: pass ? 'pass' : 'fail', params: { count: scenarios.length, incomplete } };
  }

  // 4. Edge cases: more than the happy path, at least one negative case.
  {
    const negative = cases.filter((c) => RE_NEGATIVE.test(c)).length;
    const pass = cases.length >= 2 && negative >= 1;
    results.edgeCases = { status: pass ? 'pass' : 'fail', params: { cases: cases.length, negative } };
  }

  // 5. Open questions / placeholders.
  {
    const found = findTerms(allFolded, OPEN_QUESTION_TERMS);
    if (/\?{2,}/.test(allFolded)) found.push('??');
    results.openQuestions = { status: found.length ? 'fail' : 'pass', params: { found: found.slice(0, 4) } };
  }

  // 6. Estimate.
  {
    const sp = issue.storyPoints;
    if (sp === undefined) results.estimate = { status: 'na', params: {} };
    else results.estimate = { status: typeof sp === 'number' && sp > 0 ? 'pass' : 'fail', params: { value: sp } };
  }

  // 7. Ambiguous wording.
  {
    const found = findTerms(allFolded, AMBIGUOUS_TERMS);
    results.ambiguity = { status: found.length ? 'fail' : 'pass', params: { found: found.slice(0, 5) } };
  }

  // 8. Enough detail.
  {
    const words = `${text} ${acText}`.split(/\s+/).filter((w) => /[a-z0-9]/i.test(fold(w))).length;
    results.detail = { status: words >= settings.minWords ? 'pass' : 'fail', params: { words, min: settings.minWords } };
  }

  // 9. Design link or visual attachment.
  {
    const hasUrl = (issue.urls || []).some((u) => RE_DESIGN_URL.test(u));
    const hasVisual = (issue.attachments || []).some((a) => /^image\//.test(a.mimeType || '') || /\.(png|jpe?g|gif|webp|pdf|fig)$/i.test(a.filename || ''));
    results.designLink = { status: hasUrl || hasVisual ? 'pass' : 'fail', params: {} };
  }

  const checks = CHECK_IDS
    .filter((id) => settings.checks[id].enabled)
    .map((id) => ({ id, weight: settings.checks[id].weight, ...results[id] }));

  const scored = checks.filter((c) => c.status !== 'na');
  const total = scored.reduce((sum, c) => sum + c.weight, 0);
  const earned = scored.filter((c) => c.status === 'pass').reduce((sum, c) => sum + c.weight, 0);
  const score = total ? Math.round((earned / total) * 100) : 100;

  // "What if...?" questions QA is likely to ask.
  let triggered = WHAT_IF_RULES.filter((r) => r.trigger.test(allFolded));
  if (!triggered.length) triggered = [GENERIC_RULE];
  const suggestions = triggered
    .map((r) => ({ id: r.id, covered: r.cover.test(casesFolded) }))
    .sort((a, b) => Number(a.covered) - Number(b.covered))
    .slice(0, MAX_SUGGESTIONS);

  return {
    score,
    threshold: settings.threshold,
    ready: score >= settings.threshold,
    checks,
    suggestions,
  };
}
