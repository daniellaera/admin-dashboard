import { Circle, SquareProps, useColorModeValue } from "@chakra-ui/react";

type BrandProps = SquareProps;

function Brand({ ...rest }: BrandProps) {
  const color = useColorModeValue("white", "gray.900");

  return (
    <Circle bg="primary" color={color} size="10" {...rest}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        height="16px"
        width="16px"
        fill="currentcolor"
      >
        <path id="p1" d="M 24,22 12,2 6,12 Z" />
        <path id="p2" d="M 0,22 18,12 12,2 Z" />
      </svg>
    </Circle>
  );
}

export { Brand };
