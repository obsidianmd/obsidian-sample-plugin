declare module 'lichess-pgn-viewer' {
    interface PgnViewOptions {
        pgn: string;
        pieceStyle?: string;
        boardStyle?: string;
        resizable?: boolean;
    }

    export default function(element: HTMLElement, options: PgnViewOptions): void;
} 