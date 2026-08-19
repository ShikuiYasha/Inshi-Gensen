import type { GameData } from './gameData';
import { getCanonicalCardId } from './parentDisplay';

export type CharacterOption = {
  characterId: number;
  name: string;
  thumbnailFileName: string;
};

export function createCharacterOptions(
  gameData: GameData,
): CharacterOption[] {
  const options = new Map<number, CharacterOption>();

  const canonicalCardIds = Object.keys(gameData.outfits)
    .map(Number)
    .filter(Number.isFinite)
    .map(getCanonicalCardId)
    .sort((left, right) => left - right);

  for (const cardId of canonicalCardIds) {
    const characterId = Math.floor(cardId / 100);
    const name = gameData.characters[String(characterId)];

    if (!name || options.has(characterId)) {
      continue;
    }

    options.set(characterId, {
      characterId,
      name,
      thumbnailFileName:
        `chara_stand_${characterId}_${cardId}.webp`,
    });
  }

  return Array.from(options.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}