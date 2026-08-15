import { fetchMessageAccounts, readSettings } from '@/lib/server/settings';
import { getClientContext } from '@/lib/server/client-auth';
import { hasApiKey, missingKeyResponse } from '@/lib/server/zernio';

export async function GET(req: Request) {
  if (!hasApiKey()) return missingKeyResponse();

  const client = await getClientContext(req);
  if (client instanceof Response) return client;
  const refresh = new URL(req.url).searchParams.get('refresh') === 'true';
  const result = await fetchMessageAccounts({ profileId: client.profileId, forceRefresh: refresh });
  if (result instanceof Response) return result;

  const { selectedAccountIds } = readSettings({
    accounts: result.accounts,
    cookieHeader: req.headers.get('cookie'),
  });
  return Response.json({
    accounts: result.accounts,
    profiles: result.profiles,
    selectedAccountIds,
  });
}
