import { chakra, HTMLChakraProps, useColorModeValue } from "@chakra-ui/react";
import { ReactNode } from "react";

type IllustrationProps = HTMLChakraProps<"svg"> & {
  children: ReactNode;
};

function Illustration({ children, ...rest }: IllustrationProps) {
  const primary = useColorModeValue("primary.500", "primary.200");
  const surface = useColorModeValue("white", "gray.800");
  const gray1 = useColorModeValue("gray.100", "gray.700");
  const gray2 = useColorModeValue("gray.200", "gray.500");
  const gray3 = useColorModeValue("gray.300", "gray.600");

  return (
    <chakra.svg
      xmlns="http://www.w3.org/2000/svg"
      w="full"
      h="auto"
      sx={{
        "& .fill-surface": {
          fill: surface
        },
        "& .fill-primary": {
          fill: primary
        },
        "& .fill-gray-1": {
          fill: gray1
        },
        "& .fill-gray-2": {
          fill: gray2
        },
        "& .fill-gray-3": {
          fill: gray3
        }
      }}
      {...rest}
    >
      {children}
    </chakra.svg>
  );
}

export { Illustration };
