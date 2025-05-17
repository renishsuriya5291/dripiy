// src/features/sequence/nodes/ConditionNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { HelpCircle, Check, X } from 'lucide-react';

const ConditionNode = ({ data }) => {
  const conditionLabels = {
    invite_accepted: 'Connection Accepted',
    message_read: 'Message Read',
    profile_open: 'Profile Viewed Back',
  };

  const conditionLabel = conditionLabels[data.condition] || 'Unknown Condition';

  return (
    <div className="rounded-md border bg-amber-50 border-amber-200 shadow-sm px-4 py-3 min-w-[220px]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-amber-400" 
      />
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-2 border border-amber-200">
            <HelpCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="font-semibold">Condition: If</div>
        </div>
        <div className="text-xs text-gray-700 bg-white p-2 rounded border border-amber-100 mb-3 font-medium">
          {conditionLabel}
        </div>
        
        <div className="flex justify-between text-xs mt-1">
          <div className="flex items-center text-green-600">
            <Check className="h-3 w-3 mr-1" />
            <span>Yes (↓)</span>
          </div>
          <div className="flex items-center text-red-600">
            <span>No (→)</span>
            <X className="h-3 w-3 ml-1" />
          </div>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="yes" 
        className="w-3 h-3 !bg-green-500"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="no" 
        className="w-3 h-3 !bg-red-500"
      />

      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        Yes
      </div>
      <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
        No
      </div>
    </div>
  );
};

export default memo(ConditionNode);