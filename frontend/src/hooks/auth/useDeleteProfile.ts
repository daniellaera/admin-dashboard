import { useMutation, useQueryClient } from "react-query";
import { deleteProfileById } from "../../api/authApi";

export function useDeleteProfile() {
    const queryClient = useQueryClient();

    return useMutation(deleteProfileById, {
        onSuccess: () => {
            queryClient.invalidateQueries("profile");
        }
    });
}