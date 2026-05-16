import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'

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
    const role = searchParams.get('role')

    const where: Record<string, unknown> = { isActive: true }
    if (role) where.role = role

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        shopId: true,
        shop: { select: { id: true, name: true } },
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { assignedOrders: true, orderLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error)
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
    const { email, name, password, role, phone, shopId } = body

    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: 'Champs requis: email, name, password, role' },
        { status: 400 }
      )
    }

    // Vérifier l'unicité de l'email
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        phone: phone || null,
        shopId: role === 'boutique' ? shopId : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        shopId: true,
        shop: { select: { id: true, name: true } },
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Erreur création utilisateur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
