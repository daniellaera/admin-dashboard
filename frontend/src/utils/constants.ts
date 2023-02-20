export const PostTypes = {
    FUNNY: 'FUNNY',
    TECH: 'TECH',
    RANDOM: 'RANDOM',
    NEWS: 'NEWS',
    SERIOUS: 'SERIOUS'
};

export const POST_TYPE_OPTIONS: { label: string; value: PostType }[] = [
    { value: PostTypes.FUNNY, label: "Funny" },
    { value: PostTypes.SERIOUS, label: "Serious" },
    { value: PostTypes.NEWS, label: "News" },
    { value: PostTypes.RANDOM, label: "Random" },
    { value: PostTypes.TECH, label: "Tech" },
]

export type PostType = (typeof PostTypes)[keyof typeof PostTypes]

export const DISABLED_PROFILE_TEXT = 'you must be logged in to see your profile';
export const DELETE_BUTTON_TEXT = 'You can delete this post';
export const LIKE_BUTTON_TEXT = 'Smash the like button!';
export const LIKE_BUTTON_TEXT_DISABLED = 'you must be logged in to like the post';
export const UPLOAD_PICTURE_DISABLED_TEXT = 'You must create your profile first'