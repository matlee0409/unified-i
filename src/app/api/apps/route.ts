import { NextResponse } from 'next/server';
import { composioFetch, connectedToolkitSlugs, filterConfiguredApps, hasComposioKey } from '@/lib/server/composio';
import { readClientSession } from '@/lib/server/client-auth';

export async function GET(req: Request) {
  if (!hasComposioKey()) {
    return NextResponse.json({ error: 'COMPOSIO_API_KEY is not configured.', code: 'missing_composio_key' }, { status: 500 });
  }
  const client = readClientSession(req);
  if (!client) return NextResponse.json({ error: 'A client invite is required.', code: 'client_session_required' }, { status: 401 });

  const [toolkitsResponse, authConfigsResponse, connectedAccountsResponse] = await Promise.all([
    composioFetch('/v3/toolkits?limit=1000'),
    composioFetch('/v3/auth_configs'),
    composioFetch(`/v3.1/connected_accounts?user_ids[]=${encodeURIComponent(client.clientId)}&limit=1000`),
  ]);
  if (!toolkitsResponse.ok) return NextResponse.json(await toolkitsResponse.json(), { status: toolkitsResponse.status });
  if (!authConfigsResponse.ok) return NextResponse.json(await authConfigsResponse.json(), { status: authConfigsResponse.status });
  if (!connectedAccountsResponse.ok) return NextResponse.json(await connectedAccountsResponse.json(), { status: connectedAccountsResponse.status });

  return NextResponse.json({
    ...filterConfiguredApps(await toolkitsResponse.json(), await authConfigsResponse.json()),
    connectedSlugs: connectedToolkitSlugs(await connectedAccountsResponse.json()),
  });
}
