import { parseISO } from 'date-fns';
import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/', async (req, res) => {
  const posts = await prisma.education.findMany({});
  res.status(200).json(posts);
});

router.post('/create', async (req, res) => {
  const { school, description, degree, fieldOfStudy, from, to, current, profileId } = req.body;

  const fromtoIsoString = parseISO(from);
  const totoIsoString = parseISO(to);
  try {
    const result = await prisma.education.create({
      data: {
        school,
        description,
        degree,
        fieldOfStudy,
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

router.get('/educationByProfileId/:profileId', async (req, res) => {
  const { profileId } = req.params;

  try {
    const educations = await prisma.education.findMany({
      where: { profileId: Number(profileId) },
    });

    res.json(educations);
  } catch (error) {
    res.json({ error: `Educations with profileId ${profileId} does not exist in the database` });
  }
});

export default router;