import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function getM2MToken() {
  // Read domain from environment variable or fallback to configured Auth0 domain
  const rawDomain = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL || 'YOUR_AUTH0_DOMAIN.us.auth0.com';
  const domain = rawDomain.startsWith('http') ? rawDomain.replace(/\/$/, '') : `https://${rawDomain}`;
  const clientId = process.env.AUTH0_M2M_CLIENT_ID;

  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  const audience = process.env.AUTH0_API_AUDIENCE;

  if (!clientId || !clientSecret || !audience) {
    console.error("Missing M2M credentials in .env.local");
    process.exit(1);
  }

  console.log(`Requesting token from ${domain}/oauth/token`);
  console.log(`Audience: ${audience}`);

  try {
    const response = await fetch(`${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
        grant_type: 'client_credentials'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to get token:", data);
      process.exit(1);
    }

    console.log("SUCCESS! Here is your token:");
    console.log("\n" + data.access_token + "\n");
    console.log("Token type:", data.token_type);
    console.log("Expires in:", data.expires_in);
  } catch (e) {
    console.error("Error fetching token:", e);
  }
}

getM2MToken();
