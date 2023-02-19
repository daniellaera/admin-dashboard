import axios from "axios";
import { Like } from "../types/like";

const likeUrl: string = `${process.env.REACT_APP_BACKEND_URL}/api/v1/likes`;

export async function addLike(like: Like): Promise<Like> {
    const { data } = await axios.post(likeUrl + '/create', like);
    return data;
}