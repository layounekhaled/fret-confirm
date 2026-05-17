import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { routeOrder } from '@/lib/delivery-router'
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
      // ============================================================
      // CAS 1 : confirmation_only
      // Après confirmation → envoyer automatiquement vers le prestataire configuré
      // ============================================================
      if (shop.autoSendAfterConfirmation) {
        const routeResult = await routeOrder(id)
        additionalInfo = routeResult.success
          ? ` - Envoyée vers ${routeResult.provider}${routeResult.tracking ? ` (suivi: ${routeResult.tracking})` : ''}`
          : ` - Erreur envoi (${routeResult.provider}): ${routeResult.error}`
      } else {
        additionalInfo = ' - En attente d\'envoi manuel'
      }
    } else if (shop.modeService === 'fulfillment_only') {
      // ============================================================
      // CAS 2 : fulfillment_only
      // Pas de confirmation nécessaire, directement en préparation
      // (Mais on a quand même confirmé ci-dessus, donc on gère le stock)
      // ============================================================
      const product = await db.product.findFirst({
        where: {
          shopId: shop.id,
          name: { contains: order.produit },
        },
      })

      if (product) {
        const reserved = await reserveStock(product.id, order.quantite)
        if (reserved) {
          await db.order.update({
            where: { id },
            data: { statut: 'en_preparation' },
          })
          await db.orderLog.create({
            data: {
              orderId: id,
              userId: payload.userId,
              action: 'mise_en_preparation',
              details: `Stock réservé pour ${product.name}. Mise en préparation.`,
            },
          })
          additionalInfo = ' - Mise en préparation (stock réservé)'
        } else {
          await db.order.update({
            where: { id },
            data: { statut: 'rupture_stock' },
          })
          await db.orderLog.create({
            data: {
              orderId: id,
              userId: payload.userId,
              action: 'rupture_stock',
              details: `Stock insuffisant pour ${product.name}`,
            },
          })
          additionalInfo = ' - Rupture de stock'
        }
      } else {
        await db.orderLog.create({
          data: {
            orderId: id,
            userId: payload.userId,
            action: 'produit_non_trouve',
            details: `Produit "${order.produit}" non trouvé dans le catalogue`,
          },
        })
        additionalInfo = ' - Produit non trouvé dans le catalogue'
      }
    } else if (shop.modeService === 'full_service') {
      // ============================================================
      // CAS 3 : full_service
      // Après confirmation → vérifier stock → préparation → envoi
      // ============================================================
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
              details: `Stock réservé pour ${product.name}. Mise en préparation.`,
            },
          })
          additionalInfo = ' - Mise en préparation (stock réservé)'
          // L'envoi vers le prestataire se fera après emballage
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
              details: `Stock insuffisant pour ${product.name}`,
            },
          })
          additionalInfo = ' - Rupture de stock'
        }
      } else {
        // Produit non trouvé - si autoSendAfterConfirmation, envoyer directement
        await db.orderLog.create({
          data: {
            orderId: id,
            userId: payload.userId,
            action: 'produit_non_trouve',
            details: `Produit "${order.produit}" non trouvé dans le catalogue`,
          },
        })
        additionalInfo = ' - Produit non trouvé'

        if (shop.autoSendAfterConfirmation) {
          const routeResult = await routeOrder(id)
          additionalInfo += routeResult.success
            ? ` - Envoyée vers ${routeResult.provider}`
            : ` - Erreur envoi: ${routeResult.error}`
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
        shop: { select: { id: true, name: true, modeService: true, deliveryProvider: true, deliveryMode: true } },
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
