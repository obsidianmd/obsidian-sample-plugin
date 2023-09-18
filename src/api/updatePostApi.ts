import ENV from "src/env"

interface UpdatePostQueryParams {
    accessToken: string,
    blogName: string,
    postId: string,
    title: string,
    content: string,
    visibility: string,
    tag: string
}

const updatePostApi = async (updatePostQueryParams: UpdatePostQueryParams) => {
    const url = `${ENV.TISTORY_URL}/post/modify?${updatePostQueryParams}`
}

export default updatePostApi