import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const shopId = searchParams.get('shopId')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const wilaya = searchParams.get('wilaya')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Construction des filtres
    const where: Record<string, unknown> = {}

    // Filtrage par rôle
    if (payload.role === 'boutique') {
      where.shopId = payload.shopId
    } else if (payload.role === 'confirmateur') {
      where.assignedTo = payload.userId
    }

    if (status) where.statut = status
    if (shopId && payload.role !== 'boutique') where.shopId = shopId
    if (assignedTo) where.assignedTo = assignedTo
    if (wilaya) where.wilaya = wilaya

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      }
    }

    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { nomClient: { contains: search } },
        { telephone: { contains: search } },
        { produit: { contains: search } },
      ]
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          shop: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur liste commandes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
