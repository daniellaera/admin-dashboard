import { Badge, Box, Divider, Heading, IconButton, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react"
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { HiOutlineChat } from 'react-icons/hi';
import { usePosts } from "../../hooks/post/usePosts";
import { Empty } from "../../components/shared/Empty";
import { Loading } from "../../components/shared/Loading";
import { Result } from "../../components/shared/Result";
import { Page } from "../../components/shared/Page";
import { BlogAuthor, BlogTags } from "../../components/shared/Blog";
import { Post } from "../../types/post";
import './Posts.css';
import { LikeButton } from "../../components/shared/LikeButton";
import { getRandomColor } from "../../utils/functions";

export const Posts = () => {
  const { data, isError, isLoading } = usePosts();
  const navigate = useNavigate();

  if (data?.length === 0) {
    return <Empty message="Posts will show up here!" />
  }

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Result
        description="Something went wrong! If the problem persists, contact us!"
        status="error"
        title="Oops!"
      />
    );
  }

  return (
    <Page animation="slideFade">
      {data?.map(({ id, createdAt, title, content, comments, likes, profile, type }: Post, i: number) => (
        <Wrap spacing="30px" marginTop="5" key={i}>
          <WrapItem >
            <Box w="100%" >
              <Link to={`/posts/${id}`}>
                <Stack direction='row'>
                  <Heading fontSize="xl" marginTop="2">
                    <Text>
                      {title}
                      <Badge ml='2' colorScheme={getRandomColor()}>
                        {type}
                      </Badge>
                    </Text>
                  </Heading>
                </Stack>
                <Text as="p" fontSize="md" marginTop="2">
                  {content}
                </Text>
                <BlogAuthor
                  avatarUrl={profile.avatarUrl} userEmail={profile.authorEmail}
                  name={profile?.username || profile?.authorEmail}
                  date={moment(createdAt).format('Do MMMM YYYY')}
                />
                <BlogTags tags={['Engineering', 'Product']} marginTop="4" />
              </Link>
              <Stack justify={'flex-start'} direction={'row'} mt='4'>
                <div>
                  <span className="button__badge">{likes?.length ? likes.length : 0}</span>
                  <LikeButton postId={id} />
                </div>
                <div>
                  <span className="button__badge">{comments?.length ? comments.length : 0}</span>
                  <IconButton onClick={() => navigate(`/posts/${id}`)} variant={'ghost'} aria-label="'Chat Button" icon={<HiOutlineChat />} />
                </div>
              </Stack>
            </Box>
          </WrapItem>
          <Divider marginTop="5" />
        </Wrap>
      ))}
    </Page>
  )
}

