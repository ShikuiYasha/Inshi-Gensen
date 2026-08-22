type Env = {
  UMA_MOE_API_KEY: string;
};

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');

  if (!origin) {
    return null;
  }

  try {
    const url = new URL(origin);

    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    const isGitHubPages = url.protocol === 'https:' && url.hostname.endsWith('.github.io');

    return isLocal || isGitHubPages ? origin : null;
  } catch {
    return null;
  }
}

function createCorsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...createCorsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = getAllowedOrigin(request);

    if (!origin) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: createCorsHeaders(origin),
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed', status: 405 }, 405, origin);
    }

    const requestUrl = new URL(request.url);
    const accountId = requestUrl.searchParams.get('account_id');
    const dataType = requestUrl.searchParams.get('type') ?? 'rental';

    if (!accountId || !/^\d{9,12}$/.test(accountId)) {
      return jsonResponse(
        {
          error: 'Enter a valid 9–12 digit Trainer UID.',
          status: 400,
        },
        400,
        origin,
      );
    }

    if (!env.UMA_MOE_API_KEY) {
      return jsonResponse(
        {
          error: 'Rental service is not configured.',
          status: 500,
        },
        500,
        origin,
      );
    }

    const upstreamResponse = await fetch(`https://uma.moe/api/v4/user/profile/${accountId}`, {
      headers: {
        Accept: 'application/json',
        'X-API-Key': env.UMA_MOE_API_KEY,
      },
    });

    let upstreamData: unknown;

    try {
      upstreamData = await upstreamResponse.json();
    } catch {
      return jsonResponse(
        {
          error: 'uma.moe returned an invalid response.',
          status: 502,
        },
        502,
        origin,
      );
    }

    if (!upstreamResponse.ok) {
      const error =
        typeof upstreamData === 'object' &&
        upstreamData !== null &&
        'error' in upstreamData &&
        typeof upstreamData.error === 'string'
          ? upstreamData.error
          : 'The Trainer could not be fetched.';

      return jsonResponse(
        { error, status: upstreamResponse.status },
        upstreamResponse.status,
        origin,
      );
    }
    if (dataType === 'veterans') {
      if (
        typeof upstreamData !== 'object' ||
        upstreamData === null ||
        !('trainer' in upstreamData) ||
        !('veterans' in upstreamData) ||
        !Array.isArray(upstreamData.veterans)
      ) {
        return jsonResponse(
          {
            error: 'No Parent Data was found for this Trainer.',
            status: 404,
          },
          404,
          origin,
        );
      }

      if (upstreamData.veterans.length === 0) {
        return jsonResponse(
          {
            error: 'This Trainer has not uploaded any Parent Data to uma.moe.',
            status: 404,
          },
          404,
          origin,
        );
      }

      const trainer =
        typeof upstreamData.trainer === 'object' && upstreamData.trainer !== null
          ? upstreamData.trainer
          : {};

      return jsonResponse(
        {
          trainer: {
            account_id: 'account_id' in trainer ? trainer.account_id : accountId,
            name: 'name' in trainer ? trainer.name : `Trainer ${accountId}`,
          },
          veterans: upstreamData.veterans,
        },
        200,
        origin,
      );
    }
    if (
      typeof upstreamData !== 'object' ||
      upstreamData === null ||
      !('trainer' in upstreamData) ||
      !('inheritance' in upstreamData)
    ) {
      return jsonResponse(
        {
          error: 'No Rental inheritance data was found for this Trainer.',
          status: 404,
        },
        404,
        origin,
      );
    }

    const trainer =
      typeof upstreamData.trainer === 'object' && upstreamData.trainer !== null
        ? upstreamData.trainer
        : {};

    return jsonResponse(
      {
        trainer: {
          account_id: 'account_id' in trainer ? trainer.account_id : accountId,
          name: 'name' in trainer ? trainer.name : `Trainer ${accountId}`,
        },
        inheritance: upstreamData.inheritance,
      },
      200,
      origin,
    );
  },
};
