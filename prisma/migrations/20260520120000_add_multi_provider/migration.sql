-- AlterTable: Add multi-provider delivery fields to shops
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "deliveryProvider" TEXT NOT NULL DEFAULT 'ecotrack';
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "deliveryMode" TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiUrl" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiMethod" TEXT NOT NULL DEFAULT 'POST';
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiHeaders" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiBodyTemplate" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiAuthType" TEXT NOT NULL DEFAULT 'bearer';
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiAuthToken" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "customApiMapping" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "autoSendAfterConfirmation" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add delivery routing fields to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryProvider" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliverySentAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryTracking" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryResponse" TEXT;

-- CreateTable: delivery_logs
CREATE TABLE IF NOT EXISTS "delivery_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_logs_orderId_key" ON "delivery_logs"("id");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'delivery_logs_orderId_fkey'
    ) THEN
        ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'delivery_logs_shopId_fkey'
    ) THEN
        ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
