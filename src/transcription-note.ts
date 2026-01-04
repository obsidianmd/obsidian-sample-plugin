import { App, Notice, TFile, requestUrl } from 'obsidian';
import { TranscriptionResult, TranscriptionChunk } from './whisper-transcriber';
import * as path from 'path';

/**
 * Extracts the video ID from a TikTok URL using the oEmbed API.
 * This handles all TikTok URL formats (short URLs, /t/ URLs, etc.)
 *
 * @param url - TikTok URL (any format)
 * @returns Video ID or null if extraction fails
 */
async function extractVideoIdFromUrl(url: string): Promise<string | null> {
	try {
		const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
		const response = await requestUrl({
			url: oembedUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Obsidian-AI-Toolbox/1.0)'
			}
		});

		if (response.status === 200 && response.json?.html) {
			const videoIdMatch = response.json.html.match(/data-video-id="(\d+)"/);
			if (videoIdMatch?.[1]) {
				return videoIdMatch[1];
			}
		}
	} catch (error) {
		console.error('Failed to extract video ID from TikTok URL:', error);
	}

	return null;
}

/**
 * Creates a new Obsidian note with the transcription content.
 * 
 * @param app - Obsidian App instance
 * @param result - Transcription result from Whisper
 * @param sourceUrl - Optional source URL of the video
 * @param includeTimestamps - Whether to include timestamps in the note
 * @returns The created TFile
 */
export async function createTranscriptionNote(
	app: App,
	result: TranscriptionResult,
	sourceUrl?: string,
	includeTimestamps = false
): Promise<TFile> {
	try {
		// Generate note filename from audio file path
		const noteFilename = generateNoteFilename(result.audioFilePath);

		// Format the note content
		const noteContent = await formatNoteContent(result, sourceUrl, includeTimestamps);

		// Create the note in the vault root
		const file = await app.vault.create(noteFilename, noteContent);

		new Notice(`Transcription note created: ${noteFilename}`);

		return file;
	} catch (error) {
		console.error('Failed to create transcription note:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		new Notice(`Failed to create note: ${errorMessage}`);
		throw error;
	}
}

/**
 * Opens a transcription note in the editor.
 * 
 * @param app - Obsidian App instance
 * @param file - The TFile to open
 */
export async function openTranscriptionNote(app: App, file: TFile): Promise<void> {
	const leaf = app.workspace.getLeaf(false);
	await leaf.openFile(file);
}

/**
 * Generates a filename for the transcription note based on the audio file path.
 * 
 * @param audioFilePath - Path to the audio file
 * @returns Markdown filename for the note
 */
export function generateNoteFilename(audioFilePath: string): string {
	// Extract base filename without extension
	const basename = path.basename(audioFilePath, path.extname(audioFilePath));
	
	// Add timestamp to ensure uniqueness
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
	
	return `Transcription - ${basename} - ${timestamp}.md`;
}

/**
 * Formats the transcription content into a well-structured markdown note.
 *
 * @param result - Transcription result from Whisper
 * @param sourceUrl - Optional source URL of the video
 * @param includeTimestamps - Whether to include timestamps
 * @returns Formatted markdown content
 */
export async function formatNoteContent(
	result: TranscriptionResult,
	sourceUrl?: string,
	includeTimestamps = false
): Promise<string> {
	const lines: string[] = [];

	// Add title
	const basename = path.basename(result.audioFilePath, path.extname(result.audioFilePath));
	lines.push(`# ${basename}`);
	lines.push('');

	// Add source URL if available
	if (sourceUrl) {
		lines.push('## Source');
		const videoId = await extractVideoIdFromUrl(sourceUrl);
		if (videoId) {
			lines.push(`<iframe width="325" height="760" src="https://www.tiktok.com/embed/v2/${videoId}?autoplay=0"></iframe>`);
		}
		lines.push('');
	}
	
	// Add transcription section
	lines.push('## Transcription');
	lines.push('');
	
	if (includeTimestamps && result.chunks && result.chunks.length > 0) {
		// Format with timestamps
		for (const chunk of result.chunks) {
			const timestampStr = formatTimestamp(chunk.timestamp);
			lines.push(`**[${timestampStr}]** ${chunk.text}`);
		}
		lines.push('');
	} else {
		// Format without timestamps - just the full text
		lines.push(result.text);
		lines.push('');
	}
	
	// Add metadata section
	lines.push('---');
	lines.push('');
	lines.push('## Metadata');
	lines.push(`- **Audio File**: \`${result.audioFilePath}\``);
	lines.push(`- **Transcribed**: ${new Date().toLocaleString()}`);
	if (sourceUrl) {
		lines.push(`- **Source**: ${sourceUrl}`);
	}
	
	return lines.join('\n');
}

/**
 * Formats a timestamp tuple into a readable string (MM:SS or HH:MM:SS).
 *
 * @param timestamp - Tuple of [start, end | null] in seconds
 * @returns Formatted timestamp string (only start time)
 */
export function formatTimestamp(timestamp: [number, number | null]): string {
	const [start] = timestamp;

	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, '0')}`;
		}
	};

	return formatTime(start);
}

