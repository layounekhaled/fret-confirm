import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { shop: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        shopId: user.shopId,
        shop: user.shop
          ? {
              id: user.shop.id,
              name: user.shop.name,
              modeService: user.shop.modeService,
            }
          : null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Erreur me:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
