import { useMutation } from "react-query";
import { signInWithMagicLink } from "../../api/authApi";

export function useSignInWithMagicLink() {
    return useMutation(({ email }: { email: string }) =>
        signInWithMagicLink(email)
    );
}