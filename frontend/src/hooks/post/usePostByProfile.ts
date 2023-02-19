import { useQuery } from "react-query";
import { fetchPostsByProfileId } from "../../api/postApi";

export function usePostByProfileId(profileId?: number) {
    return useQuery(["posts", profileId], () => fetchPostsByProfileId(profileId!), { enabled: !!profileId });
}