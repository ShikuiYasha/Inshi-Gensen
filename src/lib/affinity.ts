import type { GameData } from './gameData';
import type { DisplayParent, LineageMember } from './parentDisplay';

export type RaceAffinityMatch = {
  groupId: number;
  raceName: string;
  points: number;
};

export type RaceAffinityComparison = {
  label: string;
  points: number;
  matches: RaceAffinityMatch[];
};

export type RaceAffinityBreakdown = {
  total: number;
  comparisons: RaceAffinityComparison[];
};

export type CharacterAffinityContribution = {
  label: string;
  points: number;
};

export type CharacterAffinityBreakdown = {
  total: number;
  contributions: CharacterAffinityContribution[];
};

function getRaceGroups(
  member: LineageMember,
  gameData: GameData,
): Map<number, string> {
  const groups = new Map<number, string>();

  for (const saddleId of member.winSaddleIds) {
    const groupId = gameData.g1RaceGroups[String(saddleId)];

    if (typeof groupId !== 'number' || groups.has(groupId)) {
      continue;
    }

    groups.set(
      groupId,
      gameData.raceNames[String(saddleId)] ??
        `G1 Group ${groupId}`,
    );
  }

  return groups;
}

function createRaceComparison(
  label: string,
  left: LineageMember,
  right: LineageMember,
  gameData: GameData,
): RaceAffinityComparison {
  const leftGroups = getRaceGroups(left, gameData);
  const rightGroups = getRaceGroups(right, gameData);
  const matches: RaceAffinityMatch[] = [];

  for (const [groupId, leftRaceName] of leftGroups) {
    if (!rightGroups.has(groupId)) {
      continue;
    }

    matches.push({
      groupId,
      raceName:
        leftRaceName ??
        rightGroups.get(groupId) ??
        `G1 Group ${groupId}`,
      points: 3,
    });
  }

  matches.sort((leftMatch, rightMatch) =>
    leftMatch.raceName.localeCompare(rightMatch.raceName),
  );

  return {
    label,
    points: matches.length * 3,
    matches,
  };
}

export function calculateRaceAffinityBreakdown(
  parent: DisplayParent,
  gameData: GameData,
  otherParent?: DisplayParent,
): RaceAffinityBreakdown {
  const comparisons: RaceAffinityComparison[] = [];

  parent.grandparents.forEach((grandparent, index) => {
    comparisons.push(
      createRaceComparison(
        `Current Parent ↔ Grandparent ${index + 1}`,
        parent.main,
        grandparent,
        gameData,
      ),
    );
  });

  if (otherParent) {
    otherParent.grandparents.forEach((grandparent, index) => {
      comparisons.push(
        createRaceComparison(
          `Other Parent ↔ Grandparent ${index + 1}`,
          otherParent.main,
          grandparent,
          gameData,
        ),
      );
    });

    comparisons.push(
      createRaceComparison(
        'Current Parent ↔ Other Parent',
        parent.main,
        otherParent.main,
        gameData,
      ),
    );
  }

  return {
    total: comparisons.reduce(
      (total, comparison) => total + comparison.points,
      0,
    ),
    comparisons,
  };
}

export function calculateRaceAffinity(
  parent: DisplayParent,
  gameData: GameData,
  otherParent?: DisplayParent,
): number {
  return calculateRaceAffinityBreakdown(
    parent,
    gameData,
    otherParent,
  ).total;
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

function createOneSideCharacterContributions(
  sideName: string,
  targetCharacterId: number,
  parent: DisplayParent,
  gameData: GameData,
): CharacterAffinityContribution[] {
  const contributions: CharacterAffinityContribution[] = [
    {
      label: `Target ↔ ${sideName}`,
      points: calculateCharacterPair(
        targetCharacterId,
        parent.main.characterId,
        gameData,
      ),
    },
  ];

  parent.grandparents.forEach((grandparent, index) => {
    contributions.push({
      label:
        `Target + ${sideName} + ` +
        `Grandparent ${index + 1}`,
      points: calculateCharacterTriple(
        targetCharacterId,
        parent.main.characterId,
        grandparent.characterId,
        gameData,
      ),
    });
  });

  return contributions;
}

export function calculateCharacterAffinityBreakdown(
  targetCharacterId: number,
  parent: DisplayParent,
  gameData: GameData,
  otherParent?: DisplayParent,
): CharacterAffinityBreakdown {
  const contributions = createOneSideCharacterContributions(
    'Current Parent',
    targetCharacterId,
    parent,
    gameData,
  );

  if (otherParent) {
    contributions.push(
      ...createOneSideCharacterContributions(
        'Other Parent',
        targetCharacterId,
        otherParent,
        gameData,
      ),
    );

    contributions.push({
      label: 'Current Parent ↔ Other Parent',
      points: calculateCharacterPair(
        parent.main.characterId,
        otherParent.main.characterId,
        gameData,
      ),
    });
  }

  return {
    total: contributions.reduce(
      (total, contribution) => total + contribution.points,
      0,
    ),
    contributions,
  };
}

export function calculateCharacterAffinity(
  targetCharacterId: number,
  parent: DisplayParent,
  gameData: GameData,
  otherParent?: DisplayParent,
): number {
  return calculateCharacterAffinityBreakdown(
    targetCharacterId,
    parent,
    gameData,
    otherParent,
  ).total;
}