import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const tony = await prisma.mentorProfile.findFirst({
    where: {
      user: { name: { contains: 'Tony', mode: 'insensitive' } }
    },
    include: {
      serviceOfferings: true
    }
  });

  console.log('Mentor Tony Profile:', JSON.stringify(tony, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
