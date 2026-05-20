import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { userMessage, context = {} } = req.body;
        if (!userMessage) return res.status(400).json({ error: 'userMessage required' });

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API Key not configured on Vercel' });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const { profile, dailyLog = [], shoppingList = [], chatHistory = [], viewDate } = context;

        const todayStr = viewDate
            ? new Date(viewDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
            : new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        const logSummary = dailyLog.length > 0
            ? dailyLog.map(e => `- ${e.name} (${e.calories} kcal, ${e.mealType})`).join('\n')
            : '(sin registros hoy)';

        const shoppingSummary = shoppingList.length > 0
            ? shoppingList.map(i => `- ${i.name}`).join('\n')
            : '(lista vacía)';

        const systemPrompt = `Eres NutriCoach, un coach nutricional amigable, motivador y experto. Hablas en español.

DATOS DEL USUARIO:
- Nombre: ${profile?.username || 'Usuario'}
- Objetivo: ${profile?.goal || 'equilibrado'}
- Calorías diarias: ${profile?.calories || 2000} kcal
- Peso actual: ${profile?.current_weight || '?'} kg
- Intolerancias: ${(profile?.intolerances || []).join(', ') || 'ninguna'}

FECHA ACTUAL: ${todayStr}

DIARIO DE HOY:
${logSummary}

LISTA DE LA COMPRA:
${shoppingSummary}

CAPACIDADES ESPECIALES:
Puedes ejecutar acciones en la app. Si el usuario pide añadir comida al diario o a la lista de compra, 
incluye acciones JSON al FINAL de tu respuesta (separado por ---ACTIONS---), en este formato:

---ACTIONS---
[
  {"action": "add_log", "item": "Nombre comida", "calories": 350, "mealType": "comida"},
  {"action": "add_shopping", "items": ["Pollo", "Arroz"]},
  {"action": "remove_log", "item": "nombre a eliminar"},
  {"action": "clear_shopping"}
]

REGLAS:
- Si no hay acciones, NO incluyas ---ACTIONS---
- Sé breve, amigable y motivador
- Habla siempre en español
- Usa emojis con moderación`;

        const rawHistory = chatHistory
            .filter(m => m.sender !== 'system' && m.id !== 'welcome')
            .slice(-8)
            .map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

        let startIdx = 0;
        while (startIdx < rawHistory.length && rawHistory[startIdx].role === 'model') {
            startIdx++;
        }
        const history = rawHistory.slice(startIdx);

        const chat = model.startChat({
            history,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        });

        const result = await chat.sendMessage(userMessage);
        const fullText = result.response.text();

        return res.status(200).json({ responseText: fullText });
    } catch (error) {
        console.error("Vercel API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
