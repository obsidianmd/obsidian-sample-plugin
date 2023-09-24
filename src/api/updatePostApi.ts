import ENV from "src/env"

interface ModifyPostQueryParams {
    accessToken: string,
    blogName: string,
    postId: string,
    title: string,
    content: string,
    visibility: string,
    tag: string
}

const modifyPostApi = async (modifyPostQueryParams: ModifyPostQueryParams) => {
    const queryParams = `access_token=${modifyPostQueryParams.accessToken}&output=json&blogName=${modifyPostQueryParams.blogName}&title=${modifyPostQueryParams.title}&tag=${modifyPostQueryParams.tag}&visibility=${modifyPostQueryParams.visibility}&content=${
        encodeURIComponent(modifyPostQueryParams.content)
    }&postId=${modifyPostQueryParams.postId}`
    const url = `${ENV.TISTORY_URL}/post/modify?${queryParams}`
    
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

export default modifyPostApi