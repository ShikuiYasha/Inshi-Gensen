import type { GameData } from './gameData';
import {
  getCanonicalCardId,
  type DisplayParent,
} from './parentDisplay';

export type CharacterOption = {
  cardId: number;
  characterId: number;
  name: string;
  outfitTitle: string;
  thumbnailFileName: string;
};

function createOption(
  cardId: number,
  gameData: GameData,
): CharacterOption | null {
  const canonicalCardId = getCanonicalCardId(cardId);
  const characterId = Math.floor(canonicalCardId / 100);
  const name = gameData.characters[String(characterId)];

  if (!name) {
    return null;
  }

  const fullOutfitName =
    gameData.outfits[String(cardId)] ??
    gameData.outfits[String(canonicalCardId)] ??
    name;

  return {
    cardId: canonicalCardId,
    characterId,
    name,
    outfitTitle: fullOutfitName.replace(name, '').trim(),
    thumbnailFileName:
      `chara_stand_${characterId}_${canonicalCardId}.webp`,
  };
}

export function createCharacterOptions(
  gameData: GameData,
): CharacterOption[] {
  const options = new Map<number, CharacterOption>();

  for (const rawCardId of Object.keys(gameData.outfits).map(Number)) {
    if (!Number.isFinite(rawCardId)) {
      continue;
    }

    const option = createOption(rawCardId, gameData);

    if (option && !options.has(option.cardId)) {
      options.set(option.cardId, option);
    }
  }

  return Array.from(options.values()).sort((left, right) => {
    const nameDifference = left.name.localeCompare(right.name);

    if (nameDifference !== 0) {
      return nameDifference;
    }

    return left.outfitTitle.localeCompare(right.outfitTitle);
  });
}

function selectAvailableOutfits(
  cardIds: number[],
  gameData: GameData,
): CharacterOption[] {
  const availableCardIds = new Set(
    cardIds.map(getCanonicalCardId),
  );

  return createCharacterOptions(gameData).filter((option) =>
    availableCardIds.has(option.cardId),
  );
}

export function createOwnedParentCharacterOptions(
  parents: DisplayParent[],
  gameData: GameData,
): CharacterOption[] {
  return selectAvailableOutfits(
    parents.map((parent) => parent.main.cardId),
    gameData,
  );
}

export function createGrandparentCharacterOptions(
  parents: DisplayParent[],
  gameData: GameData,
): CharacterOption[] {
  return selectAvailableOutfits(
    parents.flatMap((parent) =>
      parent.grandparents.map(
        (grandparent) => grandparent.cardId,
      ),
    ),
    gameData,
  );
}