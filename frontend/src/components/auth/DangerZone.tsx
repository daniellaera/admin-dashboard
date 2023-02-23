import { FormHeader } from "../shared/Form";
import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Button,
    Heading,
    useDisclosure,
    useToast
} from "@chakra-ui/react";
import { Page } from "../shared/Page";
import { useRef } from "react";
import { useDeleteProfile } from "../../hooks/auth/useDeleteProfile";
import { useAuth } from "../../providers/AuthProvider";
import { useProfile } from "../../hooks/auth/useProfile";
import { useNavigate } from "react-router-dom";

const DangerZone = () => {
    const { isOpen, onClose, onOpen } = useDisclosure();
    const cancelRef = useRef(null);
    const toast = useToast();
    const navigate = useNavigate();
    const deleteProfile = useDeleteProfile();
    const { session } = useAuth();
    const { data: profile } = useProfile(session?.user.email);

    const handleRemoveProfile = (profileId: number) => {
        deleteProfile.mutate(profileId, {
            onSuccess: () => {
                toast({
                    position: 'top',
                    description: "Your profile has been deleted",
                    status: "success"
                });
                navigate("/login");
            },
            onError: () => {
                toast({
                    description: "Something went wrong! If the problem persists, contact us!",
                    status: "error"
                });
            }
        });
    }

    function handleOpenRemoveProfile(): void {
        onOpen();
    }

    function handleCloseRemoveAlert() {
        onClose();
    }

    return (
        <Page animation="slideFade">
            <FormHeader>
                <Heading fontSize="lg" fontWeight="semibold">
                    Delete your account
                </Heading>
                <Button
                    onClick={() => handleOpenRemoveProfile()}
                    colorScheme="red"
                    type="submit"
                >
                    Delete Account
                </Button>
            </FormHeader>
            <AlertDialog
                isOpen={isOpen}
                leastDestructiveRef={cancelRef}
                onClose={handleCloseRemoveAlert}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Profile
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
                                isLoading={deleteProfile.isLoading}
                                onClick={() => handleRemoveProfile(profile?.id!)}
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

export default DangerZone