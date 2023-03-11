import { novu } from '../config/novu-client';

export const sendCommentNotification = async (postId: number, postProfileId: number, username: string) => {
  try {
    const result = await novu.trigger('comment-template', {
      to: {
        subscriberId: `${postProfileId}`,
      },
      payload: {
        username: username,
        postId: postId,
      },
    });
    console.log(result);
  } catch (err) {
    console.error('Error >>>>', { err });
  }
};
