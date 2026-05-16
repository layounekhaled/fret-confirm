'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Receipt } from 'lucide-react'
import { toast } from 'sonner'

interface Invoice {
  id: string
  mois: string
  nbConfirmees: number
  montantConfirm: number
  montantStockage: number
  montantEmballage: number
  montantTotal: number
  statut: string
  createdAt: string
  shop: { id: string; name: string }
}

interface Shop {
  id: string
  name: string
}

const statusBadgeClasses: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  payee: 'bg-green-100 text-green-700',
  en_retard: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  en_attente: 'En attente', payee: 'Payée', en_retard: 'En retard',
}

interface InvoicesListProps {
  token: string
  userRole: string
  userShopId?: string | null
}

export function InvoicesList({ token, userRole, userShopId }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState<Shop[]>([])
  const [shopFilter, setShopFilter] = useState('all')
  const [statutFilter, setStatutFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [genShopId, setGenShopId] = useState('')
  const [genMois, setGenMois] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (shopFilter !== 'all') params.set('shopId', shopFilter)
    if (statutFilter !== 'all') params.set('statut', statutFilter)

    fetch(`/api/invoices?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.invoices && setInvoices(d.invoices))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token, shopFilter, statutFilter, refreshKey])

  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'manager') {
      fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => d.shops && setShops(d.shops.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))))
        .catch(() => {})
    }
  }, [token, userRole])

  const generateInvoice = async () => {
    if (!genShopId || !genMois) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shopId: genShopId, mois: genMois }),
      })
      if (res.ok) {
        toast.success('Facture générée')
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Facturation</h2>
          <p className="text-muted-foreground">Gestion des factures</p>
        </div>
        {userRole === 'super_admin' && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Générer une facture
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {(userRole === 'super_admin' || userRole === 'manager') && shops.length > 0 && (
          <Select value={shopFilter} onValueChange={setShopFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Boutique" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="payee">Payée</SelectItem>
            <SelectItem value="en_retard">En retard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Boutique</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Mois</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Nb confirmées</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Montant confirm</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Stockage</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Emballage</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Total</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={8} className="p-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucune facture</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm font-medium">{inv.shop.name}</td>
                    <td className="p-3 text-sm">{inv.mois}</td>
                    <td className="p-3 text-sm hidden md:table-cell">{inv.nbConfirmees}</td>
                    <td className="p-3 text-sm">{inv.montantConfirm.toLocaleString('fr-FR')} DA</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{inv.montantStockage.toLocaleString('fr-FR')} DA</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{inv.montantEmballage.toLocaleString('fr-FR')} DA</td>
                    <td className="p-3 text-sm font-bold">{inv.montantTotal.toLocaleString('fr-FR')} DA</td>
                    <td className="p-3">
                      <Badge className={`${statusBadgeClasses[inv.statut] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {statusLabels[inv.statut] || inv.statut}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Générer une facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Boutique *</Label>
              <Select value={genShopId} onValueChange={setGenShopId}>
                <SelectTrigger><SelectValue placeholder="Choisir une boutique" /></SelectTrigger>
                <SelectContent>
                  {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mois (YYYY-MM) *</Label>
              <Input type="month" value={genMois} onChange={e => setGenMois(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={generateInvoice}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
