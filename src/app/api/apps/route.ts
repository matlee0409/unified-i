import { NextResponse } from 'next/server';
import { composioFetch, connectedToolkitSlugs, filterConfiguredApps, hasComposioKey } from '@/lib/server/composio';

export async function GET() {
  if (!hasComposioKey()) {
    return NextResponse.json({ error: 'COMPOSIO_API_KEY is not configured.', code: 'missing_composio_key' }, { status: 500 });
  }

  const [toolkitsResponse, authConfigsResponse, connectedAccountsResponse] = await Promise.all([
    composioFetch('/v3/toolkits?limit=1000'),
    composioFetch('/v3/auth_configs'),
    composioFetch('/v3.1/connected_accounts?user_ids[]=bookly-user&limit=1000'),
  ]);
  if (!toolkitsResponse.ok) return NextResponse.json(await toolkitsResponse.json(), { status: toolkitsResponse.status });
  if (!authConfigsResponse.ok) return NextResponse.json(await authConfigsResponse.json(), { status: authConfigsResponse.status });
  if (!connectedAccountsResponse.ok) return NextResponse.json(await connectedAccountsResponse.json(), { status: connectedAccountsResponse.status });

  return NextResponse.json({
    ...filterConfiguredApps(await toolkitsResponse.json(), await authConfigsResponse.json()),
    connectedSlugs: connectedToolkitSlugs(await connectedAccountsResponse.json()),
  });
}
