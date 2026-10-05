import { ligarFormulario, valores, radio, texto, reais, reaisCurto, numero, linhas } from "../comum.js";
import { calcularImovel } from "../calc/imovel.js";

const IDS = ["valorImovel", "entrada", "jurosAnual", "prazoAnos", "custosCompraPct",
  "aluguel", "reajusteAluguel", "valorizacao", "rendimento", "horizonteAnos"];

const anosTexto = (n) => `${numero(n)} ano${n === 1 ? "" : "s"}`;

function calcular() {
  const v = valores(IDS);
  v.prazoAnos = Math.min(Math.max(v.prazoAnos, 1), 40);
  v.horizonteAnos = Math.min(Math.max(v.horizonteAnos, 1), 50);
  const r = calcularImovel({ ...v, sistema: radio("sistema") });

  const veredito = document.getElementById("veredito");
  const diferenca = Math.abs(r.diferenca);
  const empate = diferenca < Math.max(r.patrimonioAlugar, r.patrimonioComprar) * 0.02;
  veredito.dataset.tom = empate ? "alerta" : "positivo";

  const frase = document.getElementById("r-frase");
  if (empate) {
    frase.innerHTML = `Em ${anosTexto(v.horizonteAnos)}, os dois caminhos chegam <mark>praticamente empatados</mark>.`;
  } else {
    const caminho = r.melhor === "comprar" ? "comprar financiado" : "alugar e investir a diferença";
    frase.innerHTML = `Em ${anosTexto(v.horizonteAnos)}, ${caminho} deixa você com <mark></mark> a mais.`;
    frase.querySelector("mark").textContent = reais(diferenca);
  }

  let apoio = `Patrimônio de quem compra: ${reais(r.patrimonioComprar)}. De quem aluga e investe: ${reais(r.patrimonioAlugar)}.`;
  if (r.virada && r.virada > 1 && r.melhor === "comprar") apoio += ` A compra passa à frente a partir do ano ${r.virada}.`;
  texto("r-apoio", apoio);

  texto("r-parcela", reais(r.primeiraParcela));
  const sist = radio("sistema");
  texto("r-parcela-apoio", sist === "sac"
    ? `Diminui até ${reais(r.ultimaParcela)}. O aluguel começa em ${reais(r.aluguelInicial)}.`
    : `Fixa durante o prazo. O aluguel começa em ${reais(r.aluguelInicial)}.`);
  texto("r-juros", reais(r.totalJuros));
  texto("r-juros-apoio", v.horizonteAnos < v.prazoAnos
    ? `Nos primeiros ${anosTexto(v.horizonteAnos)} do contrato`
    : `Sobre ${reais(r.financiado)} financiados`);
  texto("r-custos", reais(r.custosCompra));

  const pontos = r.anos.map((p) => p);
  linhas(document.getElementById("grafico"), {
    series: [
      { nome: "Comprar", classe: "serie-a", pontos: pontos.map((p) => ({ x: p.ano, y: p.comprar })) },
      { nome: "Alugar e investir", classe: "serie-b", pontos: pontos.map((p) => ({ x: p.ano, y: p.alugar })) },
    ],
    rotuloX: (x, longo) => (longo ? `Ano ${numero(x)}` : numero(x)),
    rotuloY: reaisCurto,
    descricao: `Gráfico do patrimônio ao longo de ${anosTexto(v.horizonteAnos)}. Comprar termina com ${reais(r.patrimonioComprar)} e alugar e investir com ${reais(r.patrimonioAlugar)}.`,
  });

  const corpo = document.getElementById("tabela");
  corpo.innerHTML = r.anos.slice(1).map((p) => `<tr>
    <th scope="row">${numero(p.ano, Number.isInteger(p.ano) ? 0 : 1)}</th>
    <td${p.comprar >= p.alugar ? ' class="lider"' : ""}>${reais(p.comprar)}</td>
    <td${p.alugar > p.comprar ? ' class="lider"' : ""}>${reais(p.alugar)}</td>
    <td>${reais(p.saldo)}</td></tr>`).join("");
}

ligarFormulario({ calcular });
