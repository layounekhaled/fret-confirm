import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const completed = searchParams.get('completed')

    const where: Record<string, unknown> = {}

    // Les confirmateurs ne voient que leurs rappels
    if (payload.role === 'confirmateur') {
      where.userId = payload.userId
    }

    if (orderId) where.orderId = orderId
    if (completed !== null && completed !== undefined) {
      where.completed = completed === 'true'
    }

    const reminders = await db.reminder.findMany({
      where,
      include: {
        order: { select: { id: true, reference: true, nomClient: true, telephone: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { dateRappel: 'asc' },
    })

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Erreur liste rappels:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['confirmateur', 'manager', 'super_admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, dateRappel, notes } = body

    if (!orderId || !dateRappel) {
      return NextResponse.json(
        { error: 'Champs requis: orderId, dateRappel' },
        { status: 400 }
      )
    }

    const reminder = await db.reminder.create({
      data: {
        orderId,
        userId: payload.userId,
        dateRappel: new Date(dateRappel),
        notes: notes || null,
      },
    })

    // Mettre à jour la commande
    await db.order.update({
      where: { id: orderId },
      data: {
        statut: 'rappel',
        rappelDate: new Date(dateRappel),
      },
    })

    // Créer le log
    await db.orderLog.create({
      data: {
        orderId,
        userId: payload.userId,
        action: 'rappel_programme',
        details: `Rappel programmé pour le ${new Date(dateRappel).toLocaleDateString('fr-FR')}`,
      },
    })

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (error) {
    console.error('Erreur création rappel:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
