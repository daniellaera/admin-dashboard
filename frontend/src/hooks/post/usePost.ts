import { useQuery } from "react-query";
import { fetchPostById } from "../../api/postApi";

export function usePost(id?: number) {
    return useQuery(["posts", id], () => fetchPostById(id!), { enabled: !!id });
}
