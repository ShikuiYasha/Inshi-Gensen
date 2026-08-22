export async function fetchParentProfile(accountId: string): Promise<unknown> {
  const proxyUrl =
    import.meta.env.VITE_RENTAL_API_URL ??
    'https://inshi-gensen-rental-api.shikuiyasha.workers.dev';

  const requestUrl = new URL(proxyUrl);

  requestUrl.searchParams.set('account_id', accountId);
  requestUrl.searchParams.set('type', 'veterans');

  const response = await fetch(requestUrl);

  let responseData: unknown = null;

  try {
    responseData = await response.json();
  } catch {
    // The status check below will provide the useful error.
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
      throw new Error('This Trainer has not uploaded any Parent Data to uma.moe.');
    }

    throw new Error('The Parent Data service could not complete the request.');
  }

  return responseData;
}
