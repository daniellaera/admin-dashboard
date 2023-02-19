import { useMutation, useQueryClient } from "react-query";
import { deletePostById } from "../../api/postApi";

export function useRemovePost() {
  const queryClient = useQueryClient();

  return useMutation(deletePostById, {
    onSuccess: () => {
      queryClient.invalidateQueries("posts");
    }
  });
}