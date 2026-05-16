'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Key, Truck, Settings, Copy, RefreshCw, Save, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface ShopConfig {
  id: string
  name: string
  apiKey: string
  modeService: string
  ecotrackToken: string | null
  ecotrackUrl: string | null
  webhookUrl: string | null
  prixConfirmation: number
  prixStockage: number
  prixEmballage: number
}

const modeLabels: Record<string, string> = {
  confirmation_only: 'Confirmation uniquement',
  fulfillment_only: 'Préparation uniquement',
  full_service: 'Service complet',
}

export function ShopConfig({ token }: { token: string }) {
  const [shop, setShop] = useState<ShopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [ecotrackToken, setEcotrackToken] = useState('')
  const [ecotrackUrl, setEcotrackUrl] = useState('')

  useEffect(() => {
    fetch('/api/dashboard/shop', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setShop(d.shop)
        setEcotrackToken(d.shop?.ecotrackToken || '')
        setEcotrackUrl(d.shop?.ecotrackUrl || '')
      })
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié dans le presse-papiers')
  }

  const regenerateKey = async () => {
    if (!shop) return
    try {
      const res = await fetch(`/api/shops/${shop.id}/regenerate-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setShop({ ...shop, apiKey: d.shop?.apiKey || d.apiKey || '' })
        toast.success('Clé API régénérée')
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const saveEcotrack = async () => {
    if (!shop) return
    try {
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ecotrackToken, ecotrackUrl }),
      })
      if (res.ok) {
        toast.success('Configuration Ecotrack sauvegardée')
        setShop({ ...shop, ecotrackToken, ecotrackUrl })
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  if (loading) return <div className="space-y-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>

  if (!shop) return <p className="text-center text-muted-foreground py-12">Erreur de chargement</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration</h2>
        <p className="text-muted-foreground">{shop.name}</p>
      </div>

      {/* Shop info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Informations boutique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Nom:</span><p className="font-medium">{shop.name}</p></div>
            <div><span className="text-muted-foreground">Mode service:</span>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-2">
                {modeLabels[shop.modeService] || shop.modeService}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Clé API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-mono truncate">
              {shop.apiKey}
            </code>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(shop.apiKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={regenerateKey} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" /> Régénérer la clé API
          </Button>
          <p className="text-xs text-muted-foreground">
            Utilisez cette clé dans l&apos;en-tête <code className="bg-slate-100 px-1 rounded">x-api-key</code> pour vos requêtes API.
          </p>
        </CardContent>
      </Card>

      {/* Ecotrack config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" /> Configuration Ecotrack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Token Ecotrack</Label>
            <Input
              value={ecotrackToken}
              onChange={e => setEcotrackToken(e.target.value)}
              placeholder="Votre token Ecotrack"
              className="mt-1"
            />
          </div>
          <div>
            <Label>URL Ecotrack</Label>
            <Input
              value={ecotrackUrl}
              onChange={e => setEcotrackUrl(e.target.value)}
              placeholder="https://api.ecotrack.dz/..."
              className="mt-1"
            />
          </div>
          <Button onClick={saveEcotrack} className="w-full">
            <Save className="h-4 w-4 mr-2" /> Sauvegarder
          </Button>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm p-2 rounded bg-slate-50">
              <span className="text-muted-foreground">Confirmation</span>
              <span className="font-medium">{shop.prixConfirmation} DA</span>
            </div>
            <div className="flex justify-between text-sm p-2 rounded bg-slate-50">
              <span className="text-muted-foreground">Stockage</span>
              <span className="font-medium">{shop.prixStockage} DA</span>
            </div>
            <div className="flex justify-between text-sm p-2 rounded bg-slate-50">
              <span className="text-muted-foreground">Emballage</span>
              <span className="font-medium">{shop.prixEmballage} DA</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> URL Webhook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {shop.webhookUrl || 'Non configuré'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Les notifications de changement de statut seront envoyées à cette URL.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
