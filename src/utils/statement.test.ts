import { describe, expect, it } from 'vitest';
import { parseStatementFile } from './statement';
import { categorize, normalizeDescription, splitNewTransactions, transactionDocId } from './transactions';

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
    expect(statement.accountLabel).toBe('Itaú');
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

describe('extrato em texto (Mercado Pago)', () => {
  const MP_TXT = [
    '01/09/2026;Pagamento com QR Pix AUTO POSTO ARUANA LTDA;-22,00',
    '01/09/2026;Pix recebido FULANO DE TAL;100,00',
    '03/09/2026;Rendimentos ;0,03',
    '16/09/2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;-7,78',
  ].join('\n');

  it('reconhece o banco pelo estilo das descrições, mesmo com nome de arquivo genérico', () => {
    const statement = parseStatementFile(MP_TXT, 'extrato.txt');
    expect(statement.accountLabel).toBe('Mercado Pago');
    expect(statement.transactions.map((t) => t.amountCents)).toEqual([-2200, 10000, 3, -778]);
    expect(statement.transactions[2].description).toBe('Rendimentos');
  });

  it('reconhece pelo estilo os lançamentos do relatório .csv', () => {
    const csv = [
      'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
      '10-10-2026;Pix enviado Fulano;1;-20,00;10,00',
      '10-10-2026;Reembolso de transferência enviada Fulano;2;20,00;30,00',
      '11-10-2026;Pagamento com código QR Lá Baguette;3;-12,00;18,00',
    ].join('\n');
    expect(parseStatementFile(csv, 'account_statement.csv').accountLabel).toBe('Mercado Pago');
  });

  it('usa o nome do arquivo quando ele indica o banco', () => {
    expect(parseStatementFile('05/10/26;Compra;-1,00', 'Extrato MERCADOPAGO.txt').accountLabel).toBe('Mercado Pago');
    expect(parseStatementFile('05/10/26;Compra;-1,00', 'compras.txt').accountLabel).toBe('compras');
  });

  it('lê o relatório oficial com cabeçalho, ignorando a coluna de saldo', () => {
    const csv = [
      'INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE',
      '1.000,00;100,00;-22,00;1.078,00',
      '',
      'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
      '01-09-2026;Pagamento com QR Pix AUTO POSTO;123;-22,00;978,00',
      '01-09-2026;Pix recebido FULANO;124;100,00;1.078,00',
    ].join('\n');
    const statement = parseStatementFile(`\uFEFF${csv}`, 'account_statement.csv');
    expect(statement.accountLabel).toBe('Mercado Pago');
    expect(statement.transactions.map((t) => t.amountCents)).toEqual([-2200, 10000]);
    expect(statement.transactions[0].fitId).toBe('mp|123|-2200#0');
    expect(statement.transactions[0].date.getDate()).toBe(1);
  });

  it('categoriza descrições típicas do Mercado Pago', () => {
    const none = new Map<string, string>();
    expect(categorize('Pagamento com QR Pix JAD ZOGHEIB CIA LTDA', -100, none).categoryId).toBe('alimentacao');
    expect(categorize('Pagamento com QR Pix ZENSHO DO BRASIL COMERCIO DE ALIMENTOS LTDA', -100, none).categoryId).toBe('alimentacao');
    expect(
      categorize('Pagamento com QR Pix REDE INTEGRADA DE LOJAS DE CONVENIENCIA E PROXIMIDADE S.A.', -100, none).categoryId,
    ).toBe('mercado');
    expect(categorize('Rendimentos', 3, none).categoryId).toBe('receitas');
    expect(categorize('Pagamento com Pix THE CROWN PUB LTDA', -100, none).categoryId).toBe('alimentacao');
    expect(categorize('Pagamento Depois bar', -100, none).categoryId).toBe('alimentacao');
    expect(categorize('Pagamento com Pix BARBARA DA COSTA PALACIOS DE SANTANA', -100, none).categoryId).toBe('outros');
    expect(categorize('Pagamento com Pix COMPANHIA BRASILEIRA DE DISTRIBUICAO', -100, none).categoryId).toBe('mercado');
    expect(categorize('Pagamento com Pix SERGIO AFONSO PINHEIRO SOARES PET SHOP', -100, none).categoryId).toBe('compras');
    // O reembolso fica na mesma categoria do Pix enviado e abate o gasto
    expect(categorize('Pix enviado Leonardo Brabo', -100, none).categoryId).toBe('outros');
    expect(categorize('Reembolso de transferência enviada Leonardo Brabo', 100, none).categoryId).toBe('outros');
  });
});

describe('transações repetidas entre importações', () => {
  const asNew = (content: string, fileName: string) => {
    const statement = parseStatementFile(content, fileName);
    return statement.transactions.map((t) => ({
      id: transactionDocId(statement.accountKey, t.fitId),
      date: t.date,
      amountCents: t.amountCents,
      descriptionKey: normalizeDescription(t.description),
    }));
  };

  const OLD_FORMAT = [
    '16/09/2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;-10,97',
    '16/09/2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;-7,78',
    '17/09/2026;Rendimentos ;0,03',
  ].join('\n');
  const NEW_FORMAT = [
    'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
    '16-09-2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;178409186067;-10,97;39,12',
    '16-09-2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;179413428092;-7,78;1,26',
    '17-09-2026;Rendimentos ;1750117401189;0,03;1,29',
    '18-09-2026;Rendimentos ;1750195203744;0,11;301,40',
  ].join('\n');

  it('ignora a mesma transação vinda de outro formato (ids diferentes)', () => {
    const existing = asNew(OLD_FORMAT, 'mp antigo.txt');
    const { fresh, sameId, similar } = splitNewTransactions(asNew(NEW_FORMAT, 'mp.csv'), existing);
    expect(fresh.map((t) => t.amountCents)).toEqual([11]);
    expect(sameId).toBe(0);
    expect(similar).toBe(3);
  });

  it('reimportar o mesmo arquivo conta como já importado, não como parecido', () => {
    const existing = asNew(NEW_FORMAT, 'mp.csv');
    const result = splitNewTransactions(asNew(NEW_FORMAT, 'mp.csv'), existing);
    expect(result).toMatchObject({ fresh: [], sameId: 4, similar: 0 });
  });

  it('compara por quantidade: compras iguais no mesmo dia continuam entrando', () => {
    const line = '09/03/2026;PAY SUPER 07/03;-66,41';
    const existing = asNew([line, line].join('\n'), 'a.txt');
    // Formato diferente (outros ids), três compras iguais no dia: só a terceira é nova.
    const incoming = asNew(
      [
        'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
        '09-03-2026;PAY SUPER 07/03;1;-66,41;0',
        '09-03-2026;PAY SUPER 07/03;2;-66,41;0',
        '09-03-2026;PAY SUPER 07/03;3;-66,41;0',
      ].join('\n'),
      'b.csv',
    );
    const { fresh, similar } = splitNewTransactions(incoming, existing);
    expect(fresh).toHaveLength(1);
    expect(similar).toBe(2);
  });

  it('valor ou dia diferente não é repetida', () => {
    const existing = asNew('16/09/2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;-10,97', 'a.txt');
    const incoming = asNew(
      ['16/09/2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;-10,98', '17/09/2026;Pagamento com QR Pix JAD ZOGHEIB CIA LTDA;-10,97'].join('\n'),
      'b.txt',
    );
    expect(splitNewTransactions(incoming, existing).fresh).toHaveLength(2);
  });
});
