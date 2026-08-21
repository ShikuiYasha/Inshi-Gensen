import type { GameData } from './gameData';
import type { VeteranRecord } from './importVeterans';

export type FactorCategory = 'blue' | 'pink' | 'green' | 'skill' | 'race' | 'scenario' | 'event';

export type DisplayFactor = {
  factorBaseId: number;
  category: FactorCategory;
  name: string;
  totalStars: number;
  mainStars: number;
};

export type LineageMember = {
  cardId: number;
  characterId: number;
  outfitName: string;
  characterName: string;
  factors: RawFactor[];
  winSaddleIds: number[];
  thumbnailFileName: string;
};

export type DisplayParent = {
  trainedCharaId: string;
  main: LineageMember;
  grandparents: LineageMember[];
  factors: DisplayFactor[];
  rating: number | null;
  rankImageFileName: string | null;
};

type RawFactor = {
  factorId: number;
  stars: number;
};

type RawSuccessionMember = Record<string, unknown> & {
  position_id: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  const converted = Number(value);

  return Number.isFinite(converted) ? converted : null;
}

function getFactors(value: unknown): RawFactor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isObject(entry)) {
      return [];
    }

    const factorId = toNumber(entry.factor_id);

    if (factorId === null) {
      return [];
    }

    const stars = factorId % 100;

    if (stars < 1 || stars > 3) {
      return [];
    }

    return [{ factorId, stars }];
  });
}

function getWinSaddleIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const saddleId = toNumber(entry);

    return saddleId === null ? [] : [saddleId];
  });
}

const duplicateCardIdAliases: Record<number, number> = {
  9_100_101: 100_101,
  9_101_101: 101_101,
};

export function getCanonicalCardId(cardId: number): number {
  return duplicateCardIdAliases[cardId] ?? cardId;
}

function getCharacterId(cardId: number): number {
  return Math.floor(getCanonicalCardId(cardId) / 100);
}

function createLineageMember(
  source: Record<string, unknown>,
  gameData: GameData,
): LineageMember | null {
  const cardId = toNumber(source.card_id);

  if (cardId === null) {
    return null;
  }

  const characterId = getCharacterId(cardId);
  const canonicalCardId = getCanonicalCardId(cardId);

  return {
    cardId,
    characterId,
    thumbnailFileName: `chara_stand_${characterId}_${canonicalCardId}.webp`,
    outfitName:
      gameData.outfits[String(cardId)] ??
      gameData.characters[String(characterId)] ??
      `Card ${cardId}`,
    characterName: gameData.characters[String(characterId)] ?? `Character ${characterId}`,
    factors: getFactors(source.factor_info_array),
    winSaddleIds: getWinSaddleIds(source.win_saddle_id_array),
  };
}

function isSuccessionMember(value: unknown): value is RawSuccessionMember {
  return isObject(value) && typeof toNumber(value.position_id) === 'number';
}

export function getFactorCategory(factorId: number): FactorCategory {
  if (factorId >= 10_000_000) {
    return 'green';
  }

  if (factorId >= 4_000_000) {
    return 'event';
  }

  if (factorId >= 3_000_000) {
    return 'scenario';
  }

  if (factorId >= 2_000_000) {
    return 'skill';
  }

  if (factorId >= 1_000_000) {
    return 'race';
  }

  if (factorId >= 1_100) {
    return 'pink';
  }

  return 'blue';
}

function combineFactors(
  main: LineageMember,
  grandparents: LineageMember[],
  gameData: GameData,
): DisplayFactor[] {
  const combined = new Map<string, DisplayFactor>();

  const members = [
    { member: main, isMain: true },
    ...grandparents.map((member) => ({ member, isMain: false })),
  ];

  for (const { member, isMain } of members) {
    for (const factor of member.factors) {
      const category = getFactorCategory(factor.factorId);
      const factorBaseId = factor.factorId - factor.stars;
      const name = gameData.factors[String(factor.factorId)] ?? `Factor ${factor.factorId}`;
      const key = `${category}:${factorBaseId}`;
      const existing = combined.get(key);

      if (existing) {
        existing.totalStars += factor.stars;

        if (isMain) {
          existing.mainStars += factor.stars;
        }
      } else {
        combined.set(key, {
          factorBaseId,
          category,
          name,
          totalStars: factor.stars,
          mainStars: isMain ? factor.stars : 0,
        });
      }
    }
  }

  const categoryOrder: FactorCategory[] = [
    'blue',
    'pink',
    'green',
    'skill',
    'race',
    'scenario',
    'event',
  ];

  return Array.from(combined.values()).sort((left, right) => {
    const categoryDifference =
      categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);

    if (categoryDifference !== 0) {
      return categoryDifference;
    }

    const starDifference = right.totalStars - left.totalStars;

    if (starDifference !== 0) {
      return starDifference;
    }

    return left.factorBaseId - right.factorBaseId;
  });
}
function getRating(source: Record<string, unknown>): number | null {
  return toNumber(source.rank_score ?? source.parent_rank);
}

function getRankImageFileName(rating: number | null, gameData: GameData): string | null {
  if (rating === null) {
    return null;
  }

  const matchingRank = gameData.rankRanges.find(
    (rank) => rating >= rank.minValue && rating <= rank.maxValue,
  );

  if (!matchingRank) {
    return null;
  }

  const imageNumber = String(matchingRank.id - 1).padStart(2, '0');

  return `utx_ico_statusrank_${imageNumber}.webp`;
}
export function createDisplayParent(
  veteran: VeteranRecord,
  gameData: GameData,
): DisplayParent | null {
  const main = createLineageMember(veteran, gameData);

  if (!main) {
    return null;
  }

  const successionMembers = Array.isArray(veteran.succession_chara_array)
    ? veteran.succession_chara_array
    : [];

  const grandparents = successionMembers
    .filter(isSuccessionMember)
    .filter((member) => {
      const positionId = toNumber(member.position_id);

      return positionId === 10 || positionId === 20;
    })
    .sort((left, right) => Number(left.position_id) - Number(right.position_id))
    .flatMap((member) => {
      const displayMember = createLineageMember(member, gameData);

      return displayMember ? [displayMember] : [];
    });
  const rating = getRating(veteran);
  return {
    trainedCharaId: String(veteran.trained_chara_id),
    main,
    grandparents,
    factors: combineFactors(main, grandparents, gameData),
    rating,
    rankImageFileName: getRankImageFileName(rating, gameData),
  };
}
export function getTotalWhiteCount(parent: DisplayParent): number {
  return parent.factors.filter((factor) => ['skill', 'race', 'scenario'].includes(factor.category))
    .length;
}
