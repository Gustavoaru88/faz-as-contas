import { ligarFormulario, valores, radio, texto, reais, numero, barras } from "../comum.js";
import { calcularMotorista } from "../calc/motorista.js";

const IDS = ["ganhoSemanal", "kmSemana", "horasSemana", "consumo", "precoCombustivel",
  "manutencaoKm", "outrosSemana", "valorCarro", "depreciacaoAnual", "rendimentoAnual",
  "seguroAnual", "ipvaAnual", "aluguelSemanal"];

function calcular() {
  const tipoCarro = radio("tipoCarro");
  document.getElementById("grupo-proprio").hidden = tipoCarro === "alugado";
  document.getElementById("grupo-alugado").hidden = tipoCarro !== "alugado";

  const r = calcularMotorista({ ...valores(IDS), tipoCarro, salarioMinimo: window.SALARIO_MINIMO });

  const veredito = document.getElementById("veredito");
  veredito.dataset.tom = r.mes.lucro < 0 ? "negativo" : r.razaoMinimo < 1 ? "alerta" : "positivo";

  const frase = veredito.querySelector(".veredito__frase");
  if (r.mes.lucro < 0) {
    frase.innerHTML = 'Você tem um <strong>prejuízo real</strong> de <mark id="r-lucro-mes"></mark> por mês.';
  } else {
    frase.innerHTML = 'Seu lucro real é de <mark id="r-lucro-mes"></mark> por mês.';
  }
  texto("r-lucro-mes", reais(Math.abs(r.mes.lucro)));

  let apoio;
  if (r.mes.lucro < 0) {
    apoio = "Os custos do carro passam do que os apps pagam. Veja abaixo qual gasto pesa mais.";
  } else if (r.razaoMinimo < 1) {
    apoio = `São ${reais(r.lucroPorHora, 2)} por hora trabalhada, menos que o salário mínimo por hora (${reais(r.minimoPorHora, 2)}).`;
  } else if (r.razaoMinimo < 1.15) {
    apoio = `São ${reais(r.lucroPorHora, 2)} por hora trabalhada, praticamente o salário mínimo por hora (${reais(r.minimoPorHora, 2)}).`;
  } else {
    const vezes = r.razaoMinimo >= 2 ? "vezes" : "vez";
    apoio = `São ${reais(r.lucroPorHora, 2)} por hora trabalhada, ${numero(r.razaoMinimo, 1)} ${vezes} o salário mínimo por hora (${reais(r.minimoPorHora, 2)}).`;
  }
  texto("r-apoio", apoio);

  texto("r-sobra-mes", reais(r.mes.sobra));
  texto("r-hora", reais(r.lucroPorHora, 2));
  texto("r-hora-bruto", `Os apps pagam ${reais(r.ganhoPorHora, 2)} por hora antes dos custos`);
  texto("r-custo-km", reais(r.custoPorKm, 2));
  texto("r-ganho-km", `Você recebe ${reais(r.ganhoPorKm, 2)} por km rodado`);

  const itens = [...r.composicao]
    .sort((a, b) => b.valor - a.valor)
    .map((c) => ({ nome: c.nome, valor: c.valor, classe: c.oculto ? "barras__item--oculto" : "" }));
  barras(document.getElementById("composicao"), itens);
  document.getElementById("nota-oculto").hidden = !r.composicao.some((c) => c.oculto);
}

ligarFormulario({ calcular });
