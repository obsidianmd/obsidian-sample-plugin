
export interface BlogPublisherSettings {
    accessToken: string;
    blogName: string;
    visibility: string;
    platform: string;
}

export const DEFFAULT_SETTINGS: BlogPublisherSettings = {
    accessToken: "",
    blogName: "",
    visibility: "0",
    platform: "tistory"
}