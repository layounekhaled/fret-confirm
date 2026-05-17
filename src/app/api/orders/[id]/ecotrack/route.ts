import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { routeOrder, retryDelivery } from '@/lib/delivery-router'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['manager', 'super_admin', 'confirmateur', 'operateur_stock'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    // Vérifier si c'est un retry ou un envoi initial
    const body = await request.json().catch(() => ({}))
    const isRetry = body.retry === true

    const result = isRetry ? await retryDelivery(id) : await routeOrder(id)

    if (result.success) {
      return NextResponse.json({
        message: `Commande envoyée vers ${result.provider} avec succès`,
        tracking: result.tracking,
        provider: result.provider,
      })
    } else {
      return NextResponse.json(
        {
          error: `Erreur lors de l'envoi vers ${result.provider}`,
          details: result.error,
          provider: result.provider,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Erreur livraison:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
