import axios from "axios";
import { Experience } from "../types/experience";

const experienceUrl: string = `${process.env.REACT_APP_BACKEND_URL}/api/v1/experience`;

export async function addExperience(experience: Omit<Experience, 'id'>): Promise<Experience> {
  const { data } = await axios.post(experienceUrl + '/create', experience);
  return data;
}

export async function fetchExperiencesByProfileId(profileId: number): Promise<Experience[]> {
  const { data } = await axios.get(`${experienceUrl}/experienceByProfileId/${profileId}`);
  return data;
}
