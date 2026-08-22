export const FILTER_PRESET_VERSION = 1;

const storageKey = 'inshi-gensen-filter-presets-v1';
const presetCodePrefix = 'Preset Code: ';

export type FilterPreset = {
  id: string;
  name: string;
  query: string;
  createdAt: string;
};

export type SharedPreset = {
  version: typeof FILTER_PRESET_VERSION;
  name: string;
  query: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilterPreset(value: unknown): value is FilterPreset {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.query === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function writePresets(presets: FilterPreset[]): void {
  localStorage.setItem(storageKey, JSON.stringify(presets));
}

export function loadFilterPresets(): FilterPreset[] {
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isFilterPreset);
  } catch {
    return [];
  }
}

export function createFilterPreset(name: string, query: string): FilterPreset {
  const preset: FilterPreset = {
    id: crypto.randomUUID(),
    name: name.trim(),
    query: query.trim(),
    createdAt: new Date().toISOString(),
  };

  const presets = loadFilterPresets();

  writePresets([...presets, preset]);

  return preset;
}

export function removeFilterPreset(presetId: string): void {
  writePresets(loadFilterPresets().filter((preset) => preset.id !== presetId));
}

function encodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeUtf8(value: string): string {
  const base64 = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  const binary = atob(base64);

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function exportFilterPreset(preset: Pick<FilterPreset, 'name' | 'query'>): string {
  const shared: SharedPreset = {
    version: FILTER_PRESET_VERSION,
    name: preset.name,
    query: preset.query,
  };

  return presetCodePrefix + encodeUtf8(JSON.stringify(shared));
}

export function importFilterPresetCode(code: string): SharedPreset {
  const trimmed = code.trim();

  if (!trimmed.startsWith(presetCodePrefix)) {
    throw new Error('This is not a 因子厳選 Preset Code.');
  }

  try {
    const parsed: unknown = JSON.parse(decodeUtf8(trimmed.slice(presetCodePrefix.length)));

    if (
      !isObject(parsed) ||
      parsed.version !== FILTER_PRESET_VERSION ||
      typeof parsed.name !== 'string' ||
      typeof parsed.query !== 'string' ||
      !parsed.name.trim()
    ) {
      throw new Error();
    }

    return {
      version: FILTER_PRESET_VERSION,
      name: parsed.name.trim(),
      query: parsed.query.trim(),
    };
  } catch {
    throw new Error('The preset code is damaged or unsupported.');
  }
}
type PresetCollectionFile = {
  format: '因子厳選 Presets';
  version: typeof FILTER_PRESET_VERSION;
  presets: SharedPreset[];
};

export function exportFilterPresetCollection(presets: FilterPreset[]): string {
  const collection: PresetCollectionFile = {
    format: '因子厳選 Presets',
    version: FILTER_PRESET_VERSION,
    presets: presets.map((preset) => ({
      version: FILTER_PRESET_VERSION,
      name: preset.name,
      query: preset.query,
    })),
  };

  return JSON.stringify(collection, null, 2);
}

export function importFilterPresetCollection(contents: string): SharedPreset[] {
  try {
    const parsed: unknown = JSON.parse(contents);

    if (
      !isObject(parsed) ||
      parsed.format !== '因子厳選 Presets' ||
      parsed.version !== FILTER_PRESET_VERSION ||
      !Array.isArray(parsed.presets)
    ) {
      throw new Error();
    }

    return parsed.presets.map((preset) => {
      if (
        !isObject(preset) ||
        preset.version !== FILTER_PRESET_VERSION ||
        typeof preset.name !== 'string' ||
        typeof preset.query !== 'string' ||
        !preset.name.trim()
      ) {
        throw new Error();
      }

      return {
        version: FILTER_PRESET_VERSION,
        name: preset.name.trim(),
        query: preset.query.trim(),
      };
    });
  } catch {
    throw new Error('The preset collection file is damaged or unsupported.');
  }
}
