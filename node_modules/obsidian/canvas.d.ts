
/**
 * A color used to encode color data for nodes and edges
 * can be a number (like "1") representing one of the (currently 6) supported colors.
 * or can be a custom color using the hex format "#FFFFFFF".
 */
export type CanvasColor = string;

/** The overall canvas file's JSON */
export interface CanvasData {
    nodes: AllCanvasNodeData[];
    edges: CanvasEdgeData[];

    /** Support arbitrary keys for forward compatibility */
    [key: string]: any;
}

/** A node */
export interface CanvasNodeData {
    /** The unique ID for this node */
    id: string;
    // The positional data
    x: number;
    y: number;
    width: number;
    height: number;
    /** The color of this node */
    color?: CanvasColor;

    // Support arbitrary keys for forward compatibility
    [key: string]: any;
}

export type AllCanvasNodeData = CanvasFileData | CanvasTextData | CanvasLinkData | CanvasGroupData;

/** A node that is a file, where the file is located somewhere in the vault. */
export interface CanvasFileData extends CanvasNodeData {
    type: 'file';
    file: string;
    /** An optional subpath which links to a heading or a block. Always starts with a `#`. */
    subpath?: string;
}

/** A node that is plaintext. */
export interface CanvasTextData extends CanvasNodeData {
    type: 'text';
    text: string;
}

/** A node that is an external resource. */
export interface CanvasLinkData extends CanvasNodeData {
    type: 'link';
    url: string;
}

/** The background image rendering style */
export type BackgroundStyle = 'cover' | 'ratio' | 'repeat';

/** A node that represents a group. */
export interface CanvasGroupData extends CanvasNodeData {
    type: 'group';
    /** Optional label to display on top of the group. */
    label?: string;
    /** Optional background image, stores the path to the image file in the vault. */
    background?: string;
    /** Optional background image rendering style; defaults to 'cover'. */
    backgroundStyle?: BackgroundStyle;
}

/** The side of the node that a connection is connected to */
export type NodeSide = 'top' | 'right' | 'bottom' | 'left';

/** What to display at the end of an edge */
export type EdgeEnd = 'none' | 'arrow';

/** An edge */
export interface CanvasEdgeData {
    /** The unique ID for this edge */
    id: string;
    /** The node ID and side where this edge starts */
    fromNode: string;
    fromSide: NodeSide;
    /** The starting edge end; defaults to 'none' */
    fromEnd?: EdgeEnd;
    /** The node ID and side where this edge ends */
    toNode: string;
    toSide: NodeSide;
    /** The ending edge end; defaults to 'arrow' */
    toEnd?: EdgeEnd;
    /** The color of this edge */
    color?: CanvasColor;
    /** The text label of this edge, if available */
    label?: string;

    // Support arbitrary keys for forward compatibility
    [key: string]: any;
}