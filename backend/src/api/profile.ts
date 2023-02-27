import express from 'express';
import { supabaseClient } from '../config/supabase-client';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/', async (req, res) => {
  const profiles = await prisma.profile.findMany({
    include: {
      programmingLanguages: {
        select: {
          label: true,
        },
      },
    },
  });
  res.status(200).json(profiles);
});

router.get('/findProfileByEmail/:authorEmail', async (req, res) => {
  const { authorEmail } = req.params;

  try {
    const profile = await prisma.profile.findFirst({
      where: { authorEmail },
      include: {
        experiences: true,
        programmingLanguages: {
          select: {
            value: true,
            label: true,
          },
        },
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

router.post('/createProfileBySocial/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const existingProfile = await prisma.profile.findFirst({
      where: { authorEmail: email },
    });
    if (existingProfile) {
      console.log('profile exists');
      res.status(200).json(existingProfile);
    } else {
      const result = await prisma.profile.create({
        data: {
          authorEmail: email,
        },
      });
      res.status(200).json(result);
      console.log('profile created', result);
    }
  } catch (error) {
    return res.status(400).json({ error: 'Unauthorized' });
  }
});

router.delete('/delete/:profileId', async (req, res) => {
  const { profileId } = req.params;

  const token = req.header('Authorization')?.split(' ')[1];

  const { data } = await supabaseClient.auth.getUser(token);

  const result = await prisma.profile.delete({ where: { id: Number(profileId) } });

  console.log('deleting user from DB', result);

  await supabaseClient.auth.admin.deleteUser(data.user?.id!);

  console.log('deleting user from supabase with id', data.user?.id);

  res.json(result);
});

router.put('/updateById/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const { username, website, company, avatarUrl, programmingLanguages } = req.body;

  // we delete all programming languages first
  await prisma.$transaction([prisma.programmingLanguage.deleteMany({ where: { profileId: Number(profileId) } })]);

  // then we repopulate all table while we update the profile
  const profileUpdated = await prisma.profile.update({
    where: { id: Number(profileId) },

    data: {
      username: username,
      website: website,
      company: company,
      avatarUrl: avatarUrl,
      programmingLanguages: {
        connectOrCreate: programmingLanguages.map((value: string, id: number) => ({
          create: value,
          where: { id: id },
        })),
      },
    },
  });

  res.json(profileUpdated);
});

export default router;