import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/findProfileByEmail/:authorEmail', async (req, res) => {
  const { authorEmail } = req.params;

  try {
    const profile = await prisma.profile.findFirst({
      where: { authorEmail },
      include: {
        experiences: true,
      },
    });
    res.json(profile);
  } catch (error) {
    res.json({ error: `Profile with authorEmail ${authorEmail} does not exist in the database` });
  }
});

router.post('/create', async (req, res) => {
  const { authorEmail } = req.body;

  const result = await prisma.profile.create({
    data: {
      authorEmail,
    },
  });
  res.json(result);
});

router.put('/updateById/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const { username, website, company } = req.body;

  // then we repopulate programmingLanguages
  const profileUpdated = await prisma.profile.update({
    where: { id: Number(profileId) },
    data: {
      username: username,
      website: website,
      company: company,
    },
  });

  res.json(profileUpdated);
});

export default router;