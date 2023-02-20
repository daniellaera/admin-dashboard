import { useMutation, useQueryClient } from "react-query";
import { updateProfile } from "../../api/authApi";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation(updateProfile, {
    onSuccess: () => {
      queryClient.invalidateQueries("profile");
    }
  });
}
