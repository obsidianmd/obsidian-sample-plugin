import { RequestUrlParam, requestUrl } from "obsidian";
import { decode } from 'iconv-lite';

interface ogData {
    "ogTitle": string,
    "ogDescription": string,
    "ogImage": string,
    "ogImageAlt": string,
    "ogUrl": string
}

const OGDATACHACHE = "ogDataCache"
// url 정규식
const urlRegex = new RegExp("^(http:\\/\\/www\\.|https:\\/\\/www\\.|http:\\/\\/|https:\\/\\/)?[a-z0-9]+([\\-.]{1}[a-z0-9]+)*\\.[a-z]{2,5}(:[0-9]{1,5})?(\\/.*)?$");

// 저장하기 전에 img 데이터를 url-> blob -> base64로 변환 후 저장
async function getImgFile(imgUrl: string) {
    const imgFormat = ["jpg", "jpeg", "png", "bmp", "tif", "gif", "svg"];
    try {
        let imgType = "";
        imgFormat.forEach((format) => {
            if (imgUrl.includes(format)) {
                imgType = format;
            }
        });

        const options: RequestUrlParam = {
            url: imgUrl,
            contentType: `image/${imgType}`
        }

        const file = await requestUrl(options);
        const fileArrayBuffer = file.arrayBuffer;

        // 방법 2) ArrayBuffer 자체를 base64로 변환
        const uint8 = new Uint8Array(fileArrayBuffer);
        const base64String = btoa(uint8.reduce((data, byte)=> {
            return data + String.fromCharCode(byte);
        }, ''));
        if (imgType.includes("svg")) imgType += "+xml";
        return `data:image/${imgType};charset=utf-8;base64,` + base64String;

    } catch (error) {
        console.log(error);
        return "";
    }
}

async function getOgData(url: string) {
    // 로컬데이터 접근
    const data = localStorage.getItem(OGDATACHACHE + url);
    if (data) {
        const ogData: ogData = JSON.parse(data);
        return ogData;
    } else {
        const urlArr = urlRegex.exec(url);
        if (urlArr) {
            try { 
                const response = await requestUrl(url);
                if (response && response.headers && response.headers['content-type'] && !response.headers['content-type']?.includes('text/')) {
                    throw new Error('Page must return a header content-type with text/');
                }
    
                // 인코딩 문제 해결
                const bodyArrayBuffer = response.arrayBuffer;
                const contentType = response.headers["content-type"].toLowerCase().trim();
                const charset = contentType.substring(contentType.indexOf("charset=") + 8, contentType.length);
                let body;
                if (charset === "utf-8") {
                    body = Buffer.from(bodyArrayBuffer).toString('utf-8');
                } else {
                    body = decode(Buffer.from(bodyArrayBuffer), charset);
                }
                
                const parser = new DOMParser();
                const document = parser.parseFromString(body, 'text/html');
                
                const ogTitle = document.querySelector("meta[property='og:title']")?.getAttribute("content") || document.querySelector("title")?.textContent || "";
                const ogDescription = document.querySelector("meta[property='og:description']")?.getAttribute("content") || "";
                let ogImage = "";
                let imgUrl = document.querySelector("meta[property='og:image']")?.getAttribute("content") || "";
                if (imgUrl !== "") {
                    const baseUrl = url.replace(urlArr[4], "");
                    if (!imgUrl.startsWith("http")) {
                        imgUrl = baseUrl + (imgUrl.startsWith("/"))? "" : "/" + imgUrl;
                    }
    
                    ogImage = await getImgFile(imgUrl);
                }
    
                const ogImageAlt = document.querySelector("meta[property='og:image:alt']")?.getAttribute("content") || "";
                const ogUrl = document.querySelector("meta[property='og:url']")?.getAttribute("content") || url;
    
                const data: ogData = {
                    "ogTitle": ogTitle,
                    "ogDescription": ogDescription,
                    "ogImage": ogImage,
                    "ogImageAlt": ogImageAlt,
                    "ogUrl": ogUrl
                }
    
                localStorage.setItem(OGDATACHACHE + url, JSON.stringify(data));
                return data;
            } catch (error) {
                console.error(error);
                return null;
            }
        }
    }
}


export async function LinkThumbnailWidgetParams(url: string) {
    const data = await getOgData(url);    
    if (data) {
        return `
        <div class="openGraphPreview">
            ${(data?.ogImage === "")? "" : `<div class="se-oglink-thumbnail"><img src="${data?.ogImage}" alt="${data?.ogImageAlt}" class="se-oglink-thumbnail-resource"></img></div>`}
            <div class="se-oglink-info-container">
                <strong class="se-oglink-info">${data?.ogTitle}</strong>
                <description class="se-oglink-summary">${data?.ogDescription}</description>
                <span class="se-oglink-url">${data?.ogUrl}</span>
            </div>
        </div>
        `;
    }
    return null;
}
