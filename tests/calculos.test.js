// Testes dos cálculos. Rode com: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";

import { calcularMotorista } from "../static/js/calc/motorista.js";
import { calcularImovel, parcelaPrice, taxaMensal, cronograma } from "../static/js/calc/imovel.js";
import { calcularEnergia, kwhMes } from "../static/js/calc/energia.js";
import { lerNumero } from "../static/js/comum.js";

const perto = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} deveria ser ~${b}`);

test("lerNumero entende formatos brasileiros", () => {
  assert.equal(lerNumero("1.500"), 1500);
  assert.equal(lerNumero("60.000"), 60000);
  assert.equal(lerNumero("1.234,56"), 1234.56);
  assert.equal(lerNumero("6,29"), 6.29);
  assert.equal(lerNumero("0.15"), 0.15);
  assert.equal(lerNumero("R$ 2.000"), 2000);
  assert.equal(lerNumero(""), 0);
  assert.equal(lerNumero("abc"), 0);
});

test("motorista: carro próprio, conta feita à mão", () => {
  const r = calcularMotorista({
    ganhoSemanal: 1500, kmSemana: 1000, horasSemana: 50, consumo: 10, precoCombustivel: 6,
    manutencaoKm: 0.1, outrosSemana: 50, tipoCarro: "proprio", aluguelSemanal: 999,
    valorCarro: 52000, depreciacaoAnual: 10, seguroAnual: 2600, ipvaAnual: 1040,
    rendimentoAnual: 0, salarioMinimo: 1621,
  });
  // combustível 600 + manutenção 100 + seguro 50 + IPVA 20 + outros 50 = 820
  perto(r.semana.custosCaixa, 820);
  perto(r.semana.sobra, 680);
  perto(r.semana.custosOcultos, 100); // desvalorização 5.200 / 52
  perto(r.semana.lucro, 580);
  perto(r.lucroPorHora, 11.6);
  perto(r.custoPorKm, 0.92);
  perto(r.mes.lucro, 580 * 52 / 12);
});

test("motorista: carro alugado ignora custos de dono", () => {
  const r = calcularMotorista({
    ganhoSemanal: 1500, kmSemana: 1000, horasSemana: 50, consumo: 10, precoCombustivel: 6,
    manutencaoKm: 0, outrosSemana: 0, tipoCarro: "alugado", aluguelSemanal: 700,
    valorCarro: 52000, depreciacaoAnual: 10, seguroAnual: 2600, ipvaAnual: 1040,
    rendimentoAnual: 10, salarioMinimo: 1621,
  });
  perto(r.semana.custosCaixa, 1300);
  perto(r.semana.custosOcultos, 0);
  perto(r.semana.lucro, 200);
});

test("imóvel: parcela Price de referência", () => {
  // R$ 100 mil a 1% ao mês por 12 meses = R$ 8.884,88
  perto(parcelaPrice(100000, 0.01, 12), 8884.88);
  perto(taxaMensal(12.682503), 0.01, 1e-6);
});

test("imóvel: SAC e Price quitam a dívida no prazo", () => {
  for (const sistema of ["sac", "price"]) {
    const c = cronograma(320000, 11.5, 360, sistema);
    perto(c.saldos[360], 0);
    const amortizado = c.parcelas.reduce((s, p, i) => s + p - c.juros[i], 0);
    perto(amortizado, 320000, 0.5);
  }
});

test("imóvel: sem juros e sem rendimentos, a diferença é aluguel pago menos custos de compra", () => {
  const e = {
    valorImovel: 300000, entrada: 60000, custosCompraPct: 4, jurosAnual: 0, prazoAnos: 20,
    sistema: "sac", aluguel: 1500, reajusteAluguel: 0, valorizacao: 0, rendimento: 0, horizonteAnos: 20,
  };
  const r = calcularImovel(e);
  const aluguelTotal = 1500 * 240;
  perto(r.diferenca, aluguelTotal - 12000);
  assert.equal(r.melhor, "comprar");
  assert.equal(r.anos.length, 21);
});

test("imóvel: aluguel muito barato favorece alugar e investir", () => {
  const r = calcularImovel({
    valorImovel: 1000000, entrada: 200000, custosCompraPct: 4, jurosAnual: 12, prazoAnos: 30,
    sistema: "price", aluguel: 2500, reajusteAluguel: 4, valorizacao: 3, rendimento: 10, horizonteAnos: 30,
  });
  assert.equal(r.melhor, "alugar");
});

test("energia: exemplo do chuveiro da metodologia", () => {
  const chuveiro = { nome: "Chuveiro", watts: 5500, horasDia: 0.5, diasMes: 30, qtd: 1 };
  perto(kwhMes(chuveiro), 82.5);
  const r = calcularEnergia([chuveiro, { nome: "LED", watts: 9, horasDia: 5, diasMes: 30, qtd: 8 }], 0.95);
  perto(r.totalKwh, 82.5 + 10.8);
  perto(r.totalCusto, (82.5 + 10.8) * 0.95);
  assert.equal(r.maior.nome, "Chuveiro");
});
