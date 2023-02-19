import { Post } from "../../types/post";
import { Empty } from "../shared/Empty";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import {
  Badge,
  Box,
  HStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { truncate } from "../../utils/functions";

type PostTableProps = {
  onDelete: (post: Post) => void;
  posts?: Post[];
};

const PostTable = ({ onDelete, posts }: PostTableProps) => {
  if (!posts || posts.length === 0) {
    return <Empty message="Posts will show up here!" />
  }

  return (
    <Box overflowX="auto" >
      <Table variant={'simple'}>
        <Thead>
          <Tr>
            <Th>Title</Th>
            <Th>Content</Th>
            <Th>Published</Th>
            <Th isNumeric>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {posts.map((item) => (
            <Tr key={item.id}>
              <Td>{truncate(item.title)}</Td>
              <Td>{truncate(item.content)}</Td>
              <Td>
                {item.published ? (
                  <Badge colorScheme="green">Public</Badge>
                ) : (
                  <Badge>Private</Badge>
                )}
              </Td>
              <Td isNumeric>
                <HStack justify="right">
                  <IconButton
                    aria-label={`Edit post ${item.id}`}
                    as={Link}
                    icon={<EditIcon />}
                    to={`/admin/posts/${item.id}`}
                  />
                  <IconButton
                    aria-label={`Delete post ${item.id}`}
                    icon={<DeleteIcon />}
                    onClick={() => onDelete(item)}
                  />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export { PostTable }