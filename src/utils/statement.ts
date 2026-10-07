import { parseOfx, parseStatementAmount, type OfxStatement, type OfxTransaction } from './ofx';

/** Linha de extrato em texto: `data;descrição;valor` (formato TXT/CSV do Itaú e de outros bancos). */
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/;

/** Lançamentos futuros que o banco lista mas ainda não aconteceram — reaparecem com a descrição real depois. */
const SKIPPED_DESCRIPTIONS = new Set(['AGENDADO', 'AGENDAMENTO']);

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

/**
 * Lê extratos em texto com uma transação por linha. Linhas que não seguem o
 * padrão (cabeçalho, saldo) são ignoradas. Sem FITID, o identificador é a
 * combinação data + descrição + valor + ocorrência — reimportar um período
 * sobreposto gera os mesmos ids e não duplica.
 */
export function parseTextStatement(content: string, fileName: string): OfxStatement {
  const occurrences = new Map<string, number>();
  const transactions: OfxTransaction[] = [];

  for (const line of content.split(/\r?\n/)) {
    const parts = splitLine(line);
    if (parts.length < 3) continue;
    const date = parseTextDate(parts[0]);
    const amountCents = parseStatementAmount(parts[parts.length - 1]);
    const description = parts.slice(1, -1).join(' ').replace(/\s+/g, ' ').trim();
    if (!date || amountCents === null || amountCents === 0 || !description) continue;
    if (SKIPPED_DESCRIPTIONS.has(description.toUpperCase())) continue;

    const baseId = `${parts[0]}|${description}|${amountCents}`;
    const seen = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, seen + 1);
    transactions.push({ fitId: `${baseId}#${seen}`, date, amountCents, description });
  }

  if (transactions.length === 0) {
    throw new Error('formato não reconhecido. Use OFX ou TXT/CSV com "data;descrição;valor".');
  }

  return {
    // Arquivos de texto não identificam a conta; todos compartilham a mesma chave para evitar duplicatas entre si.
    accountKey: 'texto',
    accountLabel: fileName.replace(/\.[^.]+$/, '') || 'Extrato',
    isCreditCard: false,
    transactions,
  };
}

/** Escolhe o leitor pelo conteúdo (não pela extensão, que nem sempre é confiável). */
export function parseStatementFile(content: string, fileName: string): OfxStatement {
  if (!content.trim()) throw new Error('o arquivo está vazio.');
  return /<OFX>/i.test(content) ? parseOfx(content) : parseTextStatement(content, fileName);
}
