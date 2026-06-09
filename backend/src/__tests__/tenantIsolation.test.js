import request from 'supertest';
import app from '../server.js';
import { loginAsSuperAdmin, authHeaders, extractList } from './helpers.js';

const DIGIMIRCHI_COMPANY = '6e17ac7e-5d0f-43e3-93c0-34222ac4a701';

describe('Multi-Tenant Isolation', () => {
  let superToken;

  beforeAll(async () => {
    const data = await loginAsSuperAdmin(request(app));
    superToken = data.accessToken;
  });

  it('returns 404 when accessing another tenant client by ID', async () => {
    const clientsRes = await request(app)
      .get('/api/clients?limit=1')
      .set(authHeaders(superToken, '66e68258-a6fc-4ad2-b014-22e086e1cff2'))
      .expect(200);

    const acmeClients = extractList(clientsRes.body);
    const acmeClientId = acmeClients[0]?.id;
    if (!acmeClientId) return;

    await request(app)
      .get(`/api/clients/${acmeClientId}`)
      .set(authHeaders(superToken, DIGIMIRCHI_COMPANY))
      .expect(404);
  });

  it('company admin only sees own company clients', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email_id: 'grow@digimirchiinfotech.com', password: 'Admin@123' });

    if (loginRes.status !== 200) return;

    const token = loginRes.body.data.accessToken;
    const res = await request(app)
      .get('/api/clients')
      .set(authHeaders(token))
      .expect(200);

    const items = extractList(res.body);
    items.forEach((client) => {
      if (client.company_id) {
        expect(client.company_id).toBe(DIGIMIRCHI_COMPANY);
      }
    });
  });
});
