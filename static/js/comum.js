// Utilitários compartilhados por todos os simuladores.

/* ---------- números no formato brasileiro ---------- */

/** Converte "1.234,56", "1234.56", "R$ 1.500" em número. Vazio ou inválido vira 0. */
export function lerNumero(texto) {
  if (typeof texto === "number") return texto;
  let s = String(texto ?? "").trim().replace(/[^\d,.\-]/g, "");
  if (!s) return 0;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "1.500" ou "60.000" = milhar
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const fmtCache = {};
function fmt(casas) {
  return (fmtCache[casas] ??= new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  }));
}

export const reais = (n, casas = 0) => "R$ " + fmt(casas).format(Math.abs(n) < 0.5 / 10 ** casas ? 0 : n);
export const numero = (n, casas = 0) => fmt(casas).format(n);
export const pct = (n, casas = 0) => fmt(casas).format(n * 100) + "%";

/** Formato curto para eixos de gráfico: R$ 1,2 mi, R$ 350 mil. */
export function reaisCurto(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return "R$ " + fmt(1).format(n / 1e6) + " mi";
  if (a >= 1e3) return "R$ " + fmt(0).format(n / 1e3) + " mil";
  return "R$ " + fmt(0).format(n);
}

/* ---------- formulário, URL e compartilhamento ---------- */

/**
 * Liga o formulário: lê a URL, recalcula a cada digitação, restaura padrões e copia link.
 * @param {object} op
 * @param {() => void} op.calcular  chamada sempre que algo muda
 * @param {() => Record<string,string>} [op.estadoExtra]  campos extras para o link
 * @param {(params: URLSearchParams) => void} [op.restaurarExtra]  lê campos extras da URL (null = padrão)
 */
export function ligarFormulario({ calcular, estadoExtra, restaurarExtra }) {
  const form = document.getElementById("form");
  const params = new URLSearchParams(location.search);

  // valores vindos de um link compartilhado
  for (const el of form.elements) {
    if (!el.name || !params.has(el.name)) continue;
    if (el.type === "radio") el.checked = el.value === params.get(el.name);
    else el.value = params.get(el.name);
  }
  restaurarExtra?.(params.toString() ? params : null);

  // atalho fixo no celular: mostra o número principal enquanto o resultado está fora da tela
  const atalho = document.getElementById("atalho-resultado");
  const resultado = document.getElementById("resultado");
  const calcularTudo = () => {
    calcular();
    const mark = document.querySelector(".veredito mark");
    if (atalho && mark) document.getElementById("atalho-valor").textContent = mark.textContent;
  };
  ligarFormulario.recalcular = calcularTudo;
  if (atalho && resultado && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      atalho.hidden = e.isIntersecting || e.boundingClientRect.top < 0;
    }).observe(resultado);
  }

  let pendente = null;
  const agendar = () => {
    cancelAnimationFrame(pendente);
    pendente = requestAnimationFrame(calcularTudo);
  };
  form.addEventListener("input", agendar);
  form.addEventListener("change", agendar);
  form.addEventListener("submit", (ev) => ev.preventDefault());

  // ao sair do campo, mostra o número formatado (ex.: 60000 -> 60.000)
  form.addEventListener("focusout", (ev) => {
    const el = ev.target;
    if (el.matches?.("input[inputmode=decimal]") && el.value.trim() !== "") {
      const n = lerNumero(el.value);
      const casas = Number.isInteger(n) ? 0 : 2;
      el.value = fmt(casas).format(n);
    }
  });

  document.getElementById("restaurar")?.addEventListener("click", () => {
    for (const el of form.elements) {
      if (el.dataset.padrao !== undefined) el.value = el.dataset.padrao;
      if (el.type === "radio") el.checked = el.defaultChecked;
    }
    restaurarExtra?.(null);
    history.replaceState(null, "", location.pathname);
    ligarFormulario.recalcular();
  });

  const botao = document.getElementById("copiar-link");
  const aviso = document.getElementById("copiar-aviso");
  botao?.addEventListener("click", async () => {
    const p = new URLSearchParams();
    for (const el of form.elements) {
      if (!el.name || (el.type === "radio" && !el.checked)) continue;
      p.set(el.name, el.value);
    }
    for (const [k, v] of Object.entries(estadoExtra?.() ?? {})) p.set(k, v);
    const url = location.origin + location.pathname + "?" + p.toString();
    history.replaceState(null, "", "?" + p.toString());
    try {
      await navigator.clipboard.writeText(url);
      aviso.textContent = "Link copiado. Quem abrir verá estes mesmos números.";
    } catch {
      aviso.textContent = "Copie o endereço da barra do navegador para compartilhar.";
    }
    setTimeout(() => (aviso.textContent = ""), 5000);
  });

  calcularTudo();
}

/** Lê os campos numéricos do formulário pelo id. */
export function valores(ids) {
  const out = {};
  for (const id of ids) out[id] = lerNumero(document.getElementById(id).value);
  return out;
}

export function radio(nome) {
  return document.querySelector(`input[name="${nome}"]:checked`)?.value;
}

export function texto(id, conteudo) {
  const el = document.getElementById(id);
  if (el) el.textContent = conteudo;
}

/* ---------- gráficos ---------- */

/**
 * Barras horizontais em HTML (acessível e leve).
 * itens: [{nome, valor, classe?}]
 */
export function barras(container, itens, formatar = (v) => reais(v)) {
  const max = Math.max(...itens.map((i) => i.valor), 1e-9);
  container.innerHTML = "";
  const lista = document.createElement("ul");
  lista.className = "barras";
  for (const i of itens) {
    const li = document.createElement("li");
    li.className = "barras__item" + (i.classe ? " " + i.classe : "");
    li.innerHTML = `
      <span class="barras__nome"></span>
      <span class="barras__valor"></span>
      <span class="barras__trilho" aria-hidden="true"><span class="barras__barra"></span></span>`;
    li.querySelector(".barras__nome").textContent = i.nome;
    li.querySelector(".barras__valor").textContent = formatar(i.valor);
    li.querySelector(".barras__barra").style.width = Math.max((i.valor / max) * 100, 0.5) + "%";
    lista.appendChild(li);
  }
  container.appendChild(lista);
}

function passoBonito(bruto) {
  const exp = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

/**
 * Gráfico de linhas em SVG com dica ao passar o dedo/mouse.
 * @param {HTMLElement} container
 * @param {object} op
 * @param {Array<{nome:string, classe:string, pontos:Array<{x:number,y:number}>}>} op.series
 * @param {(x:number)=>string} op.rotuloX
 * @param {(y:number)=>string} op.rotuloY
 * @param {string} op.descricao texto alternativo
 */
export function linhas(container, op) {
  const desenhar = () => {
    const largura = Math.max(container.clientWidth, 280);
    const altura = largura < 480 ? 240 : 300;
    const m = { t: 16, r: 16, b: 32, l: largura < 480 ? 64 : 76 };
    const W = largura - m.l - m.r;
    const H = altura - m.t - m.b;

    const xs = op.series[0].pontos.map((p) => p.x);
    const ys = op.series.flatMap((s) => s.pontos.map((p) => p.y));
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    let yMin = Math.min(0, ...ys), yMax = Math.max(...ys);
    const passo = passoBonito((yMax - yMin) / 4 || 1);
    yMin = Math.floor(yMin / passo) * passo;
    yMax = Math.ceil(yMax / passo) * passo;

    const sx = (x) => m.l + ((x - xMin) / (xMax - xMin || 1)) * W;
    const sy = (y) => m.t + H - ((y - yMin) / (yMax - yMin || 1)) * H;

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${largura} ${altura}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", op.descricao);
    svg.classList.add("grafico");

    let html = "";
    for (let y = yMin; y <= yMax + passo / 2; y += passo) {
      html += `<line class="grafico__grade${y === 0 ? " grafico__grade--zero" : ""}" x1="${m.l}" x2="${m.l + W}" y1="${sy(y)}" y2="${sy(y)}"/>`;
      html += `<text class="grafico__eixo" x="${m.l - 8}" y="${sy(y)}" text-anchor="end" dominant-baseline="middle">${op.rotuloY(y)}</text>`;
    }
    const nTicks = Math.min(xs.length - 1, largura < 480 ? 4 : 8);
    const passoX = Math.max(1, Math.ceil((xMax - xMin) / Math.max(nTicks, 1)));
    let ultimoX = xMin;
    for (let x = xMin; x <= xMax; x += passoX) {
      html += `<text class="grafico__eixo" x="${sx(x)}" y="${m.t + H + 20}" text-anchor="middle">${op.rotuloX(x)}</text>`;
      ultimoX = x;
    }
    if (xMax - ultimoX >= passoX * 0.6) {
      html += `<text class="grafico__eixo" x="${sx(xMax)}" y="${m.t + H + 20}" text-anchor="middle">${op.rotuloX(xMax)}</text>`;
    }
    for (const s of op.series) {
      const d = s.pontos.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
      html += `<path class="grafico__linha ${s.classe}" d="${d}"/>`;
    }
    html += `<line class="grafico__guia" y1="${m.t}" y2="${m.t + H}" x1="-10" x2="-10"/>`;
    for (const s of op.series) html += `<circle class="grafico__ponto ${s.classe}" r="4.5" cx="-10" cy="-10"/>`;
    html += `<rect class="grafico__alvo" x="${m.l}" y="${m.t}" width="${W}" height="${H}"/>`;
    svg.innerHTML = html;

    container.innerHTML = "";
    container.style.position = "relative";
    container.appendChild(svg);
    const dica = document.createElement("div");
    dica.className = "grafico__dica";
    dica.hidden = true;
    container.appendChild(dica);

    const guia = svg.querySelector(".grafico__guia");
    const pontos = svg.querySelectorAll(".grafico__ponto");
    const mover = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * largura;
      let idx = 0, melhor = Infinity;
      xs.forEach((x, i) => { const d = Math.abs(sx(x) - px); if (d < melhor) { melhor = d; idx = i; } });
      const x = sx(xs[idx]);
      guia.setAttribute("x1", x); guia.setAttribute("x2", x);
      op.series.forEach((s, k) => {
        pontos[k].setAttribute("cx", x);
        pontos[k].setAttribute("cy", sy(s.pontos[idx].y));
      });
      svg.classList.add("grafico--ativo");
      dica.hidden = false;
      dica.innerHTML = `<strong>${op.rotuloX(xs[idx], true)}</strong>` +
        op.series.map((s) => `<span class="${s.classe}">${s.nome}: ${reais(s.pontos[idx].y)}</span>`).join("");
      const escala = r.width / largura;
      const esquerda = x * escala;
      dica.style.left = Math.min(Math.max(esquerda - dica.offsetWidth / 2, 0), r.width - dica.offsetWidth) + "px";
      dica.style.top = "0px";
    };
    const sair = () => { svg.classList.remove("grafico--ativo"); dica.hidden = true; guia.setAttribute("x1", -10); guia.setAttribute("x2", -10); pontos.forEach((p) => p.setAttribute("cx", -10)); };
    svg.addEventListener("pointermove", mover);
    svg.addEventListener("pointerdown", mover);
    svg.addEventListener("pointerleave", sair);
  };

  desenhar();
  if (!container._observador) {
    let largura = container.clientWidth;
    container._observador = new ResizeObserver(() => {
      if (Math.abs(container.clientWidth - largura) > 8) { largura = container.clientWidth; container._redesenhar?.(); }
    });
    container._observador.observe(container);
  }
  container._redesenhar = desenhar;
}
