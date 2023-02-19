import { InfoOutlineIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Icon,
  Link,
  ScaleFade,
  Text,
  useDisclosure
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { Banner, BannerActions, BannerAvatar, BannerBody } from "./Banner";

const CONSENT_STORAGE_KEY = "cookies-consent";

function CookieBanner() {
  const { isOpen, onClose } = useDisclosure({
    defaultIsOpen: localStorage.getItem(CONSENT_STORAGE_KEY) !== "true"
  });

  const handleConsent = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    onClose();
  };

  return (
    <ScaleFade in={isOpen} unmountOnExit>
      <Box bottom="2" maxWidth="2xl" position="fixed" right="2" zIndex="modal">
        <Banner borderRadius="lg">
          <BannerBody>
            <BannerAvatar>
              <Icon as={InfoOutlineIcon} boxSize="6" />
            </BannerAvatar>
            <Text>
              We use third-party cookies to deliver our services, to personalize
              ads, and to analyze traffic.{" "}
              <Link as={RouterLink} fontWeight="bold" to="/privacy">
                Read our Cookie Policy.
              </Link>
            </Text>
          </BannerBody>
          <BannerActions>
            <Button colorScheme="blue" onClick={handleConsent}>
              I agree
            </Button>
          </BannerActions>
        </Banner>
      </Box>
    </ScaleFade>
  );
}

export { CookieBanner };
