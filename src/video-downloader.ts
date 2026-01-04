import {Notice} from 'obsidian';
import {spawn} from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {MyPluginSettings} from './settings';

export interface ExtractAudioResult {
    audioFilePath: string;
    sourceUrl: string;
}

/**
 * Downloads audio from a video URL in the clipboard for transcription.
 * Supports TikTok, YouTube, and other platforms supported by yt-dlp.
 * Uses yt-dlp directly via child_process for audio extraction.
 * Requires yt-dlp and ffmpeg to be installed and available in PATH.
 */
export async function extractAudioFromClipboard(settings: MyPluginSettings): Promise<ExtractAudioResult | null> {
    try {
        // Read URL from clipboard
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText) {
            new Notice('Clipboard is empty');
            return null;
        }

        // Validate video URL
        if (!isValidVideoUrl(clipboardText)) {
            new Notice('Clipboard does not contain a valid video URL');
            return null;
        }

        const url = clipboardText.trim();
        new Notice('Preparing video for transcription...');

        let outputDir: string;

        if (settings.keepVideo) {
            // Use custom directory or default Downloads folder when keeping video
            const homeDir = process.env.USERPROFILE || process.env.HOME || os.homedir();
            outputDir = settings.outputDirectory ||
                path.join(homeDir, 'Videos', 'Obsidian');

            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, {recursive: true});
            }
        } else {
            // Use system temporary directory when not keeping video
            outputDir = os.tmpdir();
        }

        // Generate output template with better naming for TikTok
        // For TikTok: uses uploader_id format (e.g., "username_1234567890.mp3")
        // For other platforms: falls back to title
        const outputTemplate = path.join(outputDir, '%(uploader,title)s_%(id)s.%(ext)s');

        // Run yt-dlp to extract audio for transcription
        const audioFilePath = await runYtDlp(url, outputTemplate, settings);

        new Notice(`Audio extracted successfully!\nReady for transcription.\nSaved to: ${path.dirname(audioFilePath)}`);

        return {
            audioFilePath,
            sourceUrl: url
        };

    } catch (error) {
        console.error('Video audio extraction error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        new Notice(`Failed to extract audio for transcription: ${errorMessage}`);
        return null;
    }
}

/**
 * Runs yt-dlp to extract audio from a video for transcription.
 * Requires yt-dlp and ffmpeg to be installed and available in PATH.
 * Returns the actual filepath reported by yt-dlp.
 */
function runYtDlp(url: string, outputTemplate: string, settings: MyPluginSettings): Promise<string> {
    return new Promise((resolve, reject) => {
        const args = [
            '-x',                    // Extract audio
            '--audio-format', 'mp3', // Convert to mp3
            '--audio-quality', '0',  // Best quality
        ];

        // Keep video file if setting is enabled
        if (settings.keepVideo) {
            args.push('-k');
        }

        // Add ffmpeg location if specified in settings
        if (settings.ffmpegLocation) {
            args.push('--ffmpeg-location', settings.ffmpegLocation);
        }

        args.push(
            '--impersonate', settings.impersonateBrowser, // Impersonate browser from settings
            '-o', outputTemplate,    // Output template
            '--print', 'after_move:filepath',  // Print the final filepath after all processing
            url
        );

        let ytdlpCommand = 'yt-dlp';
        if (settings.ytdlpLocation) {
            ytdlpCommand = path.join(settings.ytdlpLocation, 'yt-dlp');
        }

        const proc = spawn(ytdlpCommand, args, {
            shell: true,
        });

        let stdout = '';
        let stderr = '';

        // Capture stdout where yt-dlp prints the filepath
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                // The filepath is printed to stdout by --print flag
                // It should be the last line of output
                const lines = stdout.trim().split('\n');
                const filepath = lines[lines.length - 1]?.trim();

                if (filepath && fs.existsSync(filepath)) {
                    resolve(filepath);
                } else {
                    reject(new Error(`yt-dlp did not return a valid filepath. Output: ${stdout}`));
                }
            } else {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start yt-dlp: ${err.message}. Is yt-dlp installed?`));
        });
    });
}

/**
 * Validates if a URL is a supported video URL (TikTok, YouTube, etc.).
 * yt-dlp supports many platforms, so we check for common video URL patterns.
 */
function isValidVideoUrl(url: string): boolean {
    const trimmedUrl = url.trim();
    
    // TikTok patterns
    const tiktokPatterns = [
        /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
        /^https?:\/\/(vm|vt)\.tiktok\.com\/[\w]+/i,
        /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w]+/i,
    ];

    // YouTube patterns
    const youtubePatterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
        /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/i,
        /^https?:\/\/youtu\.be\/[\w-]+/i,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
    ];

    // Check if URL matches any supported pattern
    const allPatterns = [...tiktokPatterns, ...youtubePatterns];
    return allPatterns.some(pattern => pattern.test(trimmedUrl));
}

