import { Button, Checkbox, FormControl, FormErrorMessage, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Stack } from "@chakra-ui/react";

const AddModal = ({
    isOpen,
    submitHandler,
    onClose,
    reset,
    fields,
    dateFields,
    modalHeader,
    errors,
    register,
    formState
}: any) => {

    return (
        <Modal
            preserveScrollBarGap
            size={{ base: "sm", md: "md" }}
            isCentered
            isOpen={isOpen}
            onClose={() => {
                onClose();
                //reset();
            }}
        >
            <ModalOverlay style={{ backdropFilter: "blur(4px)" }} />
            <ModalContent p={12} alignItems="center">
                <ModalHeader p={4}>{modalHeader}</ModalHeader>
                <ModalCloseButton />
                <ModalBody w="100%">
                    <Stack spacing={4} textAlign="center">
                        <form onSubmit={submitHandler}>
                            <Stack spacing={6}>
                                {fields?.map((field: any, index: any) => {
                                    return (
                                        <FormControl
                                            key={`input-form-control-${index}`}
                                            isInvalid={Boolean(errors?.inputs?.[index])}
                                        >
                                            <Input
                                                name={`${field}`}
                                                placeholder={field}
                                                {...register(`${field}`, {
                                                    required: "This is required"
                                                })}
                                                isDisabled={formState.isSubmitting}
                                            />
                                            <FormErrorMessage>
                                                {errors?.inputs?.[index] && "Input is required."}
                                            </FormErrorMessage>
                                        </FormControl>
                                    );
                                })}
                                {dateFields?.map((field: any, index: any) => {
                                    return (
                                        <FormControl
                                            key={`input-form-control-${index}`}
                                            isInvalid={Boolean(errors?.inputs?.[index])}
                                        >
                                            <Input
                                                type={'date'}
                                                name={`${field}`}
                                                placeholder={field}
                                                {...register(`${field}`, {
                                                    required: "This is required"
                                                })}
                                                isDisabled={formState.isSubmitting}
                                            />
                                            <FormErrorMessage>
                                                {errors?.inputs?.[index] && "Input is required."}
                                            </FormErrorMessage>
                                        </FormControl>
                                    );
                                })}
                                <FormControl>
                                    <Checkbox id="current" {...register("current")}>
                                        Current position?
                                    </Checkbox>
                                </FormControl>
                                <Button type="submit" isLoading={formState.isSubmitting}>
                                    Save
                                </Button>
                            </Stack>
                        </form>
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default AddModal