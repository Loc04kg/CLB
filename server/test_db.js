const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to Database successfully!');
    const users = await prisma.user.findMany();
    console.log('Users in database:', users);
  } catch(e) {
    console.error('Error connecting to the database:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
