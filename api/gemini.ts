export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fallback to GEMINI_API_KEY if VITE_ is removed in the future for safety
  const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Pass the body exactly as received from the client
      body: JSON.stringify(req.body),
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
