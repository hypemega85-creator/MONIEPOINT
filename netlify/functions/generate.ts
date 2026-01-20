import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { contents, systemInstruction } = JSON.parse(event.body);
    
    if (!process.env.API_KEY) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'API_KEY not configured on Netlify' }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: contents }] }],
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};