import { useMutation, useQueryClient } from "react-query";
import { removeUser } from "../../api/userApi";

export function useRemoveUser() {
  const queryClient = useQueryClient();

  return useMutation(removeUser, {
    onSuccess: () => {
      queryClient.invalidateQueries("users");
    }
  });
}
