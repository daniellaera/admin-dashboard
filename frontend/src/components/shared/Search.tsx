import { ArrowForwardIcon, Search2Icon } from "@chakra-ui/icons";
import {
  Center,
  chakra,
  Divider,
  Flex,
  HTMLChakraProps,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import { ReactNode, useMemo } from "react";
import { createCtx } from "../../utils/contextUtils";
import { Loading } from "./Loading";

interface SearchContextValue {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onQueryChange?: (query: string) => void;
  query?: string;
}

const [useSearch, SearchProvider] = createCtx<SearchContextValue>();

type SearchProps = {
  children: ReactNode;
  onQueryChange: (value: string) => void;
  query: string;
};

function Search({ children, onQueryChange, query }: SearchProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const value = useMemo(
    () => ({
      isOpen,
      onClose,
      onOpen,
      onQueryChange,
      query
    }),
    [isOpen, onClose, onOpen, onQueryChange, query]
  );

  return (
    <SearchProvider value={value as SearchContextValue}>
      {children}
    </SearchProvider>
  );
}

function SearchEmpty() {
  return <Text fontSize="sm">No result found!</Text>;
}

type SearchResultsProps = {
  children: ReactNode;
  isLoading?: boolean;
  placeholder: string;
};

function SearchResults({
  children,
  isLoading,
  placeholder
}: SearchResultsProps) {
  const { isOpen, onClose, onQueryChange, query } = useSearch();
  const bg = useColorModeValue("white", "gray.700");

  return (
    <Modal isOpen={isOpen === true} onClose={onClose!}>
      <ModalOverlay />
      <ModalContent overflow="hidden">
        <Flex pos="relative" align="stretch">
          <chakra.input
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            maxLength={64}
            bg={bg}
            fontWeight="medium"
            w="100%"
            h="68px"
            pl="68px"
            outline={0}
            placeholder={placeholder}
            value={query}
            onChange={(e) => onQueryChange!(e.target.value)}
          />
          <Center pos="absolute" left={7} h="68px">
            <Search2Icon color="primary" boxSize="20px" />
          </Center>
        </Flex>
        {query?.length! > 1 && (
          <>
            <Divider />
            <ModalBody p="4">
              {isLoading && <Loading />}
              <VStack align="stretch" spacing="2">
                {children}
              </VStack>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

type SearchResultsItemProps = {
  description?: string;
  title: string;
};

function SearchResultsItem({ description, title }: SearchResultsItemProps) {
  const { onClose } = useSearch();
  const bg = useColorModeValue("gray.100", "gray.600");
  const bgHover = useColorModeValue("primary.500", "primary.200");
  const colorHover = useColorModeValue("white", "gray.900");

  return (
    <Flex
      align="center"
      justify="space-between"
      bg={bg}
      borderRadius="lg"
      onClick={onClose}
      px="4"
      py="2"
      _hover={{
        bg: bgHover,
        color: colorHover
      }}
    >
      <Stack spacing="0.5">
        <Text fontSize="sm" fontWeight="semibold">
          {title}
        </Text>
        {description && <Text fontSize="xs">{description}</Text>}
      </Stack>
      <ArrowForwardIcon ml="2" />
    </Flex>
  );
}

type SearchTriggerProps = HTMLChakraProps<"button">;

function SearchTrigger({ ...rest }: SearchTriggerProps) {
  const { onOpen } = useSearch();

  return (
    <IconButton
      aria-label="Search"
      icon={<Search2Icon color="muted" />}
      onClick={onOpen}
      variant="ghost"
      {...rest}
    />
  );
}

export { Search, SearchEmpty, SearchResults, SearchResultsItem, SearchTrigger };
