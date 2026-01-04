import { Notice, requestUrl } from 'obsidian';
import * as fs from 'fs';

/**
 * Interface for transcription results with text and optional timestamps
 */
export interface TranscriptionResult {
	text: string;
	chunks?: TranscriptionChunk[];
	audioFilePath: string;
}

/**
 * Interface for individual transcription chunks with timestamps
 */
export interface TranscriptionChunk {
	text: string;
	timestamp: [number, number | null];
}

/**
 * Configuration for Azure OpenAI Whisper API
 */
export interface AzureWhisperConfig {
	endpoint: string;
	apiKey: string;
	deploymentName: string;
}

/**
 * Validate that the Azure OpenAI configuration is complete.
 */
function validateConfig(config: AzureWhisperConfig): void {
	if (!config.endpoint) {
		throw new Error('Azure OpenAI endpoint is not configured. Please set it in settings.');
	}
	if (!config.apiKey) {
		throw new Error('Azure OpenAI API key is not configured. Please set it in settings.');
	}
	if (!config.deploymentName) {
		throw new Error('Azure OpenAI Whisper deployment name is not configured. Please set it in settings.');
	}
}

/**
 * Build the Azure OpenAI Whisper API URL.
 */
function buildApiUrl(config: AzureWhisperConfig): string {
	// Remove trailing slash from endpoint if present
	const endpoint = config.endpoint.replace(/\/$/, '');
	// Azure OpenAI Whisper API version
	const apiVersion = '2024-06-01';
	return `${endpoint}/openai/deployments/${config.deploymentName}/audio/transcriptions?api-version=${apiVersion}`;
}

/**
 * Build multipart form data for the API request.
 */
function buildMultipartFormData(
	boundary: string,
	audioBuffer: Buffer,
	fileName: string,
	includeTimestamps: boolean,
	language?: string
): ArrayBuffer {
	const parts: (string | Buffer)[] = [];

	// Add file field
	parts.push(`--${boundary}\r\n`);
	parts.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
	parts.push(`Content-Type: application/octet-stream\r\n\r\n`);
	parts.push(audioBuffer);
	parts.push('\r\n');

	// Add response_format field for timestamps
	const responseFormat = includeTimestamps ? 'verbose_json' : 'json';
	parts.push(`--${boundary}\r\n`);
	parts.push(`Content-Disposition: form-data; name="response_format"\r\n\r\n`);
	parts.push(`${responseFormat}\r\n`);

	// Add language field if specified
	if (language) {
		parts.push(`--${boundary}\r\n`);
		parts.push(`Content-Disposition: form-data; name="language"\r\n\r\n`);
		parts.push(`${language}\r\n`);
	}

	// Add timestamp_granularities for verbose_json
	if (includeTimestamps) {
		parts.push(`--${boundary}\r\n`);
		parts.push(`Content-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\n`);
		parts.push(`segment\r\n`);
	}

	// End boundary
	parts.push(`--${boundary}--\r\n`);

	// Combine all parts into a single ArrayBuffer
	const encoder = new TextEncoder();
	const buffers: Uint8Array[] = parts.map(part => {
		if (typeof part === 'string') {
			return encoder.encode(part);
		}
		return new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
	});

	const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
	const combined = new Uint8Array(totalLength);
	let offset = 0;
	for (const buf of buffers) {
		combined.set(new Uint8Array(buf), offset);
		offset += buf.byteLength;
	}

	return combined.buffer;
}

/**
 * Parse the Azure OpenAI Whisper API response into TranscriptionResult.
 */
function parseTranscriptionResponse(
	response: { text: string; segments?: Array<{ text: string; start: number; end: number }> },
	audioFilePath: string,
	includeTimestamps: boolean
): TranscriptionResult {
	const result: TranscriptionResult = {
		text: response.text,
		audioFilePath,
	};

	if (includeTimestamps && response.segments) {
		result.chunks = response.segments.map(segment => ({
			text: segment.text.trim(),
			timestamp: [segment.start, segment.end] as [number, number],
		}));
	}

	return result;
}

/**
 * Transcribe an audio file to text using Azure OpenAI Whisper API.
 *
 * @param audioFilePath - Path to the audio file (mp3, wav, m4a, webm, etc.)
 * @param config - Azure OpenAI Whisper configuration
 * @param options - Transcription options
 * @returns TranscriptionResult with text and optional timestamps
 */
export async function transcribe(
	audioFilePath: string,
	config: AzureWhisperConfig,
	options: {
		includeTimestamps?: boolean;
		language?: string;
	} = {}
): Promise<TranscriptionResult> {
	validateConfig(config);

	// Verify audio file exists
	if (!fs.existsSync(audioFilePath)) {
		throw new Error(`Audio file not found: ${audioFilePath}`);
	}

	try {
		new Notice('Transcribing audio with Azure OpenAI Whisper...');

		// Read the audio file
		const audioBuffer = fs.readFileSync(audioFilePath);
		const fileName = audioFilePath.split(/[/\\]/).pop() || 'audio.mp3';

		// Build the API URL
		const apiUrl = buildApiUrl(config);

		// Create multipart form data manually
		const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
		const formData = buildMultipartFormData(
			boundary,
			audioBuffer,
			fileName,
			options.includeTimestamps || false,
			options.language
		);

		// Make the API request using Obsidian's requestUrl
		const response = await requestUrl({
			url: apiUrl,
			method: 'POST',
			headers: {
				'api-key': config.apiKey,
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
			},
			body: formData,
		});

		if (response.status !== 200) {
			throw new Error(`Azure OpenAI API error: ${response.status} - ${response.text}`);
		}

		const result = response.json;
		new Notice('Transcription complete!');

		// Parse and format the response
		return parseTranscriptionResponse(result, audioFilePath, options.includeTimestamps || false);
	} catch (error) {
		console.error('Transcription error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		new Notice(`Transcription failed: ${errorMessage}`);
		throw error;
	}
}