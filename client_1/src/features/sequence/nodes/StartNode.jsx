// src/features/sequence/nodes/StartNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

const StartNode = ({ data }) => {
  return (
    <div className="rounded-md border bg-white shadow-sm px-4 py-3 text-center">
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="flex flex-col items-center justify-center">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-1">
          <Play className="h-4 w-4 text-green-600" />
        </div>
        <div className="font-semibold">Start</div>
        <div className="text-xs text-gray-500">Sequence begins here</div>
      </div>
    </div>
  );
};

export default memo(StartNode);