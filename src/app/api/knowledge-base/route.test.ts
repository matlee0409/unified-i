import { afterEach, describe, expect, it } from 'vitest';
import { updateKnowledgeBase } from '@/lib/server/bot-config';
import { GET, PUT } from './route';

afterEach(() => {
  updateKnowledgeBase('');
});

describe('Knowledge base API', () => {
  it('stores and returns business information', async () => {
    const response = await PUT(new Request('https://bookly.example/api/knowledge-base', {
      method: 'PUT',
      body: JSON.stringify({ knowledgeBase: 'We help small businesses book consultations.' }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ knowledgeBase: 'We help small businesses book consultations.' });
    await expect((await GET()).json()).resolves.toEqual({ knowledgeBase: 'We help small businesses book consultations.' });
  });

  it('rejects an invalid knowledge base value', async () => {
    const response = await PUT(new Request('https://bookly.example/api/knowledge-base', {
      method: 'PUT',
      body: JSON.stringify({ knowledgeBase: 42 }),
    }));

    expect(response.status).toBe(400);
  });
});
