export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Do NOT read VITE_GEMINI_API_KEY to prevent client-side leakage.
  const API_KEY = process.env.GEMINI_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Pass the body exactly as received from the client
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API returned an error:', response.status, errorData);
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gemini API Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
