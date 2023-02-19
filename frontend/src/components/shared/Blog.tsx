import { HStack, Image, SpaceProps, Tag, Text } from "@chakra-ui/react";

interface BlogAuthorProps {
    date: string;
    name: string;
  }
  
  const BlogAuthor: React.FC<BlogAuthorProps> = (props) => {
    return (
      <HStack marginTop="2" spacing="2" display="flex" alignItems="center">
        <Image
          borderRadius="full"
          boxSize="40px"
          src="https://100k-faces.glitch.me/random-image"
          alt={`Avatar of ${props.name}`}
        />
        <Text fontWeight="medium">{props.name}</Text>
        <Text>—</Text>
        <Text>{props.date}</Text>
      </HStack>
    );
  };
  
  interface IBlogTags {
    tags: Array<string>;
    marginTop?: SpaceProps['marginTop'];
  }
  
  const BlogTags: React.FC<IBlogTags> = (props) => {
    return (
      <HStack spacing={2} marginTop={props.marginTop}>
        {props.tags.map((tag) => {
          return (
            <Tag size={'sm'} variant='subtle' colorScheme="blue" key={tag}>
              {tag}
            </Tag>
          );
        })}
      </HStack>
    );
  };

  export { BlogAuthor, BlogTags };