import type { Plugin } from "vite";
import { promises as fsp } from "fs";
import mime from "mime/lite";

const doubleQuoteRE = /"/g;
const whitespaceRE = /\s+/g;
const urlHexPairsRE = /%[\dA-F]{2}/g;

function specialHexEncode(match: string): string {
    // Browsers tolerate these characters, and they're frequent
    switch (match) {
        case "%20": {
            return " ";
        }
        case "%3D": {
            return "=";
        }
        case "%3A": {
            return ":";
        }
        case "%2F": {
            return "/";
        }
        default: {
            return match.toLowerCase();
        } // compresses better
    }
}

const cleanUrl = (url: string): string => url.replace(/#.*$/, "").replace(/\?.*$/, "");

// Adopted from https://github.com/tigt/mini-svg-data-uri
function uriEncodeSvg(content: string): string {
    const normalizedContent = content.trim().replace(whitespaceRE, " ").replace(doubleQuoteRE, "'");

    return encodeURIComponent(normalizedContent).replace(urlHexPairsRE, specialHexEncode);
}

export function inlineAssets(): Plugin {
    return {
        name: "inline:assets",
        enforce: "pre",
        async transform(_, id: string) {
            const filePath = cleanUrl(id);
            if (/.(svg|jpg|jpeg|png|gif)/.test(filePath.toLowerCase())) {
                const content = await fsp.readFile(filePath);
                const url = filePath.endsWith(".svg")
                    ? `data:image/svg+xml;utf8,${uriEncodeSvg(content.toString("utf-8"))}`
                    : `data:${mime.getType(filePath)};base64,${content.toString("base64")}`;
                return `const content = "${url}";export default content;`;
            }
            return null;
        },
    };
}