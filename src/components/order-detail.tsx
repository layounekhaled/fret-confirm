'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Phone, MessageCircle, CheckCircle, XCircle, Clock, Bell, Ban, Truck, User, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

interface OrderDetail {
  id: string
  reference: string
  nomClient: string
  telephone: string
  telephone2: string | null
  adresse: string | null
  wilaya: string | null
  commune: string | null
  produit: string
  quantite: number
  montant: number
  typeLivraison: string
  remarque: string | null
  statut: string
  notes: string | null
  isRecurrent: boolean
  confirmedAt: string | null
  sentToEcotrackAt: string | null
  ecotrackTracking: string | null
  createdAt: string
  updatedAt: string
  shop: { id: string; name: string; modeService: string }
  assignee: { id: string; name: string } | null
  orderLogs: Array<{
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { id: string; name: string } | null
  }>
  assignments: Array<{
    id: string
    type: string
    createdAt: string
    user: { id: string; name: string }
  }>
  reminders: Array<{
    id: string
    dateRappel: string
    notes: string | null
    completed: boolean
    createdAt: string
    user: { id: string; name: string }
  }>
  ecotrackLogs: Array<{
    id: string
    request: string | null
    response: string | null
    status: string
    error: string | null
    createdAt: string
  }>
}

interface Confirmateur {
  id: string
  name: string
}

const statusBadgeClasses: Record<string, string> = {
  nouvelle: 'bg-blue-100 text-blue-700',
  assignee: 'bg-cyan-100 text-cyan-700',
  en_cours: 'bg-yellow-100 text-yellow-700',
  confirmee: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-700',
  injoignable: 'bg-orange-100 text-orange-700',
  rappel: 'bg-purple-100 text-purple-700',
  doublon_suspect: 'bg-pink-100 text-pink-700',
  annulee: 'bg-gray-100 text-gray-700',
  en_preparation: 'bg-teal-100 text-teal-700',
  emballée: 'bg-emerald-100 text-emerald-700',
  prete_expedition: 'bg-lime-100 text-lime-700',
  envoyee_ecotrack: 'bg-green-800 text-white',
  erreur_ecotrack: 'bg-red-800 text-white',
  envoyee_api_externe: 'bg-teal-800 text-white',
  erreur_api_externe: 'bg-rose-800 text-white',
  rupture_stock: 'bg-amber-100 text-amber-700',
}

const statusLabels: Record<string, string> = {
  nouvelle: 'Nouvelle', assignee: 'Assignée', en_cours: 'En cours',
  confirmee: 'Confirmée', refusee: 'Refusée', injoignable: 'Injoignable',
  rappel: 'Rappel', doublon_suspect: 'Doublon', annulee: 'Annulée',
  en_preparation: 'En préparation', emballée: 'Emballée', prete_expedition: 'Prête expéd.',
  envoyee_ecotrack: 'Envoyée Eco.', erreur_ecotrack: 'Erreur Eco.',
  envoyee_api_externe: 'Envoyée API', erreur_api_externe: 'Erreur API',
  rupture_stock: 'Rupture stock',
}

interface OrderDetailProps {
  orderId: string | null
  token: string
  userRole: string
  onClose: () => void
}

export function OrderDetail({ orderId, token, userRole, onClose }: OrderDetailProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [confirmateurs, setConfirmateurs] = useState<Confirmateur[]>([])
  const [selectedConf, setSelectedConf] = useState('')
  const [rappelDate, setRappelDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetch(`/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setOrder(d.order)
        setNotes(d.order?.notes || '')
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [orderId, token])

  // Fetch confirmateurs for assignment
  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'manager') {
      fetch('/api/users?role=confirmateur', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => d.users && setConfirmateurs(d.users.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))))
        .catch(() => {})
    }
  }, [token, userRole])

  const updateStatus = async (statut: string) => {
    if (!order || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut }),
      })
      if (res.ok) {
        toast.success(`Statut mis à jour : ${statusLabels[statut]}`)
        // Refresh order
        const d = await fetch(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        setOrder(d.order)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur de mise à jour')
    } finally {
      setActionLoading(false)
    }
  }

  const assignOrder = async () => {
    if (!order || !selectedConf) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, userId: selectedConf, type: 'manuel' }),
      })
      if (res.ok) {
        toast.success('Commande assignée')
        const d = await fetch(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        setOrder(d.order)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur d\'assignation')
    } finally {
      setActionLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!order) return
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      })
      toast.success('Notes sauvegardées')
    } catch {
      toast.error('Erreur de sauvegarde')
    }
  }

  const addReminder = async () => {
    if (!order || !rappelDate) return
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, dateRappel: rappelDate, notes: 'Rappel programmé' }),
      })
      toast.success('Rappel ajouté')
      const d = await fetch(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      setOrder(d.order)
      setRappelDate('')
    } catch {
      toast.error('Erreur')
    }
  }

  const sendToEcotrack = async () => {
    if (!order) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/ecotrack`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Envoyé à Ecotrack')
        const d = await fetch(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        setOrder(d.order)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur Ecotrack')
      }
    } catch {
      toast.error('Erreur d\'envoi')
    } finally {
      setActionLoading(false)
    }
  }

  const canConfirm = order && ['nouvelle', 'assignee', 'en_cours', 'rappel'].includes(order.statut)
  const canRefuse = order && ['nouvelle', 'assignee', 'en_cours', 'rappel'].includes(order.statut)
  const canRappel = order && ['nouvelle', 'assignee', 'en_cours', 'injoignable'].includes(order.statut)
  const canCancel = order && !['confirmee', 'annulee', 'envoyee_ecotrack'].includes(order.statut)
  const canSendEcotrack = order && order.statut === 'confirmee' && order.shop?.modeService !== 'confirmation_only'
  const isConfirmateur = userRole === 'confirmateur'
  const isAdmin = userRole === 'super_admin' || userRole === 'manager'

  return (
    <Dialog open={!!orderId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Détail commande
            {order && (
              <Badge className={`${statusBadgeClasses[order.statut] || 'bg-gray-100 text-gray-700'} border-0`}>
                {statusLabels[order.statut] || order.statut}
              </Badge>
            )}
            {order?.isRecurrent && <Badge variant="outline" className="text-amber-600 border-amber-300">Récurrent</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Référence:</span><p className="font-medium">{order.reference}</p></div>
              <div><span className="text-muted-foreground">Client:</span><p className="font-medium">{order.nomClient}</p></div>
              <div>
                <span className="text-muted-foreground">Téléphone:</span>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{order.telephone}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={`tel:${order.telephone}`}><Phone className="h-3.5 w-3.5" /></a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={`https://wa.me/${order.telephone.replace(/^0/, '213')}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                    </a>
                  </Button>
                </div>
              </div>
              {order.telephone2 && <div><span className="text-muted-foreground">Tél 2:</span><p className="font-medium">{order.telephone2}</p></div>}
              <div><span className="text-muted-foreground">Produit:</span><p className="font-medium">{order.produit} x{order.quantite}</p></div>
              <div><span className="text-muted-foreground">Montant:</span><p className="font-bold text-emerald-600">{order.montant.toLocaleString('fr-FR')} DA</p></div>
              <div><span className="text-muted-foreground">Wilaya:</span><p className="font-medium">{order.wilaya || '-'}</p></div>
              <div><span className="text-muted-foreground">Commune:</span><p className="font-medium">{order.commune || '-'}</p></div>
              <div><span className="text-muted-foreground">Adresse:</span><p className="font-medium">{order.adresse || '-'}</p></div>
              <div><span className="text-muted-foreground">Livraison:</span><p className="font-medium">{order.typeLivraison === 'domicile' ? 'Domicile' : 'Stop Desk'}</p></div>
              <div><span className="text-muted-foreground">Boutique:</span><p className="font-medium">{order.shop.name}</p></div>
              <div><span className="text-muted-foreground">Assigné à:</span><p className="font-medium">{order.assignee?.name || 'Non assigné'}</p></div>
              <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
              {order.confirmedAt && <div><span className="text-muted-foreground">Confirmé le:</span><p className="font-medium">{new Date(order.confirmedAt).toLocaleDateString('fr-FR')}</p></div>}
            </div>

            {/* Infos livraison / routage */}
            {(order.deliveryProvider || order.ecotrackTracking || order.deliveryTracking) && (
              <div className="p-3 rounded-lg bg-slate-50 border">
                <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Informations livraison</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {order.deliveryProvider && (
                    <div>
                      <span className="text-muted-foreground">Prestataire:</span>
                      <Badge className={`ml-1 border-0 text-xs ${order.deliveryProvider === 'ecotrack' ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'}`}>
                        {order.deliveryProvider === 'ecotrack' ? 'Ecotrack' : 'API Externe'}
                      </Badge>
                    </div>
                  )}
                  {(order.deliveryTracking || order.ecotrackTracking) && (
                    <div><span className="text-muted-foreground">N° suivi:</span><p className="font-medium">{order.deliveryTracking || order.ecotrackTracking}</p></div>
                  )}
                  {order.deliverySentAt && (
                    <div><span className="text-muted-foreground">Envoyée le:</span><p className="font-medium">{new Date(order.deliverySentAt).toLocaleDateString('fr-FR')}</p></div>
                  )}
                </div>
              </div>
            )}

            {order.remarque && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">Remarque client</p>
                <p className="text-sm">{order.remarque}</p>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canConfirm && (isConfirmateur || isAdmin) && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('confirmee')} disabled={actionLoading}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Confirmer
                </Button>
              )}
              {canRefuse && (isConfirmateur || isAdmin) && (
                <Button size="sm" variant="destructive" onClick={() => updateStatus('refusee')} disabled={actionLoading}>
                  <XCircle className="h-4 w-4 mr-1" /> Refuser
                </Button>
              )}
              {order && ['nouvelle', 'assignee', 'en_cours'].includes(order.statut) && (isConfirmateur || isAdmin) && (
                <Button size="sm" variant="outline" onClick={() => updateStatus('injoignable')} disabled={actionLoading}>
                  <Phone className="h-4 w-4 mr-1" /> Injoignable
                </Button>
              )}
              {canRappel && (isConfirmateur || isAdmin) && (
                <Button size="sm" variant="outline" onClick={() => updateStatus('rappel')} disabled={actionLoading}>
                  <Bell className="h-4 w-4 mr-1" /> Rappeler
                </Button>
              )}
              {canCancel && isAdmin && (
                <Button size="sm" variant="outline" onClick={() => updateStatus('annulee')} disabled={actionLoading}>
                  <Ban className="h-4 w-4 mr-1" /> Annuler
                </Button>
              )}
              {canSendEcotrack && isAdmin && (
                <Button size="sm" variant="outline" onClick={sendToEcotrack} disabled={actionLoading}>
                  <Truck className="h-4 w-4 mr-1" /> Envoyer Ecotrack
                </Button>
              )}
            </div>

            {/* Assign confirmateur */}
            {isAdmin && order && ['nouvelle', 'assignee'].includes(order.statut) && confirmateurs.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-sm">Assigner un confirmateur</Label>
                  <Select value={selectedConf} onValueChange={setSelectedConf}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {confirmateurs.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={assignOrder} disabled={!selectedConf || actionLoading}>Assigner</Button>
              </div>
            )}

            {/* Add reminder */}
            {(isConfirmateur || isAdmin) && order && ['injoignable', 'rappel', 'en_cours'].includes(order.statut) && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-sm">Programmer un rappel</Label>
                  <Input type="datetime-local" value={rappelDate} onChange={(e) => setRappelDate(e.target.value)} />
                </div>
                <Button size="sm" onClick={addReminder} disabled={!rappelDate}>Ajouter</Button>
              </div>
            )}

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes internes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ajouter des notes..." />
              <Button size="sm" variant="outline" onClick={saveNotes}>Sauvegarder</Button>
            </div>

            <Separator />

            {/* Logs timeline */}
            {order.orderLogs.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Historique</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {order.orderLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-sm">
                      <div className="mt-1 h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                      <div>
                        <span className="font-medium">{log.action}</span>
                        {log.details && <span className="text-muted-foreground"> - {log.details}</span>}
                        {log.user && <span className="text-muted-foreground"> par {log.user.name}</span>}
                        <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders */}
            {order.reminders.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" /> Rappels</p>
                <div className="space-y-2">
                  {order.reminders.map(r => (
                    <div key={r.id} className={`p-2 rounded text-sm ${r.completed ? 'bg-green-50 line-through' : 'bg-amber-50'}`}>
                      <div className="flex justify-between">
                        <span>{new Date(r.dateRappel).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs text-muted-foreground">{r.user.name}</span>
                      </div>
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
