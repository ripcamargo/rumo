import { parseOfx, parseStatementAmount, type OfxStatement, type OfxTransaction } from './ofx';

/** Linha de extrato em texto: `data;descrição;valor` (formato TXT/CSV do Itaú, Mercado Pago e de outros bancos). */
const DATE_PATTERN = /^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})$/;

/** Lançamentos futuros que o banco lista mas ainda não aconteceram — reaparecem com a descrição real depois. */
const SKIPPED_DESCRIPTIONS = new Set(['AGENDADO', 'AGENDAMENTO']);

/**
 * Bancos reconhecidos pelo nome do arquivo ou pelo estilo das descrições,
 * usados só para dar um nome amigável ao extrato.
 */
const TEXT_BANKS: { label: string; fileName: RegExp; description: RegExp }[] = [
  {
    label: 'Mercado Pago',
    fileName: /mercado\s*-?\s*pago/i,
    description:
      /^(pagamento com (qr )?pix|pagamento com c[oó]digo qr|pix (recebido|enviado)|transfer[eê]ncia (pix )?(recebida|enviada)|reembolso de transfer[eê]ncia|rendimentos?$|dinheiro (reservado|retirado))/i,
  },
  {
    label: 'Itaú',
    fileName: /ita[uú]/i,
    description: /^(pay |pix transf|pix qrs|rshop|seguro cartao|saldo do dia|sispag|int )/i,
  },
];

/**
 * Colunas do relatório "Extrato de conta" do Mercado Pago. Nele a última
 * coluna é o saldo parcial, então o valor precisa ser lido pelo cabeçalho.
 */
const MERCADO_PAGO_COLUMNS = {
  date: 'RELEASE_DATE',
  description: 'TRANSACTION_TYPE',
  id: 'REFERENCE_ID',
  amount: 'TRANSACTION_NET_AMOUNT',
};

function parseTextDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  return new Date(year, Number(match[2]) - 1, Number(match[1]), 12);
}

function splitLine(line: string): string[] {
  const separator = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
  return line.split(separator).map((part) => part.trim().replace(/^"(.*)"$/, '$1'));
}

function detectBank(fileName: string, descriptions: string[]): string | null {
  const byName = TEXT_BANKS.find((bank) => bank.fileName.test(fileName));
  if (byName) return byName.label;
  let best: { label: string; hits: number } | null = null;
  for (const bank of TEXT_BANKS) {
    const hits = descriptions.filter((d) => bank.description.test(d)).length;
    if (hits > (best?.hits ?? 0)) best = { label: bank.label, hits };
  }
  // Exige que boa parte das linhas tenha o estilo do banco para não rotular errado.
  return best && best.hits >= Math.max(1, descriptions.length * 0.3) ? best.label : null;
}

/**
 * Lê extratos em texto com uma transação por linha. Linhas que não seguem o
 * padrão (cabeçalho, saldo) são ignoradas. Sem FITID, o identificador é a
 * combinação data + descrição + valor + ocorrência — reimportar um período
 * sobreposto gera os mesmos ids e não duplica.
 */
export function parseTextStatement(content: string, fileName: string): OfxStatement {
  const occurrences = new Map<string, number>();
  const transactions: OfxTransaction[] = [];
  // Posição das colunas quando o arquivo traz o cabeçalho do Mercado Pago; senão, data;descrição;valor.
  let columns: { date: number; description: number; id: number; amount: number } | null = null;

  for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const parts = splitLine(line);
    if (parts.length < 3) continue;

    const header = parts.map((part) => part.toUpperCase());
    if (header.includes(MERCADO_PAGO_COLUMNS.date) && header.includes(MERCADO_PAGO_COLUMNS.amount)) {
      columns = {
        date: header.indexOf(MERCADO_PAGO_COLUMNS.date),
        description: header.indexOf(MERCADO_PAGO_COLUMNS.description),
        id: header.indexOf(MERCADO_PAGO_COLUMNS.id),
        amount: header.indexOf(MERCADO_PAGO_COLUMNS.amount),
      };
      continue;
    }

    const rawDate = columns ? parts[columns.date] ?? '' : parts[0];
    const date = parseTextDate(rawDate);
    const amountCents = parseStatementAmount(columns ? parts[columns.amount] : parts[parts.length - 1]);
    const rawDescription = columns ? parts[columns.description] ?? '' : parts.slice(1, -1).join(' ');
    const description = rawDescription.replace(/\s+/g, ' ').trim();
    if (!date || amountCents === null || amountCents === 0 || !description) continue;
    if (SKIPPED_DESCRIPTIONS.has(description.toUpperCase())) continue;

    const referenceId = columns && columns.id >= 0 ? parts[columns.id] : '';
    const baseId = referenceId ? `mp|${referenceId}|${amountCents}` : `${rawDate}|${description}|${amountCents}`;
    const seen = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, seen + 1);
    transactions.push({ fitId: `${baseId}#${seen}`, date, amountCents, description });
  }

  if (transactions.length === 0) {
    throw new Error('formato não reconhecido. Use OFX ou TXT/CSV com "data;descrição;valor".');
  }

  const bank = detectBank(fileName, transactions.map((t) => t.description));
  return {
    // Arquivos de texto não identificam a conta; todos compartilham a mesma chave para evitar duplicatas entre si.
    accountKey: 'texto',
    accountLabel: bank ?? (fileName.replace(/\.[^.]+$/, '') || 'Extrato'),
    isCreditCard: false,
    transactions,
  };
}

/** Escolhe o leitor pelo conteúdo (não pela extensão, que nem sempre é confiável). */
export function parseStatementFile(content: string, fileName: string): OfxStatement {
  if (!content.trim()) throw new Error('o arquivo está vazio.');
  return /<OFX>/i.test(content) ? parseOfx(content) : parseTextStatement(content, fileName);
}
