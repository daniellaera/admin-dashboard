import { useMutation } from "react-query";
import { updatePassword } from "../../api/authApi";

export function useUpdatePassword() {
  return useMutation(updatePassword);
}
