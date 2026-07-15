const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Assuming they use bcryptjs based on the hash

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const user = await prisma.user.findUnique({where: {email: 'tuan@gmail.com'}});
  if (user) {
    console.log('User found:', user.email);
    console.log('Hash:', user.password);
    const isMatch = await bcrypt.compare('123456', user.password);
    console.log('Does 123456 match?', isMatch);
  } else {
    console.log('User not found');
  }
  await prisma.$disconnect();
}
main();
