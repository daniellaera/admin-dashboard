import axios from "axios";
import { Education } from "../types/education";

const educationUrl: string = `${process.env.REACT_APP_BACKEND_URL}/api/v1/education`;

export async function addEducation(education: Omit<Education, 'id'>): Promise<Education> {
    const { data } = await axios.post(educationUrl + '/create', education);
    return data;
}

export async function fetchEducationsByProfileId(profileId: number): Promise<Education[]> {
    const { data } = await axios.get(`${educationUrl}/educationByProfileId/${profileId}`);
    return data;
}