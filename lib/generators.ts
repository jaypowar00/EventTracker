import crypto from 'crypto';

/**
 * Generates a random password
 */
export function generatePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    return password;
}

/**
 * Generates a unique 5-digit publicId (10000-99999)
 */
export async function generateUniquePublicId(prisma: any, type: 'user' | 'team'): Promise<string> {
    const min = 10000;
    const max = 99999;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        const publicId = Math.floor(Math.random() * (max - min + 1)) + min;
        const publicIdStr = publicId.toString();

        // Check uniqueness
        const model = type === 'user' ? prisma.user : prisma.team;
        const existing = await model.findUnique({
            where: { publicId: publicIdStr },
        });

        if (!existing) {
            return publicIdStr;
        }

        attempts++;
    }

    throw new Error(`Failed to generate unique publicId for ${type} after ${maxAttempts} attempts`);
}
