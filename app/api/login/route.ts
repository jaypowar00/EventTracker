import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ status: false, message: 'Missing credentials' }, { status: 200 });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                event: {
                    select: {
                        slug: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ status: false, message: 'Invalid credentials' }, { status: 200 });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
            return NextResponse.json({ status: false, message: 'Invalid credentials' }, { status: 200 });
        }

        // Create session token
        const token = await signToken({
            userId: user.id,
            username: user.username,
            role: user.role,
            publicId: user.publicId,
        });

        // Set cookie
        (await cookies()).set('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return NextResponse.json({
            status: true,
            message: 'Login successful',
            data: {
                id: user.id,
                username: user.username,
                role: user.role,
                publicId: user.publicId,
                eventSlug: user.event?.slug || null,
            },
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
