import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token');

        if (!token) {
            return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 200 });
        }

        const payload = await verifyToken(token.value) as any;
        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ status: false, message: 'Forbidden' }, { status: 200 });
        }

        const logs = await prisma.auditLog.findMany({
            orderBy: {
                timestamp: 'desc'
            },
            take: 100 // Limit for performance, can add pagination later
        });

        return NextResponse.json({
            status: true,
            data: logs
        });

    } catch (error: any) {
        console.error('Error listing logs:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
