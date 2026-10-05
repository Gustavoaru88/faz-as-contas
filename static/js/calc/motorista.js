// Cálculos do simulador "Vale a pena rodar de aplicativo?"
// Funções puras: recebem números e devolvem números. Testadas em tests/.

export const SEMANAS_POR_MES = 52 / 12;
export const HORAS_MES_CLT = 220; // jornada mensal de referência para o salário mínimo

/**
 * @param {object} e entradas
 * @param {number} e.ganhoSemanal      valor bruto recebido dos apps na semana (R$)
 * @param {number} e.kmSemana          km totais rodados na semana, com e sem passageiro
 * @param {number} e.horasSemana       horas trabalhadas na semana
 * @param {number} e.consumo           km por litro
 * @param {number} e.precoCombustivel  R$ por litro
 * @param {number} e.manutencaoKm      R$ por km (óleo, pneus, revisões, consertos)
 * @param {number} e.outrosSemana      celular, lavagem, alimentação na rua etc. (R$ por semana)
 * @param {"proprio"|"alugado"} e.tipoCarro
 * @param {number} e.aluguelSemanal    R$ por semana (só carro alugado)
 * @param {number} e.valorCarro        valor de mercado hoje (só carro próprio)
 * @param {number} e.depreciacaoAnual  % ao ano (só carro próprio)
 * @param {number} e.seguroAnual       R$ por ano (só carro próprio)
 * @param {number} e.ipvaAnual         IPVA + licenciamento, R$ por ano (só carro próprio)
 * @param {number} e.rendimentoAnual   % ao ano que o valor do carro renderia aplicado (só carro próprio)
 * @param {number} e.salarioMinimo     R$ por mês, para comparação
 */
export function calcularMotorista(e) {
  const proprio = e.tipoCarro !== "alugado";
  const consumo = Math.max(e.consumo, 0.1);

  // custos que saem do bolso (por semana)
  const combustivel = (e.kmSemana / consumo) * e.precoCombustivel;
  const manutencao = e.kmSemana * e.manutencaoKm;
  const seguro = proprio ? e.seguroAnual / 52 : 0;
  const ipva = proprio ? e.ipvaAnual / 52 : 0;
  const aluguel = proprio ? 0 : e.aluguelSemanal;
  const outros = e.outrosSemana;

  // custos que não saem do bolso toda semana, mas existem
  const depreciacao = proprio ? (e.valorCarro * e.depreciacaoAnual / 100) / 52 : 0;
  const oportunidade = proprio ? (e.valorCarro * e.rendimentoAnual / 100) / 52 : 0;

  const custosCaixa = combustivel + manutencao + seguro + ipva + aluguel + outros;
  const custosOcultos = depreciacao + oportunidade;
  const custoTotal = custosCaixa + custosOcultos;

  const sobraSemana = e.ganhoSemanal - custosCaixa;
  const lucroSemana = sobraSemana - custosOcultos;

  const horas = Math.max(e.horasSemana, 0.1);
  const km = Math.max(e.kmSemana, 0.1);

  const minimoPorHora = e.salarioMinimo / HORAS_MES_CLT;

  return {
    semana: {
      ganho: e.ganhoSemanal,
      custosCaixa,
      custosOcultos,
      sobra: sobraSemana,
      lucro: lucroSemana,
    },
    mes: {
      ganho: e.ganhoSemanal * SEMANAS_POR_MES,
      sobra: sobraSemana * SEMANAS_POR_MES,
      lucro: lucroSemana * SEMANAS_POR_MES,
      horas: e.horasSemana * SEMANAS_POR_MES,
    },
    lucroPorHora: lucroSemana / horas,
    ganhoPorHora: e.ganhoSemanal / horas,
    custoPorKm: custoTotal / km,
    ganhoPorKm: e.ganhoSemanal / km,
    // participação de cada custo no gasto total, por mês
    composicao: [
      { nome: "Combustível", valor: combustivel * SEMANAS_POR_MES, oculto: false },
      { nome: "Manutenção e pneus", valor: manutencao * SEMANAS_POR_MES, oculto: false },
      { nome: "Aluguel do carro", valor: aluguel * SEMANAS_POR_MES, oculto: false },
      { nome: "Seguro", valor: seguro * SEMANAS_POR_MES, oculto: false },
      { nome: "IPVA e licenciamento", valor: ipva * SEMANAS_POR_MES, oculto: false },
      { nome: "Outros gastos", valor: outros * SEMANAS_POR_MES, oculto: false },
      { nome: "Desvalorização do carro", valor: depreciacao * SEMANAS_POR_MES, oculto: true },
      { nome: "Rendimento que o carro deixa de dar", valor: oportunidade * SEMANAS_POR_MES, oculto: true },
    ].filter((c) => c.valor > 0.005),
    minimoPorHora,
    // quantas vezes o lucro por hora equivale ao salário mínimo por hora
    razaoMinimo: (lucroSemana / horas) / minimoPorHora,
  };
}
