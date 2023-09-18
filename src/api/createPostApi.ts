import ENV from "src/env";

interface CreatePostQueryParams {
    accessToken: string,
    blogName: string,
    title: string,
    tag?: string,
    content: string,
    visibility: string
}

const createPostApi = async (createPostQueryParams: CreatePostQueryParams) => {
    const queryParams = `access_token=${createPostQueryParams.accessToken}&output=json&blogName=${createPostQueryParams.blogName}&title=${createPostQueryParams.title}&tag=${createPostQueryParams.tag}&visibility=${createPostQueryParams.visibility}&content=${
        encodeURIComponent(createPostQueryParams.content)
    }`
    const url = `${ENV.TISTORY_URL}/post/write?${queryParams}`

    return await fetch(url, {
        method: "POST"
    })
    .then((response) => {
        return response
    })
    .catch((error) => {
        console.log(error)
        throw new Error(error)
    })
}

export default createPostApi
