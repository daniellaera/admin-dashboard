import { useMutation, useQueryClient } from "react-query";
import { addExperience } from "../../api/experienceApi";

export function useAddExperience() {
  const queryClient = useQueryClient();

  return useMutation(addExperience, {
    onSuccess: () => {
      queryClient.invalidateQueries("experiences");
    }
  });
}