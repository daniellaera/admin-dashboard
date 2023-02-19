import {
    chakra,
    Container,
    Flex,
    HTMLChakraProps,
    useColorModeValue,
    useMultiStyleConfig
  } from "@chakra-ui/react";
  import { useScroll } from "framer-motion";
  import { ReactNode, useEffect, useRef, useState } from "react";
  
  type NavbarProps = HTMLChakraProps<"div"> & {
    children: ReactNode;
  };
  
  function Navbar({ children, ...rest }: NavbarProps) {
    const styles = useMultiStyleConfig("Navbar", {});
    const shadow = useColorModeValue("sm", "dark-sm");
  
    const ref = useRef<HTMLHeadingElement>(null);
    const [y, setY] = useState(0);
    const { height = 0 } = ref.current?.getBoundingClientRect() ?? {};
  
    const { scrollY } = useScroll();
    useEffect(() => {
      return scrollY.onChange(() => setY(scrollY.get()));
    }, [scrollY]);
  
    return (
      <chakra.div
        __css={styles.navbar}
        ref={ref}
        shadow={y > height ? shadow : undefined}
        {...rest}
      >
        <Container maxW="7xl" px={{ base: "4", sm: "8" }}>
          <Flex align="center" py="4">
            {children}
          </Flex>
        </Container>
      </chakra.div>
    );
  }
  
  export { Navbar };
  