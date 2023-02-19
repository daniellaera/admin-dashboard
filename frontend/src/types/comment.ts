import { Profile } from "./profile";

export type Comment = {
    id: number
    createdAt?: Date
    text: string
    profileId: number;
    postId: number;
    profile: Profile
}