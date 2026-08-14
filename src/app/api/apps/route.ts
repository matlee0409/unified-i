import { NextResponse } from 'next/server';
import { composioFetch, filterConfiguredApps, hasComposioKey } from '@/lib/server/composio';

export async function GET() {
  if (!hasComposioKey()) {
    return NextResponse.json({ error: 'COMPOSIO_API_KEY is not configured.', code: 'missing_composio_key' }, { status: 500 });
  }

  const [toolkitsResponse, authConfigsResponse] = await Promise.all([
    composioFetch('/v3/toolkits?limit=1000'),
    composioFetch('/v3/auth_configs'),
  ]);
  if (!toolkitsResponse.ok) return NextResponse.json(await toolkitsResponse.json(), { status: toolkitsResponse.status });
  if (!authConfigsResponse.ok) return NextResponse.json(await authConfigsResponse.json(), { status: authConfigsResponse.status });

  return NextResponse.json(filterConfiguredApps(await toolkitsResponse.json(), await authConfigsResponse.json()));
}
