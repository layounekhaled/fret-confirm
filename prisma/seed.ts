import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding...')

  // Nettoyer la base
  await prisma.ecotrackLog.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.orderLog.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.order.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.webhook.deleteMany()
  await prisma.product.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.shop.deleteMany()

  console.log('🧹 Base nettoyée')

  // ==========================================
  // UTILISATEURS
  // ==========================================
  const hashPassword = (pw: string) => hashSync(pw, 12)

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@fret.confirm',
      name: 'Super Admin',
      password: hashPassword('Admin@123'),
      role: 'super_admin',
      phone: '0550000001',
      isActive: true,
    },
  })
  console.log('✅ Super admin créé')

  const manager = await prisma.user.create({
    data: {
      email: 'manager@fret.confirm',
      name: 'Chef Manager',
      password: hashPassword('Manager@123'),
      role: 'manager',
      phone: '0550000002',
      isActive: true,
    },
  })
  console.log('✅ Manager créé')

  const confirmateurs = []
  for (let i = 1; i <= 3; i++) {
    const conf = await prisma.user.create({
      data: {
        email: `conf${i}@fret.confirm`,
        name: `Confirmateur ${i}`,
        password: hashPassword('Conf@123'),
        role: 'confirmateur',
        phone: `055000001${i}`,
        isActive: true,
      },
    })
    confirmateurs.push(conf)
  }
  console.log('✅ 3 confirmateurs créés')

  const operateurs = []
  for (let i = 1; i <= 2; i++) {
    const op = await prisma.user.create({
      data: {
        email: `stock${i}@fret.confirm`,
        name: `Opérateur Stock ${i}`,
        password: hashPassword('Stock@123'),
        role: 'operateur_stock',
        phone: `055000002${i}`,
        isActive: true,
      },
    })
    operateurs.push(op)
  }
  console.log('✅ 2 opérateurs stock créés')

  // ==========================================
  // BOUTIQUES
  // ==========================================
  const shopTechDZ = await prisma.shop.create({
    data: {
      name: 'Boutique TechDZ',
      responsible: 'Karim Benali',
      phone: '0550123456',
      email: 'contact@techdz.com',
      address: 'Rue Didouche Mourad, Alger',
      isActive: true,
      apiKey: `fret_${uuidv4().replace(/-/g, '')}`,
      ecotrackToken: 'test_token_techdz',
      ecotrackUrl: 'https://ecotrack.example.com/api/orders',
      modeService: 'full_service',
      prixConfirmation: 150,
      prixStockage: 50,
      prixEmballage: 75,
    },
  })

  const shopModeAlgerie = await prisma.shop.create({
    data: {
      name: 'ModeAlgerie',
      responsible: 'Amina Khelifi',
      phone: '0660123456',
      email: 'contact@modealgerie.com',
      address: 'Boulevard Mohamed V, Oran',
      isActive: true,
      apiKey: `fret_${uuidv4().replace(/-/g, '')}`,
      ecotrackToken: 'test_token_modealgerie',
      ecotrackUrl: 'https://ecotrack.example.com/api/orders',
      modeService: 'confirmation_only',
      prixConfirmation: 200,
      prixStockage: 0,
      prixEmballage: 0,
    },
  })

  const shopDZMarket = await prisma.shop.create({
    data: {
      name: 'DZMarket',
      responsible: 'Yacine Boudiaf',
      phone: '0770123456',
      email: 'contact@dzmarket.com',
      address: 'Zone industrielle, Blida',
      isActive: true,
      apiKey: `fret_${uuidv4().replace(/-/g, '')}`,
      ecotrackToken: 'test_token_dzmarket',
      ecotrackUrl: 'https://ecotrack.example.com/api/orders',
      modeService: 'fulfillment_only',
      prixConfirmation: 0,
      prixStockage: 100,
      prixEmballage: 125,
    },
  })
  console.log('✅ 3 boutiques créées')

  // Créer les utilisateurs boutique
  await prisma.user.create({
    data: {
      email: 'boutique@techdz.com',
      name: 'Karim Benali (TechDZ)',
      password: hashPassword('Boutique@123'),
      role: 'boutique',
      phone: '0550123456',
      shopId: shopTechDZ.id,
      isActive: true,
    },
  })

  await prisma.user.create({
    data: {
      email: 'boutique@modealgerie.com',
      name: 'Amina Khelifi (ModeAlgerie)',
      password: hashPassword('Boutique@123'),
      role: 'boutique',
      phone: '0660123456',
      shopId: shopModeAlgerie.id,
      isActive: true,
    },
  })

  await prisma.user.create({
    data: {
      email: 'boutique@dzmarket.com',
      name: 'Yacine Boudiaf (DZMarket)',
      password: hashPassword('Boutique@123'),
      role: 'boutique',
      phone: '0770123456',
      shopId: shopDZMarket.id,
      isActive: true,
    },
  })
  console.log('✅ 3 utilisateurs boutique créés')

  // Créer les clés API
  for (const shop of [shopTechDZ, shopModeAlgerie, shopDZMarket]) {
    await prisma.apiKey.create({
      data: {
        shopId: shop.id,
        key: shop.apiKey,
        name: 'Clé principale',
      },
    })
  }
  console.log('✅ Clés API créées')

  // ==========================================
  // PRODUITS
  // ==========================================
  const wilayas = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif', 'Tlemcen', 'Béjaïa']

  // Produits TechDZ
  const techProducts = []
  const techProductNames = [
    { name: 'Écouteurs Bluetooth Pro', sku: 'TECH-EBP-001', price: 3500, stock: 50 },
    { name: 'Chargeur Rapide USB-C', sku: 'TECH-CRU-002', price: 1500, stock: 100 },
    { name: 'Coque iPhone 15', sku: 'TECH-CI15-003', price: 1200, stock: 75 },
    { name: 'Support Voiture Magnétique', sku: 'TECH-SVM-004', price: 2800, stock: 30 },
    { name: 'Câble HDMI 2m', sku: 'TECH-CH2-005', price: 800, stock: 200 },
  ]

  for (const p of techProductNames) {
    const product = await prisma.product.create({
      data: {
        shopId: shopTechDZ.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stockTotal: p.stock,
        stockDispo: p.stock,
        stockReserve: 0,
        stockExpedie: 0,
        weight: 0.3,
        fragile: p.name.includes('Écouteurs'),
      },
    })
    techProducts.push(product)
  }
  console.log('✅ 5 produits TechDZ créés')

  // Produits ModeAlgerie
  const modeProducts = []
  const modeProductNames = [
    { name: 'Hijab Premium Cachemire', sku: 'MODE-HPC-001', price: 2500, stock: 60 },
    { name: 'Abaya Élégante Noire', sku: 'MODE-AEN-002', price: 6500, stock: 25 },
    { name: 'Ensemble Femme Moderne', sku: 'MODE-EFM-003', price: 8500, stock: 15 },
    { name: 'Écharpe Soie Naturelle', sku: 'MODE-ESN-004', price: 3200, stock: 40 },
    { name: 'Jebba Traditionnelle', sku: 'MODE-JTR-005', price: 12000, stock: 10 },
  ]

  for (const p of modeProductNames) {
    const product = await prisma.product.create({
      data: {
        shopId: shopModeAlgerie.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stockTotal: p.stock,
        stockDispo: p.stock,
        stockReserve: 0,
        stockExpedie: 0,
        weight: 0.5,
      },
    })
    modeProducts.push(product)
  }
  console.log('✅ 5 produits ModeAlgerie créés')

  // Produits DZMarket
  const dzProducts = []
  const dzProductNames = [
    { name: 'Café Moulu Traditionnel', sku: 'DZM-CMT-001', price: 600, stock: 150 },
    { name: 'Huile d\'Olive Extra Vierge', sku: 'DZM-HOE-002', price: 1800, stock: 80 },
    { name: 'Dattes Deglet Nour Premium', sku: 'DZM-DDP-003', price: 2200, stock: 60 },
    { name: 'Miel de Montagne Kabyle', sku: 'DZM-MMK-004', price: 3500, stock: 35 },
    { name: 'Epices Mélangées Fines', sku: 'DZM-EMF-005', price: 450, stock: 120 },
  ]

  for (const p of dzProductNames) {
    const product = await prisma.product.create({
      data: {
        shopId: shopDZMarket.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stockTotal: p.stock,
        stockDispo: p.stock,
        stockReserve: 0,
        stockExpedie: 0,
        weight: 1.0,
        fragile: p.name.includes('Huile'),
      },
    })
    dzProducts.push(product)
  }
  console.log('✅ 5 produits DZMarket créés')

  // ==========================================
  // COMMANDES
  // ==========================================
  const statuses = [
    'nouvelle', 'assignee', 'en_cours', 'confirmee', 'refusee',
    'injoignable', 'rappel', 'doublon_suspect', 'envoyee_ecotrack',
    'erreur_ecotrack', 'rupture_stock', 'en_preparation',
  ]

  const firstNames = ['Mohamed', 'Ahmed', 'Fatima', 'Amina', 'Yacine', 'Sara', 'Karim', 'Nadia', 'Ali', 'Leila', 'Omar', 'Dalia', 'Rami', 'Hana', 'Sofiane']
  const lastNames = ['Benmoussa', 'Khelifi', 'Boudiaf', 'Hamidi', 'Mebarki', 'Ziani', 'Benali', 'Taleb', 'Cherif', 'Mansouri', 'Bouzid', 'Haddad', 'Saidi', 'Ait Ahmed', 'Belkacem']
  const communes: Record<string, string[]> = {
    'Alger': ['Bab El Oued', 'Hussein Dey', 'Bir Mourad Raïs', 'El Biar'],
    'Oran': ['Bir El Djir', 'Es Senia', 'Aïn El Turk', 'Arzew'],
    'Constantine': ['El Khroub', 'Aïn Smara', 'Hamma Bouziane'],
    'Annaba': ['El Bouni', 'Seraidi', 'El Hadjar'],
    'Blida': ['Boufarik', 'Bougara', 'Mouzaia'],
    'Sétif': ['Aïn Arnat', 'El Eulma', 'Aïn Oulmene'],
    'Tlemcen': ['Maghnia', 'Ghazaouet', 'Remchi'],
    'Béjaïa': ['Aokas', 'Sidi Aich', 'Amizour'],
  }

  const shops = [
    { shop: shopTechDZ, products: techProducts },
    { shop: shopModeAlgerie, products: modeProducts },
    { shop: shopDZMarket, products: dzProducts },
  ]

  let orderCount = 0

  for (const { shop, products } of shops) {
    // Créer des commandes dans différents statuts
    for (let i = 0; i < 15; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const wilaya = wilayas[Math.floor(Math.random() * wilayas.length)]
      const communeList = communes[wilaya] || ['Centre-ville']
      const commune = communeList[Math.floor(Math.random() * communeList.length)]
      const product = products[Math.floor(Math.random() * products.length)]
      const quantite = Math.floor(Math.random() * 3) + 1
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      const phone1 = `0${Math.floor(Math.random() * 3 + 5)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
      const phone2 = Math.random() > 0.5 ? `0${Math.floor(Math.random() * 3 + 5)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}` : null

      const assignTo = ['assignee', 'en_cours', 'confirmee', 'rappel', 'injoignable'].includes(status)
        ? confirmateurs[Math.floor(Math.random() * confirmateurs.length)].id
        : null

      const confirmedAt = status === 'confirmee' || status === 'envoyee_ecotrack'
        ? new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
        : null

      const order = await prisma.order.create({
        data: {
          shopId: shop.id,
          reference: `CMD-${shop.name.substring(0, 3).toUpperCase()}-${String(1000 + i).padStart(4, '0')}`,
          nomClient: `${firstName} ${lastName}`,
          telephone: phone1,
          telephone2: phone2,
          adresse: `${Math.floor(Math.random() * 50) + 1} Rue ${lastName}`,
          wilaya,
          commune,
          produit: product.name,
          quantite,
          montant: product.price * quantite,
          typeLivraison: Math.random() > 0.3 ? 'domicile' : 'stop_desk',
          remarque: i % 5 === 0 ? 'Livraison rapide SVP' : null,
          statut: status,
          assignedTo: assignTo,
          confirmedAt,
          isRecurrent: i % 4 === 0,
          ecotrackTracking: status === 'envoyee_ecotrack' ? `ET${String(Math.floor(Math.random() * 900000) + 100000)}` : null,
          sentToEcotrackAt: status === 'envoyee_ecotrack' ? new Date() : null,
        },
      })

      orderCount++

      // Créer le log de création
      await prisma.orderLog.create({
        data: {
          orderId: order.id,
          action: 'creation',
          details: `Commande créée - Statut: ${status}`,
        },
      })

      // Créer l'assignation si applicable
      if (assignTo) {
        await prisma.assignment.create({
          data: {
            orderId: order.id,
            userId: assignTo,
            type: Math.random() > 0.5 ? 'automatique' : 'manuel',
            assignedBy: Math.random() > 0.5 ? manager.id : null,
          },
        })
      }

      // Créer un rappel pour certaines commandes
      if (status === 'rappel') {
        await prisma.reminder.create({
          data: {
            orderId: order.id,
            userId: assignTo || confirmateurs[0].id,
            dateRappel: new Date(Date.now() + Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)),
            notes: 'Client à rappeler',
          },
        })
      }
    }
  }
  console.log(`✅ ${orderCount} commandes créées`)

  // ==========================================
  // MOUVEMENTS DE STOCK
  // ==========================================
  const allProducts = [...techProducts, ...modeProducts, ...dzProducts]
  const movementTypes = ['entree', 'sortie', 'reservation', 'expedition']

  for (const product of allProducts) {
    // Entrée initiale déjà créée par le stock initial

    // Quelques mouvements supplémentaires
    for (let i = 0; i < 3; i++) {
      const type = movementTypes[Math.floor(Math.random() * movementTypes.length)]
      const quantite = Math.floor(Math.random() * 10) + 1

      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type,
          quantite,
          reference: type === 'entree' ? 'Réassort' : type === 'reservation' ? `CMD-${String(Math.floor(Math.random() * 9000) + 1000)}` : 'Expédition',
          notes: i === 0 ? 'Mouvement de test' : null,
        },
      })
    }
  }
  console.log('✅ Mouvements de stock créés')

  // ==========================================
  // FACTURES
  // ==========================================
  const now = new Date()
  const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const moisPrecedent = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`

  for (const shop of [shopTechDZ, shopModeAlgerie, shopDZMarket]) {
    // Facture du mois précédent
    await prisma.invoice.create({
      data: {
        shopId: shop.id,
        mois: moisPrecedent,
        nbConfirmees: Math.floor(Math.random() * 20) + 5,
        montantConfirm: Math.floor(Math.random() * 50000) + 10000,
        montantStockage: Math.floor(Math.random() * 10000),
        montantEmballage: Math.floor(Math.random() * 15000),
        montantTotal: 0, // sera calculé
        statut: Math.random() > 0.5 ? 'payee' : 'en_attente',
      },
    })

    // Facture du mois courant
    await prisma.invoice.create({
      data: {
        shopId: shop.id,
        mois: moisCourant,
        nbConfirmees: Math.floor(Math.random() * 10) + 1,
        montantConfirm: Math.floor(Math.random() * 20000) + 5000,
        montantStockage: Math.floor(Math.random() * 5000),
        montantEmballage: Math.floor(Math.random() * 8000),
        montantTotal: 0,
        statut: 'en_attente',
      },
    })
  }

  // Mettre à jour les totaux des factures
  const invoices = await prisma.invoice.findMany()
  for (const invoice of invoices) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        montantTotal: invoice.montantConfirm + invoice.montantStockage + invoice.montantEmballage,
      },
    })
  }
  console.log('✅ Factures créées')

  // ==========================================
  // WEBHOOKS
  // ==========================================
  for (const shop of [shopTechDZ, shopModeAlgerie, shopDZMarket]) {
    await prisma.webhook.create({
      data: {
        shopId: shop.id,
        event: 'confirmee',
        url: `https://example.com/webhooks/${shop.id}/confirmed`,
      },
    })

    await prisma.webhook.create({
      data: {
        shopId: shop.id,
        event: 'envoyee_ecotrack',
        url: `https://example.com/webhooks/${shop.id}/shipped`,
      },
    })
  }
  console.log('✅ Webhooks créés')

  console.log(`
🎉 Seeding terminé avec succès!

📋 Comptes créés:
  👑 Super Admin:    admin@fret.confirm / Admin@123
  📋 Manager:        manager@fret.confirm / Manager@123
  🎧 Confirmateurs:  conf1@fret.confirm, conf2@fret.confirm, conf3@fret.confirm / Conf@123
  📦 Opérateurs:     stock1@fret.confirm, stock2@fret.confirm / Stock@123
  🏪 Boutiques:      boutique@techdz.com, boutique@modealgerie.com, boutique@dzmarket.com / Boutique@123
  `)
}

main()
  .catch((e) => {
    console.error('❌ Erreur de seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
