import { useQuery } from "react-query";
import { fetchExperiencesByProfileId } from "../../api/experienceApi";

export function useExperiences(profileId?: number) {
    return useQuery(["experiences", profileId], () => fetchExperiencesByProfileId(profileId!), { enabled: !!profileId });
}