-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_eventId_fkey";

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
