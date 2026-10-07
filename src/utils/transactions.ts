import type { Transaction } from '../types';

export interface SpendingCategory {
  id: string;
  name: string;
  icon: string;
  /** Movimentações entre contas próprias — ficam fora dos totais da análise. */
  ignored?: boolean;
  income?: boolean;
}

export const SPENDING_CATEGORIES: SpendingCategory[] = [
  { id: 'alimentacao', name: 'Alimentação', icon: '🍽️' },
  { id: 'mercado', name: 'Mercado', icon: '🛒' },
  { id: 'transporte', name: 'Transporte', icon: '🚗' },
  { id: 'moradia', name: 'Moradia', icon: '🏠' },
  { id: 'assinaturas', name: 'Contas e assinaturas', icon: '📱' },
  { id: 'saude', name: 'Saúde', icon: '💊' },
  { id: 'compras', name: 'Compras', icon: '🛍️' },
  { id: 'lazer', name: 'Lazer', icon: '🎉' },
  { id: 'educacao', name: 'Educação', icon: '📚' },
  { id: 'taxas', name: 'Impostos e taxas', icon: '🧾' },
  { id: 'outros', name: 'Outros', icon: '📦' },
  { id: 'receitas', name: 'Receitas', icon: '💰', income: true },
  { id: 'transferencias', name: 'Transferências', icon: '🔁', ignored: true },
];

const CATEGORIES_BY_ID = new Map(SPENDING_CATEGORIES.map((c) => [c.id, c]));

export function getSpendingCategory(id: string | undefined): SpendingCategory {
  return CATEGORIES_BY_ID.get(id ?? '') ?? (CATEGORIES_BY_ID.get('outros') as SpendingCategory);
}

/**
 * Chave normalizada da descrição: sem acentos, números e pontuação. Faz
 * "UBER *TRIP 05/10" e "Uber Trip 12/10" caírem na mesma regra.
 */
export function normalizeDescription(description: string): string {
  return description
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palavras-chave padrão (início de palavra na descrição normalizada). A primeira que casar vence. */
const KEYWORD_RULES: [string, string][] = [
  // Transferências entre contas e pagamento de fatura
  ['PAGAMENTO FATURA', 'transferencias'],
  ['PAGTO FATURA', 'transferencias'],
  ['PAG FATURA', 'transferencias'],
  ['PAGAMENTO RECEBIDO', 'transferencias'],
  ['PAGAMENTO DE FATURA', 'transferencias'],
  ['APLICACAO', 'transferencias'],
  ['RESGATE', 'transferencias'],
  // Receitas
  ['SALARIO', 'receitas'],
  ['PROVENTOS', 'receitas'],
  ['RENDIMENTO', 'receitas'],
  ['PIX RECEBIDO', 'receitas'],
  ['REMUNERACAO', 'receitas'],
  ['ADIANTAMENTO SA', 'receitas'],
  // Taxas
  ['IOF', 'taxas'],
  ['TARIFA', 'taxas'],
  ['ANUIDADE', 'taxas'],
  ['JUROS', 'taxas'],
  ['DARF', 'taxas'],
  ['IPVA', 'taxas'],
  ['IPTU', 'taxas'],
  ['ENCARGOS', 'taxas'],
  ['SEGURO CARTAO', 'taxas'],
  ['SEGURO LIS', 'taxas'],
  // Compras (antes de "MERCADO" para não confundir com supermercado)
  ['MERCADOLIVRE', 'compras'],
  ['MERCADO LIVRE', 'compras'],
  ['MERCADO PAGO', 'compras'],
  ['MERCPAGO', 'compras'],
  // Mercado
  ['SUPERMERC', 'mercado'],
  ['MERCADO', 'mercado'],
  ['ATACAD', 'mercado'],
  ['ASSAI', 'mercado'],
  ['CARREFOUR', 'mercado'],
  ['PAO DE ACUCAR', 'mercado'],
  ['HORTIFRUTI', 'mercado'],
  ['SACOLAO', 'mercado'],
  ['ACOUGUE', 'mercado'],
  // Abreviações do extrato Itaú ("PAY SUPER", "PAY MINUT"...)
  ['SUPER ', 'mercado'],
  ['MERCA ', 'mercado'],
  ['MINUT', 'mercado'],
  ['MINUTO PA', 'mercado'],
  ['OXXO', 'mercado'],
  ['PAO D', 'mercado'],
  // Alimentação
  ['IFOOD', 'alimentacao'],
  ['IFD', 'alimentacao'],
  ['RAPPI', 'alimentacao'],
  ['RESTAURANTE', 'alimentacao'],
  ['LANCHONETE', 'alimentacao'],
  ['PADARIA', 'alimentacao'],
  ['PANIFICADORA', 'alimentacao'],
  ['PIZZA', 'alimentacao'],
  ['BURGER', 'alimentacao'],
  ['MCDONALDS', 'alimentacao'],
  ['MC DONALDS', 'alimentacao'],
  ['BK ', 'alimentacao'],
  ['SUBWAY', 'alimentacao'],
  ['STARBUCKS', 'alimentacao'],
  ['CAFE', 'alimentacao'],
  ['CHURRASCARIA', 'alimentacao'],
  ['SORVETERIA', 'alimentacao'],
  ['PADAR', 'alimentacao'],
  ['CONFI', 'alimentacao'],
  ['MC DO', 'alimentacao'],
  ['DOCERIA', 'alimentacao'],
  ['BOTEQ', 'alimentacao'],
  ['ADEGA', 'alimentacao'],
  ['CERVE', 'alimentacao'],
  // Transporte
  ['UBER', 'transporte'],
  ['POSTO', 'transporte'],
  ['COMBUST', 'transporte'],
  ['AUTO POSTO', 'transporte'],
  ['SHELL', 'transporte'],
  ['IPIRANGA', 'transporte'],
  ['PETROBRAS', 'transporte'],
  ['ESTACION', 'transporte'],
  ['SEM PARAR', 'transporte'],
  ['CONECTCAR', 'transporte'],
  ['VELOE', 'transporte'],
  ['PEDAGIO', 'transporte'],
  ['METRO', 'transporte'],
  ['AUTOP', 'transporte'],
  ['AUTO ', 'transporte'],
  ['SPVIA', 'transporte'],
  // Moradia
  ['ALUGUEL', 'moradia'],
  ['CONDOMINIO', 'moradia'],
  ['ENERGIA', 'moradia'],
  ['ENEL', 'moradia'],
  ['CEMIG', 'moradia'],
  ['COPEL', 'moradia'],
  ['CPFL', 'moradia'],
  ['LIGHT', 'moradia'],
  ['SABESP', 'moradia'],
  ['SANEPAR', 'moradia'],
  ['COMGAS', 'moradia'],
  // Contas e assinaturas
  ['NETFLIX', 'assinaturas'],
  ['SPOTIFY', 'assinaturas'],
  ['DISNEY', 'assinaturas'],
  ['HBO', 'assinaturas'],
  ['MAX ', 'assinaturas'],
  ['PRIME VIDEO', 'assinaturas'],
  ['AMAZON PRIME', 'assinaturas'],
  ['YOUTUBE', 'assinaturas'],
  ['GLOBOPLAY', 'assinaturas'],
  ['APPLE COM', 'assinaturas'],
  ['GOOGLE', 'assinaturas'],
  ['MICROSOFT', 'assinaturas'],
  ['TIM', 'assinaturas'],
  ['VIVO', 'assinaturas'],
  ['CLARO', 'assinaturas'],
  ['OI ', 'assinaturas'],
  ['INTERNET', 'assinaturas'],
  // Saúde
  ['FARMACIA', 'saude'],
  ['DROGARIA', 'saude'],
  ['DROGA', 'saude'],
  ['RAIA', 'saude'],
  ['DROGASIL', 'saude'],
  ['PAGUE MENOS', 'saude'],
  ['PANVEL', 'saude'],
  ['HOSPITAL', 'saude'],
  ['CLINICA', 'saude'],
  ['LABORATORIO', 'saude'],
  ['UNIMED', 'saude'],
  ['ODONTO', 'saude'],
  ['TOTALPASS', 'saude'],
  ['TOTAL PASS', 'saude'],
  ['GYMPASS', 'saude'],
  ['WELLHUB', 'saude'],
  ['SMART FIT', 'saude'],
  ['SMARTFIT', 'saude'],
  ['ACADEMIA', 'saude'],
  ['REMED', 'saude'],
  // Compras
  ['AMAZON', 'compras'],
  ['AMZN', 'compras'],
  ['SHOPEE', 'compras'],
  ['MAGALU', 'compras'],
  ['MAGAZINE LUIZA', 'compras'],
  ['AMERICANAS', 'compras'],
  ['ALIEXPRESS', 'compras'],
  ['SHEIN', 'compras'],
  ['RENNER', 'compras'],
  ['RIACHUELO', 'compras'],
  ['C A', 'compras'],
  ['CENTAURO', 'compras'],
  ['NETSHOES', 'compras'],
  ['KABUM', 'compras'],
  ['LEROY', 'compras'],
  ['LOJAS', 'compras'],
  // Lazer
  ['CINEMA', 'lazer'],
  ['CINEMARK', 'lazer'],
  ['INGRESSO', 'lazer'],
  ['SYMPLA', 'lazer'],
  ['STEAM', 'lazer'],
  ['PLAYSTATION', 'lazer'],
  ['HOTEL', 'lazer'],
  ['AIRBNB', 'lazer'],
  ['BOOKING', 'lazer'],
  ['DECOLAR', 'lazer'],
  // Educação
  ['ESCOLA', 'educacao'],
  ['COLEGIO', 'educacao'],
  ['FACULDADE', 'educacao'],
  ['UNIVERSIDADE', 'educacao'],
  ['CURSO', 'educacao'],
  ['UDEMY', 'educacao'],
  ['ALURA', 'educacao'],
  ['LIVRARIA', 'educacao'],
];

function matchesKeyword(key: string, keyword: string): boolean {
  const padded = ` ${key} `;
  const kw = keyword.trimEnd();
  // Palavras-chave curtas ou com espaço final exigem palavra inteira (ex.: "TIM" não casa com "TIMBAUBA").
  return keyword.endsWith(' ') || kw.length <= 3
    ? padded.includes(` ${kw} `)
    : padded.includes(` ${kw}`);
}

/**
 * Categoria sugerida: regra aprendida do usuário > palavra-chave padrão >
 * Receitas (entradas) / Outros (saídas).
 */
export function categorize(
  description: string,
  amountCents: number,
  userRules: Map<string, string>,
): { categoryId: string; source: 'rule' | 'auto' } {
  const key = normalizeDescription(description);
  const ruled = userRules.get(key);
  if (ruled) return { categoryId: ruled, source: 'rule' };
  const keyword = KEYWORD_RULES.find(([kw]) => matchesKeyword(key, kw));
  // Uma entrada que casa com categoria de gasto (ex.: estorno da Amazon) fica nela e abate o gasto.
  if (keyword) return { categoryId: keyword[1], source: 'auto' };
  return { categoryId: amountCents > 0 ? 'receitas' : 'outros', source: 'auto' };
}

export interface CategoryTotal {
  category: SpendingCategory;
  /** Gasto líquido da categoria (positivo = saiu dinheiro). */
  spentCents: number;
  count: number;
}

export interface SpendingSummary {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  byCategory: CategoryTotal[];
  ignoredCount: number;
}

/**
 * Totais do período, sem contar transferências entre contas próprias.
 * Entradas em categorias de gasto (estornos) abatem o gasto da categoria.
 */
export function summarizeTransactions(transactions: Pick<Transaction, 'amountCents' | 'categoryId'>[]): SpendingSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let ignoredCount = 0;
  const totals = new Map<string, CategoryTotal>();

  for (const tx of transactions) {
    const category = getSpendingCategory(tx.categoryId);
    if (category.ignored) {
      ignoredCount += 1;
    } else if (category.income) {
      incomeCents += tx.amountCents;
    } else {
      expenseCents -= tx.amountCents;
      const total = totals.get(category.id) ?? { category, spentCents: 0, count: 0 };
      total.spentCents -= tx.amountCents;
      total.count += 1;
      totals.set(category.id, total);
    }
  }

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    byCategory: [...totals.values()].filter((t) => t.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents),
    ignoredCount,
  };
}

/** Hash FNV-1a de 64 bits em hex — gera ids de documento estáveis e sem caracteres inválidos. */
export function stableHash(input: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const char of input) {
    hash ^= BigInt(char.codePointAt(0) as number);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

export function transactionDocId(accountKey: string, fitId: string): string {
  return `ofx_${stableHash(`${accountKey}|${fitId}`)}`;
}
