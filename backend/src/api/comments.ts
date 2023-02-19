import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.post('/create', async (req, res) => {
  const { text, profileId, postId } = req.body;
  try {
    const result = await prisma.comment.create({
      data: {
        text: text,
        profileId: profileId,
        postId: postId,
      },
    });
    res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: 'Unauthorized' });
  }
});

router.get('/commentsByPostId/:postId', async (req, res) => {
  const { postId } = req.params;
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: Number(postId),
      },
      include: {
        profile: true,
      },
    });
    res.json(comments);
  } catch (error) {
    res.json({ error: `Cound not fetch comments with ${postId} from database` });
  }
});
  

export default router;