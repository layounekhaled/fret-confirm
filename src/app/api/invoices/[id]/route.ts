import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getInvoice } from '@/lib/invoices'

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

    const invoice = await getInvoice(id)

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Erreur détail facture:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
