const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  console.log('Finding user tuan@gmail.com...');
  const user = await prisma.user.findUnique({ where: { email: 'tuan@gmail.com' } });
  
  if (!user) {
    console.error('User tuan@gmail.com not found!');
    return;
  }

  // 1. Create or find a club
  let club = await prisma.club.findFirst();
  if (!club) {
    console.log('No club found. Creating a sample club...');
    club = await prisma.club.create({
      data: {
        name: 'CLB Tiếng Anh (English Club)',
        description: 'Câu lạc bộ dành cho những người yêu thích tiếng Anh',
        status: 'APPROVED',
        founderId: user.id
      }
    });
  } else {
    console.log('Found club:', club.name);
  }

  // Ensure tuan@gmail.com is in the club as LEADER so they can manage it if they want
  const existingMember = await prisma.clubMember.findFirst({
    where: { clubId: club.id, userId: user.id }
  });

  if (!existingMember) {
    await prisma.clubMember.create({
      data: {
        clubId: club.id,
        userId: user.id,
        role: 'LEADER',
        status: 'APPROVED'
      }
    });
    console.log('Added tuan@gmail.com as LEADER to club', club.name);
  } else if (existingMember.role !== 'LEADER') {
    await prisma.clubMember.update({
      where: { id: existingMember.id },
      data: { role: 'LEADER' }
    });
    console.log('Updated tuan@gmail.com to LEADER in club', club.name);
  }

  // 2. Create some events for the club
  console.log('Creating events...');
  
  const event1 = await prisma.event.create({
    data: {
      clubId: club.id,
      title: 'Hội thảo Tiếng Anh Giao Tiếp',
      description: 'Cải thiện kỹ năng nghe nói tiếng Anh với người bản xứ.',
      location: 'Phòng A1-101',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'APPROVED',
      maxCapacity: 100,
      imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad'
    }
  });

  const event2 = await prisma.event.create({
    data: {
      clubId: club.id,
      title: 'Workshop: Kỹ năng thuyết trình',
      description: 'Làm thế nào để thuyết trình tự tin trước đám đông.',
      location: 'Hội trường B',
      eventDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'APPROVED',
      maxCapacity: 50,
      imageUrl: 'https://images.unsplash.com/photo-1540317580384-e5d43867caa6'
    }
  });

  console.log('Events created!');

  // 3. Register tuan@gmail.com to the events
  console.log('Registering tuan@gmail.com to events...');
  
  await prisma.eventRegistration.create({
    data: {
      eventId: event1.id,
      userId: user.id,
      status: 'APPROVED'
    }
  });

  await prisma.eventRegistration.create({
    data: {
      eventId: event2.id,
      userId: user.id,
      status: 'APPROVED'
    }
  });
  
  // Add an attendance record for the past event
  await prisma.attendance.create({
    data: {
      eventId: event2.id,
      userId: user.id,
      method: 'MANUAL',
      checkinTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000), // Check-in 1 hour after start
      isValid: true
    }
  });

  // Also update user's global role to LEADER just in case the system requires it
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'LEADER' }
  });

  console.log('Successfully seeded data for testing!');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
