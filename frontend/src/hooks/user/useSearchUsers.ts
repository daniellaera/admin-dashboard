import { useQuery } from "react-query";
import { searchUsers } from "../../api/userApi";

export function useSearchUsers(query: string) {
  return useQuery(["users", query], () => searchUsers(query), {
    enabled: query.length > 1
  });
}
