import { describe, expect, it } from 'vitest';
import { parseStatementFile } from './statement';
import { categorize } from './transactions';

const ITAU_TXT = [
  '09/03/2026;PAY SUPER 07/03;-66,41',
  '09/03/2026;PAY SUPER 07/03;-66,41',
  '19/03/2026;PAGTO ADIANTAMENTO SALAR;1193,64',
  '20/03/2026;PIX TRANSF Ricardo20/03;-1.650,16',
  '21/03/2026;Saldo do dia;0,00',
  '07/10/2026;Agendado;-5,74',
].join('\r\n');

describe('extrato em texto (Itaú)', () => {
  it('lê data;descrição;valor e ignora saldos e agendamentos', () => {
    const statement = parseStatementFile(ITAU_TXT, 'Extrato Conta itau.txt');
    expect(statement.accountLabel).toBe('Extrato Conta itau');
    expect(statement.transactions.map((t) => t.amountCents)).toEqual([-6641, -6641, 119364, -165016]);
    expect(statement.transactions[0].date.getMonth()).toBe(2);
    // Lançamentos idênticos no mesmo dia continuam distintos e com ids estáveis
    expect(new Set(statement.transactions.map((t) => t.fitId)).size).toBe(4);
    expect(parseStatementFile(ITAU_TXT, 'outro nome.txt').transactions.map((t) => t.fitId)).toEqual(
      statement.transactions.map((t) => t.fitId),
    );
  });

  it('aceita vírgula ou tab como separador e ano com 2 dígitos', () => {
    const statement = parseStatementFile('Data,Descrição,Valor\n"05/10/26","UBER *TRIP","-24.30"', 'x.csv');
    expect(statement.transactions).toHaveLength(1);
    expect(statement.transactions[0]).toMatchObject({ amountCents: -2430, description: 'UBER *TRIP' });
  });

  it('explica quando o arquivo está vazio ou num formato desconhecido', () => {
    expect(() => parseStatementFile('', 'a.ofx')).toThrow('vazio');
    expect(() => parseStatementFile('qualquer coisa', 'a.txt')).toThrow('formato não reconhecido');
  });

  it('categoriza abreviações do Itaú', () => {
    const none = new Map<string, string>();
    expect(categorize('PAY SUPER 07/03', -100, none).categoryId).toBe('mercado');
    expect(categorize('PAY PADAR 17/03', -100, none).categoryId).toBe('alimentacao');
    expect(categorize('PAGTO ADIANTAMENTO SALAR', 100, none).categoryId).toBe('receitas');
    expect(categorize('SEGURO CARTAO', -574, none).categoryId).toBe('taxas');
  });
});
