import { describe, expect, it } from 'vitest';
import { decodeOfx, parseOfx } from './ofx';
import {
  categorize,
  normalizeDescription,
  summarizeTransactions,
  transactionDocId,
} from './transactions';

const SGML_CHECKING = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>0341<ACCTID>12345-6<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003100000[-3:BRT]<TRNAMT>-70,00<FITID>A1<MEMO>CEMIG ENERGIA</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-42.50<FITID>A2<MEMO>IFOOD *Restaurante 05/10</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-42.50<FITID>A2<MEMO>IFOOD *Restaurante 05/10</STMTTRN>
<STMTTRN><TRNTYPE>OTHER<DTPOSTED>20261001<TRNAMT>0.00<FITID>S0<MEMO>SALDO ANTERIOR</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261001<TRNAMT>5000.00<FITID>A3<NAME>SALARIO<MEMO>EMPRESA LTDA</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const XML_CARD = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211"?>
<OFX>
  <CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS>
    <CCACCTFROM><ACCTID>9876</ACCTID></CCACCTFROM>
    <FI><ORG>NU PAGAMENTOS S.A.</ORG></FI>
    <BANKTRANLIST>
      <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260928000000[-3:BRT]</DTPOSTED><TRNAMT>-1,234.56</TRNAMT><FITID>xyz</FITID><MEMO>Drogasil &amp; Cia</MEMO></STMTTRN>
      <STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261002</DTPOSTED><TRNAMT>300.00</TRNAMT><FITID>pay</FITID><MEMO>Pagamento recebido</MEMO></STMTTRN>
    </BANKTRANLIST>
  </CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1>
</OFX>`;

describe('parseOfx', () => {
  it('lê OFX 1.x (SGML) de conta corrente', () => {
    const statement = parseOfx(SGML_CHECKING);
    expect(statement.accountLabel).toBe('Itaú ··3456');
    expect(statement.isCreditCard).toBe(false);
    expect(statement.transactions).toHaveLength(4);
    expect(statement.transactions[0]).toMatchObject({ fitId: 'A1', amountCents: -7000, description: 'CEMIG ENERGIA' });
    expect(statement.transactions[0].date.getDate()).toBe(3);
    // FITID repetido no mesmo arquivo vira id distinto
    expect(statement.transactions.map((t) => t.fitId)).toEqual(['A1', 'A2', 'A2#1', 'A3']);
    expect(statement.transactions[3]).toMatchObject({ amountCents: 500000, description: 'SALARIO · EMPRESA LTDA' });
  });

  it('lê OFX 2.x (XML) de cartão de crédito', () => {
    const statement = parseOfx(XML_CARD);
    expect(statement.isCreditCard).toBe(true);
    expect(statement.accountLabel).toBe('Cartão NU PAGAMENTOS S.A. ··9876');
    expect(statement.transactions[0]).toMatchObject({ amountCents: -123456, description: 'Drogasil & Cia' });
  });

  it('rejeita arquivos que não são OFX', () => {
    expect(() => parseOfx('data;valor\n01/10;10')).toThrow();
  });

  it('decodifica Windows-1252 quando o arquivo não é UTF-8', () => {
    // "PADARIA SÃO" em Windows-1252: 0xC3 é "Ã" (e sozinho é UTF-8 inválido)
    const latin1 = new Uint8Array([0x50, 0x41, 0x44, 0x41, 0x52, 0x49, 0x41, 0x20, 0x53, 0xc3, 0x4f]);
    expect(decodeOfx(latin1.buffer)).toBe('PADARIA SÃO');
  });
});

describe('categorização', () => {
  const noRules = new Map<string, string>();

  it('normaliza descrições para casar regras', () => {
    expect(normalizeDescription('UBER *TRIP 05/10')).toBe('UBER TRIP');
    expect(normalizeDescription('Pão de Açúcar-123')).toBe('PAO DE ACUCAR');
  });

  it('usa palavras-chave, sinal do valor e regras aprendidas', () => {
    expect(categorize('IFOOD *Restaurante', -4250, noRules).categoryId).toBe('alimentacao');
    expect(categorize('MERCADO LIVRE *Loja', -9990, noRules).categoryId).toBe('compras');
    expect(categorize('SUPERMERCADO BH', -9990, noRules).categoryId).toBe('mercado');
    expect(categorize('Pagamento recebido', 30000, noRules).categoryId).toBe('transferencias');
    expect(categorize('TIMBAUBA LTDA', -1000, noRules).categoryId).toBe('outros');
    expect(categorize('PIX FULANO', 1000, noRules).categoryId).toBe('receitas');
    const rules = new Map([['PIX FULANO', 'lazer']]);
    expect(categorize('Pix Fulano 10/10', -1000, rules)).toEqual({ categoryId: 'lazer', source: 'rule' });
  });

  it('resume o mês sem contar transferências e abatendo estornos', () => {
    const summary = summarizeTransactions([
      { amountCents: -10000, categoryId: 'compras' },
      { amountCents: 2000, categoryId: 'compras' },
      { amountCents: -5000, categoryId: 'alimentacao' },
      { amountCents: 500000, categoryId: 'receitas' },
      { amountCents: -30000, categoryId: 'transferencias' },
    ]);
    expect(summary).toMatchObject({ incomeCents: 500000, expenseCents: 13000, balanceCents: 487000, ignoredCount: 1 });
    expect(summary.byCategory.map((c) => [c.category.id, c.spentCents])).toEqual([
      ['compras', 8000],
      ['alimentacao', 5000],
    ]);
  });

  it('gera ids estáveis por conta e FITID', () => {
    expect(transactionDocId('341-1', 'A1')).toBe(transactionDocId('341-1', 'A1'));
    expect(transactionDocId('341-1', 'A1')).not.toBe(transactionDocId('341-2', 'A1'));
    expect(transactionDocId('341-1', 'A1')).toMatch(/^ofx_[0-9a-f]{16}$/);
  });
});
