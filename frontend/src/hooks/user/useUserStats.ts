import { useQuery } from "react-query";
import { fetchUserStats } from "../../api/userApi";

export function useUserStats() {
  return useQuery("userStats", fetchUserStats);
}
