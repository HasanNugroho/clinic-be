/**
 * Utility for detecting and handling examination numbers
 * Supports Indonesian ordinal numbers from 1 to 999 (ratusan)
 */

/**
 * Map of Indonesian ordinal keywords to numbers
 */
const INDONESIAN_ORDINALS: Record<string, number> = {
    // Units (1-9)
    'pertama': 1,
    'kedua': 2,
    'ketiga': 3,
    'keempat': 4,
    'kelima': 5,
    'keenam': 6,
    'ketujuh': 7,
    'kedelapan': 8,
    'kesembilan': 9,

    // Tens (10-90)
    'kesepuluh': 10,
    'kesebelas': 11,
    'keduabelas': 12,
    'ketigabelas': 13,
    'keempatbelas': 14,
    'kelimabelas': 15,
    'keenambelas': 16,
    'ketujuhbelas': 17,
    'kedelapanbelas': 18,
    'kesembilanbelas': 19,
    'kedua puluh': 20,
    'ketiga puluh': 30,
    'keempat puluh': 40,
    'kelima puluh': 50,
    'keenam puluh': 60,
    'ketujuh puluh': 70,
    'kedelapan puluh': 80,
    'kesembilan puluh': 90,

    // Hundreds (100-900)
    'seratus': 100,
    'dua ratus': 200,
    'tiga ratus': 300,
    'empat ratus': 400,
    'lima ratus': 500,
    'enam ratus': 600,
    'tujuh ratus': 700,
    'delapan ratus': 800,
    'sembilan ratus': 900,
};

/**
 * Detect examination number from query keywords
 * Supports:
 * - Indonesian ordinal keywords: pertama (1), kedua (2), ketiga (3), etc.
 * - Numeric patterns: "pemeriksaan 1", "pemeriksaan ke-1", "pemeriksaan ke 1"
 * - Range up to 999 (ratusan)
 *
 * @param query - User query string
 * @returns Detected examination number or null
 */
export function detectExaminationNumber(query: string): number | null {
    const lowerQuery = query.toLowerCase();

    // Try to match Indonesian ordinal keywords
    for (const [keyword, number] of Object.entries(INDONESIAN_ORDINALS)) {
        if (lowerQuery.includes(keyword)) {
            return number;
        }
    }

    // Check for numeric patterns like "pemeriksaan 1", "pemeriksaan ke-1", "pemeriksaan ke 1"
    // Supports numbers up to 999
    const numericMatch = lowerQuery.match(/pemeriksaan\s+(?:ke[- ]?)?(\d{1,3})/);
    if (numericMatch) {
        const num = parseInt(numericMatch[1], 10);
        if (num >= 1 && num <= 999) {
            return num;
        }
    }

    return null;
}

/**
 * Convert number to Indonesian ordinal text
 * @param num - Number to convert (1-999)
 * @returns Indonesian ordinal text or null if out of range
 */
export function numberToIndonesianOrdinal(num: number): string | null {
    if (num < 1 || num > 999) {
        return null;
    }

    // Find direct match in ordinals map
    for (const [text, value] of Object.entries(INDONESIAN_ORDINALS)) {
        if (value === num) {
            return text;
        }
    }

    // Build composite numbers (e.g., 21 = "kedua puluh satu")
    if (num > 20 && num < 100) {
        const tens = Math.floor(num / 10) * 10;
        const units = num % 10;
        const tensText = INDONESIAN_ORDINALS[`ketiga puluh`]
            ? Object.entries(INDONESIAN_ORDINALS).find(([_, v]) => v === tens)?.[0]
            : null;
        const unitsText = Object.entries(INDONESIAN_ORDINALS).find(([_, v]) => v === units)?.[0];
        if (tensText && unitsText) {
            return `${tensText} ${unitsText}`;
        }
    }

    // Build hundreds (e.g., 150 = "seratus lima puluh")
    if (num >= 100) {
        const hundreds = Math.floor(num / 100) * 100;
        const remainder = num % 100;
        const hundredsText = Object.entries(INDONESIAN_ORDINALS).find(([_, v]) => v === hundreds)?.[0];
        if (hundredsText) {
            if (remainder === 0) {
                return hundredsText;
            }
            const remainderText = numberToIndonesianOrdinal(remainder);
            if (remainderText) {
                return `${hundredsText} ${remainderText}`;
            }
        }
    }

    return null;
}

/**
 * Check if query is asking for a specific examination number
 * @param query - User query string
 * @returns true if query contains examination number keywords or patterns
 */
export function isAskingForSpecificExamination(query: string): boolean {
    return detectExaminationNumber(query) !== null;
}
