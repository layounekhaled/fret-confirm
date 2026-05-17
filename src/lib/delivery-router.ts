import { db } from '@/lib/db'

// ============================================================
// TYPES
// ============================================================

interface RouteResult {
  success: boolean
  provider: string
  tracking?: string
  error?: string
}

interface OrderData {
  id: string
  reference: string
  nomClient: string
  telephone: string
  telephone2: string | null
  adresse: string | null
  wilaya: string | null
  commune: string | null
  produit: string
  quantite: number
  montant: number
  typeLivraison: string
  remarque: string | null
}

// ============================================================
// FONCTION CENTRALE DE ROUTAGE
// ============================================================

/**
 * routeOrder - Fonction centrale de routage des commandes
 * Décide automatiquement vers quel prestataire envoyer la commande
 * en fonction de la configuration de la boutique
 */
export async function routeOrder(orderId: string): Promise<RouteResult> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    })

    if (!order) {
      return { success: false, provider: 'none', error: 'Commande introuvable' }
    }

    const shop = order.shop

    // Déterminer le prestataire
    if (shop.deliveryMode === 'external' && shop.deliveryProvider === 'custom_api') {
      // Envoyer vers l'API externe configurée
      return await sendOrderToExternalAPI(orderId)
    } else {
      // Par défaut : envoyer vers Ecotrack (mode internal)
      return await sendOrderToEcotrackRouted(orderId)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, provider: 'none', error: message }
  }
}

// ============================================================
// ENVOI VERS ECOTRACK (via routage)
// ============================================================

async function sendOrderToEcotrackRouted(orderId: string): Promise<RouteResult> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    })

    if (!order) {
      return { success: false, provider: 'ecotrack', error: 'Commande introuvable' }
    }

    if (!order.shop.ecotrackToken || !order.shop.ecotrackUrl) {
      await db.deliveryLog.create({
        data: {
          orderId: order.id,
          shopId: order.shopId,
          provider: 'ecotrack',
          status: 'error',
          errorMessage: 'Configuration Ecotrack manquante (token ou URL)',
        },
      })

      await db.order.update({
        where: { id: orderId },
        data: {
          statut: 'erreur_ecotrack',
          deliveryProvider: 'ecotrack',
          deliveryResponse: 'Configuration Ecotrack manquante',
        },
      })

      return { success: false, provider: 'ecotrack', error: 'Configuration Ecotrack manquante' }
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
        signal: AbortSignal.timeout(30000), // 30s timeout
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

    // Sauvegarder dans delivery_logs
    await db.deliveryLog.create({
      data: {
        orderId: order.id,
        shopId: order.shopId,
        provider: 'ecotrack',
        requestPayload: requestJson,
        responsePayload: responseJson,
        status: isSuccess ? 'success' : 'error',
        errorMessage: errorMsg,
      },
    })

    // Aussi sauvegarder dans ecotrack_logs (rétrocompatibilité)
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

    // Mettre à jour la commande
    await db.order.update({
      where: { id: orderId },
      data: {
        statut: isSuccess ? 'envoyee_ecotrack' : 'erreur_ecotrack',
        ecotrackTracking: tracking || null,
        ecotrackResponse: responseJson || errorMsg || null,
        sentToEcotrackAt: isSuccess ? new Date() : null,
        deliveryProvider: 'ecotrack',
        deliverySentAt: isSuccess ? new Date() : null,
        deliveryTracking: tracking || null,
        deliveryResponse: responseJson || errorMsg || null,
      },
    })

    return isSuccess
      ? { success: true, provider: 'ecotrack', tracking }
      : { success: false, provider: 'ecotrack', error: errorMsg }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, provider: 'ecotrack', error: message }
  }
}

// ============================================================
// ENVOI VERS API EXTERNE
// ============================================================

export async function sendOrderToExternalAPI(orderId: string): Promise<RouteResult> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    })

    if (!order) {
      return { success: false, provider: 'custom', error: 'Commande introuvable' }
    }

    const shop = order.shop

    if (shop.deliveryProvider !== 'custom_api' || !shop.customApiUrl) {
      await db.deliveryLog.create({
        data: {
          orderId: order.id,
          shopId: order.shopId,
          provider: 'custom',
          status: 'error',
          errorMessage: 'Configuration API externe manquante',
        },
      })

      await db.order.update({
        where: { id: orderId },
        data: {
          statut: 'erreur_api_externe',
          deliveryProvider: 'custom',
          deliveryResponse: 'Configuration API externe manquante',
        },
      })

      return { success: false, provider: 'custom', error: 'Configuration API externe manquante' }
    }

    // Construire le payload dynamique
    const payload = buildDynamicPayload(order, shop)
    const headers = buildDynamicHeaders(shop)

    const requestJson = JSON.stringify(payload)
    let responseJson: string | null = null
    let tracking: string | undefined
    let errorMsg: string | undefined

    try {
      const fetchOptions: RequestInit = {
        method: shop.customApiMethod || 'POST',
        headers,
        signal: AbortSignal.timeout(30000),
      }

      if (shop.customApiMethod !== 'GET') {
        fetchOptions.body = requestJson
      }

      const response = await fetch(shop.customApiUrl, fetchOptions)

      let responseData: Record<string, unknown>
      try {
        responseData = await response.json()
      } catch {
        responseData = { raw: await response.text() }
      }

      responseJson = JSON.stringify(responseData)

      if (response.ok) {
        // Essayer d'extraire le tracking depuis la réponse
        tracking = extractTracking(responseData, shop)
      } else {
        errorMsg = (responseData as Record<string, unknown>).message as string
          || (responseData as Record<string, unknown>).error as string
          || `Erreur HTTP ${response.status}`
      }
    } catch (fetchError) {
      errorMsg = fetchError instanceof Error ? fetchError.message : 'Erreur réseau API externe'
    }

    const isSuccess = !errorMsg

    // Sauvegarder dans delivery_logs
    await db.deliveryLog.create({
      data: {
        orderId: order.id,
        shopId: order.shopId,
        provider: 'custom',
        requestPayload: requestJson,
        responsePayload: responseJson,
        status: isSuccess ? 'success' : 'error',
        errorMessage: errorMsg,
      },
    })

    // Mettre à jour la commande
    await db.order.update({
      where: { id: orderId },
      data: {
        statut: isSuccess ? 'envoyee_api_externe' : 'erreur_api_externe',
        deliveryProvider: 'custom',
        deliverySentAt: isSuccess ? new Date() : null,
        deliveryTracking: tracking || null,
        deliveryResponse: responseJson || errorMsg || null,
      },
    })

    return isSuccess
      ? { success: true, provider: 'custom', tracking }
      : { success: false, provider: 'custom', error: errorMsg }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, provider: 'custom', error: message }
  }
}

// ============================================================
// CONSTRUCTION DU PAYLOAD DYNAMIQUE
// ============================================================

function buildDynamicPayload(order: OrderData, shop: { customApiBodyTemplate: string | null; customApiMapping: string | null }): Record<string, unknown> {
  // Champs disponibles pour le template
  const fields: Record<string, string | number | null> = {
    reference: order.reference,
    nom_client: order.nomClient,
    telephone: order.telephone,
    telephone_2: order.telephone2,
    adresse: order.adresse,
    wilaya: order.wilaya,
    commune: order.commune,
    produit: order.produit,
    quantite: order.quantite,
    montant: order.montant,
    type_livraison: order.typeLivraison,
    remarque: order.remarque,
  }

  // Si un body template est défini, l'utiliser
  if (shop.customApiBodyTemplate) {
    try {
      const template = JSON.parse(shop.customApiBodyTemplate)
      return replaceTemplateVariables(template, fields)
    } catch {
      // Si le parsing échoue, utiliser le mapping ou le format par défaut
    }
  }

  // Si un mapping est défini, l'utiliser
  if (shop.customApiMapping) {
    try {
      const mapping = JSON.parse(shop.customApiMapping) as Record<string, string>
      const payload: Record<string, unknown> = {}
      for (const [targetField, sourceField] of Object.entries(mapping)) {
        payload[targetField] = fields[sourceField] ?? null
      }
      return payload
    } catch {
      // Fallback
    }
  }

  // Format par défaut
  return fields as Record<string, unknown>
}

function replaceTemplateVariables(
  template: Record<string, unknown>,
  fields: Record<string, string | number | null>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      // Remplacer les {{field}} par les valeurs
      result[key] = value.replace(/\{\{(\w+)\}\}/g, (_, fieldName) => {
        const val = fields[fieldName]
        return val !== null && val !== undefined ? String(val) : ''
      })
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = replaceTemplateVariables(value as Record<string, unknown>, fields)
    } else {
      result[key] = value
    }
  }

  return result
}

// ============================================================
// CONSTRUCTION DES HEADERS DYNAMIQUES
// ============================================================

function buildDynamicHeaders(shop: {
  customApiHeaders: string | null
  customApiAuthType: string
  customApiAuthToken: string | null
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Ajouter les headers personnalisés
  if (shop.customApiHeaders) {
    try {
      const customHeaders = JSON.parse(shop.customApiHeaders) as Record<string, string>
      Object.assign(headers, customHeaders)
    } catch {
      // Ignorer les erreurs de parsing
    }
  }

  // Ajouter l'authentification
  if (shop.customApiAuthType === 'bearer' && shop.customApiAuthToken) {
    headers['Authorization'] = `Bearer ${shop.customApiAuthToken}`
  } else if (shop.customApiAuthType === 'api_key' && shop.customApiAuthToken) {
    headers['x-api-key'] = shop.customApiAuthToken
  }

  return headers
}

// ============================================================
// EXTRACTION DU TRACKING
// ============================================================

function extractTracking(response: Record<string, unknown>, _shop: { customApiMapping: string | null }): string | undefined {
  // Essayer les chemins communs pour trouver le numéro de suivi
  const possibleKeys = ['tracking', 'tracking_number', 'trackingNumber', 'track_number', 'suivi', 'numero_suivi', 'reference']

  for (const key of possibleKeys) {
    if (response[key] && typeof response[key] === 'string') {
      return response[key] as string
    }
    // Vérifier dans data
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>
      if (data[key] && typeof data[key] === 'string') {
        return data[key] as string
      }
    }
  }

  return undefined
}

// ============================================================
// RETRY AVEC DÉLAI
// ============================================================

export async function retryDelivery(orderId: string): Promise<RouteResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { shop: true },
  })

  if (!order) {
    return { success: false, provider: 'none', error: 'Commande introuvable' }
  }

  // Incrémenter le compteur de retry dans le dernier delivery_log
  const lastLog = await db.deliveryLog.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  })

  if (lastLog) {
    await db.deliveryLog.update({
      where: { id: lastLog.id },
      data: { retryCount: { increment: 1 } },
    })
  }

  // Router à nouveau
  return routeOrder(orderId)
}

// ============================================================
// TEST API EXTERNE (pour le bouton test dans la config)
// ============================================================

export async function testExternalAPI(shopId: string): Promise<RouteResult> {
  const shop = await db.shop.findUnique({ where: { id: shopId } })

  if (!shop) {
    return { success: false, provider: 'custom', error: 'Boutique introuvable' }
  }

  if (!shop.customApiUrl) {
    return { success: false, provider: 'custom', error: 'URL API non configurée' }
  }

  // Créer une commande test fictive
  const testOrder: OrderData = {
    id: 'test',
    reference: 'TEST-000',
    nomClient: 'Client Test',
    telephone: '0500000000',
    telephone2: null,
    adresse: 'Adresse test',
    wilaya: 'Alger',
    commune: 'Test',
    produit: 'Produit Test',
    quantite: 1,
    montant: 1000,
    typeLivraison: 'domicile',
    remarque: 'Commande de test FRET.CONFIRM',
  }

  const payload = buildDynamicPayload(testOrder, shop)
  const headers = buildDynamicHeaders(shop)

  try {
    const fetchOptions: RequestInit = {
      method: shop.customApiMethod || 'POST',
      headers,
      signal: AbortSignal.timeout(15000),
    }

    if (shop.customApiMethod !== 'GET') {
      fetchOptions.body = JSON.stringify(payload)
    }

    const response = await fetch(shop.customApiUrl, fetchOptions)

    let responseData: Record<string, unknown>
    try {
      responseData = await response.json()
    } catch {
      responseData = { raw: await response.text() }
    }

    return {
      success: response.ok,
      provider: 'custom',
      tracking: response.ok ? extractTracking(responseData, shop) : undefined,
      error: !response.ok
        ? (responseData.message as string || responseData.error as string || `Erreur HTTP ${response.status}`)
        : undefined,
    }
  } catch (fetchError) {
    return {
      success: false,
      provider: 'custom',
      error: fetchError instanceof Error ? fetchError.message : 'Erreur réseau',
    }
  }
}
