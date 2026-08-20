import type { GameData } from './gameData';
import {
  getCanonicalCardId,
  type DisplayParent,
  type LineageMember,
} from './parentDisplay';

export type AffinityParticipant = {
  label: string;
  characterName: string;
  thumbnailFileName?: string;
};

export type RaceAffinityMatch = {
  groupId: number;
  raceName: string;
  points: number;
};

export type RaceAffinityComparison = {
  label: string;
  points: number;
  participants: [AffinityParticipant, AffinityParticipant];
  matches: RaceAffinityMatch[];
};

export type RaceAffinityBreakdown = {
  total: number;
  comparisons: RaceAffinityComparison[];
};

export type CharacterAffinityContribution = {
  label: string;
  points: number;
  participants: AffinityParticipant[];
};

export type CharacterAffinityBreakdown = {
  total: number;
  contributions: CharacterAffinityContribution[];
};

function createMemberParticipant(
  label: string,
  member: LineageMember,
): AffinityParticipant {
  return {
    label,
    characterName: member.characterName,
    thumbnailFileName: member.thumbnailFileName,
  };
}

function createTargetParticipant(
  targetCharacterId: number,
  gameData: GameData,
): AffinityParticipant {
  const canonicalCardId = Object.keys(gameData.outfits)
    .map(Number)
    .filter(Number.isFinite)
    .map(getCanonicalCardId)
    .sort((left, right) => left - right)
    .find(
      (cardId) =>
        Math.floor(cardId / 100) === targetCharacterId,
    );

  return {
    label: 'Target',
    characterName:
      gameData.characters[String(targetCharacterId)] ??
      `Character ${targetCharacterId}`,
    thumbnailFileName:
      canonicalCardId === undefined
        ? undefined
        : `chara_stand_${targetCharacterId}_${canonicalCardId}.webp`,
  };
}

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
  leftLabel: string,
  left: LineageMember,
  rightLabel: string,
  right: LineageMember,
  gameData: GameData,
): RaceAffinityComparison {
  const leftGroups = getRaceGroups(left, gameData);
  const rightGroups = getRaceGroups(right, gameData);
  const matches: RaceAffinityMatch[] = [];

  for (const [groupId, raceName] of leftGroups) {
    if (!rightGroups.has(groupId)) {
      continue;
    }

    matches.push({
      groupId,
      raceName,
      points: 3,
    });
  }

  matches.sort((leftMatch, rightMatch) =>
    leftMatch.raceName.localeCompare(rightMatch.raceName),
  );

  return {
    label,
    points: matches.length * 3,
    participants: [
      createMemberParticipant(leftLabel, left),
      createMemberParticipant(rightLabel, right),
    ],
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
        'Current Parent',
        parent.main,
        `Grandparent ${index + 1}`,
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
          'Other Parent',
          otherParent.main,
          `Grandparent ${index + 1}`,
          grandparent,
          gameData,
        ),
      );
    });

    comparisons.push(
      createRaceComparison(
        'Current Parent ↔ Other Parent',
        'Current Parent',
        parent.main,
        'Other Parent',
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
  const targetParticipant = createTargetParticipant(
    targetCharacterId,
    gameData,
  );
  const parentParticipant = createMemberParticipant(
    sideName,
    parent.main,
  );

  const contributions: CharacterAffinityContribution[] = [
    {
      label: `Target ↔ ${sideName}`,
      points: calculateCharacterPair(
        targetCharacterId,
        parent.main.characterId,
        gameData,
      ),
      participants: [targetParticipant, parentParticipant],
    },
  ];

  parent.grandparents.forEach((grandparent, index) => {
    const grandparentLabel = `Grandparent ${index + 1}`;

    contributions.push({
      label: `Target + ${sideName} + ${grandparentLabel}`,
      points: calculateCharacterTriple(
        targetCharacterId,
        parent.main.characterId,
        grandparent.characterId,
        gameData,
      ),
      participants: [
        targetParticipant,
        parentParticipant,
        createMemberParticipant(
          grandparentLabel,
          grandparent,
        ),
      ],
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
      participants: [
        createMemberParticipant('Current Parent', parent.main),
        createMemberParticipant(
          'Other Parent',
          otherParent.main,
        ),
      ],
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