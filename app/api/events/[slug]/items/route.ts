import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        const event = await prisma.event.findFirst({
            where: {
                OR: [
                    { id: slug },
                    { slug: slug }
                ]
            }
        });

        if (!event) {
            return NextResponse.json({ status: false, message: 'Event not found' }, { status: 200 });
        }

        const items = await prisma.item.findMany({
            where: {
                eventId: event.id,
                name: {
                    contains: query,
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ status: true, data: items });
    } catch (error: any) {
        console.error('Error fetching items:', error);
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
