import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning old data...');
  await prisma.attendance.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.departmentMember.deleteMany();
  await prisma.department.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aILog.deleteMany();
  await prisma.event.deleteMany();
  await prisma.clubMember.deleteMany();
  await prisma.club.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Admin account
  const admin = await prisma.user.create({
    data: {
      studentId: 'ADMIN001',
      name: 'Admin HUTECH',
      email: 'admin@hutech.edu.vn',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  // Leader 1
  const leader1 = await prisma.user.create({
    data: {
      studentId: '2280600001',
      name: 'Nguyễn Văn Tuấn',
      email: 'tuan.nv@hutech.edu.vn',
      password: hashedPassword,
      role: 'LEADER'
    }
  });

  // Leader 2
  const leader2 = await prisma.user.create({
    data: {
      studentId: '2280600002',
      name: 'Trần Thị Mai',
      email: 'mai.tt@hutech.edu.vn',
      password: hashedPassword,
      role: 'LEADER'
    }
  });

  // Regular students
  const student1 = await prisma.user.create({
    data: {
      studentId: '2280600010',
      name: 'Lê Hoàng Nam',
      email: 'nam.lh@hutech.edu.vn',
      password: hashedPassword,
      role: 'STUDENT'
    }
  });

  const student2 = await prisma.user.create({
    data: {
      studentId: '2280600011',
      name: 'Phạm Minh Anh',
      email: 'anh.pm@hutech.edu.vn',
      password: hashedPassword,
      role: 'STUDENT'
    }
  });

  console.log('🏢 Creating clubs...');
  const club1 = await prisma.club.create({
    data: {
      name: 'CLB Công Nghệ Thông Tin (HIT)',
      description: 'Nơi hội tụ các tài năng lập trình, AI, bảo mật và công nghệ tại HUTECH. Tổ chức workshop, hackathon và các cuộc thi lập trình.',
      category: 'Xã Hội',
      founderId: leader1.id,
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format'
    }
  });

  const club2 = await prisma.club.create({
    data: {
      name: 'CLB Nghệ Thuật (H-Art)',
      description: 'Phát triển đam mê âm nhạc, hội họa, nhiếp ảnh và biểu diễn. Tổ chức triển lãm, đêm nhạc và các hoạt động nghệ thuật.',
      category: 'Nghệ Thuật',
      founderId: leader2.id,
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format'
    }
  });

  const club3 = await prisma.club.create({
    data: {
      name: 'CLB Bóng Rổ HUTECH (HBS)',
      description: 'Sân chơi thể thao chuyên nghiệp dành cho sinh viên đam mê bóng rổ. Huấn luyện, thi đấu giải sinh viên toàn quốc.',
      category: 'Thể Thao',
      founderId: leader1.id,
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&auto=format'
    }
  });

  const club4 = await prisma.club.create({
    data: {
      name: 'CLB Guitar Acoustic',
      description: 'Kết nối những người yêu âm nhạc, giao lưu guitar và tổ chức đêm nhạc acoustic hàng tháng.',
      category: 'Nghệ Thuật',
      founderId: leader2.id,
      status: 'APPROVED',
      logoUrl: 'https://images.unsplash.com/photo-1510915363646-a621064998cc?w=500&auto=format'
    }
  });

  console.log('👥 Adding club members...');
  // Leader 1 is leader of club1, club3
  await prisma.clubMember.createMany({
    data: [
      { clubId: club1.id, userId: leader1.id, role: 'LEADER', status: 'APPROVED' },
      { clubId: club3.id, userId: leader1.id, role: 'LEADER', status: 'APPROVED' },
      // Leader 2 is leader of club2, club4
      { clubId: club2.id, userId: leader2.id, role: 'LEADER', status: 'APPROVED' },
      { clubId: club4.id, userId: leader2.id, role: 'LEADER', status: 'APPROVED' },
      // Student1 is approved member of club1
      { clubId: club1.id, userId: student1.id, role: 'MEMBER', status: 'APPROVED' },
      // Student2 is approved member of club2
      { clubId: club2.id, userId: student2.id, role: 'MEMBER', status: 'APPROVED' },
    ]
  });

  console.log('📅 Creating events...');
  await prisma.event.createMany({
    data: [
      {
        clubId: club1.id,
        title: 'Workshop: AI & Machine Learning 2026',
        description: 'Tìm hiểu về trí tuệ nhân tạo và ứng dụng thực tế trong cuộc sống.',
        location: 'Hội trường E3, Tầng 5',
        eventDate: new Date('2026-05-15T14:00:00'),
        status: 'APPROVED'
      },
      {
        clubId: club2.id,
        title: 'Đêm nhạc Acoustic "Thanh Xuân"',
        description: 'Đêm nhạc acoustic ấm áp dành cho sinh viên HUTECH.',
        location: 'Coffee Garden HUTECH',
        eventDate: new Date('2026-05-20T19:00:00'),
        status: 'APPROVED'
      },
      {
        clubId: club3.id,
        title: 'Giải Bóng Rổ Sinh Viên Mở Rộng 2026',
        description: 'Giải đấu bóng rổ quy mô lớn nhất năm dành cho sinh viên.',
        location: 'Sân bóng rổ Campus E',
        eventDate: new Date('2026-05-10T08:00:00'),
        status: 'APPROVED'
      },
      {
        clubId: club1.id,
        title: 'Hackathon: Build for Good',
        description: 'Cuộc thi lập trình 24 giờ, xây dựng giải pháp công nghệ vì cộng đồng.',
        location: 'Phòng Lab CNTT',
        eventDate: new Date('2026-06-01T08:00:00'),
        status: 'PENDING'
      }
    ]
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('=== TÀI KHOẢN TEST ===');
  console.log('Tất cả mật khẩu: 123456');
  console.log('');
  console.log('👑 Admin:');
  console.log('   Email: admin@hutech.edu.vn');
  console.log('');
  console.log('🎯 Chủ nhiệm CLB 1 (CLB IT + CLB Bóng Rổ):');
  console.log('   Email: tuan.nv@hutech.edu.vn');
  console.log('');
  console.log('🎯 Chủ nhiệm CLB 2 (CLB Nghệ Thuật + CLB Guitar):');
  console.log('   Email: mai.tt@hutech.edu.vn');
  console.log('');
  console.log('📚 Sinh viên 1 (đã tham gia CLB IT):');
  console.log('   Email: nam.lh@hutech.edu.vn');
  console.log('');
  console.log('📚 Sinh viên 2 (đã tham gia CLB Nghệ Thuật):');
  console.log('   Email: anh.pm@hutech.edu.vn');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
