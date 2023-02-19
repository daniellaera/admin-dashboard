import { Center, CenterProps, Spinner } from "@chakra-ui/react";

type LoadingProps = CenterProps;

function Loading({ ...rest }: LoadingProps) {
  return (
    <Center {...rest}>
      <Spinner />
    </Center>
  );
}

export { Loading };
