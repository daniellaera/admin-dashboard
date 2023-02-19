import { useMutation, useQueryClient } from "react-query";
import { addComment } from "../../api/commentApi";

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation(addComment, {
    onSuccess: () => {
      queryClient.invalidateQueries("comments");
    }
  });
}