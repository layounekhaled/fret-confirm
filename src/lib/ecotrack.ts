import { db } from '@/lib/db'

interface EcotrackResult {
  success: boolean
  tracking?: string
  error?: string
}

export async function sendOrderToEcotrack(orderId: string): Promise<EcotrackResult> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    })

    if (!order) {
      return { success: false, error: 'Commande introuvable' }
    }

    if (!order.shop.ecotrackToken || !order.shop.ecotrackUrl) {
      await db.ecotrackLog.create({
        data: {
          orderId: order.id,
          shopId: order.shopId,
          request: null,
          response: null,
          status: 'erreur',
          error: 'Configuration Ecotrack manquante (token ou URL)',
        },
      })

      await db.order.update({
        where: { id: orderId },
        data: { statut: 'erreur_ecotrack', ecotrackResponse: 'Configuration Ecotrack manquante' },
      })

      return { success: false, error: 'Configuration Ecotrack manquante' }
    }

    const requestBody = {
      order_ref: order.reference,
      client_name: order.nomClient,
      client_phone: order.telephone,
      client_phone2: order.telephone2,
      client_address: order.adresse,
      wilaya: order.wilaya,
      commune: order.commune,
      product: order.produit,
      quantity: order.quantite,
      amount: order.montant,
      delivery_type: order.typeLivraison,
      note: order.remarque,
    }

    const requestJson = JSON.stringify(requestBody)
    let responseJson: string | null = null
    let tracking: string | undefined
    let errorMsg: string | undefined

    try {
      const response = await fetch(order.shop.ecotrackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${order.shop.ecotrackToken}`,
        },
        body: requestJson,
      })

      const responseData = await response.json()
      responseJson = JSON.stringify(responseData)

      if (response.ok && responseData.tracking) {
        tracking = responseData.tracking
      } else {
        errorMsg = responseData.message || responseData.error || `Erreur HTTP ${response.status}`
      }
    } catch (fetchError) {
      errorMsg = fetchError instanceof Error ? fetchError.message : 'Erreur réseau Ecotrack'
    }

    const isSuccess = !!tracking

    await db.ecotrackLog.create({
      data: {
        orderId: order.id,
        shopId: order.shopId,
        request: requestJson,
        response: responseJson,
        status: isSuccess ? 'succes' : 'erreur',
        error: errorMsg,
      },
    })

    await db.order.update({
      where: { id: orderId },
      data: {
        statut: isSuccess ? 'envoyee_ecotrack' : 'erreur_ecotrack',
        ecotrackTracking: tracking || null,
        ecotrackResponse: responseJson || errorMsg || null,
        sentToEcotrackAt: isSuccess ? new Date() : null,
      },
    })

    return isSuccess
      ? { success: true, tracking }
      : { success: false, error: errorMsg }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, error: message }
  }
}

export async function retryEcotrack(orderId: string): Promise<EcotrackResult> {
  return sendOrderToEcotrack(orderId)
}
