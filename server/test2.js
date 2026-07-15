const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$connect();
  const user = await prisma.user.findUnique({where: {email: 'tuan@gmail.com'}});
  console.log('Found user:', user);
  await prisma.$disconnect();
}
main();
