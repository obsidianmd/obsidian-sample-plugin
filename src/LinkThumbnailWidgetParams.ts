import { requestUrl } from "obsidian";
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

// 로컬데이터 접근
function getLocalOgData(url: string) {
    const data = localStorage.getItem(OGDATACHACHE + url);
    if (data) {
        const ogData: ogData = JSON.parse(data);
        return ogData;
    }
}

async function saveLocalOgData(url:string, ogData: ogData) {
    const imgUrl = ogData.ogImage;
    const lastDot = imgUrl.lastIndexOf(".");
	const imgType = imgUrl.substring(lastDot, imgUrl.length).toLowerCase();

    const file = await requestUrl({url:imgUrl, contentType: `image/${imgType}`});
    const fileArrayBuffer = file.arrayBuffer;
    // 방법 1) blob 변환
    // const fileBlob = new Blob([fileArrayBuffer], { type: `image/${imgType}`});

    // // 파일 리더 생성
    // const reader = new FileReader();
    // reader.readAsDataURL(fileBlob);
    // let base64String = "";
    // reader.onloadend = () => {
    //     const base64 = reader.result;
    //     if (typeof base64 === "string") base64String = base64;
    // };

    // 방법 2) ArrayBuffer 자체를 base64로 변환
    const uint8 = new Uint8Array(fileArrayBuffer);
    const base64String = btoa(uint8.reduce((data, byte)=> {
        return data + String.fromCharCode(byte);
      }, ''));
    ogData.ogImage = `data:image/${imgType};charset=utf-8;base64,` + base64String;

    // 저장하기 전에 img 데이터를 url-> blob -> base64로 변환 후 저장
    localStorage.setItem(OGDATACHACHE + url, JSON.stringify(ogData));
}


async function getOgData(url: string) {
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
            let ogImage = document.querySelector("meta[property='og:image']")?.getAttribute("content") || "";
            if (ogImage.startsWith("/")) {
                const baseUrl = url.replace(urlArr[4], "");
                ogImage = baseUrl + ogImage;
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

            await saveLocalOgData(url, data);
            return data;
        } catch (error) {
            console.error(error);
        }
    }
}

function renderOgData(data:ogData) {
    return  `
    <div class="openGraphPreview">
        ${(data?.ogImage === "")? "" : `<div class="se-oglink-thumbnail"><img src="${data?.ogImage}" alt="${data?.ogImageAlt}" class="se-oglink-thumbnail-resource"></img></div>`}
        <div class="se-oglink-info-container">
            <strong class="se-oglink-info">${data?.ogTitle}</strong>
            <description class="se-oglink-summary">${data?.ogDescription}</description>
            <p class="se-oglink-url">${data?.ogUrl}</p>
        </div>
    </div>
    `;
}

export async function LinkThumbnailWidgetParams(url: string) {
    const data = getLocalOgData(url) || await getOgData(url);    
    if (data) {
        const result = renderOgData(data);
        return result;
    }
    return null;
}
