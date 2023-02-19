import { useMutation, useQueryClient } from "react-query";
import { updateUser } from "../../api/userApi";

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation(updateUser, {
    onSuccess: () => {
      queryClient.invalidateQueries("users");
    }
  });
}
