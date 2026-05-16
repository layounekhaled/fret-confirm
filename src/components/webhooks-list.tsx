'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Webhook } from 'lucide-react'
import { toast } from 'sonner'

interface WebhookItem {
  id: string
  event: string
  url: string
  isActive: boolean
  lastSentAt: string | null
  lastStatus: string | null
  createdAt: string
  shop: { id: string; name: string }
}

interface Shop {
  id: string
  name: string
}

const eventLabels: Record<string, string> = {
  confirmee: 'Commande confirmée',
  refusee: 'Commande refusée',
  envoyee_ecotrack: 'Envoyée Ecotrack',
}

const eventColors: Record<string, string> = {
  confirmee: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-700',
  envoyee_ecotrack: 'bg-teal-100 text-teal-700',
}

export function WebhooksList({ token, userRole }: { token: string; userRole: string }) {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [shops, setShops] = useState<Shop[]>([])
  const [form, setForm] = useState({ shopId: '', event: 'confirmee', url: '' })

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch('/api/webhooks', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.webhooks && setWebhooks(d.webhooks))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token, refreshKey])

  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'manager') {
      fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => d.shops && setShops(d.shops.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))))
        .catch(() => {})
    }
  }, [token, userRole])

  const createWebhook = async () => {
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Webhook créé')
        setDialogOpen(false)
        setForm({ shopId: '', event: 'confirmee', url: '' })
        setRefreshKey(k => k + 1)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Supprimer ce webhook ?')) return
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Webhook supprimé')
        setRefreshKey(k => k + 1)
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
          <p className="text-muted-foreground">Configuration des webhooks</p>
        </div>
        {(userRole === 'super_admin' || userRole === 'manager') && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : webhooks.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aucun webhook configuré</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">URL</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Événement</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Boutique</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Statut</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Dernier envoi</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map(w => (
                  <tr key={w.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm font-mono truncate max-w-48">{w.url}</td>
                    <td className="p-3">
                      <Badge className={`${eventColors[w.event] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {eventLabels[w.event] || w.event}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">{w.shop.name}</td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge className={w.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {w.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {w.lastSentAt ? new Date(w.lastSentAt).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteWebhook(w.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Boutique *</Label>
              <Select value={form.shopId} onValueChange={v => setForm({ ...form, shopId: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir une boutique" /></SelectTrigger>
                <SelectContent>
                  {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Événement *</Label>
              <Select value={form.event} onValueChange={v => setForm({ ...form, event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmee">Commande confirmée</SelectItem>
                  <SelectItem value="refusee">Commande refusée</SelectItem>
                  <SelectItem value="envoyee_ecotrack">Envoyée Ecotrack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>URL *</Label><Input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={createWebhook}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
