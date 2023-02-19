import { useMutation } from "react-query";
import { signOut } from "../../api/authApi";

export function useSignOut() {
  return useMutation(signOut);
}
