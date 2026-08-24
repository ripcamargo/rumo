import { describe, expect, it } from 'vitest';
import {
  calculateAge,
  calculateBmi,
  classifyBmi,
  calculateReferenceWeight,
  calculateMifflinStJeor,
  calculateTdee,
  calculateCalorieGoal,
  calculateGoalProgress,
  estimateWeeksToGoal,
  calculateTrend,
} from './calculations';

describe('calculo de idade', () => {
  it('calcula a idade corretamente a partir da data de nascimento', () => {
    const birthDate = new Date('1997-03-15T00:00:00');
    const now = new Date('2026-08-24T00:00:00');
    expect(calculateAge(birthDate, now)).toBe(29);
  });
});

describe('calculo de IMC', () => {
  it('calcula o IMC usando peso e altura em metros', () => {
    expect(calculateBmi(95, 175)).toBeCloseTo(31.02, 2);
  });

  it('classifica corretamente as faixas de IMC', () => {
    expect(classifyBmi(17.9)).toBe('abaixo do peso');
    expect(classifyBmi(21.5)).toBe('saudável');
    expect(classifyBmi(27.6)).toBe('sobrepeso');
    expect(classifyBmi(31.2)).toBe('obesidade grau I');
    expect(classifyBmi(36.2)).toBe('obesidade grau II');
    expect(classifyBmi(42)).toBe('obesidade grau III');
  });
});

describe('peso de referência', () => {
  it('calcula o peso de referência com base no topo da faixa saudável', () => {
    expect(calculateReferenceWeight(175)).toBeCloseTo(76.3, 1);
  });
});

describe('Mifflin-St Jeor', () => {
  it('calcula o gasto basal masculino', () => {
    expect(calculateMifflinStJeor({ sex: 'male', weightKg: 95, heightCm: 175, ageYears: 29 })).toBeCloseTo(1904, 0);
  });

  it('calcula o gasto basal feminino', () => {
    expect(calculateMifflinStJeor({ sex: 'female', weightKg: 68, heightCm: 165, ageYears: 30 })).toBeCloseTo(1400, 0);
  });
});

describe('TDEE e meta calórica', () => {
  it('calcula o gasto diário estimado com o fator de atividade', () => {
    expect(calculateTdee(1914, 'moderately_active')).toBeCloseTo(2967, 0);
  });

  it('calcula a meta calórica com déficit moderado', () => {
    expect(calculateCalorieGoal(2400, 500)).toBe(1900);
  });
});

describe('progresso e previsão', () => {
  it('calcula o progresso até a meta', () => {
    expect(calculateGoalProgress(95, 82, 76)).toBeCloseTo(0.68, 2);
  });

  it('estima as semanas restantes até a meta com base na tendência', () => {
    expect(estimateWeeksToGoal(95, 76, 0.7)).toBeCloseTo(27.14, 1);
  });

  it('retorna ausência de tendência quando há dados insuficientes', () => {
    const result = calculateTrend([
      { weight: 95, recordedAt: new Date('2026-08-01') },
      { weight: 94.8, recordedAt: new Date('2026-08-05') },
      { weight: 94.9, recordedAt: new Date('2026-08-08') },
    ]);
    expect(result.hasTrend).toBe(false);
    expect(result.kgPerWeek).toBeNull();
  });
});
