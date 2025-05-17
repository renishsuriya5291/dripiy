// src/features/sequence/nodes/ViewProfileNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Eye } from 'lucide-react';

const ViewProfileNode = ({ data }) => {
  return (
    <div className="rounded-md border bg-purple-50 border-purple-200 shadow-sm px-4 py-3">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center mr-2">
            <Eye className="h-4 w-4 text-purple-600" />
          </div>
          <div className="font-semibold">View Profile</div>
        </div>
        <div className="text-xs text-gray-600">
          Visit lead's LinkedIn profile
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default memo(ViewProfileNode);