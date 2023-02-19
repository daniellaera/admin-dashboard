import { useMutation, useQueryClient } from "react-query";
import { addPost } from "../../api/postApi";

export function useAddPost() {
  const queryClient = useQueryClient();

  return useMutation(addPost, {
    onSuccess: () => {
      queryClient.invalidateQueries("posts");
    }
  });
}