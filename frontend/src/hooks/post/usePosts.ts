import { useQuery } from "react-query";
import { fetchPosts } from "../../api/postApi";

export function usePosts() {
    return useQuery("posts", fetchPosts)
}