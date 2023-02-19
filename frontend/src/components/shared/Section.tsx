import {
    Box,
    BoxProps,
    Container,
    Heading,
    HeadingProps,
    Stack,
    StackProps,
    Text,
    TextProps
  } from "@chakra-ui/react";
  
  const variants = {
    default: "5xl",
    full: "full",
    prose: "2xl"
  };
  
  type SectionProps = BoxProps & {
    variant?: "default" | "full" | "prose";
  };
  
  function Section({ children, variant = "default", ...rest }: SectionProps) {
    return (
      <Box as="section" py={{ base: "16", md: "24" }} {...rest}>
        <Container maxW={variants[variant]}>
          <Stack spacing="20">{children}</Stack>
        </Container>
      </Box>
    );
  }
  
  type SectionBodyProps = BoxProps;
  
  function SectionBody({ ...rest }: SectionBodyProps) {
    return <Box {...rest} />;
  }
  
  type SectionDescriptionProps = TextProps;
  
  function SectionDescription({ ...rest }: SectionDescriptionProps) {
    return <Text color="muted" fontSize="xl" maxW="2xl" {...rest} />;
  }
  
  type SectionHeaderProps = StackProps;
  
  function SectionHeader({ ...rest }: SectionHeaderProps) {
    return <Stack align="center" spacing="6" textAlign="center" {...rest} />;
  }
  
  type SectionHeadingsProps = StackProps;
  
  function SectionHeadings({ ...rest }: SectionHeadingsProps) {
    return <Stack align="center" spacing="3" {...rest} />;
  }
  
  type SectionTagProps = TextProps;
  
  function SectionTag({ ...rest }: SectionTagProps) {
    return <Text color="primary" fontSize="md" fontWeight="semibold" {...rest} />;
  }
  
  type SectionTitleProps = HeadingProps;
  
  function SectionTitle({ ...rest }: SectionTitleProps) {
    return <Heading as="h2" size="2xl" fontWeight="extrabold" {...rest} />;
  }
  
  export {
    Section,
    SectionBody,
    SectionDescription,
    SectionHeader,
    SectionHeadings,
    SectionTag,
    SectionTitle
  };
  