import {
  Box,
  BoxProps,
  chakra,
  Divider,
  FormControl,
  FormControlProps,
  FormLabel,
  FormLabelProps,
  HTMLChakraProps,
  Stack,
  StackProps
} from "@chakra-ui/react";

type FormProps = HTMLChakraProps<"form">;

function Form({ children, ...rest }: FormProps) {
  return (
    <chakra.form {...rest}>
      <Stack direction="column" divider={<Divider />} spacing="6">
        {children}
      </Stack>
    </chakra.form>
  );
}

type FormFooterProps = StackProps;

function FormFooter({ ...rest }: FormFooterProps) {
  return (
    <Stack
      direction={{ base: "column", sm: "row-reverse" }}
      spacing="6"
      {...rest}
    />
  );
}

type FormHeaderProps = StackProps;

function FormHeader({ ...rest }: FormHeaderProps) {
  return (
    <Stack
      direction={{ base: "column", sm: "row" }}
      justify="space-between"
      spacing="6"
      {...rest}
    />
  );
}

type FormLineProps = FormControlProps;

function FormLine({ children, ...rest }: FormLineProps) {
  return (
    <FormControl {...rest}>
      <Stack
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        spacing={{ base: "0", sm: "8" }}
      >
        {children}
      </Stack>
    </FormControl>
  );
}

type FormLineLabelProps = FormLabelProps;

function FormLineLabel({ ...rest }: FormLineLabelProps) {
  return <FormLabel flexShrink="0" {...rest} />;
}

type FormLineFieldProps = BoxProps;

function FormLineField({ ...rest }: FormLineFieldProps) {
  return <Box flexGrow="1" maxW="3xl" {...rest} />;
}

export { Form, FormFooter, FormHeader, FormLine, FormLineField, FormLineLabel };
