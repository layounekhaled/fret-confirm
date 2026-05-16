import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        shopId: true,
        shop: { select: { id: true, name: true } },
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { assignedOrders: true, orderLogs: true, assignments: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Erreur détail utilisateur:', error)
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

    if (payload.role !== 'super_admin' && payload.userId !== (await params).id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.name) updateData.name = body.name
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.avatar !== undefined) updateData.avatar = body.avatar

    // Seul le super_admin peut changer le rôle et le shopId
    if (payload.role === 'super_admin') {
      if (body.role) updateData.role = body.role
      if (body.shopId !== undefined) updateData.shopId = body.shopId
    }

    // Changement de mot de passe
    if (body.password) {
      updateData.password = await hashPassword(body.password)
    }

    if (Object.keys(updateData).length > 0) {
      await db.user.update({ where: { id }, data: updateData })
    }

    const updatedUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        shopId: true,
        shop: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error)
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

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    await db.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Utilisateur désactivé' })
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
