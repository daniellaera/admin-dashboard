import { Button, Stack, StackProps, Text } from "@chakra-ui/react";
import { useMemo } from "react";

type PaginationProps = StackProps & {
  onPageChange: (pageIndex: number) => void;
  pageIndex: number;
  pageSize: number;
  total: number;
};

function Pagination({
  onPageChange,
  pageIndex,
  pageSize,
  total,
  ...rest
}: PaginationProps) {
  const startIndex = useMemo(() => pageIndex * pageSize + 1, [
    pageIndex,
    pageSize
  ]);

  const lastIndex = useMemo(
    () => Math.min(pageIndex * pageSize + pageSize, total),
    [pageIndex, pageSize, total]
  );

  const prevDisabled = useMemo(() => pageIndex <= 0, [pageIndex]);

  const nextDisabled = useMemo(() => pageIndex * pageSize + pageSize >= total, [
    pageIndex,
    pageSize,
    total
  ]);

  return (
    <Stack
      align="center"
      direction={{ base: "column", sm: "row" }}
      justify="space-between"
      {...rest}
    >
      <Text>{`${startIndex}–${lastIndex} of ${total}`}</Text>
      <Stack direction="row" spacing={4}>
        <Button
          isDisabled={prevDisabled}
          onClick={() => onPageChange(pageIndex - 1)}
          variant="outline"
        >
          Previous
        </Button>
        <Button
          isDisabled={nextDisabled}
          onClick={() => onPageChange(pageIndex + 1)}
          variant="outline"
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
}

export { Pagination };
