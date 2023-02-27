import { useQuery } from "react-query";
import { fetchProfiles } from "../../api/authApi";

export function useProfiles() {
    return useQuery("profiles", fetchProfiles)
}