import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Edit3, X } from 'lucide-react';
import type { SketchStroke } from '../types/project';

interface SketchpadProps {
    title: string;
    onSave: (strokes: SketchStroke[]) => void;
    onClose: () => void;
}

export function Sketchpad({ title, onSave, onClose }: SketchpadProps) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStrokes, setCurrentStrokes] = useState<SketchStroke[]>([]);
    const activeColor = '#38bdf8';

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsDrawing(true);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCurrentStrokes(prev => [
            ...prev,
            {
                points: [[x, y]],
                color: activeColor,
                size: 3,
            },
        ]);
    };

    const draw = (e: MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCurrentStrokes(prev => {
            const lastStroke = prev[prev.length - 1];
            if (!lastStroke) return prev;

            const updatedStroke = {
                ...lastStroke,
                points: [...lastStroke.points, [x, y] as [number, number]],
            };

            return [...prev.slice(0, -1), updatedStroke];
        });
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        currentStrokes.forEach(stroke => {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();

            stroke.points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point[0], point[1]);
                } else {
                    ctx.lineTo(point[0], point[1]);
                }
            });

            ctx.stroke();
        });
    }, [currentStrokes]);

    return (
        <div>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[700px] flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                            <Edit3 className="w-4 h-4" /> Sketchpad — {title}
                        </h3>
                        <button
                            onClick={() => onClose()}
                            className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 bg-zinc-950 flex justify-center">
                        <canvas
                            ref={canvasRef}
                            width={640}
                            height={380}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="bg-zinc-900 rounded-lg border border-zinc-800 cursor-crosshair shadow-inner"
                        />
                    </div>
                    <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
                        <button
                            onClick={() => setCurrentStrokes([])}
                            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium cursor-pointer"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => onSave(currentStrokes)}
                            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-xs text-zinc-950 font-semibold cursor-pointer"
                        >
                            Save Sketch to Node
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}