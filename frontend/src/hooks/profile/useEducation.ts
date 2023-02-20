import { useQuery } from "react-query";
import { fetchEducationsByProfileId } from "../../api/educationApi";

export function useEducations(profileId?: number) {
    return useQuery(["educations", profileId], () => fetchEducationsByProfileId(profileId!), { enabled: !!profileId });
}