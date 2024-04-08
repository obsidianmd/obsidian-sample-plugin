import { requestUrl } from "obsidian";
import { decode } from 'iconv-lite';

// url 정규식
const urlRegex = new RegExp("^(http:\\/\\/www\\.|https:\\/\\/www\\.|http:\\/\\/|https:\\/\\/)?[a-z0-9]+([\\-.]{1}[a-z0-9]+)*\\.[a-z]{2,5}(:[0-9]{1,5})?(\\/.*)?$");

export async function LinkThumbnailWidgetParams(url: string) {
    const urlArr = urlRegex.exec(url);
    if (urlArr) {
        try { 
            
            const response = await requestUrl({
                url:url,
                throw: true
            });
            if (response && response.headers && response.headers['content-type'] && !response.headers['content-type']?.includes('text/')) {
                throw new Error('Page must return a header content-type with text/');
            }

            // 인코딩 문제 해결
            const bodyArrayBuffer = response.arrayBuffer;            
            const charset = response.headers["content-type"].replace("text/html;charset=","").toLowerCase();

            let body;
            if (charset.trim() === "utf-8") {
                body = Buffer.from(bodyArrayBuffer).toString('utf-8');
            } else {
                body = decode(Buffer.from(bodyArrayBuffer), charset);
            }
            
            const parser = new DOMParser();
            const document = parser.parseFromString(body, 'text/html');
            
            const ogTitle = document.querySelector("meta[property='og:title']")?.getAttribute("content") || document.querySelector("title")?.textContent || "";
            const ogDescription = document.querySelector("meta[property='og:description']")?.getAttribute("content") || "";
            let ogImage = document.querySelector("meta[property='og:image']")?.getAttribute("content") || "";
            if (ogImage.startsWith("/")) {
                const baseUrl = url.replace(urlArr[4], "");
                ogImage = baseUrl + ogImage;
            }
            const ogImageAlt = document.querySelector("meta[property='og:image:alt']")?.getAttribute("content") || "";
            const ogUrl = document.querySelector("meta[property='og:url']")?.getAttribute("content") || url;

            const result = `
                <div class="openGraphPreview">
                    ${(ogImage === "")? "" : `<div class="se-oglink-thumbnail"><img src="${ogImage}" alt="${ogImageAlt}" class="se-oglink-thumbnail-resource"></img></div>`}
                    <div class="se-oglink-info-container">
                        <strong class="se-oglink-info">${ogTitle}</strong>
                        <description class="se-oglink-summary">${ogDescription}</description>
                        <p class="se-oglink-url">${ogUrl}</p>
                    </div>
                </div>
            `
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }
    return null
}
