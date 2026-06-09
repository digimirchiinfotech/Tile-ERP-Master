/**
 * Integration test helpers
 */
export const extractList = (body) => {
  const data = body?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const TEST_CREDENTIALS = {
  superAdminEmail: process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@admin.com',
  superAdminPassword: process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '',
  companyAdminEmail: 'grow@digimirchiinfotech.com',
  companyAdminPassword: 'Admin@123',
};

export const loginAs = async (request, email, password) => {
  const res = await request
    .post('/api/auth/login')
    .send({ email_id: email, password })
    .expect(200);

  expect(res.body.success).toBe(true);
  expect(res.body.data.accessToken).toBeTruthy();
  return res.body.data;
};

export const loginAsSuperAdmin = async (request) => {
  if (!TEST_CREDENTIALS.superAdminPassword) {
    throw new Error('Set TEST_ADMIN_PASSWORD in backend/.env (run npm run security:reset-admin-password)');
  }
  return loginAs(request, TEST_CREDENTIALS.superAdminEmail, TEST_CREDENTIALS.superAdminPassword);
};

export const loginAsCompanyAdmin = async (request) => {
  return loginAs(request, TEST_CREDENTIALS.companyAdminEmail, TEST_CREDENTIALS.companyAdminPassword);
};

export const authHeaders = (token, companyId = null) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (companyId) headers['x-company-id'] = companyId;
  return headers;
};
