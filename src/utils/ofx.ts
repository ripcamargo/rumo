/**
 * Leitor de extratos OFX (1.x em SGML e 2.x em XML), no formato exportado
 * por bancos brasileiros tanto para conta corrente quanto para cartão.
 */

export interface OfxTransaction {
  /** Identificador do banco para a transação (FITID), único por conta. */
  fitId: string;
  date: Date;
  amountCents: number;
  description: string;
}

export interface OfxStatement {
  /** Chave estável da conta (banco + número), usada para evitar duplicatas. */
  accountKey: string;
  accountLabel: string;
  isCreditCard: boolean;
  transactions: OfxTransaction[];
}

const BANK_NAMES: Record<string, string> = {
  '1': 'Banco do Brasil',
  '33': 'Santander',
  '77': 'Inter',
  '104': 'Caixa',
  '197': 'Stone',
  '208': 'BTG',
  '212': 'Original',
  '237': 'Bradesco',
  '260': 'Nubank',
  '290': 'PagBank',
  '323': 'Mercado Pago',
  '336': 'C6 Bank',
  '341': 'Itaú',
  '380': 'PicPay',
  '422': 'Safra',
  '655': 'Neon',
  '748': 'Sicredi',
  '756': 'Sicoob',
};

/** Decodifica o arquivo: UTF-8 quando válido, senão Windows-1252 (padrão da maioria dos bancos). */
export function decodeOfx(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Valor de um campo simples — funciona com e sem tag de fechamento (SGML/XML). */
function field(block: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(block);
  const value = match?.[1].trim();
  return value ? decodeEntities(value) : undefined;
}

function blocks(content: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
  return Array.from(content.matchAll(regex), (m) => m[1]);
}

/** Datas OFX: `YYYYMMDD[HHMMSS[.xxx]][[-3:BRT]]`. Usa meio-dia local para não escorregar de dia por fuso. */
function parseOfxDate(value: string | undefined): Date | null {
  const match = value && /^(\d{4})(\d{2})(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

/** Valores podem vir como "-50.00", "-50,00", "1,234.56" ou "-1.650,16". */
export function parseStatementAmount(value: string | undefined): number | null {
  if (!value) return null;
  let normalized = value.replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else {
    normalized = normalized.replace(',', '.');
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function buildDescription(block: string): string {
  const name = field(block, 'NAME');
  const memo = field(block, 'MEMO');
  if (name && memo && !memo.toUpperCase().includes(name.toUpperCase())) return `${name} · ${memo}`;
  return memo ?? name ?? 'Sem descrição';
}

function accountInfo(content: string, isCreditCard: boolean) {
  const bankId = field(content, 'BANKID');
  const org = field(content, 'ORG');
  const acctId = field(content, 'ACCTID') ?? 'conta';
  const bankName = (bankId && BANK_NAMES[String(Number(bankId))]) || org || (bankId ? `Banco ${bankId}` : 'Banco');
  const suffix = acctId.replace(/\W/g, '').slice(-4);
  return {
    accountKey: `${bankId ?? org ?? 'banco'}-${acctId}`,
    accountLabel: `${isCreditCard ? 'Cartão ' : ''}${bankName}${suffix ? ` ··${suffix}` : ''}`,
  };
}

export function parseOfx(content: string): OfxStatement {
  if (!/<OFX>/i.test(content)) {
    throw new Error('O arquivo não parece ser um extrato OFX.');
  }
  const isCreditCard = /<CCSTMTRS>/i.test(content);
  const seenFitIds = new Map<string, number>();

  const transactions: OfxTransaction[] = [];
  for (const block of blocks(content, 'STMTTRN')) {
    const date = parseOfxDate(field(block, 'DTPOSTED'));
    const amountCents = parseStatementAmount(field(block, 'TRNAMT'));
    // Linhas informativas (ex.: "SALDO ANTERIOR") costumam vir com valor zero.
    if (!date || amountCents === null || amountCents === 0) continue;
    const description = buildDescription(block);

    let fitId = field(block, 'FITID') ?? `${date.getTime()}_${amountCents}_${description}`;
    // Alguns bancos repetem o FITID dentro do mesmo arquivo; o sufixo mantém as transações distintas e determinísticas.
    const seen = seenFitIds.get(fitId) ?? 0;
    seenFitIds.set(fitId, seen + 1);
    if (seen > 0) fitId = `${fitId}#${seen}`;

    transactions.push({ fitId, date, amountCents, description });
  }

  return { ...accountInfo(content, isCreditCard), isCreditCard, transactions };
}
