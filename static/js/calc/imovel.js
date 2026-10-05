// Cálculos do simulador "Alugar ou financiar um imóvel?"
// Os dois caminhos gastam o mesmo dinheiro todo mês: quem paga menos investe a diferença.

export function taxaMensal(taxaAnualPct) {
  return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1;
}

/** Parcela fixa da tabela Price. */
export function parcelaPrice(valor, iMensal, meses) {
  if (meses <= 0) return 0;
  if (iMensal === 0) return valor / meses;
  return (valor * iMensal) / (1 - Math.pow(1 + iMensal, -meses));
}

/**
 * Gera o cronograma do financiamento.
 * @returns {{parcelas:number[], saldos:number[], juros:number[]}} saldos[m] = saldo após a parcela m (m começa em 1; saldos[0] = valor financiado)
 */
export function cronograma(valorFinanciado, jurosAnualPct, prazoMeses, sistema) {
  const i = taxaMensal(jurosAnualPct);
  const parcelas = [0];
  const saldos = [valorFinanciado];
  const juros = [0];
  let saldo = valorFinanciado;
  const pmt = parcelaPrice(valorFinanciado, i, prazoMeses);
  const amortSac = prazoMeses > 0 ? valorFinanciado / prazoMeses : 0;

  for (let m = 1; m <= prazoMeses; m++) {
    const j = saldo * i;
    let amort = sistema === "price" ? pmt - j : amortSac;
    if (amort > saldo) amort = saldo;
    saldo = Math.max(saldo - amort, 0);
    parcelas.push(amort + j);
    juros.push(j);
    saldos.push(saldo < 0.005 ? 0 : saldo);
  }
  return { parcelas, saldos, juros };
}

/**
 * @param {object} e
 * @param {number} e.valorImovel
 * @param {number} e.entrada
 * @param {number} e.custosCompraPct   ITBI + escritura + registro, % do valor do imóvel
 * @param {number} e.jurosAnual        % a.a. (custo efetivo do financiamento)
 * @param {number} e.prazoAnos
 * @param {"sac"|"price"} e.sistema
 * @param {number} e.aluguel           aluguel mensal hoje, de um imóvel equivalente
 * @param {number} e.reajusteAluguel   % a.a.
 * @param {number} e.valorizacao       % a.a. do imóvel
 * @param {number} e.rendimento        % a.a. líquido dos investimentos
 * @param {number} e.horizonteAnos     por quantos anos comparar
 */
export function calcularImovel(e) {
  const entrada = Math.min(Math.max(e.entrada, 0), e.valorImovel);
  const financiado = e.valorImovel - entrada;
  const custosCompra = e.valorImovel * e.custosCompraPct / 100;
  const prazoMeses = Math.round(e.prazoAnos * 12);
  const horizonteMeses = Math.max(1, Math.round(e.horizonteAnos * 12));
  const fin = cronograma(financiado, e.jurosAnual, prazoMeses, e.sistema);
  const r = taxaMensal(e.rendimento);

  let investInquilino = entrada + custosCompra; // dinheiro que o inquilino não gastou na compra
  let investComprador = 0;
  let aportesInquilino = 0;
  let aportesComprador = 0;
  let totalAluguel = 0;
  let totalParcelas = 0;
  let totalJuros = 0;
  let virada = null; // primeiro ano em que comprar fica à frente

  const anos = [{
    ano: 0,
    comprar: e.valorImovel - financiado + investComprador,
    alugar: investInquilino,
  }];

  for (let m = 1; m <= horizonteMeses; m++) {
    const anoCorrente = Math.floor((m - 1) / 12);
    const aluguel = e.aluguel * Math.pow(1 + e.reajusteAluguel / 100, anoCorrente);
    const parcela = m <= prazoMeses ? fin.parcelas[m] : 0;

    investInquilino *= 1 + r;
    investComprador *= 1 + r;

    const diferenca = parcela - aluguel;
    if (diferenca > 0) {
      investInquilino += diferenca;
      aportesInquilino += diferenca;
    } else {
      investComprador += -diferenca;
      aportesComprador += -diferenca;
    }

    totalAluguel += aluguel;
    totalParcelas += parcela;
    if (m <= prazoMeses) totalJuros += fin.juros[m];

    if (m % 12 === 0 || m === horizonteMeses) {
      const saldo = fin.saldos[Math.min(m, prazoMeses)] ?? 0;
      const valorImovel = e.valorImovel * Math.pow(1 + e.valorizacao / 100, m / 12);
      const ponto = {
        ano: m / 12,
        comprar: valorImovel - saldo + investComprador,
        alugar: investInquilino,
        valorImovel,
        saldo,
      };
      anos.push(ponto);
      if (virada === null && ponto.comprar > ponto.alugar) virada = Math.ceil(m / 12);
    }
  }

  const final = anos[anos.length - 1];
  return {
    financiado,
    custosCompra,
    primeiraParcela: fin.parcelas[1] ?? 0,
    ultimaParcela: fin.parcelas[prazoMeses] ?? 0,
    aluguelInicial: e.aluguel,
    totalJuros,
    totalAluguel,
    totalParcelas,
    aportesInquilino,
    aportesComprador,
    patrimonioComprar: final.comprar,
    patrimonioAlugar: final.alugar,
    diferenca: final.comprar - final.alugar,
    melhor: final.comprar >= final.alugar ? "comprar" : "alugar",
    virada,
    anos,
  };
}
