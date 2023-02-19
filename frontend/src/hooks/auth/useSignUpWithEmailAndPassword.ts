import { useMutation } from "react-query";
import { signUpWithEmailAndPassword } from "../../api/authApi";

export function useSignUpWithEmailAndPassword() {
  return useMutation(
    ({ email, password }: { email: string; password: string }) =>
      signUpWithEmailAndPassword(email, password)
  );
}
