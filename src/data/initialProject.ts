import type { ProjectFile } from "../types/project";

export const initialProject: ProjectFile = {
    projectName: 'Robotic Arm',
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    defaults: {
        pricePerGram: 0.025,
        filamentDensity: 1.27,
        waste: 1.15,
    },
    nodes: [
        {
            id: 'n1',
            type: 'engineeringNode',
            position: { x: 100, y: 150 },
            data: {
                title: 'Chassis',
                notes: 'notes or something',
                cadAsset: {
                    calculatedVolumeCM3: 85.4,
                    filamentDensity: 1.27,
                    infillPercent: 35,
                    waste: 1.15,
                    pricePerGram: 0.025,
                },
                parts: [
                    {
                        id: 'p1',
                        name: 'NEMA 17 Stepper Motor',
                        unit: 'piece',
                        unitPrice: 14.99,
                        quantity: 1,
                    },
                    {
                        id: 'p2',
                        name: 'M3 Bolts',
                        unit: 'piece',
                        unitPrice: 0.085,
                        quantity: 100,
                    },
                ],
                media: [],
            },
        },
        {
            id: 'n2',
            type: 'engineeringNode',
            position: { x: 500, y: 150 },
            data: {
                title: 'Arm Segment',
                notes: 'notes or something',
                cadAsset: {
                    calculatedVolumeCM3: 120.2,
                    filamentDensity: 1.27,
                    infillPercent: 40,
                    waste: 1.15,
                    pricePerGram: 0.025,
                },
                parts: [],
                media: [],
            },
        },
    ],

    edges: [
        {
            id: 'e1-2',
            source: 'n1',
            target: 'n2',
            label: 'Connects to',
        },
    ],
};