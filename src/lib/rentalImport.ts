import type { VeteranRecord } from './importVeterans';

type RentalImportResult = {
  accountId: string;
  trainerName: string;
  veteran: VeteranRecord;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  const converted = Number(value);

  return Number.isFinite(converted) ? converted : null;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function createFactorEntries(...values: unknown[]): { factor_id: number }[] {
  return values.flatMap((value) => {
    const entries = Array.isArray(value) ? value : [value];

    return entries.flatMap((entry) => {
      const factorId = toNumber(entry);

      return factorId !== null && factorId > 0 ? [{ factor_id: factorId }] : [];
    });
  });
}

function createGrandparent(
  positionId: number,
  cardId: unknown,
  blueFactor: unknown,
  pinkFactor: unknown,
  greenFactor: unknown,
  whiteFactors: unknown,
  winSaddles: unknown,
): Record<string, unknown> | null {
  const convertedCardId = toNumber(cardId);

  if (convertedCardId === null) {
    return null;
  }

  return {
    position_id: positionId,
    card_id: convertedCardId,
    factor_info_array: createFactorEntries(blueFactor, pinkFactor, greenFactor, whiteFactors),
    win_saddle_id_array: Array.isArray(winSaddles) ? winSaddles : [],
  };
}

export function importRentalProfile(value: unknown): RentalImportResult {
  if (!isObject(value)) {
    throw new Error('The Rental response is invalid.');
  }

  const trainer = value.trainer;
  const inheritance = value.inheritance;

  if (!isObject(trainer) || !isObject(inheritance)) {
    throw new Error('No Rental inheritance data was found for this Trainer.');
  }

  const accountId = toText(inheritance.account_id) ?? toText(trainer.account_id);

  const trainerName = toText(trainer.name) ?? `Trainer ${accountId ?? ''}`;

  const mainCardId = toNumber(inheritance.main_parent_id);
  const inheritanceId = toNumber(inheritance.inheritance_id);

  if (accountId === null || mainCardId === null || inheritanceId === null) {
    throw new Error('The Rental inheritance data is incomplete.');
  }

  const grandparents = [
    createGrandparent(
      10,
      inheritance.parent_left_id,
      inheritance.left_blue_factors,
      inheritance.left_pink_factors,
      inheritance.left_green_factors,
      inheritance.left_white_factors,
      inheritance.left_win_saddles,
    ),
    createGrandparent(
      20,
      inheritance.parent_right_id,
      inheritance.right_blue_factors,
      inheritance.right_pink_factors,
      inheritance.right_green_factors,
      inheritance.right_white_factors,
      inheritance.right_win_saddles,
    ),
  ].filter((grandparent): grandparent is Record<string, unknown> => grandparent !== null);

  const veteran: VeteranRecord = {
    trained_chara_id: `rental:${accountId}:${inheritanceId}`,
    card_id: mainCardId,
    rank_score: inheritance.parent_rank,
    factor_info_array: createFactorEntries(
      inheritance.main_blue_factors,
      inheritance.main_pink_factors,
      inheritance.main_green_factors,
      inheritance.main_white_factors,
    ),
    succession_chara_array: grandparents,
    win_saddle_id_array: Array.isArray(inheritance.main_win_saddles)
      ? inheritance.main_win_saddles
      : [],
  };

  return {
    accountId,
    trainerName,
    veteran,
  };
}
