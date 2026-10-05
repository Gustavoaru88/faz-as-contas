// Cálculos do simulador "Quanto cada aparelho pesa na conta de luz?"

/** Aparelhos sugeridos, com potência média típica. Ajuste para o seu modelo. */
export const APARELHOS_PADRAO = [
  { nome: "Chuveiro elétrico", watts: 5500, horasDia: 0.5, diasMes: 30, qtd: 1 },
  { nome: "Ar-condicionado 9.000 BTU (inverter)", watts: 800, horasDia: 6, diasMes: 20, qtd: 1 },
  { nome: "Geladeira frost free", watts: 45, horasDia: 24, diasMes: 30, qtd: 1 },
  { nome: "TV LED 50\"", watts: 100, horasDia: 5, diasMes: 30, qtd: 1 },
  { nome: "Máquina de lavar", watts: 500, horasDia: 1, diasMes: 12, qtd: 1 },
  { nome: "Air fryer", watts: 1500, horasDia: 0.4, diasMes: 20, qtd: 1 },
  { nome: "Computador de mesa", watts: 200, horasDia: 6, diasMes: 22, qtd: 1 },
  { nome: "Lâmpada LED 9 W", watts: 9, horasDia: 5, diasMes: 30, qtd: 8 },
];

/** Outros aparelhos que a pessoa pode adicionar com um clique. */
export const CATALOGO = [
  { nome: "Ferro de passar", watts: 1000, horasDia: 0.5, diasMes: 8, qtd: 1 },
  { nome: "Micro-ondas", watts: 1200, horasDia: 0.25, diasMes: 30, qtd: 1 },
  { nome: "Secador de cabelo", watts: 1800, horasDia: 0.2, diasMes: 15, qtd: 1 },
  { nome: "Freezer horizontal", watts: 60, horasDia: 24, diasMes: 30, qtd: 1 },
  { nome: "Ventilador", watts: 120, horasDia: 8, diasMes: 30, qtd: 1 },
  { nome: "Notebook", watts: 65, horasDia: 6, diasMes: 22, qtd: 1 },
  { nome: "Videogame", watts: 200, horasDia: 2, diasMes: 20, qtd: 1 },
  { nome: "Bomba de piscina", watts: 750, horasDia: 6, diasMes: 30, qtd: 1 },
  { nome: "Forno elétrico", watts: 1800, horasDia: 0.5, diasMes: 8, qtd: 1 },
  { nome: "Carregador de carro elétrico", watts: 7000, horasDia: 2, diasMes: 15, qtd: 1 },
];

export function kwhMes(a) {
  return (a.watts * a.horasDia * a.diasMes * a.qtd) / 1000;
}

/**
 * @param {Array<{nome:string,watts:number,horasDia:number,diasMes:number,qtd:number}>} aparelhos
 * @param {number} tarifa R$ por kWh (com impostos)
 */
export function calcularEnergia(aparelhos, tarifa) {
  const itens = aparelhos.map((a) => {
    const kwh = kwhMes(a);
    return { ...a, kwh, custo: kwh * tarifa };
  });
  const totalKwh = itens.reduce((s, i) => s + i.kwh, 0);
  const totalCusto = totalKwh * tarifa;
  const ordenados = [...itens].sort((a, b) => b.custo - a.custo);
  const maior = ordenados[0] ?? null;
  return {
    itens: itens.map((i) => ({ ...i, fatia: totalKwh > 0 ? i.kwh / totalKwh : 0 })),
    ordenados,
    totalKwh,
    totalCusto,
    totalAno: totalCusto * 12,
    maior,
    // economia se o maior gasto for usado 20% menos tempo
    economia20: maior ? maior.custo * 0.2 : 0,
  };
}
