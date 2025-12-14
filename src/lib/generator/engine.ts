import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import manifestData from '@/data/deck_manifest.json';


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
    count: number;
}

export async function generateDeck(options: GenerateOptions) {
    // Load Manifest - Imported directly to ensure bundling
    // const manifestPath = path.resolve('../deck_manifest.json'); 
    // We use the imported manifest constant.

    const generatedCards = [];

    const manifest = manifestData as CardManifestItem[];

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

    const svgText = `
    <svg width="${width}" height="${height}">
        <style>
        .title { fill: white; font-family: 'Bebas Neue'; font-size: 80px; font-weight: bold; anchor: middle; }
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

    // Create base art layer (simulated generation)
    const artLayer = await sharp({
        create: {
            width: 500,
            height: 500,
            channels: 4,
            background: colorHex
        }
    }).png().toBuffer();

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
