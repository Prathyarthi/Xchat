import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || '',
});

export const generateAgentResponse = async (agent: any, messages: any) => {
    const history = messages.map((msg: any) => ({
        role: msg.senderType === 'HUMAN' ? 'user' : 'assistant',
        content: msg.content
    }))

    const systemPrompt = `You are ${agent.name}.
Stay in character.
Respond naturally.
`

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: history,
        config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
            topP: 0.9,
        }
    })

    return response.text;
}