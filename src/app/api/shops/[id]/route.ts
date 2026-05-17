import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const shop = await db.shop.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, products: true, invoices: true } },
        apiKeys: { where: { isActive: true } },
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
    }

    // Masquer les infos sensibles si boutique
    if (payload.role === 'boutique' && payload.shopId !== id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({ shop })
  } catch (error) {
    console.error('Erreur détail boutique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager'].includes(payload.role) && payload.role !== 'boutique') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const shop = await db.shop.findUnique({ where: { id } })
    if (!shop) {
      return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
    }

    // Vérifier qu'une boutique ne peut modifier que sa propre config
    if (payload.role === 'boutique' && payload.shopId !== id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      // Champs de base
      'name', 'responsible', 'phone', 'address',
      'modeService', 'prixConfirmation', 'prixStockage', 'prixEmballage',
      // Champs Ecotrack
      'ecotrackToken', 'ecotrackUrl', 'webhookUrl',
      // Nouveaux champs routage livraison
      'deliveryProvider', 'deliveryMode',
      'customApiUrl', 'customApiMethod', 'customApiHeaders',
      'customApiBodyTemplate', 'customApiAuthType', 'customApiAuthToken',
      'customApiMapping', 'autoSendAfterConfirmation',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Pour les champs JSON, valider que c'est du JSON valide
        if (['customApiHeaders', 'customApiBodyTemplate', 'customApiMapping'].includes(field) && body[field]) {
          try {
            JSON.parse(body[field])
          } catch {
            return NextResponse.json(
              { error: `Champ ${field} : JSON invalide` },
              { status: 400 }
            )
          }
        }
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.shop.update({ where: { id }, data: updateData })
    }

    const updatedShop = await db.shop.findUnique({ where: { id } })
    return NextResponse.json({ shop: updatedShop })
  } catch (error) {
    console.error('Erreur mise à jour boutique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const shop = await db.shop.findUnique({ where: { id } })
    if (!shop) {
      return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
    }

    await db.shop.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Boutique désactivée' })
  } catch (error) {
    console.error('Erreur suppression boutique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
