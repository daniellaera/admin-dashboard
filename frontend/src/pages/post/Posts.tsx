import { Badge, Box, Divider, Heading, HStack, IconButton, ScaleFade, Stack, Tag, TagLabel, Text, Wrap, WrapItem } from "@chakra-ui/react"
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
import { Pagination } from "../../components/shared/Pagination";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowDownIcon } from "@chakra-ui/icons";
import { socket } from "../../utils/constants";

const pageSize = 5;

export const Posts = () => {
  const { data, isError, isLoading, refetch } = usePosts();
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [chipVisible, setChipVisible] = useState<boolean>();

  const toggleChip = useCallback(
    () => setChipVisible(!chipVisible),
    [chipVisible, setChipVisible],
  );

  const posts = useMemo(() => {
    return data?.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  }, [data, pageIndex]);

  useEffect(() => {
    socket.on("postBroadcasted", (postBroadcasted) => {
      if (postBroadcasted.post.published) {
        toggleChip()
      }
    });

  }, [toggleChip]);

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

  function handlePageChange(newPageIndex: number) {
    setPageIndex(newPageIndex);
  }

  const reloadPosts = (): any => {
    refetch()
    toggleChip()
  }

  return (
    <Page animation="slideFade">
      {chipVisible &&
        <ScaleFade initialScale={0.9} in={chipVisible}>
          <HStack spacing={4} justifyContent={'center'} onClick={reloadPosts}>
            <Tag
              cursor='pointer'
              size={'lg'}
              borderRadius='full'
              variant='solid'
              colorScheme='blue'
            >
              <TagLabel>New posts</TagLabel>
              <ArrowDownIcon />
            </Tag>
          </HStack>
        </ScaleFade>
      }
      {posts?.map(({ id, createdAt, title, content, comments, likes, tags, profile, type }: Post, i: number) => (
        <Wrap spacing="30px" marginTop="10" key={i}>
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
                <BlogTags tags={tags} marginTop="4" />
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
      <Stack mt={4}>
        <Pagination
          onPageChange={handlePageChange}
          pageIndex={pageIndex}
          pageSize={pageSize}
          total={data?.length!}
        />
      </Stack>
    </Page>
  )
}
