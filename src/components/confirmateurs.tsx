'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Headphones, TrendingUp, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

interface Confirmateur {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  _count: { assignedOrders: number; orderLogs: number }
}

export function Confirmateurs({ token }: { token: string }) {
  const [confirmateurs, setConfirmateurs] = useState<Confirmateur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users?role=confirmateur', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => d.users && setConfirmateurs(d.users))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token])

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        toast.success(isActive ? 'Confirmateur désactivé' : 'Confirmateur activé')
        setConfirmateurs(prev => prev.map(c => c.id === userId ? { ...c, isActive: !isActive } : c))
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Confirmateurs</h2>
        <p className="text-muted-foreground">Gestion des agents confirmateurs</p>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : confirmateurs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aucun confirmateur</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {confirmateurs.map(c => (
            <Card key={c.id} className={!c.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                  <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c.id, c.isActive)} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded bg-slate-50">
                    <p className="text-lg font-bold">{c._count.assignedOrders}</p>
                    <p className="text-xs text-muted-foreground">Commandes</p>
                  </div>
                  <div className="text-center p-2 rounded bg-slate-50">
                    <p className="text-lg font-bold">{c._count.orderLogs}</p>
                    <p className="text-xs text-muted-foreground">Actions</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge className={c.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                    {c.isActive ? 'Disponible' : 'Indisponible'}
                  </Badge>
                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
