import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { base64Image } = req.body;
        if (!base64Image) return res.status(400).json({ error: 'base64Image required' });

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API Key not configured' });

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const prompt = `Eres un nutricionista experto. Analiza esta imagen de comida y proporciona:
1. Nombre del alimento o plato
2. Calorías estimadas (número)
3. Macronutrientes aproximados

Responde en español con formato JSON:
{
  "name": "nombre",
  "calories": número,
  "protein": número,
  "carbs": número,
  "fat": número,
  "description": "descripción breve"
}`;

        const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) return res.status(200).json({ analysis: text });
        return res.status(200).json({ analysis: JSON.parse(jsonMatch[0]) });
    } catch (error) {
        console.error("Vercel Analyze Image Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
