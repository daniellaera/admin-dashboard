import { useMutation, useQueryClient } from "react-query";
import { addUser } from "../../api/userApi";

export function useAddUser() {
  const queryClient = useQueryClient();

  return useMutation(addUser, {
    onSuccess: () => {
      queryClient.invalidateQueries("users");
    }
  });
}
