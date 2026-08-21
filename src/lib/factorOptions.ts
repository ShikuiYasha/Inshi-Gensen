import type { GameData } from './gameData';
import { getFactorCategory, type FactorCategory } from './parentDisplay';

export type FactorOption = {
  factorBaseId: number;
  category: Exclude<FactorCategory, 'event'>;
  name: string;
};

export function createFactorOptions(gameData: GameData): FactorOption[] {
  const options = new Map<number, FactorOption>();

  for (const [rawFactorId, name] of Object.entries(gameData.factors)) {
    const factorId = Number(rawFactorId);
    const stars = factorId % 100;

    if (!Number.isFinite(factorId) || stars < 1 || stars > 3) {
      continue;
    }

    const category = getFactorCategory(factorId);

    if (category === 'event') {
      continue;
    }

    const factorBaseId = factorId - stars;

    if (!options.has(factorBaseId)) {
      options.set(factorBaseId, {
        factorBaseId,
        category,
        name,
      });
    }
  }

  return Array.from(options.values()).sort((left, right) => left.factorBaseId - right.factorBaseId);
}
