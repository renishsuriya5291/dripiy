// src/features/sequence/nodes/SendInviteNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { UserPlus } from 'lucide-react';

const SendInviteNode = ({ data }) => {
  return (
    <div className="rounded-md border bg-blue-50 border-blue-200 shadow-sm px-4 py-3">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mr-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
          </div>
          <div className="font-semibold">Send Connection</div>
        </div>
        {data.message ? (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border border-blue-100 max-w-[200px] truncate">
            {data.message}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No message added</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default memo(SendInviteNode);