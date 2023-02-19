import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertProps,
    AlertTitle
  } from "@chakra-ui/react";
  
  type ResultProps = AlertProps & {
    description: string;
    title: string;
  };
  
  function Result({ description, title, ...rest }: ResultProps) {
    return (
      <Alert
        bg="transparent"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        py="12"
        {...rest}
      >
        <AlertIcon boxSize="40px" mr="0" />
        <AlertTitle mt="4" fontSize="xl">
          {title}
        </AlertTitle>
        <AlertDescription maxWidth="sm" mt="3">
          {description}
        </AlertDescription>
      </Alert>
    );
  }
  
  export { Result };
  