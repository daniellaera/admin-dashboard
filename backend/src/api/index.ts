import express from 'express';

import MessageResponse from '../interfaces/MessageResponse';
import emojis from './emojis';
import posts from './posts';
import profile from './profile';
import experience from './experience';
import comments from './comments';
import like from './like';
import education from './education';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/emojis', emojis);
router.use('/posts', posts);
router.use('/profile', profile);
router.use('/experience', experience);
router.use('/comments', comments);
router.use('/likes', like);
router.use('/education', education);

export default router;
