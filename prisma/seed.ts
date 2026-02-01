import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 1. Generate 10000-99999 publicId
    const publicId = Math.floor(10000 + Math.random() * 90000).toString();

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
        where: { username: adminUsername },
        update: {},
        create: {
            username: adminUsername,
            passwordHash,
            role: 'SUPER_ADMIN', // As per new schema
            publicId: publicId,
        },
    });

    console.log({ admin });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
