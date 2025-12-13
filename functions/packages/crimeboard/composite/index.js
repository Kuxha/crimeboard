// Composite function - generates suspect composite prompt from description
// Returns a detailed image generation prompt

async function main(args) {
    try {
        const { case_id, suspect_description } = args;

        if (!suspect_description) {
            return { body: { error: 'suspect_description is required' } };
        }

        // Build a detailed photorealistic image prompt from the description
        const composite_prompt = buildCompositePrompt(suspect_description);

        // For MVP, we return the prompt only
        // In production, this could call an image generation API
        const image_url_optional = null;

        return {
            body: {
                success: true,
                case_id,
                composite_prompt,
                image_url_optional,
                note: 'Composite prompt generated. Image generation available with additional API integration.'
            }
        };
    } catch (error) {
        console.error('Composite error:', error);
        return {
            body: {
                error: error.message || 'Composite generation failed'
            }
        };
    }
}

function buildCompositePrompt(description) {
    // Parse and enhance the description into a detailed prompt
    const cleanDesc = description.trim();

    // Extract key features
    const features = [];

    // Height
    if (/tall|6['\s]?f|over 6/i.test(cleanDesc)) features.push('tall stature');
    else if (/short|5['\s]?[0-5]|under 5['\s]?6/i.test(cleanDesc)) features.push('shorter stature');
    else if (/medium|average/i.test(cleanDesc)) features.push('average height');

    // Build
    if (/heavy|large|big|overweight/i.test(cleanDesc)) features.push('heavy build');
    else if (/slim|thin|skinny|lean/i.test(cleanDesc)) features.push('slim build');
    else if (/muscular|athletic|fit/i.test(cleanDesc)) features.push('athletic build');

    // Hair
    const hairMatch = cleanDesc.match(/(black|brown|blonde|red|gray|grey|white|bald)\s*(hair)?/i);
    if (hairMatch) features.push(`${hairMatch[1].toLowerCase()} hair`);

    // Age
    const ageMatch = cleanDesc.match(/(\d{1,2})\s*(years?\s*old|yo)?|((young|middle[- ]aged|elderly|older))/i);
    if (ageMatch) {
        if (ageMatch[1]) features.push(`approximately ${ageMatch[1]} years old`);
        else if (ageMatch[3]) features.push(`${ageMatch[3]} appearance`);
    }

    // Facial features
    if (/beard|goatee|mustache|facial hair/i.test(cleanDesc)) features.push('facial hair');
    if (/scar|scarred/i.test(cleanDesc)) features.push('visible scar');
    if (/tattoo/i.test(cleanDesc)) features.push('visible tattoo');
    if (/glasses|spectacles/i.test(cleanDesc)) features.push('wearing glasses');

    // Clothing
    const clothingMatch = cleanDesc.match(/(wearing|in|had on)\s+([^,.]+)/i);
    if (clothingMatch) features.push(`clothing: ${clothingMatch[2].trim()}`);

    // Build the final prompt
    const promptParts = [
        'Photorealistic police composite sketch style portrait',
        'professional forensic artist rendering',
        'neutral gray background',
        'front-facing view',
        'detailed facial features',
        'high resolution',
        'realistic skin texture'
    ];

    if (features.length > 0) {
        promptParts.push(`Subject details: ${features.join(', ')}`);
    }

    promptParts.push(`Based on witness description: ${cleanDesc}`);

    return promptParts.join('. ') + '.';
}

exports.main = main;
