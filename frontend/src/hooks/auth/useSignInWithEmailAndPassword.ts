import { useMutation } from "react-query";
import { signInWithEmailAndPassword } from "../../api/authApi";

export function useSignInWithEmailAndPassword() {
  return useMutation(({ email, password }: { email: string; password: string }) =>
      signInWithEmailAndPassword(email, password)
  );
}
