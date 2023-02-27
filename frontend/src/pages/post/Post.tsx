import { ArrowBackIcon } from "@chakra-ui/icons";
import { Box, Button, Center, Divider, Flex, Heading, Text, Wrap } from "@chakra-ui/react"
import moment from "moment";
import { Link, useParams } from "react-router-dom";
import { BlogAuthor } from "../../components/shared/Blog";
import { Empty } from "../../components/shared/Empty";
import { Loading } from "../../components/shared/Loading";
import { Page } from "../../components/shared/Page";
import { Toolbar, ToolbarActions, ToolbarTitle } from "../../components/shared/Toolbar";
import { useCommentsByPostId } from "../../hooks/comments/useCommentsByPost";
import { usePost } from "../../hooks/post/usePost";
import { useAuth } from "../../providers/AuthProvider";
import { Comment } from "../../types/comment";
import CommentForm from "../../components/comments/CommentForm";

export const Post = () => {
  const { id } = useParams();
  let { session } = useAuth();
  const { data, isError, isLoading } = usePost(Number(id));
  const { data: comments } = useCommentsByPostId(data?.id);

  const isUpdate = !!id;

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <span>Something went wrong! If the problem persists, contact us!</span>
    );
  }

  return (
    <Page animation="slideFade">
      <Toolbar>
        <ToolbarTitle>
          {isUpdate ? `Post ${id}` : "Add post"}
        </ToolbarTitle>
        <ToolbarActions>
          <Button
            as={Link}
            leftIcon={<ArrowBackIcon />}
            to="/posts"
            variant="outline"
          >
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>
      <Wrap spacing="30px" marginTop="5">
        <Box w="100%">
          <Heading fontSize="xl" marginTop="2">
            <Text>
              {data?.title}
            </Text>
          </Heading>
          <Text as="p" fontSize="md" marginTop="2">
            {data?.content}
          </Text>
        </Box>
        <BlogAuthor avatarUrl={data?.profile.avatarUrl} userEmail={data?.profile.authorEmail!} name={data?.profile.username!} date={moment(data?.createdAt).format('Do MMMM YYYY')} />
      </Wrap>
      <Divider marginTop={'5'} />
      {session ? <CommentForm post={data} /> : <Empty message="You need to login to comment the post" />}
      {comments?.map(({ text, createdAt, profile }: Comment, i: number) => (
        <Flex key={i} align={'left'} justify={'left'}>
          <Center py={2}>
            <Box maxW={'800px'} w={'full'} rounded={'md'} p={6} overflow={'hidden'}>
              <Text as="p" fontSize="md" marginTop="2">
                {text}
              </Text>
              <BlogAuthor avatarUrl={profile?.avatarUrl} userEmail={profile?.authorEmail} name={profile?.authorEmail} date={moment(createdAt).format('Do MMMM YYYY')} />
            </Box>
          </Center>
        </Flex>
      ))}
    </Page>
  )
}
