import { parseISO } from 'date-fns';
import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/', async (req, res) => {
  const posts = await prisma.experiences.findMany({});
  res.status(200).json(posts);
});

router.post('/create', async (req, res) => {
  const { title, description, company, location, from, to, current, profileId } = req.body;

  const fromtoIsoString = parseISO(from);
  const totoIsoString = parseISO(to);
  try {
    const result = await prisma.experiences.create({
      data: {
        title,
        description,
        company,
        location,
        current,
        from: fromtoIsoString,
        to: totoIsoString,
        profileId: profileId,
      },
    });
    res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: 'Unauthorized' });
  }
});

router.get('/experienceByProfileId/:profileId', async (req, res) => {
  const { profileId } = req.params;
  
  try {
    const experiences = await prisma.experiences.findMany({
      where: { profileId: Number(profileId) },
    });
  
    res.json(experiences);
  } catch (error) {
    res.json({ error: `Experiences with profileId ${profileId} does not exist in the database` });
  }
});

export default router;