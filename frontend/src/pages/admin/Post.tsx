import { ArrowBackIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Link as ChakraLink,
  Stack,
  Text
} from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { Page } from "../../components/shared/Page";
import {
  Toolbar,
  ToolbarActions,
  ToolbarTitle
} from "../../components/shared/Toolbar";
import { Loading } from "../../components/shared/Loading";
import { usePost } from "../../hooks/post/usePost";
import PostForm from "../../components/post/PostForm";

export const Post = () => {
  const { id } = useParams();
  const { data, isError, isLoading } = usePost(Number(id));

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
          {isUpdate ? `Update post ${id}` : "Add post"}
        </ToolbarTitle>
        <ToolbarActions>
          <Button
            as={Link}
            leftIcon={<ArrowBackIcon />}
            to="/admin/posts"
            variant="outline"
          >
            Back
          </Button>
        </ToolbarActions>
      </Toolbar>
      <Grid
        templateColumns={{ base: "repeat(1, 1fr)", xl: "repeat(3, 1fr)" }}
        gap={6}
        mt="8"
      >
        <GridItem colSpan={{ xl: 2 }}>
          <Card>
            <CardHeader>
              <Text>Post form</Text>
            </CardHeader>
            <CardBody>
              <PostForm initialValues={data} />
            </CardBody>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardHeader>
              <Text>Help</Text>
            </CardHeader>
            <CardBody>
              <Stack spacing={3}>
                <ChakraLink isExternal>
                  Read documentation
                  <ExternalLinkIcon ml="1" />
                </ChakraLink>
                <ChakraLink>Chakra UI documentation</ChakraLink>
              </Stack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Page>
  )
}