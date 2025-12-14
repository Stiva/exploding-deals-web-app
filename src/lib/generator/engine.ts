import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { generateCardImage } from '@/lib/services/image-gen';


// Font loading
const FONT_PATH = path.join(process.cwd(), 'public', 'assets', 'BebasNeue-Regular.ttf');
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'assets', 'card_template.png');

interface GenerateOptions {
    deckId: number;
    userId: string;
}

interface CardManifestItem {
    id: string;
    mechanic_id: string;
    name: string;
    flavor_text: string;
    image_prompt?: string;
    count: number;
}

export async function generateDeck(options: GenerateOptions, manifest: CardManifestItem[]) {
    // Manifest is now passed from the Server Action (uploaded file)

    const generatedCards = [];

    for (const item of manifest) {

        // Generate Graphic
        // 1. Simulate "Nano Banana Pro" -> Getting consistent style image
        // For now: Just a solid color or noise with the mechanic color.

        // Mechanic Colors (simplified mapping)
        const colorMap: Record<string, string> = {
            'GAME_OVER': '#333333',
            'SAVE_LIFE': '#99CC00',
            'ATTACK_2X': '#FFCC00',
            'SKIP_1X': '#0099CC',
            'STEAL_CHOSEN': '#666666',
            'SHUFFLE': '#CC9966',
            'PEEK_3': '#FF66CC',
            'CANCEL': '#CC3300',
            'VANILLA': '#EFEFEF'
        };

        const baseColor = colorMap[item.mechanic_id] || '#FFFFFF';

        // 2. Composite with Sharp
        // Placeholder for Real API Call
        const apiKey = process.env.NANO_BANANA_API_KEY;
        if (!apiKey) {
            console.warn("NANO_BANANA_API_KEY is missing. Using local simulation.");
        } else {
            console.log("Generating with Nano Banana API...");
        }

        const cardImageBuffer = await createCardImage(item, baseColor);

        // 3. Upload to Blob
        const blob = await put(`decks/${options.deckId}/${item.id}.png`, cardImageBuffer, {
            access: 'public',
        });

        generatedCards.push({
            ...item,
            imageUrl: blob.url
        });
    }

    return generatedCards;
}

async function createCardImage(item: CardManifestItem, colorHex: string): Promise<Buffer> {
    // Basic Geometry from specs
    // Header Top 15%
    // Art Middle 50%
    // Desc Bottom 25%
    // We are overlaying on the template. 
    // Assuming Template is the Frame.

    // We create an SVG overlay for text because Sharp renders SVG text best.
    const width = 750;
    const height = 1050; // Standard Poker 300dpi approx

    // Load font and convert to base64 to embed in SVG (avoids fontconfig dependency)
    const fontBuffer = fs.readFileSync(FONT_PATH);
    const fontBase64 = fontBuffer.toString('base64');

    const svgText = `
    <svg width="${width}" height="${height}">
        <style>
        @font-face {
            font-family: 'Bebas Neue';
            src: url(data:font/ttf;base64,${fontBase64});
        }
        .title { fill: white; font-family: 'Bebas Neue', sans-serif; font-size: 80px; font-weight: bold; anchor: middle; }
        .flavor { fill: black; font-family: sans-serif; font-size: 32px; }
        </style>
        <text x="50%" y="12%" text-anchor="middle" class="title">${item.name.toUpperCase()}</text>
        <rect x="100" y="750" width="550" height="200" fill="rgba(255,255,255,0.8)" rx="20" />
        <foreignObject x="120" y="770" width="510" height="160">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif; font-size:28px; color: black; text-align: center;">
                <strong>${item.flavor_text}</strong>
            </div>
        </foreignObject>
    </svg>
    `;

    // Create base art layer
    let artLayer: Buffer;

    try {
        if (item.image_prompt) {
            console.log(`Generating image for ${item.name}...`);
            artLayer = await generateCardImage(item.image_prompt);
            // Resize generated image to fit the 500x500 slot if needed
            artLayer = await sharp(artLayer).resize(500, 500).toBuffer();
        } else {
            throw new Error("No image prompt");
        }
    } catch (e) {
        console.error(`Failed to generate image for ${item.name}:`, e);
        // Fallback: Solid Color + Mechanic Icon/Text maybe? 
        // For now: Solid Color
        artLayer = await sharp({
            create: {
                width: 500,
                height: 500,
                channels: 4,
                background: colorHex
            }
        }).png().toBuffer();
    }

    // Composite
    // Layer 0: Template Background (if template has transparency in middle? 
    // Assuming Template is a Frame with transparent center? Or we play art on top? 
    // Standard: Art under Frame or Art in Middle on top of base.
    // Let's assume Template is the top frame.

    return await sharp(TEMPLATE_PATH)
        .resize(width, height)
        .composite([
            { input: artLayer, top: 200, left: 125 }, // Centered roughly
            { input: Buffer.from(svgText), top: 0, left: 0 }
        ])
        .png()
        .toBuffer();
}
