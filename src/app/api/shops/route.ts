import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['admin', 'super_admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const shops = await db.shop.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true, products: true } },
      },
    })

    return NextResponse.json({ shops })
  } catch (error) {
    console.error('Erreur liste boutiques:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      responsible,
      phone,
      email,
      address,
      modeService,
      prixConfirmation,
      prixStockage,
      prixEmballage,
      ecotrackToken,
      ecotrackUrl,
      webhookUrl,
    } = body

    if (!name || !responsible || !phone || !email) {
      return NextResponse.json(
        { error: 'Champs requis: name, responsible, phone, email' },
        { status: 400 }
      )
    }

    // Vérifier l'unicité de l'email
    const existing = await db.shop.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email déjà utilisé' },
        { status: 409 }
      )
    }

    const apiKey = `fret_${uuidv4().replace(/-/g, '')}`

    const shop = await db.shop.create({
      data: {
        name,
        responsible,
        phone,
        email,
        address: address || null,
        modeService: modeService || 'confirmation_only',
        prixConfirmation: Number(prixConfirmation) || 0,
        prixStockage: Number(prixStockage) || 0,
        prixEmballage: Number(prixEmballage) || 0,
        ecotrackToken: ecotrackToken || null,
        ecotrackUrl: ecotrackUrl || null,
        webhookUrl: webhookUrl || null,
        apiKey,
      },
    })

    return NextResponse.json({ shop }, { status: 201 })
  } catch (error) {
    console.error('Erreur création boutique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
