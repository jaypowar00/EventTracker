import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete the session token cookie
        cookieStore.delete('session_token');

        return NextResponse.json({
            status: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json({
            status: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}
