import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.post('/create', async (req, res) => {
  const { profileId, postId } = req.body;
  let likeProfileIds: number[] = [];

  try {
    // find all likes for this post
    const allLikes = await prisma.like.findMany({
      where: { postId: postId },
    });

    // we map through it and we assign the like authorId to a variable
    allLikes.forEach(lk => likeProfileIds.push(lk.profileId));


    if (likeProfileIds.includes(profileId)) {
      // we check that the logged user id is the same as the author of this post's like
      // and we avoid he likes the post twice
      return res.status(400).json({ error: 'You cannot like a post twice' });
    } else {
      const result = await prisma.like.create({
        data: {
          profileId: profileId,
          postId: postId,
        },
      });
      return res.status(200).json(result);
    }
  } catch (error) {
    return res.status(400).json({ error: 'Unauthorized' });
  }
});

export default router;