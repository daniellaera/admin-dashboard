import axios from "axios";
import { Post } from "../types/post";

const postUrl: string = `${process.env.REACT_APP_BACKEND_URL}/api/v1/posts`;

export async function fetchPosts(): Promise<Post[]> {
  const { data } = await axios.get(postUrl);
  return data;
}

export async function fetchPostsByProfileId(profileId: number): Promise<Post[]> {
  const { data } = await axios.get(postUrl + '/postsByProfileId/' + profileId);
  return data;
}

export async function fetchPostById(id: number): Promise<Post> {
  const { data } = await axios.get(postUrl + '/post/' + id);
  return data;
}

export async function addPost(post: Post): Promise<Post> {
  const { data } = await axios.post(postUrl + '/create', post);
  return data;
}

export async function updatePost(post: Post) {
  const { data } = await axios.put(`${postUrl}/updateById/${post.id}`, post);
  return data;
}

export async function deletePostById(id: number) {
  const { data } = await axios.delete(`${postUrl}/deleteById/${id}`);
  return data;
}