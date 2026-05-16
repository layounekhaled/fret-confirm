import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Les boutiques voient leurs webhooks, les admins voient tout
    const where: Record<string, unknown> = {}
    if (payload.role === 'boutique') {
      where.shopId = payload.shopId
    }

    const webhooks = await db.webhook.findMany({
      where,
      include: { shop: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Erreur liste webhooks:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { shopId, event, url } = body

    if (!shopId || !event || !url) {
      return NextResponse.json(
        { error: 'Champs requis: shopId, event, url' },
        { status: 400 }
      )
    }

    // Valider l'événement
    const validEvents = ['confirmee', 'refusee', 'envoyee_ecotrack']
    if (!validEvents.includes(event)) {
      return NextResponse.json(
        { error: `Événement invalide. Valeurs acceptées: ${validEvents.join(', ')}` },
        { status: 400 }
      )
    }

    const webhook = await db.webhook.create({
      data: {
        shopId,
        event,
        url,
      },
    })

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Erreur création webhook:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
