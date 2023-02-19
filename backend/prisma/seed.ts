import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const userData: Prisma.ProfileCreateInput[] = [
  {
    username: 'Hulk Green',
    authorEmail: 'hulk@marvel.com',
    posts: {
      create: [
        {
          title: 'Where does it come from?',
          content: 'ype specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was p',
          published: true,
        },
        {
          title: 'Why do we use it?',
          content: 'ey College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undo',
          published: true,
        },
      ],
    },
  },
  {
    username: 'Matthew Laing',
    authorEmail: 'matthewlaing@gmail.com',
    website: 'matthewlaing.io',
    company: 'Matthew&Co',
    posts: {
      create: [
        {
          title: 'Join the Prisma Slack',
          content: 'https://slack.prisma.io',
          published: true,
        },
      ],
    },
  },
  {
    username: 'Ken Jimmy',
    authorEmail: 'ken@jimmy.io',
    posts: {
      create: [
        {
          title: 'Words which dont look',
          content: ' undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on ',
          published: true,
        },
        {
          title: 'Why do we use it?',
          content: 'ey College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undo',
          published: true,
        },
      ],
    },
  },
  {
    username: 'Randy Smith',
    authorEmail: 'randysmith@gmail.com',
    website: 'radnysmith.io',
    company: 'Randy&Co',
    posts: {
      create: [
        {
          title: 'Ask a question about Prisma on GitHub',
          content: 'https://www.github.com/prisma/prisma/discussions',
          published: true,
          viewCount: 128,
        },
      ],
    },
  },
]

async function main() {
  console.log(`Start seeding ...`)
  for (const u of userData) {
    const user = await prisma.profile.create({
      data: u,
    })
    console.log(`Created user with id: ${user.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })