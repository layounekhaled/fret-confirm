import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { generateInvoice } from '@/lib/invoices'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const mois = searchParams.get('mois')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (shopId) where.shopId = shopId
    if (mois) where.mois = mois
    if (statut) where.statut = statut

    const invoices = await db.invoice.findMany({
      where,
      include: { shop: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Erreur liste factures:', error)
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
    const { shopId, mois } = body

    if (!shopId || !mois) {
      return NextResponse.json(
        { error: 'Champs requis: shopId, mois (format YYYY-MM)' },
        { status: 400 }
      )
    }

    // Valider le format du mois
    if (!/^\d{4}-\d{2}$/.test(mois)) {
      return NextResponse.json(
        { error: 'Format de mois invalide (YYYY-MM)' },
        { status: 400 }
      )
    }

    const result = await generateInvoice(shopId, mois)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id: result.invoiceId },
      include: { shop: true },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('Erreur génération facture:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
