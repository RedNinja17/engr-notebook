import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';

export const EngineeringNodeComponent = memo(({ data }: { data: any }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-72 shadow-2xl text-zinc-100 relative">
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-3 !h-3 !-top-1.5" />
      
      <div className="flex items-center space-x-2 mb-2">
        <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-xs tracking-wide text-zinc-100">{data.title}</h4>
          <span className="text-[10px] text-zinc-500 font-mono">Engineering Node</span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
        {data.notes || 'No engineering notes provided.'}
      </p>

      {data.cadAsset?.pointerPath && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-cyan-400 font-mono">
          <Layers className="w-3 h-3" /> CAD Model Linked
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-3 !h-3 !-bottom-1.5" />
    </div>
  );
});

EngineeringNodeComponent.displayName = 'EngineeringNodeComponent';