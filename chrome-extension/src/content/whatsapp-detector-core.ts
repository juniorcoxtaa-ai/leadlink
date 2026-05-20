export function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeCandidate(value: string | null | undefined) {
  const digits = onlyDigits(value);
  if (digits.length < 10 || digits.length > 13) return null;
  const local = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
  if (local.length < 10 || local.length > 11) return null;
  if (!/^\d{2}9?\d{8}$/.test(local)) return null;
  return digits;
}

export function phoneFromUrlString(href: string) {
  // new URL() lança TypeError para URLs malformadas. Quando chamada dentro de
  // detectPhone() → publishDetection() → setTimeout, uma exceção não capturada
  // impediria o envio de WHATSAPP_CONVERSATION_CLOSED e corromperia o estado.
  try {
    const url = new URL(href);
    const phoneFromPath = url.pathname.match(/\/send\/?([^/?#]+)?/)?.[1];
    const phone = url.searchParams.get("phone") || phoneFromPath;
    return normalizeCandidate(phone);
  } catch {
    return null;
  }
}

export function extractCusPhone(value: string | null | undefined) {
  const raw = String(value ?? "");
  if (/@g\.us\b/i.test(raw)) return null;
  const match = raw.match(/(\d{10,13})@c\.us\b/i);
  if (!match) return null;
  return normalizeCandidate(match[1]);
}

export function extractPhoneFromCandidates(values: Array<string | null | undefined>) {
  for (const value of values) {
    const phone = extractCusPhone(value);
    if (phone) return phone;
  }
  return null;
}

export function extractBrazilianPhoneFromText(text: string | null | undefined) {
  const raw = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return null;

  const candidates = [
    ...raw.matchAll(/(?:\+?55[\s-]*)?(?:\(?\d{2}\)?[\s-]*)?(?:9?\d{4})[\s-]*\d{4}/g),
    ...raw.matchAll(/\b\d{10,13}\b/g),
  ].map((match) => normalizeCandidate(match[0]));

  return candidates.find(Boolean) ?? null;
}

export function nextDetectedPhone(current: string | null, detected: string | null) {
  return current === detected ? null : detected;
}

export type WhatsappConversationMessage = {
  from: "me" | "them";
  text: string;
  time?: string;
};

export type ConversationContainerMatch = {
  element: HTMLElement | null;
  selector: string | null;
  rows: number;
  width: number;
  height: number;
  debug: Array<{
    selector: string;
    accepted: boolean;
    reason: string;
    rows: number;
    width: number;
    height: number;
    left: number;
    top: number;
  }>;
};

type ConversationContainerValidation = {
  valid: boolean;
  reason:
    | "svg/mask"
    | "not html element"
    | "in sidebar"
    | "too small"
    | "invisible"
    | "sidebar marker"
    | "no rows";
  rows: number;
  width: number;
  height: number;
  left: number;
  top: number;
};

// ---------------------------------------------------------------------------
// Seletores internos
// ---------------------------------------------------------------------------

/**
 * Elementos que NÃO são mensagens: caixa de digitação, barra lateral e lista
 * de contatos. Qualquer nó que seja descendente desses seletores é ignorado.
 */
const NOISE_ROOTS_SELECTOR = [
  '[data-testid="conversation-compose-box"]',
  '[data-testid="chat-list"]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  "#side",
  '[data-testid="side"]',
].join(", ");

/**
 * Seletores de container de mensagem, do mais específico para o menos.
 * Estratégia 1: data-testid estável do WhatsApp Web.
 * Estratégia 2: classes clássicas .message-in / .message-out.
 */
const PRIMARY_CONTAINER_SELECTOR = [
  '[data-testid="msg-container"]',
  ".message-in",
  ".message-out",
].join(", ");

/**
 * Folhas de texto dentro de um container de mensagem.
 * Ordenadas da mais específica (aria/testid) para a mais genérica (span[dir]).
 */
const TEXT_LEAF_SELECTOR = [
  '[data-testid="conversation-text"]',
  ".selectable-text",
  ".copyable-text",
  "span[dir='auto']",
  "span[dir='ltr']",
].join(", ");

/**
 * Seletor da área de mensagens (lista virtualizada).
 * Usado como raiz de fallback quando as estratégias primárias falham.
 */
const MSG_LIST_SELECTOR = [
  '[data-testid="conversation-panel-messages"]',
  '[aria-label*="mensagens"]',
  '[aria-label*="messages"]',
  '[role="application"]',
].join(", ");

const MODERN_CONVERSATION_SELECTOR = [
  '[data-tab="8"]',
  '[data-testid="conversation-panel-body"]',
  '[data-testid="conversation-panel-messages"]',
  MSG_LIST_SELECTOR,
].join(", ");

const HEADER_CANDIDATE_SELECTOR = [
  "header",
  '[data-testid="conversation-info-header"]',
  '[data-testid="conversation-header"]',
  '[role="banner"]',
].join(", ");

// ---------------------------------------------------------------------------
// Funções utilitárias internas
// ---------------------------------------------------------------------------

function isInNoiseRoot(node: Element): boolean {
  return Boolean(node.closest(NOISE_ROOTS_SELECTOR));
}

function measureElement(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  const width =
    rect.width ||
    node.clientWidth ||
    Number.parseFloat(style.width) ||
    Number.parseFloat(node.getAttribute("data-test-width") ?? "0") ||
    0;
  const height =
    rect.height ||
    node.clientHeight ||
    Number.parseFloat(style.height) ||
    Number.parseFloat(node.getAttribute("data-test-height") ?? "0") ||
    0;
  const left = rect.left || Number.parseFloat(style.left) || Number.parseFloat(node.getAttribute("data-test-left") ?? "0") || 0;
  const top = rect.top || Number.parseFloat(style.top) || Number.parseFloat(node.getAttribute("data-test-top") ?? "0") || 0;
  return { width, height, left, top };
}

function isVisibleElement(node: HTMLElement): boolean {
  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = measureElement(node);
  return rect.width > 0 && rect.height > 0;
}

function rowCountIn(node: ParentNode) {
  return node.querySelectorAll?.('[role="row"], [role="listitem"]').length ?? 0;
}

function messageStructureCount(node: ParentNode) {
  return (
    node.querySelectorAll?.(
      `${PRIMARY_CONTAINER_SELECTOR}, [data-pre-plain-text], [data-testid="conversation-text"]`,
    ).length ?? 0
  );
}

function isScrollableContainer(node: HTMLElement) {
  const style = window.getComputedStyle(node);
  const overflowY = style.overflowY.toLowerCase();
  return overflowY === "auto" || overflowY === "scroll" || node.scrollHeight > node.clientHeight + 24;
}

function isLikelySidebar(node: HTMLElement, rect: ReturnType<typeof measureElement>): string | null {
  const id = node.id?.toLowerCase() ?? "";
  const testId = node.getAttribute("data-testid")?.toLowerCase() ?? "";
  const ariaLabel = node.getAttribute("aria-label")?.toLowerCase() ?? "";
  const role = node.getAttribute("role")?.toLowerCase() ?? "";

  if (id === "side" || testId.includes("side") || testId.includes("chat-list")) return "sidebar marker";
  if (ariaLabel.includes("chat") && rect.width < 520) return "chat list label";
  if (role === "navigation" || role === "complementary") return "navigation/complementary";
  if (rect.width < 420) return "too narrow";
  if (rect.left < 140 && rect.width < window.innerWidth * 0.5) return "left sidebar region";
  return null;
}

export function isValidConversationContainer(el: Element | null | undefined): ConversationContainerValidation {
  if (el instanceof SVGElement || ["mask", "svg", "path", "rect"].includes(el?.tagName?.toLowerCase?.() ?? "") || Boolean(el?.closest?.("svg"))) {
    return { valid: false, reason: "svg/mask", rows: 0, width: 0, height: 0, left: 0, top: 0 };
  }

  if (!(el instanceof HTMLElement)) {
    return { valid: false, reason: "not html element", rows: 0, width: 0, height: 0, left: 0, top: 0 };
  }

  const rect = measureElement(el);
  const rows = rowCountIn(el);
  const structures = messageStructureCount(el);

  if (!isVisibleElement(el)) {
    return { valid: false, reason: "invisible", rows, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  }

  if (el.closest("#side, [data-testid='side']")) {
    return { valid: false, reason: "in sidebar", rows, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  }

  const sidebarReason = isLikelySidebar(el, rect);
  if (sidebarReason) {
    return { valid: false, reason: "sidebar marker", rows, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  }

  if (rect.width <= 300 || rect.height <= 300) {
    return { valid: false, reason: "too small", rows, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  }

  if (!rows && !structures) {
    return { valid: false, reason: "no rows", rows, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
  }

  return { valid: true, reason: "no rows", rows, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
}

function inspectConversationCandidate(selector: string, node: Element | null) {
  if (!node) {
    return {
      selector,
      accepted: false,
      reason: "not found",
      rows: 0,
      width: 0,
      height: 0,
      left: 0,
      top: 0,
    };
  }

  const validation = isValidConversationContainer(node);
  return {
    selector,
    accepted: validation.valid,
    reason: validation.valid ? "matched" : validation.reason,
    rows: validation.rows,
    width: validation.width,
    height: validation.height,
    left: validation.left,
    top: validation.top,
  };
}

function scoreConversationCandidate(node: HTMLElement) {
  const rect = measureElement(node);
  const rows = rowCountIn(node);
  const centered = Math.max(0, window.innerWidth / 2 - Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2));
  const scrollBonus = isScrollableContainer(node) ? 200 : 0;
  return rows * 1000 + rect.height * 2 + rect.width + centered + scrollBonus;
}

function dedupeLines(lines: string[]) {
  return lines.filter((line, index) => lines.indexOf(line) === index);
}

function shouldIgnoreMessageLine(line: string) {
  const normalized = line.trim().toLowerCase();
  if (!normalized) return true;

  // Horários e datas isolados
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(normalized)) return true;
  if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(normalized)) return true;

  // Rótulos de UI do WhatsApp (ações, tipos de mídia, estados)
  if (/^(encaminhada?|reagir|menu|mais opç(õ|o)es?|mensagem apagada)$/i.test(normalized)) return true;
  if (/^(foto|vídeo|video|sticker|gif|documento|audio|áudio|figurinha)$/i.test(normalized)) return true;
  if (/^(ler mais|leia mais|view more|read more)$/i.test(normalized)) return true;
  if (/^(abrir|fechar|reply|responder|curtir|arquivar|excluir|deletar)$/i.test(normalized)) return true;
  if (/^(enviado?a?|recebido?a?|lido?a?|aguardando|não entregue)$/i.test(normalized)) return true;
  if (/^(hoje|ontem|yesterday|today)$/i.test(normalized)) return true;

  // Placeholder da caixa de digitação
  if (/(digite uma mensagem|escreva uma mensagem|type a message)/i.test(normalized)) return true;

  return false;
}

export function sanitizeWhatsappMessageText(value: string | null | undefined) {
  const text = String(value ?? "").replace(/‎|‏|‪|‬/g, "").trim();

  if (!text) return "";

  const lines = dedupeLines(
    text
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => !shouldIgnoreMessageLine(line)),
  );

  return lines.join(" ").trim();
}

export function extractWhatsappMessageTime(value: string | null | undefined) {
  const raw = String(value ?? "");
  const match = raw.match(/\[(\d{1,2}:\d{2})(?:,\s*[\d/]+)?\]/);
  return match?.[1] || undefined;
}

// ---------------------------------------------------------------------------
// Extração de containers de mensagem (multi-estratégia)
// ---------------------------------------------------------------------------

/**
 * Encontra todos os containers de mensagem visíveis dentro de `root`.
 *
 * Usa 3 estratégias em ordem decrescente de especificidade:
 *
 *  1. data-testid="msg-container" e .message-in/.message-out (clássico, ≤2024)
 *  2. [data-pre-plain-text] → sobe para o container mais próximo
 *  3. [role="row"] / [role="listitem"] direto no root (WhatsApp Web 2025+)
 *     — NÃO exige data-id no elemento de linha, pois no layout atual o
 *       data-id fica em um filho ou não existe. Buscamos todos os rows e
 *       filtramos ruído via shouldIgnoreMessageLine / isInNoiseRoot.
 *
 * Elementos dentro da caixa de digitação ou barra lateral são sempre ignorados.
 */
function messageContainers(root: ParentNode): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const containers: HTMLElement[] = [];

  function add(node: HTMLElement) {
    if (seen.has(node)) return;
    if (isInNoiseRoot(node)) return;
    seen.add(node);
    containers.push(node);
  }

  // Estratégia 1: seletores primários estáveis (WhatsApp Web clássico)
  for (const node of Array.from(root.querySelectorAll<HTMLElement>(PRIMARY_CONTAINER_SELECTOR))) {
    add(node);
  }

  // Estratégia 2: elementos com data-pre-plain-text
  if (!containers.length) {
    for (const node of Array.from(root.querySelectorAll<HTMLElement>("[data-pre-plain-text]"))) {
      if (isInNoiseRoot(node)) continue;
      const ancestor = node.closest<HTMLElement>(
        PRIMARY_CONTAINER_SELECTOR + ", [role='row'], [role='listitem']",
      );
      add(ancestor ?? node);
    }
  }

  // Estratégia 3: lista virtualizada — [role="row"] sem exigir data-id no elemento.
  // Confirmado no WhatsApp Web 2025+:
  //   document.querySelectorAll('[role="row"]').length → 62
  //   document.querySelectorAll('[role="row"][data-id]').length → 0
  // O data-id está nos FILHOS, não no row. Por isso removemos o requisito.
  if (!containers.length) {
    for (const node of Array.from(
      root.querySelectorAll<HTMLElement>('[role="row"], [role="listitem"]'),
    )) {
      add(node);
    }
  }

  return containers;
}

// ---------------------------------------------------------------------------
// Inferência de autor (me / them)
// ---------------------------------------------------------------------------

function inferMessageAuthor(node: HTMLElement): "me" | "them" {
  // 1. Classe direta no container
  if (node.classList.contains("message-out")) return "me";
  if (node.classList.contains("message-in")) return "them";

  // 2. Classe em descendente
  if (node.querySelector(".message-out, .tail-out")) return "me";
  if (node.querySelector(".message-in, .tail-in")) return "them";

  // 3. data-id: "true_PHONE@c.us_ID" = enviado por mim; "false_..." = recebido
  const dataIdEl = node.hasAttribute("data-id") ? node : node.querySelector<HTMLElement>("[data-id]");
  const dataId = dataIdEl?.getAttribute("data-id") ?? "";
  if (dataId.startsWith("true_")) return "me";
  if (dataId.startsWith("false_")) return "them";

  // 4. Ícones de status de entrega (presentes apenas em mensagens enviadas)
  if (
    node.querySelector(
      '[data-testid="msg-meta-out"], [data-icon="msg-dblcheck"], [data-icon="msg-dblcheck-ack"], [data-icon="msg-check"], [data-icon="msg-time"]',
    )
  ) {
    return "me";
  }

  return "them";
}

// ---------------------------------------------------------------------------
// Extração de texto e mídia
// ---------------------------------------------------------------------------

/**
 * Retorna um placeholder de texto para mensagens que são puramente mídia
 * (imagem, vídeo, áudio, documento) sem legenda textual.
 */
function extractMediaPlaceholder(node: HTMLElement, author: "me" | "them"): string | null {
  // Áudio / nota de voz
  if (node.querySelector('[data-testid="audio-progress"], [data-icon="ptt-played"], [data-icon="ptt"]')) {
    return author === "me" ? "[áudio enviado]" : "[áudio recebido]";
  }
  // Documento
  if (
    node.querySelector(
      '[data-testid="document-thumb"], [data-testid="media-document"], [data-icon="document-filled"]',
    )
  ) {
    return author === "me" ? "[documento enviado]" : "[documento recebido]";
  }
  // Vídeo
  if (node.querySelector('video, [data-testid="video-thumb"], [data-icon="video"]')) {
    return author === "me" ? "[vídeo enviado]" : "[vídeo recebido]";
  }
  // Imagem
  if (
    node.querySelector(
      'img[src*="blob:"], [data-testid="image-thumb"], [data-testid="media-url-provider"], img[referrerpolicy]',
    )
  ) {
    return author === "me" ? "[imagem enviada]" : "[imagem recebida]";
  }
  if (node.querySelector('[data-testid*="media"], [data-icon="media-disabled"], canvas')) {
    return author === "me" ? "[mídia enviada]" : "[mídia recebida]";
  }
  return null;
}

function extractMessageText(node: HTMLElement): string {
  // Passo 1: seletores conhecidos (.selectable-text, span[dir], data-testid…).
  // Filtra para "folhas" — elementos sem filhos que também sejam folhas — para
  // evitar capturar o mesmo texto tanto no pai quanto no filho.
  const knownLeaves = Array.from(node.querySelectorAll<HTMLElement>(TEXT_LEAF_SELECTOR)).filter(
    (el) => !el.querySelector(TEXT_LEAF_SELECTOR),
  );
  const knownCandidates = knownLeaves
    .map((el) => sanitizeWhatsappMessageText(el.textContent))
    .filter(Boolean);
  if (knownCandidates.length) {
    knownCandidates.sort((a, b) => b.length - a.length);
    return knownCandidates[0];
  }

  // Passo 2: varredura genérica de <span> e <p> folha (sem classe específica).
  // Necessário no WhatsApp Web 2025+ onde as classes são ofuscadas e não há
  // span.selectable-text nem data-pre-plain-text. Captura qualquer folha com
  // texto de comprimento > 1 e retorna a mais longa que passe no filtro de ruído.
  const genericLeaves = Array.from(node.querySelectorAll<HTMLElement>("span, p")).filter(
    (el) =>
      !el.querySelector("span, p") && // só folhas (sem filhos span/p)
      (el.textContent?.trim().length ?? 0) > 1, // descarta chars únicos (reações)
  );
  const genericCandidates = genericLeaves
    .map((el) => sanitizeWhatsappMessageText(el.textContent))
    .filter((t) => t.length > 1);
  if (genericCandidates.length) {
    genericCandidates.sort((a, b) => b.length - a.length);
    return genericCandidates[0];
  }

  // Passo 3: textContent completo do nó — último recurso.
  return sanitizeWhatsappMessageText(node.textContent);
}

function extractMessageTime(node: HTMLElement) {
  // Passo 1: formato clássico "[HH:MM, DD/MM/YYYY]" em data-pre-plain-text.
  const sources = [
    node.getAttribute("data-pre-plain-text"),
    ...Array.from(
      node.querySelectorAll<HTMLElement>("[data-pre-plain-text], [aria-label], [title]"),
    ).flatMap((element) => [
      element.getAttribute("data-pre-plain-text"),
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
    ]),
  ];
  for (const source of sources) {
    const time = extractWhatsappMessageTime(source);
    if (time) return time;
  }

  // Passo 2: aria-label com horário direto — formato do WhatsApp Web 2025+.
  // Ex.: aria-label="16:12" ou aria-label="16:12, lido"
  const TIME_BARE = /^(\d{1,2}:\d{2})(?:[,\s]|$)/;
  for (const el of Array.from(node.querySelectorAll<HTMLElement>("[aria-label]"))) {
    const label = el.getAttribute("aria-label") ?? "";
    const m = label.match(TIME_BARE);
    if (m) return m[1];
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Extração principal
// ---------------------------------------------------------------------------

/**
 * Retorna informações de diagnóstico para uso em logs de dev.
 * Chamado por whatsapp-detector.ts quando isDev === true.
 *
 * Inclui contagens de cada estratégia para facilitar o diagnóstico quando o
 * extrator retorna array vazio (ex.: seletores desatualizados, novo layout).
 */
export function diagnoseDomForMessages(root: ParentNode): {
  primaryContainers: number;
  prePlainTextNodes: number;
  roleRowTotal: number;
  roleRowDataId: number;
  textLeaves: number;
  spanDirCount: number;
  sampleTexts: string[];
} {
  const asEl = root as HTMLElement;
  return {
    primaryContainers: asEl.querySelectorAll?.(PRIMARY_CONTAINER_SELECTOR).length ?? 0,
    prePlainTextNodes: asEl.querySelectorAll?.("[data-pre-plain-text]").length ?? 0,
    roleRowTotal: asEl.querySelectorAll?.('[role="row"], [role="listitem"]').length ?? 0,
    roleRowDataId: asEl.querySelectorAll?.('[role="row"][data-id], [role="listitem"][data-id]').length ?? 0,
    textLeaves: asEl.querySelectorAll?.(TEXT_LEAF_SELECTOR).length ?? 0,
    spanDirCount: asEl.querySelectorAll?.('span[dir="ltr"], span[dir="auto"]').length ?? 0,
    sampleTexts: Array.from(asEl.querySelectorAll?.('span[dir="ltr"], span[dir="auto"]') ?? [])
      .slice(0, 6)
      .map((el) => (el as HTMLElement).textContent?.replace(/\s+/g, " ").trim().slice(0, 60) ?? ""),
  };
}

export function findConversationContainer(root: ParentNode = document): ConversationContainerMatch {
  const debug: ConversationContainerMatch["debug"] = [];

  const addInspection = (selector: string, node: Element | null) => {
    const result = inspectConversationCandidate(selector, node);
    debug.push(result);
    return result;
  };

  const directCandidates: Array<[string, Element | null]> = [
    ["#main", root.querySelector("#main")],
    ['[data-testid="conversation-panel-messages"]', root.querySelector('[data-testid="conversation-panel-messages"]')],
    ["modern conversation selectors", root.querySelector(MODERN_CONVERSATION_SELECTOR)],
  ];

  for (const [selector, node] of directCandidates) {
    const result = addInspection(selector, node);
    if (result.accepted) {
      return { element: node as HTMLElement, selector, rows: result.rows, width: result.width, height: result.height, debug };
    }
  }

  const rowContainers = Array.from(root.querySelectorAll<HTMLElement>('[role="row"], [role="listitem"]'))
    .map((row) => row.closest<HTMLElement>(MODERN_CONVERSATION_SELECTOR) ?? row.parentElement?.closest<HTMLElement>("main, section, article, div") ?? row.parentElement)
    .filter((node): node is HTMLElement => Boolean(node));

  const uniqueRowContainers = Array.from(new Set(rowContainers));
  for (const node of uniqueRowContainers) {
    const result = addInspection("row ancestor", node);
    if (result.accepted) {
      return { element: node, selector: "row ancestor", rows: result.rows, width: result.width, height: result.height, debug };
    }
  }

  const broadCandidates = Array.from(root.querySelectorAll<HTMLElement>("main, section, article, div"))
    .filter((node) => rowCountIn(node) >= 2)
    .filter((node) => !isInNoiseRoot(node));

  let bestNode: HTMLElement | null = null;
  let bestScore = -1;

  for (const node of broadCandidates) {
    const result = addInspection("heuristic visible scroll container", node);
    if (!result.accepted) continue;
    const score = scoreConversationCandidate(node);
    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  if (bestNode) {
    const rect = measureElement(bestNode);
    return {
      element: bestNode,
      selector: "heuristic visible scroll container",
      rows: rowCountIn(bestNode),
      width: rect.width,
      height: rect.height,
      debug,
    };
  }

  return { element: null, selector: null, rows: 0, width: 0, height: 0, debug };
}

export function findActiveConversationHeader(root: ParentNode = document) {
  const conversation = findConversationContainer(root).element;
  const candidates = [
    conversation?.previousElementSibling instanceof HTMLElement ? conversation.previousElementSibling : null,
    conversation?.closest("main, section, article, div")?.querySelector?.<HTMLElement>(HEADER_CANDIDATE_SELECTOR) ?? null,
    conversation?.querySelector?.<HTMLElement>(HEADER_CANDIDATE_SELECTOR) ?? null,
    ...Array.from(root.querySelectorAll<HTMLElement>(HEADER_CANDIDATE_SELECTOR)),
  ].filter((node): node is HTMLElement => Boolean(node));

  const uniqueCandidates = Array.from(new Set(candidates)).filter((node) => {
    if (!isVisibleElement(node)) return false;
    if (node.closest("#side, [data-testid='side']")) return false;
    const rect = measureElement(node);
    if (isLikelySidebar(node, rect)) return false;
    return rect.width > 250 && rect.left >= 140;
  });

  uniqueCandidates.sort((a, b) => {
    const aRect = measureElement(a);
    const bRect = measureElement(b);
    const aScore = aRect.width + aRect.height - aRect.top;
    const bScore = bRect.width + bRect.height - bRect.top;
    return bScore - aScore;
  });

  return uniqueCandidates[0] ?? null;
}

export function extractVisibleConversationMessages(
  root: ParentNode,
  options?: { limit?: number; maxTextChars?: number },
): WhatsappConversationMessage[] {
  const limit = options?.limit ?? 20;
  const maxTextChars = options?.maxTextChars ?? 4000;

  const extracted = messageContainers(root)
    .map((node) => {
      const author = inferMessageAuthor(node);
      const text = extractMessageText(node);
      // Se não houver texto explícito, tenta placeholder de mídia
      const finalText = text || extractMediaPlaceholder(node, author);
      if (!finalText) return null;
      return {
        from: author,
        text: finalText,
        time: extractMessageTime(node),
      } satisfies WhatsappConversationMessage;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const lastMessages = extracted.slice(-limit);
  const trimmed: WhatsappConversationMessage[] = [];
  let totalChars = 0;

  for (let index = lastMessages.length - 1; index >= 0; index -= 1) {
    const message = lastMessages[index];
    if (!message) continue;
    const remaining = Math.max(0, maxTextChars - totalChars);
    if (remaining <= 0) break;
    const text = message.text.slice(0, remaining).trim();
    if (!text) continue;
    totalChars += text.length;
    trimmed.unshift({ ...message, text });
  }

  return trimmed;
}
