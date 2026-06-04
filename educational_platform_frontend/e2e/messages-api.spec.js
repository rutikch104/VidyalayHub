import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL || 'http://localhost:3030/api';

test.describe('Messaging API (auth + routing)', () => {
  test('GET /messages/conversations without token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/messages/conversations`).catch(() => null);
    if (!res) {
      test.skip(true, `Backend not reachable at ${API}`);
      return;
    }
    expect([401, 403]).toContain(res.status());
  });

  test('POST /messages without token returns 401', async ({ request }) => {
    const res = await request
      .post(`${API}/messages`, {
        data: { recipient_id: '00000000-0000-4000-8000-000000000002', content: 'hi' },
      })
      .catch(() => null);
    if (!res) {
      test.skip(true, `Backend not reachable at ${API}`);
      return;
    }
    expect([401, 403]).toContain(res.status());
  });

  test('GET /messages/:userId without token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/messages/00000000-0000-4000-8000-000000000002`).catch(() => null);
    if (!res) {
      test.skip(true, `Backend not reachable at ${API}`);
      return;
    }
    expect([401, 403]).toContain(res.status());
  });
});
