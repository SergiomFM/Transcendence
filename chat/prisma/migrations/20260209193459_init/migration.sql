/*
  Warnings:

  - You are about to drop the column `receiverUsename` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `senderUsename` on the `Message` table. All the data in the column will be lost.
  - Added the required column `receiverUsername` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderUsername` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "senderUsername" TEXT NOT NULL,
    "receiverUsername" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_senderUsername_fkey" FOREIGN KEY ("senderUsername") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_receiverUsername_fkey" FOREIGN KEY ("receiverUsername") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "updatedAt") SELECT "content", "createdAt", "id", "updatedAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
