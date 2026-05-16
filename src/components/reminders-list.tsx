'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Reminder {
  id: string
  dateRappel: string
  notes: string | null
  completed: boolean
  createdAt: string
  order: { id: string; reference: string; nomClient: string; telephone: string }
  user: { id: string; name: string }
}

export function RemindersList({ token }: { token: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter === 'pending') params.set('completed', 'false')
    fetch(`/api/reminders?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.reminders && setReminders(d.reminders))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token, filter, refreshKey])

  const markComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, completed: true }),
      })
      if (res.ok) {
        toast.success('Rappel marqué comme terminé')
        setRefreshKey(k => k + 1)
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const isOverdue = (date: string) => new Date(date) < new Date()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rappels</h2>
          <p className="text-muted-foreground">Gestion des rappels</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
            En attente
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            Tous
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aucun rappel {filter === 'pending' ? 'en attente' : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => (
            <Card key={r.id} className={r.completed ? 'opacity-60' : isOverdue(r.dateRappel) ? 'border-red-200 bg-red-50/30' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-8 w-8 flex items-center justify-center rounded-full shrink-0 ${
                      r.completed ? 'bg-green-100' : isOverdue(r.dateRappel) ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {r.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{r.order.reference}</p>
                        <Badge className={
                          r.completed ? 'bg-green-100 text-green-700 border-0' :
                          isOverdue(r.dateRappel) ? 'bg-red-100 text-red-700 border-0' :
                          'bg-amber-100 text-amber-700 border-0'
                        }>
                          {r.completed ? 'Terminé' : isOverdue(r.dateRappel) ? 'En retard' : 'En attente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.order.nomClient} - {r.order.telephone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rappel prévu : {new Date(r.dateRappel).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    </div>
                  </div>
                  {!r.completed && (
                    <Button size="sm" variant="outline" onClick={() => markComplete(r.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Terminer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
