import { useQuery } from "react-query";
import { fetchUsers } from "../../api/userApi";

export function useUsers() {
  return useQuery("users", fetchUsers);
}
