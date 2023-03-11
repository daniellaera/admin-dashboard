import { HStack, SpaceProps, Tag, Text } from "@chakra-ui/react";
import { getRandomColor, truncate } from "../../utils/functions";
import ProfileAvatar from "./ProfileAvatar";

interface BlogAuthorProps {
  date: string;
  name: string;
  avatarUrl: string | undefined;
  userEmail: string
}

const BlogAuthor: React.FC<BlogAuthorProps> = (props) => {
  return (
    <HStack marginTop="4" spacing="2" display="flex" alignItems="center">
      <ProfileAvatar mr="3" avatarSize="sm" url={props.avatarUrl} avatarName={truncate(props.userEmail)} />
      <Text fontSize={'small'}>{props.name || props.userEmail} - {props.date}</Text>
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
          <Tag size={'sm'} variant='subtle' colorScheme={getRandomColor()} key={tag}>
            {tag}
          </Tag>
        );
      })}
    </HStack>
  );
};

export { BlogAuthor, BlogTags };