import { useMutation, useQueryClient } from "react-query";
import { updatePost } from "../../api/postApi";

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation(updatePost, {
    onSuccess: () => {
      queryClient.invalidateQueries("posts");
    }
  });
}
