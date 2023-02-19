import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.post('/create', async (req, res) => {
  const { profileId, postId } = req.body;
  try {
    const result = await prisma.like.create({
      data: {
        profileId: profileId,
        postId: postId,
      },
    });
    res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: 'Unauthorized' });
  }
});

export default router;