import { useQuery } from "react-query";
import { fetchCommentsByPostId } from "../../api/commentApi";

export function useCommentsByPostId(postId?: number) {
    return useQuery(["comments", postId], () => fetchCommentsByPostId(postId!), { enabled: !!postId });
}