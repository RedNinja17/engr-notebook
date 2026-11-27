export interface Part {
    id: string;
    name: string;
    unit: string; // something like 'piece' for a singular object (motor, screw, etc), 'gram' for stuff like sand?? idk, or like 'meter' for wire and stuff
    unitPrice: number;
    quantity: number;
}

export interface AnimationRule {
    partId: string;
    axis: 'X' | 'Y' | 'Z';
    rpm: number;
}

export interface AssetReference {
    id: string;
    name: string;
    mimeType: string;
    relativePath: string;
}

export interface CADPart {
    step?: AssetReference;
    glb?: AssetReference;
    calculatedVolumeCM3: number;
    filamentDensity: number;
    infillPercent: number;
    waste: number;
    pricePerGram: number;
    animations?: AnimationRule[];
}

export interface SketchStroke {
    points: [number, number][];
    color: string;
    size: number;
}

export type NodeMedia =
    | {
        id: string;
        type: 'image';
        asset: AssetReference;
        caption?: string;
    }
    | {
        id: string;
        type: 'sketch';
        strokes: SketchStroke[];
        caption?: string;
    };

export interface EngineeringNodeData extends Record<string, unknown> {
    title: string;
    notes: string;
    cadAsset?: CADPart;
    parts: Part[];
    media: NodeMedia[];
}

export interface EngineeringNode {
    id: string;
    type: 'engineeringNode';
    position: { x: number; y: number };
    data: EngineeringNodeData;
}

export interface EngineeringEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

export interface ProjectFile {
    projectName: string;
    version: string;
    lastModified: string;
    defaults: {
        pricePerGram: number;
        filamentDensity: number;
        waste: number;
    };
    nodes: EngineeringNode[];
    edges: EngineeringEdge[];
}