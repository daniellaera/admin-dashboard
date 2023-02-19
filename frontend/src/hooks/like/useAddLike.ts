import { useMutation, useQueryClient } from "react-query";
import { addLike } from "../../api/likeApi";

export function useAddLike() {
    const queryClient = useQueryClient();

    return useMutation(addLike, {
        onSuccess: () => {
            queryClient.invalidateQueries("posts");
        }
    });
}