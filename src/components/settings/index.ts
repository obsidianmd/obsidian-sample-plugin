
export interface TistoryPublisherSettings {
    accessToken: string;
    blogName: string;
    visibility: string;
}

export const DEFFAULT_SETTINGS: TistoryPublisherSettings = {
    accessToken: "",
    blogName: "",
    visibility: "0"
}