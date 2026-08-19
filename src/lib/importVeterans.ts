export type VeteranRecord = Record<string, unknown> & {
  trained_chara_id: number | string;
  card_id: number | string;
  factor_info_array: unknown[];
  succession_chara_array: unknown[];
  win_saddle_id_array: unknown[];
};

export type ImportedVeteranData = {
  veterans: VeteranRecord[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string';
}

function isVeteranRecord(value: unknown): value is VeteranRecord {
  if (!isObject(value)) {
    return false;
  }

  return (
    isId(value.trained_chara_id) &&
    isId(value.card_id) &&
    Array.isArray(value.factor_info_array) &&
    Array.isArray(value.succession_chara_array) &&
    Array.isArray(value.win_saddle_id_array)
  );
}

function findVeterans(value: unknown, results: VeteranRecord[]): void {
  if (isVeteranRecord(value)) {
    results.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findVeterans(item, results);
    }

    return;
  }

  if (isObject(value)) {
    for (const nestedValue of Object.values(value)) {
      findVeterans(nestedValue, results);
    }
  }
}

export function importVeterans(jsonText: string): ImportedVeteranData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('This file does not contain valid JSON.');
  }

  const discoveredVeterans: VeteranRecord[] = [];
  findVeterans(parsed, discoveredVeterans);

  const uniqueVeterans = Array.from(
    new Map(
      discoveredVeterans.map((veteran) => [
        String(veteran.trained_chara_id),
        veteran,
      ]),
    ).values(),
  );

  if (uniqueVeterans.length === 0) {
    throw new Error(
      'No supported Veteran Data could be found in this JSON file.',
    );
  }

  return {
    veterans: uniqueVeterans,
  };
}