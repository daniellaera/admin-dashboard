import { useQuery } from "react-query";
import { fetchUserById } from "../../api/userApi";

export function useUser(id?: string) {
  return useQuery(["users", id], () => fetchUserById(id!), { enabled: !!id });
}
