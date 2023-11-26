import OpenAI from 'openai';
export interface IThread extends OpenAI.Beta.Thread {
    metadata: {
        name: string;
        annotationFiles?: ThreadAnnotationFile[];
    };
}

export interface ThreadAnnotationFile {
    fileName: string;
    fileId: string;
}
