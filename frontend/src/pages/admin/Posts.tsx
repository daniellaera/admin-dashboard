import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button, Card, CardBody, CardFooter, CardHeader, Text, useDisclosure, useToast } from "@chakra-ui/react"
import { Page } from "../../components/shared/Page"
import { Toolbar, ToolbarActions, ToolbarTitle } from "../../components/shared/Toolbar"
import { Link } from "react-router-dom";
import { Loading } from "../../components/shared/Loading";
import { Result } from "../../components/shared/Result";
import { Empty } from "../../components/shared/Empty";
import { PostTable } from "../../components/post/PostTable";
import { useMemo, useRef, useState } from "react";
import { Post } from "../../types/post";
import { Pagination } from "../../components/shared/Pagination";
import { useRemovePost } from "../../hooks/post/useRemovePost";
import { useAuth } from "../../providers/AuthProvider";
import { useProfile } from "../../hooks/auth/useProfile";
import { usePostByProfileId } from "../../hooks/post/usePostByProfile";

const pageSize = 5;

const Posts = () => {
  let { session } = useAuth();
  const { data: profile } = useProfile(session?.user.email);
  const { data, isError, isLoading } = usePostByProfileId(profile?.id);
  const [pageIndex, setPageIndex] = useState(0);
  const [activePost, setActivePost] = useState<Post | undefined>(undefined);
  const { isOpen, onClose, onOpen } = useDisclosure();
  const toast = useToast();
  const cancelRef = useRef(null);
  const removePost = useRemovePost();

  const posts = useMemo(() => {
    return data?.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  }, [data, pageIndex]);

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

  function handleCloseRemoveAlert() {
    setActivePost(undefined);
    onClose();
  }

  function handleOpenRemoveAlert(post: Post) {
    setActivePost(post);
    onOpen();
  }

  function handleRemovePost(post: Post) {
    removePost.mutate(post.id, {
      onSuccess: () => {
        onClose();
        toast({
          description: `Post ${post.id} has been removed`,
          status: "success"
        });
      },
      onError: () => {
        toast({
          description:
            "Something went wrong! If the problem persists, contact us!",
          status: "error"
        });
      }
    });
  }

  return (
    <Page animation="slideFade">
      <Toolbar>
        <ToolbarTitle>Posts</ToolbarTitle>
        <ToolbarActions>
          <Button as={Link} colorScheme='blue' to="/admin/posts/new">
            Add Post
          </Button>
        </ToolbarActions>
      </Toolbar>
      {data?.length === 0 ? <>
        <Empty message="Posts will show up here!" />
      </> : <>
        <Card mt="8">
          <CardHeader>
            <Text>Posts table</Text>
          </CardHeader>
          <CardBody>
            <PostTable
              onDelete={(post) => handleOpenRemoveAlert(post)}
              posts={posts}
            />
          </CardBody>
          <CardFooter>
            <Pagination
              onPageChange={handlePageChange}
              pageIndex={pageIndex}
              pageSize={pageSize}
              total={data?.length!}
            />
          </CardFooter>
        </Card>
      </>}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleCloseRemoveAlert}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Post
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? You can't undo this action afterwards.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCloseRemoveAlert}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={removePost.isLoading}
                onClick={() => handleRemovePost(activePost!)}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Page>
  )
}

export default Posts