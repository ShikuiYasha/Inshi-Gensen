import { importVeterans, type ImportedVeteranData } from './importVeterans';

type ImportedParentProfile = ImportedVeteranData & {
  accountId: string;
  trainerName: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function importParentProfile(value: unknown): ImportedParentProfile {
  if (!isObject(value)) {
    throw new Error('The Parent Data response is invalid.');
  }

  const trainer = value.trainer;
  const veterans = value.veterans;

  if (!isObject(trainer) || !Array.isArray(veterans)) {
    throw new Error('No Parent Data was found for this Trainer.');
  }

  const accountId = getText(trainer.account_id);
  const trainerName =
    getText(trainer.name) ?? (accountId ? `Trainer ${accountId}` : 'uma.moe Trainer');

  const importedData = importVeterans(JSON.stringify(veterans));

  return {
    accountId: accountId ?? '',
    trainerName,
    veterans: importedData.veterans,
  };
}
