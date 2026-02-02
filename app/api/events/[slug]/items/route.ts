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
                    mode: 'insensitive'
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

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { name, defaultVolume, defaultPercentage } = await request.json();

        if (!name) {
            return NextResponse.json({ status: false, message: 'Item name is required' }, { status: 200 });
        }

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

        const newItem = await prisma.item.create({
            data: {
                name: name.trim(),
                defaultVolume: parseInt(defaultVolume) || 0,
                defaultPercentage: parseFloat(defaultPercentage) || 0,
                eventId: event.id
            } as any
        });

        return NextResponse.json({ status: true, data: newItem });
    } catch (error: any) {
        console.error('Error creating item:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ status: false, message: 'Item already exists' }, { status: 200 });
        }
        return NextResponse.json({ status: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
