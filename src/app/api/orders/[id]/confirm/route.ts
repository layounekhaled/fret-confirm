import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sendOrderToEcotrack } from '@/lib/ecotrack'
import { reserveStock } from '@/lib/stock'
import { sendWebhook } from '@/lib/webhooks'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Seuls les confirmateurs et managers peuvent confirmer
    if (!['confirmateur', 'manager', 'super_admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: { shop: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (order.statut === 'confirmee') {
      return NextResponse.json(
        { error: 'Commande déjà confirmée' },
        { status: 400 }
      )
    }

    // Confirmer la commande
    await db.order.update({
      where: { id },
      data: {
        statut: 'confirmee',
        confirmedAt: new Date(),
      },
    })

    // Log de confirmation
    await db.orderLog.create({
      data: {
        orderId: id,
        userId: payload.userId,
        action: 'confirmation',
        details: 'Commande confirmée',
      },
    })

    // Actions selon le mode de service de la boutique
    const shop = order.shop
    let additionalInfo = ''

    if (shop.modeService === 'confirmation_only') {
      // Envoyer directement à Ecotrack
      const ecotrackResult = await sendOrderToEcotrack(id)
      additionalInfo = ecotrackResult.success
        ? ' - Envoyée à Ecotrack'
        : ` - Erreur Ecotrack: ${ecotrackResult.error}`
    } else if (shop.modeService === 'fulfillment_only' || shop.modeService === 'full_service') {
      // Chercher le produit dans le stock
      const product = await db.product.findFirst({
        where: {
          shopId: shop.id,
          name: { contains: order.produit },
        },
      })

      if (product) {
        const reserved = await reserveStock(product.id, order.quantite)
        if (reserved) {
          // Mettre en préparation
          await db.order.update({
            where: { id },
            data: { statut: 'en_preparation' },
          })
          await db.orderLog.create({
            data: {
              orderId: id,
              userId: payload.userId,
              action: 'mise_en_preparation',
              details: `Stock réservé pour le produit ${product.name}. Mise en préparation.`,
            },
          })
          additionalInfo = ' - Mise en préparation (stock réservé)'

          // Si full_service, aussi envoyer à Ecotrack
          if (shop.modeService === 'full_service') {
            const ecotrackResult = await sendOrderToEcotrack(id)
            additionalInfo += ecotrackResult.success
              ? ' + Envoyée à Ecotrack'
              : ` + Erreur Ecotrack: ${ecotrackResult.error}`
          }
        } else {
          // Pas de stock disponible
          await db.order.update({
            where: { id },
            data: { statut: 'rupture_stock' },
          })
          await db.orderLog.create({
            data: {
              orderId: id,
              userId: payload.userId,
              action: 'rupture_stock',
              details: `Stock insuffisant pour le produit ${product.name}`,
            },
          })
          additionalInfo = ' - Rupture de stock'
        }
      } else {
        // Produit non trouvé dans le catalogue
        await db.orderLog.create({
          data: {
            orderId: id,
            userId: payload.userId,
            action: 'produit_non_trouve',
            details: `Produit "${order.produit}" non trouvé dans le catalogue de la boutique`,
          },
        })
        additionalInfo = ' - Produit non trouvé dans le catalogue'

        // Si full_service, envoyer à Ecotrack quand même
        if (shop.modeService === 'full_service') {
          await sendOrderToEcotrack(id)
        }
      }
    }

    // Envoyer webhook
    await sendWebhook(order.shopId, 'confirmee', {
      orderId: order.id,
      reference: order.reference,
      montant: order.montant,
    })

    const updatedOrder = await db.order.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, name: true, modeService: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      order: updatedOrder,
      message: `Commande confirmée${additionalInfo}`,
    })
  } catch (error) {
    console.error('Erreur confirmation commande:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
