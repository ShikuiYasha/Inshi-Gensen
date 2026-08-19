import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const sourceDirectory = process.argv[2];

if (!sourceDirectory) {
  throw new Error(
    'Provide the folder containing the Uma source JSON files.',
  );
}

async function readJson(fileName) {
  const filePath = path.join(sourceDirectory, fileName);
  const contents = await readFile(filePath, 'utf8');

  return JSON.parse(contents);
}

function createTextLookup(rows, category) {
  return Object.fromEntries(
    rows
      .filter((row) => Number(row.category) === category)
      .map((row) => [String(row.index), row.text]),
  );
}

const [textData, saddles, relations, relationMembers] = await Promise.all([
  readJson('text_data.json'),
  readJson('single_mode_wins_saddle.json'),
  readJson('succession_relation.json'),
  readJson('succession_relation_member.json'),
]);

const membersByRelation = new Map();

for (const member of relationMembers) {
  const relationType = Number(member.relation_type);
  const existingMembers = membersByRelation.get(relationType) ?? [];

  existingMembers.push(Number(member.chara_id));
  membersByRelation.set(relationType, existingMembers);
}

const affinityGroups = relations
  .map((relation) => {
    const relationType = Number(relation.relation_type);

    return {
      relationType,
      points: Number(relation.relation_point),
      characters: membersByRelation.get(relationType) ?? [],
    };
  })
  .filter((group) => group.characters.length > 0)
  .sort((left, right) => left.relationType - right.relationType);

const g1RaceGroups = Object.fromEntries(
  saddles
    .filter((saddle) => Number(saddle.win_saddle_type) === 3)
    .map((saddle) => [
      String(saddle.id),
      Number(saddle.group_id),
    ]),
);

const gameData = {
  version: 1,
  characters: createTextLookup(textData, 6),
  outfits: createTextLookup(textData, 4),
  factors: createTextLookup(textData, 147),
  raceNames: createTextLookup(textData, 111),
  g1RaceGroups,
  affinityGroups,
};

const outputDirectory = path.resolve('public', 'data');
const outputFile = path.join(outputDirectory, 'game-data.json');

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  outputFile,
  `${JSON.stringify(gameData, null, 2)}\n`,
  'utf8',
);

console.log(`Created ${outputFile}`);
console.log(
  `${Object.keys(gameData.characters).length} characters, ` +
    `${Object.keys(gameData.outfits).length} outfits, ` +
    `${Object.keys(gameData.factors).length} factors, ` +
    `${Object.keys(gameData.g1RaceGroups).length} G1 saddle mappings, ` +
    `${gameData.affinityGroups.length} affinity groups.`,
);