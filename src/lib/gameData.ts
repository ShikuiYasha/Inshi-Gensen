export type AffinityGroup = {
  relationType: number;
  points: number;
  characters: number[];
};
export type RankRange = {
  id: number;
  minValue: number;
  maxValue: number;
};

export type GameData = {
  version: number;
  characters: Record<string, string>;
  outfits: Record<string, string>;
  factors: Record<string, string>;
  raceNames: Record<string, string>;
  g1RaceGroups: Record<string, number>;
  affinityGroups: AffinityGroup[];
  rankRanges: RankRange[];
};

let gameDataPromise: Promise<GameData> | null = null;

export function loadGameData(): Promise<GameData> {
  if (!gameDataPromise) {
    const fileUrl = `${import.meta.env.BASE_URL}data/game-data.json`;

    gameDataPromise = fetch(fileUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error('The game lookup data could not be loaded.');
      }

      const data: unknown = await response.json();

      if (
        typeof data !== 'object' ||
        data === null ||
        !('version' in data) ||
        !('characters' in data) ||
        !('outfits' in data) ||
        !('factors' in data) ||
        !('raceNames' in data) ||
        !('g1RaceGroups' in data) ||
        !('affinityGroups' in data) ||
        !('rankRanges' in data)
      ) {
        throw new Error('The game lookup data is invalid.');
      }

      return data as GameData;
    });
  }

  return gameDataPromise;
}
