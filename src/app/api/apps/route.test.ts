import { describe, expect, it } from 'vitest';
import { filterConfiguredApps } from '@/lib/server/composio';

describe('filterConfiguredApps', () => {
  it('returns only toolkits with enabled auth configurations', () => {
    const result = filterConfiguredApps(
      {
        items: [
          { slug: 'googlecalendar', name: 'Google Calendar' },
          { slug: 'slack', name: 'Slack' },
          { slug: 'github', name: 'GitHub' },
        ],
      },
      {
        items: [
          { id: 'google-config', toolkit: { slug: 'googlecalendar' }, status: 'ENABLED' },
          { id: 'slack-config', toolkit: { slug: 'slack' }, status: 'DISABLED' },
          { id: 'malformed-config', status: 'ENABLED' },
        ],
      },
    );

    expect(result.toolkits).toEqual([{ slug: 'googlecalendar', name: 'Google Calendar' }]);
    expect(result.authConfigs).toEqual([
      { id: 'google-config', toolkit: { slug: 'googlecalendar' }, status: 'ENABLED' },
    ]);
  });

  it('supports nested v3 response shapes and string toolkit slugs', () => {
    const result = filterConfiguredApps(
      { data: { toolkits: [{ slug: 'GOOGLECALENDAR', name: 'Google Calendar' }] } },
      { data: { auth_configs: [{ uuid: 'calendar-config', toolkit: 'googlecalendar' }] } },
    );

    expect(result.toolkits).toHaveLength(1);
    expect(result.authConfigs).toHaveLength(1);
  });
});
