/*
  Warnings:

  - You are about to drop the `_EventUsers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_EventUsers" DROP CONSTRAINT "_EventUsers_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventUsers" DROP CONSTRAINT "_EventUsers_B_fkey";

-- DropTable
DROP TABLE "_EventUsers";
