import { GoogleGenAI } from "@google/genai";

// Initialize Client (Server-Side Only)
// Note: process.env.GOOGLE_API_KEY must be set
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function generateCardImage(userPrompt: string): Promise<Buffer> {
    // 1. Construct the Enforced Style Prompt
    const styleModifier = "Style of The Oatmeal, crude vector illustration, thick messy black outlines, flat colors, white background, minimalist, high contrast, corporate satire theme";
    const finalPrompt = `${userPrompt}. ${styleModifier}`;

    try {
        // 2. Call Google Gemini Model
        const response = await genAI.models.generateContent({
            model: process.env.GOOGLE_GEN_MODEL || "gemini-2.5-flash-image",
            contents: [
                {
                    parts: [
                        { text: finalPrompt }
                    ]
                }
            ],
            config: {
                // Optional: Ensure square aspect ratio if model supports it, 
                // otherwise we crop in the compositing step.
                responseModalities: ["IMAGE"]
            }
        });

        // 3. Extract Image Data
        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find(p => p.inlineData);

        if (!imagePart || !imagePart.inlineData?.data) {
            throw new Error("No image data received from Gemini.");
        }

        // 4. Convert Base64 to Buffer
        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        return imageBuffer;

    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw new Error("Failed to generate image asset.");
    }
}
