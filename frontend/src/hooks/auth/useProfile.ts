import { useQuery } from "react-query";
import { fetchProfileByEmail } from "../../api/authApi";

export function useProfile(email?: string) {
    return useQuery(["profile", email], () => fetchProfileByEmail(email!), { enabled: !!email });
}