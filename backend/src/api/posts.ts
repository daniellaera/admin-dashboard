import express from 'express';
import prisma from '../lib/prisma';
import { auth } from '../middleware/auth';

const router = express.Router();

router.get('/', async (req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    where: {
      published: true,
    },
    include: {
      profile: {
        select: {
          username: true,
          authorEmail: true,
          avatarUrl: true,
        },
      },
      comments: {
        select: {
          profile: true,
          text: true,
        },
      },
      likes: true,
      tags: true,
    },
  });
  res.status(200).json(posts);
});

router.get('/postsByProfileId/:profileId', async (req, res) => {
  const { profileId } = req.params;
  try {
    const posts = await prisma.post.findMany({
      where: {
        profileId: Number(profileId),
      },
    });
    res.json(posts);
  } catch (error) {
    res.json({ error: `Cound not fetch posts with ${profileId} from database` });
  }
});

router.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.findFirst({
      where: {
        id: Number(id),
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            authorEmail: true,
            avatarUrl: true,
          },
        },
        comments: true,
        tags: {
          select: {
            value: true,
            label: true,
          },
        },
      },
    });
    res.json(post);
  } catch (error) {
    res.json({ error: `Post with ID ${id} does not exist in the database` });
  }
});

router.put('/updateById/:postId', async (req, res) => {
  const { postId } = req.params;
  const { title, content, type, published, tags } = req.body;

  // we delete all tags first
  await prisma.$transaction([prisma.tags.deleteMany({ where: { postId: Number(postId) } })]);

  const postUpdated = await prisma.post.update({
    where: { id: Number(postId) },
    data: {
      title: title,
      content: content,
      type: type,
      published: published,
      tags: {
        connectOrCreate: tags.map((value: string, id: number) => ({
          create: value,
          where: { id: id },
        })),
      },
    },
  });

  res.json(postUpdated);
});

router.post('/create', auth, async (req, res) => {
  const { title, content, type, published, profileId, tags } = req.body;
  try {
    const result = await prisma.post.create({
      data: {
        title,
        content,
        type: type,
        published: published,
        profileId: profileId,
        tags: {
          connectOrCreate: tags.map((value: string, id: number) => ({
            create: value,
            where: { id: id },
          })),
        },
      },
    });
    res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: 'Unauthorized' });
  }
});

router.delete('/deleteById/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.delete({
      where: {
        id: Number(id),
      },
    });
    res.json(post);
  } catch (error) {
    res.json({ error: `Post with ID ${id} does not exist in the database` });
  }
});

export default router;