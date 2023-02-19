import { useMutation } from "react-query";
import { updateProfile } from "../../api/authApi";

export function useUpdateProfile() {
  return useMutation(updateProfile);
}
