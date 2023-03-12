import { PostType } from "../utils/constants";
import { Comment } from "./comment";
import { Like } from "./like";
import { Profile } from "./profile";
import { Tag } from "./tag";

export type Post = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  content: string;
  published: boolean;
  viewCount: number;
  profile: Profile;
  profileId: number;
  type: PostType
  comments?: Comment[]
  likes?: Like[]
  tags?: Tag[]
};