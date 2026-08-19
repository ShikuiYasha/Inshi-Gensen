import type { GameData } from './gameData';
import type { DisplayParent, LineageMember } from './parentDisplay';

function getRaceGroups(
  member: LineageMember,
  gameData: GameData,
): Set<number> {
  const groups = member.winSaddleIds.flatMap((saddleId) => {
    const groupId = gameData.g1RaceGroups[String(saddleId)];

    return typeof groupId === 'number' ? [groupId] : [];
  });

  return new Set(groups);
}

function countSharedValues(
  left: Set<number>,
  right: Set<number>,
): number {
  let matches = 0;

  for (const value of left) {
    if (right.has(value)) {
      matches += 1;
    }
  }

  return matches;
}

function calculateRacePair(
  left: LineageMember,
  right: LineageMember,
  gameData: GameData,
): number {
  const leftGroups = getRaceGroups(left, gameData);
  const rightGroups = getRaceGroups(right, gameData);

  return countSharedValues(leftGroups, rightGroups) * 3;
}

export function calculateRaceAffinity(
  parent: DisplayParent,
  gameData: GameData,
  otherParent?: DisplayParent,
): number {
  let affinity = 0;

  for (const grandparent of parent.grandparents) {
    affinity += calculateRacePair(parent.main, grandparent, gameData);
  }

  if (otherParent) {
    for (const grandparent of otherParent.grandparents) {
      affinity += calculateRacePair(
        otherParent.main,
        grandparent,
        gameData,
      );
    }

    affinity += calculateRacePair(
      parent.main,
      otherParent.main,
      gameData,
    );
  }

  return affinity;
}

function calculateCharacterPair(
  leftCharacterId: number,
  rightCharacterId: number,
  gameData: GameData,
): number {
  return gameData.affinityGroups.reduce((total, group) => {
    const containsBoth =
      group.characters.includes(leftCharacterId) &&
      group.characters.includes(rightCharacterId);

    return containsBoth ? total + group.points : total;
  }, 0);
}

function calculateCharacterTriple(
  targetCharacterId: number,
  parentCharacterId: number,
  grandparentCharacterId: number,
  gameData: GameData,
): number {
  return gameData.affinityGroups.reduce((total, group) => {
    const containsAll =
      group.characters.includes(targetCharacterId) &&
      group.characters.includes(parentCharacterId) &&
      group.characters.includes(grandparentCharacterId);

    return containsAll ? total + group.points : total;
  }, 0);
}

function calculateOneSideCharacterAffinity(
  targetCharacterId: number,
  parent: DisplayParent,
  gameData: GameData,
): number {
  let affinity = calculateCharacterPair(
    targetCharacterId,
    parent.main.characterId,
    gameData,
  );

  for (const grandparent of parent.grandparents) {
    affinity += calculateCharacterTriple(
      targetCharacterId,
      parent.main.characterId,
      grandparent.characterId,
      gameData,
    );
  }

  return affinity;
}

export function calculateCharacterAffinity(
  targetCharacterId: number,
  parent: DisplayParent,
  gameData: GameData,
  otherParent?: DisplayParent,
): number {
  let affinity = calculateOneSideCharacterAffinity(
    targetCharacterId,
    parent,
    gameData,
  );

  if (otherParent) {
    affinity += calculateOneSideCharacterAffinity(
      targetCharacterId,
      otherParent,
      gameData,
    );

    affinity += calculateCharacterPair(
      parent.main.characterId,
      otherParent.main.characterId,
      gameData,
    );
  }

  return affinity;
}