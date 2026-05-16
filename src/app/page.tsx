'use client'

import { useState, useEffect } from 'react'
import { AppLogin } from '@/components/app-login'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardAdmin } from '@/components/dashboard-admin'
import { DashboardShop } from '@/components/dashboard-shop'
import { DashboardConfirmateur } from '@/components/dashboard-confirmateur'
import { DashboardStock } from '@/components/dashboard-stock'
import { OrdersList } from '@/components/orders-list'
import { OrderDetail } from '@/components/order-detail'
import { ShopsList } from '@/components/shops-list'
import { ProductsList } from '@/components/products-list'
import { StockManagement } from '@/components/stock-management'
import { Fulfillment } from '@/components/fulfillment'
import { Confirmateurs } from '@/components/confirmateurs'
import { InvoicesList } from '@/components/invoices-list'
import { UsersList } from '@/components/users-list'
import { WebhooksList } from '@/components/webhooks-list'
import { RemindersList } from '@/components/reminders-list'
import { ShopConfig } from '@/components/shop-config'

interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  shopId?: string | null
  shop?: { id: string; name: string; modeService: string } | null
}

interface AuthState {
  token: string | null
  user: User | null
  initializing: boolean
}

export default function Home() {
  const [auth, setAuth] = useState<AuthState>({ token: null, user: null, initializing: true })
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Check localStorage for existing token and verify
  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('fret_confirm_token') : null
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('fret_confirm_user') : null

    const verifyAuth = async (): Promise<{ token: string | null; user: User | null }> => {
      if (!storedToken || !storedUser) {
        return { token: null, user: null }
      }

      try {
        const parsedUser = JSON.parse(storedUser) as User
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        if (res.ok) {
          return { token: storedToken, user: parsedUser }
        }
      } catch {
        // ignore
      }

      localStorage.removeItem('fret_confirm_token')
      localStorage.removeItem('fret_confirm_user')
      return { token: null, user: null }
    }

    verifyAuth().then(({ token: verifiedToken, user: verifiedUser }) => {
      setAuth({ token: verifiedToken, user: verifiedUser, initializing: false })
    })
  }, [])

  const handleLogin = (newToken: string, newUser: Record<string, unknown>) => {
    const typedUser = newUser as unknown as User
    setAuth({ token: newToken, user: typedUser, initializing: false })
    localStorage.setItem('fret_confirm_token', newToken)
    localStorage.setItem('fret_confirm_user', JSON.stringify(typedUser))
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    setAuth({ token: null, user: null, initializing: false })
    setCurrentPage('dashboard')
    localStorage.removeItem('fret_confirm_token')
    localStorage.removeItem('fret_confirm_user')
  }

  const { token, user, initializing } = auth

  // Show loading while checking auth
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 animate-pulse">
            <div className="h-6 w-6 rounded bg-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!token || !user) {
    return <AppLogin onLogin={handleLogin} />
  }

  // Determine which dashboard to show
  const getDashboardComponent = () => {
    if (user.role === 'super_admin' || user.role === 'manager') {
      return <DashboardAdmin token={token} />
    }
    if (user.role === 'boutique') {
      return <DashboardShop token={token} />
    }
    if (user.role === 'confirmateur') {
      return <DashboardConfirmateur token={token} />
    }
    if (user.role === 'operateur_stock') {
      return <DashboardStock token={token} />
    }
    return <DashboardAdmin token={token} />
  }

  // Render the current page content
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return getDashboardComponent()
      case 'orders':
        return (
          <OrdersList
            token={token}
            userRole={user.role}
            onSelectOrder={(id) => setSelectedOrderId(id)}
          />
        )
      case 'shops':
        return <ShopsList token={token} />
      case 'products':
        return <ProductsList token={token} userRole={user.role} userShopId={user.shopId} />
      case 'stock':
        return <StockManagement token={token} />
      case 'fulfillment':
        return <Fulfillment token={token} />
      case 'confirmateurs':
        return <Confirmateurs token={token} />
      case 'invoices':
        return <InvoicesList token={token} userRole={user.role} userShopId={user.shopId} />
      case 'users':
        return <UsersList token={token} />
      case 'webhooks':
        return <WebhooksList token={token} userRole={user.role} />
      case 'reminders':
        return <RemindersList token={token} />
      case 'config':
        return <ShopConfig token={token} />
      default:
        return getDashboardComponent()
    }
  }

  // Page title mapping
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: 'Tableau de bord',
      orders: user.role === 'confirmateur' ? 'Mes commandes' : 'Commandes',
      shops: 'Boutiques',
      products: 'Produits',
      stock: 'Stock',
      fulfillment: 'Préparation',
      confirmateurs: 'Confirmateurs',
      invoices: 'Facturation',
      users: 'Utilisateurs',
      webhooks: 'Webhooks',
      reminders: 'Rappels',
      config: 'Configuration',
    }
    return titles[currentPage] || 'Tableau de bord'
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        user={user}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile hamburger */}
          <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>

      {/* Order detail dialog */}
      {selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          token={token}
          userRole={user.role}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  )
}
