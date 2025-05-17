// src/features/sequence/nodes/EndNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Square } from 'lucide-react';

const EndNode = ({ data }) => {
  return (
    <div className="rounded-md border bg-white shadow-sm px-4 py-3 text-center">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex flex-col items-center justify-center">
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mb-1">
          <Square className="h-4 w-4 text-red-600" />
        </div>
        <div className="font-semibold">End</div>
        <div className="text-xs text-gray-500">Sequence ends here</div>
      </div>
    </div>
  );
};

export default memo(EndNode);