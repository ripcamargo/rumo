import type { Transaction } from '../types';
import {
  addMonths,
  buildMonthBills,
  formatCurrency,
  formatMonthLabel,
  getDueStatus,
  isRecurringActiveIn,
  monthDiff,
  recurringEndMonth,
  summarizeBills,
} from './finance';
import { buildFinanceOverview, type FinanceData } from './financeOverview';
import { DEBT_KIND_LABELS, debtLabel, formatMonths, formatRate, INCOME_KIND_LABELS } from './financePlanning';
import { getSpendingCategory, summarizeTransactions } from './transactions';

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function fmtDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

function byMonthDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

/**
 * Relatório em texto (Markdown) com todos os dados financeiros, pensado para
 * ser colado numa IA de apoio financeiro. Valores sempre em reais.
 */
export function buildFinanceReport(data: FinanceData, month: string, now: Date = new Date()): string {
  const o = buildFinanceOverview(data, month);
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);

  push(
    '# Relatório financeiro completo',
    '',
    `Gerado em ${fmtDate(now)} pelo app Rumo. Mês de referência: ${formatMonthLabel(month)}.`,
    'Valores em reais (R$). Use estes dados para analisar minha situação financeira e sugerir melhorias.',
    '',
  );

  // Resumo
  push(
    '## Resumo do mês atual',
    '',
    `- Renda que cai na conta: ${formatCurrency(o.income.netCashCents)}`,
    `- Entradas avulsas no mês: ${formatCurrency(o.extrasCents)}`,
    `- Contas a pagar no mês: ${formatCurrency(o.bills.totalCents)} (pagas ${formatCurrency(o.bills.paidCents)}, faltam ${formatCurrency(o.bills.remainingCents)}, vencidas: ${o.bills.overdueCount})`,
    `- Parcelas de dívidas fora das contas: ${formatCurrency(o.untracked)}`,
    `- Sobra prevista: ${formatCurrency(o.surplusCents)}`,
    `- Gasto real no mês pelos extratos: ${formatCurrency(o.current.expenseCents)}${o.avgSpendingCents ? ` (média dos 3 meses anteriores: ${formatCurrency(o.avgSpendingCents)})` : ''}`,
    `- Custo de vida estimado: ${formatCurrency(o.monthlyCostCents)}/mês`,
    '',
    '## Patrimônio',
    '',
    `- Guardado (todos os bancos): ${formatCurrency(o.worth.savedCents)}`,
    `- Dívidas: ${formatCurrency(o.worth.debtCents)}`,
    `- Patrimônio líquido: ${formatCurrency(o.worth.netWorthCents)}`,
    `- Reserva de emergência: ${o.monthlyCostCents > 0 ? formatMonths(o.reserveMonths) : 'sem custo de vida calculado'}`,
    '',
  );

  // Renda
  push('## Renda mensal fixa', '');
  if (data.incomeItems.length === 0) push('Nenhum item de renda cadastrado.');
  for (const kind of ['salary', 'benefit', 'deduction'] as const) {
    const items = data.incomeItems.filter((i) => i.kind === kind);
    if (!items.length) continue;
    push(`**${INCOME_KIND_LABELS[kind].title}**`);
    for (const item of items) {
      const cash = kind === 'benefit' && item.inCash === false ? ' (não cai na conta, ex.: VR/VA)' : '';
      push(`- ${item.name}: ${formatCurrency(item.amountCents)}${cash}`);
    }
    push('');
  }
  push(
    `- Total bruto: ${formatCurrency(o.income.grossCents)}`,
    `- Benefícios: ${formatCurrency(o.income.benefitsCents)} (fora da conta: ${formatCurrency(o.income.nonCashBenefitsCents)})`,
    `- Descontos: ${formatCurrency(o.income.deductionsCents)}`,
    `- Líquido total: ${formatCurrency(o.income.netCents)} · em conta: ${formatCurrency(o.income.netCashCents)}`,
    '',
  );

  // Receitas avulsas
  push('## Receitas avulsas', '');
  const extras = [...data.extraIncomes].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  if (!extras.length) push('Nenhuma receita avulsa registrada.');
  for (const e of extras) push(`- ${fmtDate(e.date.toDate())} · ${e.description}: ${formatCurrency(e.amountCents)}`);
  push('');

  // Bancos e dívidas
  push('## Bancos e dívidas', '');
  if (!data.banks.length) push('Nenhum banco cadastrado.');
  for (const bank of [...data.banks].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))) {
    push(`### ${bank.name}`, `- Guardado: ${formatCurrency(bank.balanceCents ?? 0)}`);
    for (const debt of bank.debts ?? []) {
      const details = [
        debt.description?.trim() ? DEBT_KIND_LABELS[debt.kind] : '',
        `saldo devedor ${formatCurrency(debt.balanceCents)}`,
        debt.monthlyPaymentCents ? `parcela ${formatCurrency(debt.monthlyPaymentCents)}/mês` : 'sem parcela definida',
        debt.installmentsLeft ? `${debt.installmentsLeft} parcelas restantes` : '',
        debt.interestRateMonthly ? `juros ${formatRate(debt.interestRateMonthly)} a.m.` : 'juros não informados',
        debt.paymentTracked === false ? 'parcela fora das contas a pagar' : 'parcela já nas contas a pagar ou descontada do salário',
      ].filter(Boolean);
      push(`- Dívida "${debtLabel(debt)}": ${details.join(' · ')}`);
    }
    push('');
  }
  if (o.debts.length) {
    push(
      '**Previsão de quitação**',
      `- Pagando só as parcelas (${formatCurrency(o.mins)}/mês): ${o.basePlan.months === null ? 'sem previsão de quitação' : `${formatMonths(o.basePlan.months)}, ${formatCurrency(o.basePlan.totalInterestCents)} em juros`}`,
    );
    if (o.surplusCents > 0) {
      push(
        `- Usando também a sobra (${formatCurrency(o.mins + o.surplusCents)}/mês): ${o.surplusPlan.months === null ? 'sem previsão de quitação' : `${formatMonths(o.surplusPlan.months)}, ${formatCurrency(o.surplusPlan.totalInterestCents)} em juros`}`,
      );
    }
    push('');
  }

  // Contas fixas
  push('## Contas fixas e parceladas', '');
  if (!data.recurringBills.length) push('Nenhuma conta fixa cadastrada.');
  for (const r of [...data.recurringBills].sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name, 'pt-BR'))) {
    const end = recurringEndMonth(r);
    const details = [
      formatCurrency(r.amountCents),
      `todo dia ${r.dueDay}`,
      r.payee ? `para ${r.payee}` : '',
      `desde ${formatMonthLabel(r.startMonth)}`,
      end ? `${r.installments}x, até ${formatMonthLabel(end)}` : 'sem data de término',
      isRecurringActiveIn(r, month) ? '' : monthDiff(month, r.startMonth) > 0 ? 'ainda não começou' : 'encerrada',
    ].filter(Boolean);
    push(`- ${r.name}: ${details.join(' · ')}`);
  }
  push('');

  // Contas a pagar por mês: meses com contas gravadas + mês atual e os dois seguintes.
  const billMonths = new Set([...data.bills.map((b) => b.month), month, addMonths(month, 1), addMonths(month, 2)]);
  push('## Contas a pagar por mês', '');
  for (const m of [...billMonths].sort(byMonthDesc)) {
    const monthBills = buildMonthBills(m, data.bills, data.recurringBills);
    if (!monthBills.length) continue;
    const s = summarizeBills(monthBills, now);
    push(`### ${formatMonthLabel(m)}`, `Total ${formatCurrency(s.totalCents)} · pago ${formatCurrency(s.paidCents)} · falta ${formatCurrency(s.remainingCents)}`);
    for (const bill of monthBills) {
      const status = bill.paid ? 'paga' : getDueStatus(bill, now).kind === 'overdue' ? 'VENCIDA' : 'pendente';
      const extra = [bill.installmentLabel ? `parcela ${bill.installmentLabel}` : bill.recurringId ? 'fixa' : '', bill.payee ? `para ${bill.payee}` : '']
        .filter(Boolean)
        .join(', ');
      push(`- ${fmtDate(bill.dueDate)} · ${bill.name}${extra ? ` (${extra})` : ''}: ${formatCurrency(bill.amountCents)} · ${status}`);
    }
    push('');
  }

  // Extratos
  push('## Gastos pelos extratos bancários', '');
  if (!data.transactions.length) {
    push('Nenhum extrato importado.', '');
  } else {
    const byMonth = new Map<string, Transaction[]>();
    for (const tx of data.transactions) byMonth.set(tx.month, [...(byMonth.get(tx.month) ?? []), tx]);
    const months = [...byMonth.keys()].sort(byMonthDesc);
    const overall = summarizeTransactions(data.transactions);

    push(
      `### Visão geral (${months.length} ${months.length === 1 ? 'mês' : 'meses'} com extrato)`,
      `- Entradas: ${formatCurrency(overall.incomeCents)} · saídas: ${formatCurrency(overall.expenseCents)} · saldo: ${formatCurrency(overall.balanceCents)}`,
      `- Média de saídas por mês: ${formatCurrency(Math.round(overall.expenseCents / months.length))}`,
      '',
      '**Categorias com mais gastos (todo o período)**',
    );
    for (const c of overall.byCategory) {
      const share = overall.expenseCents > 0 ? Math.round((c.spentCents / overall.expenseCents) * 100) : 0;
      push(`- ${c.category.name}: ${formatCurrency(c.spentCents)} (${share}%, ${c.count} ${c.count === 1 ? 'lançamento' : 'lançamentos'}, média ${formatCurrency(Math.round(c.spentCents / months.length))}/mês)`);
    }

    // Onde o dinheiro mais vai: descrições agrupadas.
    const byDescription = new Map<string, { label: string; cents: number; count: number }>();
    for (const tx of data.transactions) {
      if (tx.amountCents >= 0 || getSpendingCategory(tx.categoryId).ignored) continue;
      const entry = byDescription.get(tx.descriptionKey) ?? { label: tx.description, cents: 0, count: 0 };
      entry.cents -= tx.amountCents;
      entry.count += 1;
      byDescription.set(tx.descriptionKey, entry);
    }
    push('', '**Estabelecimentos/destinos com mais gastos**');
    for (const d of [...byDescription.values()].sort((a, b) => b.cents - a.cents).slice(0, 20)) {
      push(`- ${d.label}: ${formatCurrency(d.cents)} em ${d.count}x`);
    }
    push('');

    for (const m of months) {
      const txs = [...(byMonth.get(m) ?? [])].sort((a, b) => a.date.toMillis() - b.date.toMillis());
      const s = summarizeTransactions(txs);
      push(
        `### ${formatMonthLabel(m)}`,
        `Entradas ${formatCurrency(s.incomeCents)} · saídas ${formatCurrency(s.expenseCents)} · saldo ${formatCurrency(s.balanceCents)}${s.ignoredCount ? ` · ${s.ignoredCount} transferências entre contas próprias (fora dos totais)` : ''}`,
        '',
        'Por categoria:',
      );
      for (const c of s.byCategory) push(`- ${c.category.name}: ${formatCurrency(c.spentCents)} (${c.count}x)`);
      push('', 'Todas as movimentações (data · descrição · valor · categoria · conta):');
      for (const tx of txs) {
        push(
          `- ${fmtDate(tx.date.toDate())} · ${tx.description} · ${tx.amountCents < 0 ? '−' : '+'}${formatCurrency(Math.abs(tx.amountCents))} · ${getSpendingCategory(tx.categoryId).name} · ${tx.accountLabel}`,
        );
      }
      push('');
    }
  }

  // Projeção e dicas
  if (o.worth.savedCents > 0 || o.debts.length > 0) {
    const last = o.projection[o.projection.length - 1];
    push(
      '## Projeção para 12 meses (sobra indo para dívidas e depois para o guardado)',
      '',
      `- Guardado: ${formatCurrency(last.savedCents)} · dívidas: ${formatCurrency(last.debtCents)} · patrimônio: ${formatCurrency(last.savedCents - last.debtCents)}`,
      '',
    );
  }
  if (o.surplusCents > 0) {
    push(
      '## Sugestão do app para a sobra',
      '',
      `- Antecipar dívidas: ${formatCurrency(o.split.debtsCents)}`,
      `- Reserva de emergência: ${formatCurrency(o.split.reserveCents)}`,
      `- Livre para gastar: ${formatCurrency(o.split.freeCents)}`,
      '',
    );
  }
  if (o.insights.length) {
    push('## Alertas e dicas do app', '');
    for (const insight of o.insights) push(`- ${insight.text}`);
    push('');
  }

  return lines.join('\n');
}
