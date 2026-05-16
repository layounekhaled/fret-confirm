'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { Plus, Edit, Copy, RefreshCw, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Shop {
  id: string
  name: string
  responsible: string
  phone: string
  email: string
  address: string | null
  isActive: boolean
  apiKey: string
  modeService: string
  ecotrackToken: string | null
  ecotrackUrl: string | null
  createdAt: string
  _count: { orders: number; products: number }
}

const modeLabels: Record<string, string> = {
  confirmation_only: 'Confirmation',
  fulfillment_only: 'Préparation',
  full_service: 'Service complet',
}

const modeColors: Record<string, string> = {
  confirmation_only: 'bg-emerald-100 text-emerald-700',
  fulfillment_only: 'bg-blue-100 text-blue-700',
  full_service: 'bg-purple-100 text-purple-700',
}

export function ShopsList({ token }: { token: string }) {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [apiKeyDialog, setApiKeyDialog] = useState<Shop | null>(null)
  const [form, setForm] = useState({
    name: '', responsible: '', phone: '', email: '', address: '',
    modeService: 'confirmation_only', prixConfirmation: '0', prixStockage: '0', prixEmballage: '0',
    ecotrackToken: '', ecotrackUrl: '',
  })

  useEffect(() => {
    fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.shops && setShops(d.shops))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [token, refreshKey])

  const openCreate = () => {
    setEditingShop(null)
    setForm({ name: '', responsible: '', phone: '', email: '', address: '', modeService: 'confirmation_only', prixConfirmation: '0', prixStockage: '0', prixEmballage: '0', ecotrackToken: '', ecotrackUrl: '' })
    setDialogOpen(true)
  }

  const openEdit = (shop: Shop) => {
    setEditingShop(shop)
    setForm({
      name: shop.name, responsible: shop.responsible, phone: shop.phone,
      email: shop.email, address: shop.address || '', modeService: shop.modeService,
      prixConfirmation: '0', prixStockage: '0', prixEmballage: '0',
      ecotrackToken: shop.ecotrackToken || '', ecotrackUrl: shop.ecotrackUrl || '',
    })
    setDialogOpen(true)
  }

  const saveShop = async () => {
    try {
      const url = editingShop ? `/api/shops/${editingShop.id}` : '/api/shops'
      const method = editingShop ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(editingShop ? 'Boutique modifiée' : 'Boutique créée')
        setDialogOpen(false)
        setRefreshKey(k => k + 1)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const regenerateKey = async (shopId: string) => {
    try {
      const res = await fetch(`/api/shops/${shopId}/regenerate-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Clé API régénérée')
        setRefreshKey(k => k + 1)
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Clé copiée')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Boutiques</h2>
          <p className="text-muted-foreground">Gestion des boutiques</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Nom</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Responsable</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Téléphone</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Mode service</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Statut</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map(shop => (
                  <tr key={shop.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <p className="text-sm font-medium">{shop.name}</p>
                      <p className="text-xs text-muted-foreground">{shop._count.orders} commandes, {shop._count.products} produits</p>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">{shop.responsible}</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{shop.phone}</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{shop.email}</td>
                    <td className="p-3">
                      <Badge className={`${modeColors[shop.modeService] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {modeLabels[shop.modeService] || shop.modeService}
                      </Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge className={shop.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {shop.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(shop)} title="Modifier">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setApiKeyDialog(shop)} title="Voir clé API">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingShop ? 'Modifier la boutique' : 'Nouvelle boutique'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Responsable *</Label><Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
              <div><Label>Téléphone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div>
                <Label>Mode service</Label>
                <Select value={form.modeService} onValueChange={v => setForm({ ...form, modeService: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmation_only">Confirmation</SelectItem>
                    <SelectItem value="fulfillment_only">Préparation</SelectItem>
                    <SelectItem value="full_service">Service complet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Token Ecotrack</Label><Input value={form.ecotrackToken} onChange={e => setForm({ ...form, ecotrackToken: e.target.value })} /></div>
              <div><Label>URL Ecotrack</Label><Input value={form.ecotrackUrl} onChange={e => setForm({ ...form, ecotrackUrl: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveShop}>{editingShop ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key dialog */}
      <Dialog open={!!apiKeyDialog} onOpenChange={() => setApiKeyDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clé API - {apiKeyDialog?.name}</DialogTitle>
          </DialogHeader>
          {apiKeyDialog && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Clé API</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-mono truncate">
                    {apiKeyDialog.apiKey}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyKey(apiKeyDialog.apiKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm">Token Ecotrack</Label>
                <p className="text-sm mt-1 bg-slate-50 px-3 py-2 rounded">{apiKeyDialog.ecotrackToken || 'Non configuré'}</p>
              </div>
              <div>
                <Label className="text-sm">URL Ecotrack</Label>
                <p className="text-sm mt-1 bg-slate-50 px-3 py-2 rounded">{apiKeyDialog.ecotrackUrl || 'Non configuré'}</p>
              </div>
              <Button variant="outline" onClick={() => regenerateKey(apiKeyDialog.id)} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> Régénérer la clé API
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
