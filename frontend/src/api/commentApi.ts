import axios from "axios";
import { Comment } from "../types/comment";

const commentUrl: string = `${process.env.REACT_APP_BACKEND_URL}/api/v1/comments`;

export async function addComment(comment: Comment): Promise<Comment> {
  const { data } = await axios.post(commentUrl + '/create', comment);
  return data;
}

export async function fetchCommentsByPostId(postId: number): Promise<Comment[]> {
  const { data } = await axios.get(commentUrl + '/commentsByPostId/' + postId);
  return data;
}