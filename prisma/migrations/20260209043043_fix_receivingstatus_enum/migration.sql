-- DropForeignKey
ALTER TABLE "receivings" DROP CONSTRAINT "receivings_invoiceId_fkey";

-- AddForeignKey
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "purchase_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
