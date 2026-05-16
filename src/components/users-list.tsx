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
import { Plus, Edit, UserX } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
  shopId: string | null
  shop: { id: string; name: string } | null
  lastLoginAt: string | null
  createdAt: string
  _count: { assignedOrders: number; orderLogs: number }
}

interface Shop {
  id: string
  name: string
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  confirmateur: 'bg-emerald-100 text-emerald-700',
  operateur_stock: 'bg-blue-100 text-blue-700',
  boutique: 'bg-amber-100 text-amber-700',
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  confirmateur: 'Confirmateur',
  operateur_stock: 'Opérateur Stock',
  boutique: 'Boutique',
}

export function UsersList({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [shops, setShops] = useState<Shop[]>([])
  const [form, setForm] = useState({
    email: '', name: '', password: '', role: 'confirmateur', phone: '', shopId: '',
  })

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.users && setUsers(d.users))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token, refreshKey])

  useEffect(() => {
    fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.shops && setShops(d.shops.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))))
      .catch(() => {})
  }, [token])

  const createUser = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          shopId: form.role === 'boutique' ? form.shopId : undefined,
        }),
      })
      if (res.ok) {
        toast.success('Utilisateur créé')
        setDialogOpen(false)
        setForm({ email: '', name: '', password: '', role: 'confirmateur', phone: '', shopId: '' })
        setRefreshKey(k => k + 1)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const toggleUser = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        toast.success(isActive ? 'Utilisateur désactivé' : 'Utilisateur activé')
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u))
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
          <h2 className="text-2xl font-bold tracking-tight">Utilisateurs</h2>
          <p className="text-muted-foreground">Gestion des comptes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Nom</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Rôle</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Téléphone</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Statut</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Dernière connexion</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm font-medium">{u.name}</td>
                    <td className="p-3 text-sm hidden md:table-cell">{u.email}</td>
                    <td className="p-3">
                      <Badge className={`${roleColors[u.role] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm hidden lg:table-cell">{u.phone || '-'}</td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge className={u.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleUser(u.id, u.isActive)}>
                        <UserX className="h-4 w-4" />
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
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Mot de passe *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>Rôle *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="confirmateur">Confirmateur</SelectItem>
                  <SelectItem value="operateur_stock">Opérateur Stock</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            {form.role === 'boutique' && (
              <div>
                <Label>Boutique *</Label>
                <Select value={form.shopId} onValueChange={v => setForm({ ...form, shopId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir une boutique" /></SelectTrigger>
                  <SelectContent>
                    {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={createUser}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
