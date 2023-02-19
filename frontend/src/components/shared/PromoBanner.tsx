import {
    Collapse,
    Text,
    useColorModeValue,
    useDisclosure
  } from "@chakra-ui/react";
  import { Banner, BannerBody } from "./Banner";
  
  function PromoBanner() {
    const { isOpen, onClose } = useDisclosure({ defaultIsOpen: true });
    const bgGradient = useColorModeValue(
      "linear(to-r, primary.500, green.500)",
      "linear(to-r, primary.200, green.200)"
    );
    return (
      <Collapse in={isOpen} unmountOnExit>
        <Banner
          bgGradient={bgGradient}
          closable={true}
          color="surface"
          onClose={onClose}
        >
          <BannerBody justify="center" w="100%">
            <Text fontWeight="medium">We just launched our new product.</Text>
          </BannerBody>
        </Banner>
      </Collapse>
    );
  }
  
  export { PromoBanner };
  