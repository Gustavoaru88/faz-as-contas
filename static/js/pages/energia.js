import { ligarFormulario, lerNumero, texto, reais, numero, pct, barras } from "../comum.js";
import { calcularEnergia, kwhMes, APARELHOS_PADRAO, CATALOGO } from "../calc/energia.js";

const lista = document.getElementById("aparelhos");
const catalogo = document.getElementById("catalogo");
let aparelhos = [];

for (const [i, a] of CATALOGO.entries()) {
  const op = document.createElement("option");
  op.value = String(i);
  op.textContent = a.nome;
  catalogo.appendChild(op);
}

const CAMPOS = [
  { chave: "watts", rotulo: "Potência", sufixo: "W" },
  { chave: "horasDia", rotulo: "Horas por dia", sufixo: "h" },
  { chave: "diasMes", rotulo: "Dias no mês", sufixo: "dias" },
  { chave: "qtd", rotulo: "Quantidade", sufixo: "un." },
];

let contador = 0;
function linhaAparelho(a, idx) {
  const li = document.createElement("li");
  li.className = "aparelho";
  const id = `ap${contador++}`;
  li.innerHTML = `
    <div class="aparelho__topo">
      <label class="visualmente-oculto" for="${id}-nome">Nome do aparelho</label>
      <input class="aparelho__nome" id="${id}-nome" type="text" autocomplete="off">
      <button type="button" class="aparelho__remover" aria-label="Remover aparelho">Remover</button>
    </div>
    <div class="aparelho__campos">
      ${CAMPOS.map((c) => `
        <div class="campo campo--compacto">
          <label for="${id}-${c.chave}">${c.rotulo}</label>
          <div class="campo__caixa">
            <input id="${id}-${c.chave}" data-chave="${c.chave}" type="text" inputmode="decimal" autocomplete="off">
            <span class="campo__afixo">${c.sufixo}</span>
          </div>
        </div>`).join("")}
    </div>
    <p class="aparelho__resultado"></p>`;
  li.querySelector(".aparelho__nome").value = a.nome;
  li.querySelector(".aparelho__nome").setAttribute("aria-label", "Nome do aparelho");
  for (const c of CAMPOS) {
    li.querySelector(`[data-chave="${c.chave}"]`).value = numero(a[c.chave], Number.isInteger(a[c.chave]) ? 0 : 2);
  }
  li.querySelector(".aparelho__remover").addEventListener("click", () => {
    li.remove();
    calcular();
  });
  return li;
}

function lerAparelhos() {
  return [...lista.children].map((li) => {
    const a = { nome: li.querySelector(".aparelho__nome").value.trim() || "Aparelho" };
    for (const c of CAMPOS) a[c.chave] = Math.max(lerNumero(li.querySelector(`[data-chave="${c.chave}"]`).value), 0);
    return a;
  });
}

function preencher(lst) {
  lista.innerHTML = "";
  lst.forEach((a, i) => lista.appendChild(linhaAparelho(a, i)));
}

function adicionar(a) {
  const li = linhaAparelho(a);
  lista.appendChild(li);
  li.querySelector(".aparelho__nome").focus();
  calcular();
}

catalogo.addEventListener("change", () => {
  if (catalogo.value === "") return;
  adicionar({ ...CATALOGO[Number(catalogo.value)] });
  catalogo.value = "";
});
document.getElementById("adicionar-vazio").addEventListener("click", () =>
  adicionar({ nome: "", watts: 100, horasDia: 1, diasMes: 30, qtd: 1 }));

function calcular() {
  const tarifa = Math.max(lerNumero(document.getElementById("tarifa").value), 0);
  aparelhos = lerAparelhos();
  const r = calcularEnergia(aparelhos, tarifa);

  [...lista.children].forEach((li, i) => {
    const it = r.itens[i];
    li.querySelector(".aparelho__resultado").textContent =
      `${numero(it.kwh, 1)} kWh por mês, ${reais(it.custo, 2)}`;
  });

  const veredito = document.getElementById("veredito");
  veredito.dataset.tom = "positivo";
  texto("r-total", reais(r.totalCusto));
  texto("r-kwh", `${numero(r.totalKwh)} kWh`);
  texto("r-ano", reais(r.totalAno));

  if (r.maior && r.totalKwh > 0) {
    const fatia = r.maior.kwh / r.totalKwh;
    texto("r-apoio", `${r.maior.nome} é o maior gasto: ${pct(fatia)} do consumo, ou ${reais(r.maior.custo)} por mês.`);
    texto("r-economia", reais(r.economia20, 2));
    texto("r-economia-apoio", `por mês, só reduzindo o uso de: ${r.maior.nome}`);
  } else {
    texto("r-apoio", "Adicione aparelhos para ver quanto cada um pesa na conta.");
    texto("r-economia", reais(0));
    texto("r-economia-apoio", "de economia por mês");
  }

  barras(document.getElementById("composicao"),
    r.ordenados.filter((i) => i.custo > 0).map((i) => ({ nome: i.nome, valor: i.custo })),
    (v) => reais(v, v < 10 ? 2 : 0));
}

// link compartilhável: lista compacta [nome, W, h, dias, qtd]
const estadoExtra = () => ({
  ap: JSON.stringify(lerAparelhos().map((a) => [a.nome, a.watts, a.horasDia, a.diasMes, a.qtd])),
});
const restaurarExtra = (params) => {
  let lst = APARELHOS_PADRAO;
  if (params?.has("ap")) {
    try {
      const bruto = JSON.parse(params.get("ap"));
      if (Array.isArray(bruto)) {
        lst = bruto.slice(0, 60).map(([nome, watts, horasDia, diasMes, qtd]) => ({
          nome: String(nome).slice(0, 60), watts: +watts || 0, horasDia: +horasDia || 0,
          diasMes: +diasMes || 0, qtd: +qtd || 0,
        }));
      }
    } catch { /* link inválido: usa a lista padrão */ }
  }
  preencher(lst.map((a) => ({ ...a })));
};

ligarFormulario({ calcular, estadoExtra, restaurarExtra });
