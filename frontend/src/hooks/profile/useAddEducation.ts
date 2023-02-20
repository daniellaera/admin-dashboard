import { useMutation, useQueryClient } from "react-query";
import { addEducation } from "../../api/educationApi";

export function useAddEducation() {
    const queryClient = useQueryClient();
  
    return useMutation(addEducation, {
      onSuccess: () => {
        queryClient.invalidateQueries("educations");
      }
    });
  }