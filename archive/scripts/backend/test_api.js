async function run() {
  // Login first
  const loginRes = await fetch('https://tile-erp-master-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@tile-erp.com', password: 'Admin@123456' })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.log("Login failed", loginData);
    return;
  }
  
  const token = loginData.data.accessToken;
  console.log("Login success! Token:", token.substring(0, 20) + "...");

  // Test /api/subscriptions/plans
  const planRes = await fetch('https://tile-erp-master-production.up.railway.app/api/subscriptions/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name: "API Test Plan", price: 50, duration: 30 })
  });
  
  console.log("Plan Response Status:", planRes.status);
  const planData = await planRes.text();
  console.log("Plan Response Body:", planData);

  // Test /api/users
  const userRes = await fetch('https://tile-erp-master-production.up.railway.app/api/users', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log("Users Response Status:", userRes.status);
  console.log("Users Response Body:", await userRes.text());
}
run();
