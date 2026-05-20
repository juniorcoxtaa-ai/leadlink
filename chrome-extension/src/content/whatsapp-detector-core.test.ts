import { describe, expect, it } from "vitest";
import {
  extractVisibleConversationMessages,
  extractBrazilianPhoneFromText,
  extractCusPhone,
  extractPhoneFromCandidates,
  findActiveConversationHeader,
  findConversationContainer,
  nextDetectedPhone,
  phoneFromUrlString,
  sanitizeWhatsappMessageText,
} from "@/content/whatsapp-detector-core";

describe("whatsapp detector core", () => {
  // -------------------------------------------------------------------------
  // Telefone
  // -------------------------------------------------------------------------

  it("extracts number from url with c.us", () => {
    expect(phoneFromUrlString("https://web.whatsapp.com/send?phone=5511998765432")).toBe("5511998765432");
  });

  it("extracts number from data-id", () => {
    expect(extractCusPhone("5511998765432@c.us")).toBe("5511998765432");
  });

  it("ignores groups", () => {
    expect(extractCusPhone("5511998765432@g.us")).toBeNull();
  });

  it("ignores suspicious values", () => {
    expect(extractCusPhone("abc123")).toBeNull();
  });

  it("returns null without conversation", () => {
    expect(extractPhoneFromCandidates([null, undefined, ""])).toBeNull();
  });

  it("extracts brazilian phone from visible text", () => {
    expect(extractBrazilianPhoneFromText("+55 14 99801-9400")).toBe("5514998019400");
    expect(extractBrazilianPhoneFromText("55 14 99801-9400")).toBe("5514998019400");
    expect(extractBrazilianPhoneFromText("(14) 99801-9400")).toBe("14998019400");
    expect(extractBrazilianPhoneFromText("14 99801-9400")).toBe("14998019400");
    expect(extractBrazilianPhoneFromText("14998019400")).toBe("14998019400");
  });

  it("does not return old phone", () => {
    expect(nextDetectedPhone("5511998765432", "5511998765432")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // sanitizeWhatsappMessageText
  // -------------------------------------------------------------------------

  it("sanitize: keeps real message text", () => {
    expect(sanitizeWhatsappMessageText("Oi, tudo bem?")).toBe("Oi, tudo bem?");
  });

  it("sanitize: removes time-only lines", () => {
    expect(sanitizeWhatsappMessageText("Olá\n16:12\ncomo vai?")).toBe("Olá como vai?");
  });

  it("sanitize: removes 'ler mais'", () => {
    expect(sanitizeWhatsappMessageText("texto\nLer mais")).toBe("texto");
  });

  it("sanitize: removes 'foto' label but not words containing foto", () => {
    expect(sanitizeWhatsappMessageText("foto")).toBe("");
    expect(sanitizeWhatsappMessageText("Gostei da foto")).toBe("Gostei da foto");
  });

  it("sanitize: removes 'hoje' and 'ontem' date labels", () => {
    expect(sanitizeWhatsappMessageText("hoje")).toBe("");
    expect(sanitizeWhatsappMessageText("Ontem")).toBe("");
  });

  it("sanitize: ignores compose box placeholder", () => {
    expect(sanitizeWhatsappMessageText("Digite uma mensagem")).toBe("");
    expect(sanitizeWhatsappMessageText("Type a message")).toBe("");
  });

  // -------------------------------------------------------------------------
  // Mensagem de texto normal
  // -------------------------------------------------------------------------

  it("extracts text messages from classic DOM structure", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in" data-pre-plain-text="[12:03, 18/05/2026] Lead: ">
          <div class="selectable-text">Oi, tudo bem?</div>
        </div>
        <div class="message-out" data-pre-plain-text="[12:04, 18/05/2026] Corretor: ">
          <div class="selectable-text">Tudo sim! Posso te mandar opcoes.</div>
        </div>
        <div class="message-in" data-pre-plain-text="[12:05, 18/05/2026] Lead: ">
          <div class="selectable-text">Gostei da regiao</div>
          <button>Menu</button>
        </div>
      </div>
    `;

    expect(extractVisibleConversationMessages(document.body)).toEqual([
      { from: "them", text: "Oi, tudo bem?", time: "12:03" },
      { from: "me", text: "Tudo sim! Posso te mandar opcoes.", time: "12:04" },
      { from: "them", text: "Gostei da regiao", time: "12:05" },
    ]);
  });

  it("extracts sent message (message-out) as from:'me'", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-out">
          <div class="selectable-text">Enviado por mim</div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.from).toBe("me");
    expect(result[0]!.text).toBe("Enviado por mim");
  });

  it("extracts received message (message-in) as from:'them'", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <div class="selectable-text">Recebido do lead</div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.from).toBe("them");
    expect(result[0]!.text).toBe("Recebido do lead");
  });

  // -------------------------------------------------------------------------
  // Mensagens com mídia
  // -------------------------------------------------------------------------

  it("returns image placeholder when message has image but no caption", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <img src="blob:https://web.whatsapp.com/abc123" referrerpolicy="no-referrer" />
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("[imagem recebida]");
    expect(result[0]!.from).toBe("them");
  });

  it("returns sent image placeholder for message-out with image", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-out">
          <img src="blob:https://web.whatsapp.com/xyz" referrerpolicy="no-referrer" />
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("[imagem enviada]");
    expect(result[0]!.from).toBe("me");
  });

  it("returns caption text when image has caption", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <img src="blob:https://web.whatsapp.com/abc" referrerpolicy="no-referrer" />
          <div class="selectable-text copyable-text">
            <span dir="ltr">Essa casa me interessa muito</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Essa casa me interessa muito");
  });

  it("returns video placeholder when message has video", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-out">
          <video src="blob:https://web.whatsapp.com/vid"></video>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("[vídeo enviado]");
  });

  it("returns audio placeholder when message has audio progress indicator", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <div data-testid="audio-progress"></div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("[áudio recebido]");
  });

  // -------------------------------------------------------------------------
  // Filtragem de ruído
  // -------------------------------------------------------------------------

  it("ignores 'Digite uma mensagem' from compose box", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <div class="selectable-text">Mensagem real do lead</div>
        </div>
        <div data-testid="conversation-compose-box">
          <span dir="auto">Digite uma mensagem</span>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Mensagem real do lead");
  });

  it("ignores elements inside sidebar (#side)", () => {
    document.body.innerHTML = `
      <div id="side">
        <div class="message-in">
          <div class="selectable-text">Texto na barra lateral</div>
        </div>
      </div>
      <div id="main">
        <div class="message-out">
          <div class="selectable-text">Mensagem real</div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    // Deve retornar apenas a mensagem de #main
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Mensagem real");
  });

  it("does not include time-only text as a message", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <div class="selectable-text">Preciso de uma proposta</div>
          <span dir="ltr">16:12</span>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    // O horário não deve aparecer no texto
    expect(result[0]!.text).not.toContain("16:12");
    expect(result[0]!.text).toBe("Preciso de uma proposta");
  });

  // -------------------------------------------------------------------------
  // Formato de lista virtualizada (data-testid="msg-container")
  // -------------------------------------------------------------------------

  it("extracts messages using data-testid='msg-container'", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div data-testid="msg-container">
            <div data-pre-plain-text="[14:20, 18/05/2026] Lead: ">
              <span class="selectable-text copyable-text">
                <span dir="ltr">Tem imóvel na região central?</span>
              </span>
            </div>
          </div>
        </div>
        <div role="row">
          <div data-testid="msg-container" class="message-out">
            <div data-pre-plain-text="[14:21, 18/05/2026] Eu: ">
              <span class="selectable-text copyable-text">
                <span dir="ltr">Sim, temos várias opções!</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe("Tem imóvel na região central?");
    expect(result[0]!.time).toBe("14:20");
    expect(result[1]!.from).toBe("me");
  });

  // -------------------------------------------------------------------------
  // Layout [role="row"] sem .selectable-text (WhatsApp Web 2025+)
  // Reproduz o ambiente real confirmado pelo usuário:
  //   [data-pre-plain-text] = 0, span.selectable-text = 0, [role="row"] = 62
  // -------------------------------------------------------------------------

  it("role=row: extracts plain text from bare span children", () => {
    // Layout confirmado no ambiente: só [role="row"] + spans sem classe
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div>
            <span>Oi, você tem apartamentos disponíveis?</span>
            <span>16:12</span>
          </div>
        </div>
        <div role="row">
          <div>
            <span>Sim, tenho várias opções para te mostrar!</span>
            <span>16:13</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(2);
    // "16:12" e "16:13" são filtrados por shouldIgnoreMessageLine
    expect(result[0]!.text).toBe("Oi, você tem apartamentos disponíveis?");
    expect(result[1]!.text).toBe("Sim, tenho várias opções para te mostrar!");
  });

  it("role=row: extracts text from span[dir=ltr] without class", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div>
            <span dir="ltr">Quero ver o apartamento de 2 quartos</span>
            <span dir="ltr" aria-label="09:45, enviado">09:45</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Quero ver o apartamento de 2 quartos");
  });

  it("role=row: extracts time from bare aria-label (formato 2025+)", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div>
            <span dir="ltr">Mensagem com horário no aria-label</span>
            <span aria-label="14:55, lido">14:55</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.time).toBe("14:55");
  });

  it("role=row: image without caption returns placeholder", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div>
            <img src="blob:https://web.whatsapp.com/abc123" referrerpolicy="no-referrer" />
            <span aria-label="16:12, recebido">16:12</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toMatch(/\[imagem/);
  });

  it("role=row: image with caption uses caption text (not placeholder)", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div>
            <img src="blob:https://web.whatsapp.com/img1" referrerpolicy="no-referrer" />
            <span dir="ltr">Essa fachada é incrível, né?</span>
            <span dir="ltr" aria-label="10:30">10:30</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Essa fachada é incrível, né?");
  });

  it("role=row: ignores 'Ler mais' standalone text", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <div>
            <span dir="ltr">Tenho interesse na proposta</span>
          </div>
        </div>
        <div role="row">
          <div>
            <span>Ler mais</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    // "Ler mais" row deve ser descartado por shouldIgnoreMessageLine
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Tenho interesse na proposta");
  });

  it("role=row: ignores row inside compose box (contenteditable)", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <span dir="ltr">Mensagem real</span>
        </div>
        <div role="textbox" contenteditable="true">
          <div role="row">
            <span>Digite uma mensagem</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Mensagem real");
  });

  it("role=row: date separator row is discarded", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row">
          <span>Hoje</span>
        </div>
        <div role="row">
          <span dir="ltr">Bom dia! Posso agendar uma visita?</span>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    // Linha "Hoje" → descartada por shouldIgnoreMessageLine
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("Bom dia! Posso agendar uma visita?");
  });

  it("role=row: multiple message types in realistic conversation", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row"><span>Hoje</span></div>
        <div role="row">
          <div data-id="false_5514998019400@c.us_ABCD">
            <span dir="ltr">Boa tarde! Você tem imóveis no bairro?</span>
            <span aria-label="14:00">14:00</span>
          </div>
        </div>
        <div role="row">
          <div data-id="true_5514998019400@c.us_EFGH">
            <span dir="ltr">Sim, tenho ótimas opções!</span>
            <span aria-label="14:01, enviado">14:01</span>
          </div>
        </div>
        <div role="row">
          <div data-id="false_5514998019400@c.us_IJKL">
            <img src="blob:https://web.whatsapp.com/img1" referrerpolicy="no-referrer" />
            <span dir="ltr">Essa aqui me chamou atenção</span>
            <span aria-label="14:02">14:02</span>
          </div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    // "Hoje" descartado; 3 mensagens reais
    expect(result).toHaveLength(3);
    expect(result[0]!.from).toBe("them");
    expect(result[0]!.text).toBe("Boa tarde! Você tem imóveis no bairro?");
    expect(result[1]!.from).toBe("me");
    expect(result[1]!.text).toBe("Sim, tenho ótimas opções!");
    expect(result[2]!.text).toBe("Essa aqui me chamou atenção"); // caption ganha
    expect(result[2]!.time).toBe("14:02");
  });

  // -------------------------------------------------------------------------
  // Inferência de autor por data-id
  // -------------------------------------------------------------------------

  it("infers 'me' from data-id starting with true_", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row" data-id="true_5511999@c.us_ABCD">
          <span dir="auto">Mensagem enviada</span>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.from).toBe("me");
  });

  it("infers 'them' from data-id starting with false_", () => {
    document.body.innerHTML = `
      <div id="main">
        <div role="row" data-id="false_5511999@c.us_ABCD">
          <span dir="auto">Mensagem recebida</span>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]!.from).toBe("them");
  });

  // -------------------------------------------------------------------------
  // Limites e truncamento
  // -------------------------------------------------------------------------

  it("respects limit option", () => {
    const msgs = Array.from({ length: 30 }, (_, i) => `
      <div class="message-in">
        <div class="selectable-text">Mensagem ${i + 1}</div>
      </div>
    `).join("");
    document.body.innerHTML = `<div id="main">${msgs}</div>`;

    const result = extractVisibleConversationMessages(document.body, { limit: 5 });
    expect(result).toHaveLength(5);
    // Deve ser as últimas 5 mensagens
    expect(result[result.length - 1]!.text).toBe("Mensagem 30");
  });

  it("respects maxTextChars option", () => {
    document.body.innerHTML = `
      <div id="main">
        <div class="message-in">
          <div class="selectable-text">${"A".repeat(3000)}</div>
        </div>
        <div class="message-out">
          <div class="selectable-text">${"B".repeat(3000)}</div>
        </div>
      </div>
    `;
    const result = extractVisibleConversationMessages(document.body, { maxTextChars: 2000 });
    const total = result.reduce((sum, m) => sum + m.text.length, 0);
    expect(total).toBeLessThanOrEqual(2000);
  });

  it("findConversationContainer: works without #main using alternate container", () => {
    document.body.innerHTML = `
      <div id="side" style="width: 320px; height: 900px;" data-test-width="320" data-test-height="900" data-test-left="0">
        <div role="row"><span>Chat lateral</span></div>
        <div role="row"><span>Outro chat</span></div>
      </div>
      <section data-testid="conversation-panel-messages" style="width: 860px; height: 900px;" data-test-width="860" data-test-height="900" data-test-left="360">
        <div role="row"><span dir="ltr">Mensagem A</span></div>
        <div role="row"><span dir="ltr">Mensagem B</span></div>
      </section>
    `;

    const result = findConversationContainer(document);
    expect(result.element?.getAttribute("data-testid")).toBe("conversation-panel-messages");
    expect(result.selector).toBe('[data-testid="conversation-panel-messages"]');
    expect(result.rows).toBe(2);
  });

  it("findConversationContainer: ignores sidebar and prefers central container with more rows", () => {
    document.body.innerHTML = `
      <div id="side" style="width: 300px; height: 900px;" data-test-width="300" data-test-height="900" data-test-left="0">
        <div role="row"><span>Chat 1</span></div>
        <div role="row"><span>Chat 2</span></div>
        <div role="row"><span>Chat 3</span></div>
      </div>
      <div style="width: 760px; height: 900px;" data-test-width="760" data-test-height="900" data-test-left="340">
        <div role="row"><span dir="ltr">Oi</span></div>
        <div role="row"><span dir="ltr">Tudo bem?</span></div>
        <div role="row"><span dir="ltr">Sim</span></div>
        <div role="row"><span dir="ltr">Vamos agendar</span></div>
      </div>
    `;

    const result = findConversationContainer(document);
    expect(result.element?.id).not.toBe("side");
    expect(result.rows).toBe(4);
    expect(result.debug.some((item) => item.reason === "in sidebar" || item.reason === "sidebar marker")).toBe(true);
  });

  it("extracts messages from alternate container without #main", () => {
    document.body.innerHTML = `
      <section data-testid="conversation-panel-messages" style="width: 820px; height: 900px;" data-test-width="820" data-test-height="900" data-test-left="360">
        <div role="row"><span dir="ltr">Mensagem sem main 1</span></div>
        <div role="row"><span dir="ltr">Mensagem sem main 2</span></div>
      </section>
    `;

    const container = findConversationContainer(document).element;
    expect(container).not.toBeNull();
    expect(extractVisibleConversationMessages(container!)).toEqual([
      { from: "them", text: "Mensagem sem main 1", time: undefined },
      { from: "them", text: "Mensagem sem main 2", time: undefined },
    ]);
  });

  it("returns generic media fallback when row has media without text", () => {
    document.body.innerHTML = `
      <section data-testid="conversation-panel-messages" style="width: 820px; height: 900px;" data-test-width="820" data-test-height="900" data-test-left="360">
        <div role="row">
          <div data-testid="media-pending"></div>
        </div>
      </section>
    `;

    const container = findConversationContainer(document).element;
    const result = extractVisibleConversationMessages(container!);
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("[mídia recebida]");
  });

  it("returns empty array when conversation container has no message rows", () => {
    document.body.innerHTML = `
      <section data-testid="conversation-panel-messages" style="width: 820px; height: 900px;" data-test-width="820" data-test-height="900" data-test-left="360">
        <div>Sem mensagens</div>
      </section>
    `;

    const containerMatch = findConversationContainer(document);
    expect(containerMatch.element).toBeNull();
    expect(extractVisibleConversationMessages(document.body)).toEqual([]);
  });

  it("rejects #main when it is an svg mask and chooses a valid conversation container", () => {
    document.body.innerHTML = `
      <svg width="0" height="0">
        <mask id="main" maskUnits="userSpaceOnUse">
          <rect width="100" height="100"></rect>
        </mask>
      </svg>
      <section data-testid="conversation-panel-messages" style="width: 840px; height: 900px;" data-test-width="840" data-test-height="900" data-test-left="360">
        <div role="row"><span dir="ltr">Mensagem real 1</span></div>
        <div role="row"><span dir="ltr">Mensagem real 2</span></div>
      </section>
    `;

    const result = findConversationContainer(document);
    expect(result.element?.tagName.toLowerCase()).toBe("section");
    expect(result.element?.getAttribute("data-testid")).toBe("conversation-panel-messages");
    expect(result.debug.some((item) => item.selector === "#main" && item.reason === "svg/mask")).toBe(true);
  });

  it("returns null when #main only exists as svg mask", () => {
    document.body.innerHTML = `
      <svg width="0" height="0">
        <mask id="main" maskUnits="userSpaceOnUse">
          <rect width="100" height="100"></rect>
        </mask>
      </svg>
    `;

    const result = findConversationContainer(document);
    expect(result.element).toBeNull();
    expect(result.debug.some((item) => item.selector === "#main" && item.reason === "svg/mask")).toBe(true);
  });

  it("finds visible active header with phone text and ignores sidebar", () => {
    document.body.innerHTML = `
      <div id="side" style="width: 300px; height: 900px;" data-test-width="300" data-test-height="900" data-test-left="0">
        <header style="width: 280px; height: 60px;" data-test-width="280" data-test-height="60" data-test-left="0">
          +55 11 99999-9999
        </header>
      </div>
      <div style="width: 860px; height: 900px;" data-test-width="860" data-test-height="900" data-test-left="340">
        <header style="width: 820px; height: 72px;" data-test-width="820" data-test-height="72" data-test-left="360">
          +55 14 99801-9400
        </header>
        <section data-testid="conversation-panel-messages" style="width: 820px; height: 820px;" data-test-width="820" data-test-height="820" data-test-left="360">
          <div role="row"><span dir="ltr">Oi</span></div>
        </section>
      </div>
    `;

    const header = findActiveConversationHeader(document);
    expect(header?.textContent).toContain("+55 14 99801-9400");
    expect(extractBrazilianPhoneFromText(header?.textContent)).toBe("5514998019400");
  });
});
