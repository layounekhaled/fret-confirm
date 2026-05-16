import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizePhone } from '@/lib/phone'
import { checkExactDuplicate, checkProbableDuplicate, checkRecurrentClient } from '@/lib/duplicates'

export async function POST(request: NextRequest) {
  try {
    // Authentification par API Key
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API requise' },
        { status: 401 }
      )
    }

    // Vérifier la clé API dans la table Shop ou ApiKey
    const shop = await db.shop.findFirst({ where: { apiKey, isActive: true } })
    let shopId: string

    if (shop) {
      shopId = shop.id
    } else {
      const apiKeyRecord = await db.apiKey.findFirst({
        where: { key: apiKey, isActive: true },
        include: { shop: true },
      })
      if (!apiKeyRecord || !apiKeyRecord.shop.isActive) {
        return NextResponse.json(
          { error: 'Clé API invalide' },
          { status: 401 }
        )
      }
      shopId = apiKeyRecord.shopId

      // Mettre à jour lastUsedAt
      await db.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
    }

    const body = await request.json()
    const {
      reference,
      nom_client,
      telephone,
      telephone_2,
      adresse,
      wilaya,
      commune,
      produit,
      quantite,
      montant,
      type_livraison,
      remarque,
    } = body

    // Validations
    if (!reference || !nom_client || !telephone || !produit) {
      return NextResponse.json(
        { error: 'Champs requis manquants: reference, nom_client, telephone, produit' },
        { status: 400 }
      )
    }

    // Normaliser le téléphone
    let normalizedPhone: string
    try {
      normalizedPhone = normalizePhone(telephone)
    } catch {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide', code: 'phone_invalid' },
        { status: 400 }
      )
    }

    let normalizedPhone2: string | undefined
    if (telephone_2) {
      try {
        normalizedPhone2 = normalizePhone(telephone_2)
      } catch {
        return NextResponse.json(
          { error: 'Deuxième numéro de téléphone invalide', code: 'phone_invalid' },
          { status: 400 }
        )
      }
    }

    // Vérifier doublon exact
    const isExactDuplicate = await checkExactDuplicate(shopId, reference, normalizedPhone)
    if (isExactDuplicate) {
      return NextResponse.json(
        { error: 'Commande dupliquée', code: 'duplicate_order' },
        { status: 409 }
      )
    }

    // Vérifier doublon probable
    const probableDuplicates = await checkProbableDuplicate(
      shopId,
      normalizedPhone,
      produit,
      Number(montant) || 0
    )

    // Vérifier client récurrent
    const recurrentHistory = await checkRecurrentClient(shopId, normalizedPhone)
    const isRecurrent = recurrentHistory.length > 0

    // Déterminer le statut
    let statut = 'nouvelle'
    if (probableDuplicates.length > 0) {
      statut = 'doublon_suspect'
    }

    // Créer la commande
    const order = await db.order.create({
      data: {
        shopId,
        reference,
        nomClient: nom_client,
        telephone: normalizedPhone,
        telephone2: normalizedPhone2,
        adresse: adresse || null,
        wilaya: wilaya || null,
        commune: commune || null,
        produit,
        quantite: Number(quantite) || 1,
        montant: Number(montant) || 0,
        typeLivraison: type_livraison || 'domicile',
        remarque: remarque || null,
        statut,
        isRecurrent,
      },
    })

    // Créer le log
    await db.orderLog.create({
      data: {
        orderId: order.id,
        action: 'creation',
        details: `Commande créée via API. Statut: ${statut}${isRecurrent ? ' (client récurrent)' : ''}${probableDuplicates.length > 0 ? ` (${probableDuplicates.length} doublon(s) suspecté(s))` : ''}`,
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Erreur création commande:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
