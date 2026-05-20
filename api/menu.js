import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { profileData, checkinData, customInstruction = "" } = req.body;

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API Key not configured' });

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const systemPrompt = `Eres NutriChef, un chef nutricionista experto. Debes generar un menú diario personalizado en formato JSON puro.

PERFIL DEL USUARIO:
- Objetivo: ${profileData?.goal || 'equilibrado'}
- Calorías diarias: ${profileData?.calories || 2000} kcal
- Intolerancias: ${(profileData?.intolerances || []).join(', ') || 'ninguna'}
- Alergias: ${profileData?.allergies || 'ninguna'}
- Preferencias: ${profileData?.preferences || 'mediterránea'}

ESTADO HOY:
${checkinData ? `- Sueño: ${checkinData.sleep}/5, Energía: ${checkinData.energy}/5, Estrés: ${checkinData.stress}/5` : '- Sin datos de hoy'}

${customInstruction ? `INSTRUCCIÓN ESPECIAL: ${customInstruction}` : ''}

Responde ÚNICAMENTE con un array JSON válido. Cada elemento debe tener:
{
  "id": número único,
  "name": "Nombre del plato",
  "calories": número,
  "mealType": "desayuno" | "comida" | "cena" | "snack",
  "ingredients": ["ingrediente 1 (cantidad)", "ingrediente 2 (cantidad)"],
  "reason": "Breve explicación de por qué es bueno para el usuario"
}

Genera entre 4 y 6 platos que cubran el día completo.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta");

        return res.status(200).json({ menu: JSON.parse(jsonMatch[0]) });
    } catch (error) {
        console.error("Vercel Generate Menu Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
