export async function fetchRentalProfile(accountId: string): Promise<unknown> {
  const proxyUrl =
    import.meta.env.VITE_RENTAL_API_URL ??
    'https://inshi-gensen-rental-api.shikuiyasha.workers.dev';

  if (!proxyUrl) {
    throw new Error('Rental lookup has not been configured yet.');
  }

  const requestUrl = new URL(proxyUrl);
  requestUrl.searchParams.set('account_id', accountId);

  const response = await fetch(requestUrl);

  let responseData: unknown = null;

  try {
    responseData = await response.json();
  } catch {
    // The status handling below provides the useful error.
  }

  if (!response.ok) {
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'error' in responseData &&
      typeof responseData.error === 'string'
    ) {
      throw new Error(responseData.error);
    }

    if (response.status === 404) {
      throw new Error('Trainer not found.');
    }

    throw new Error('The Rental service could not complete the request.');
  }

  return responseData;
}
