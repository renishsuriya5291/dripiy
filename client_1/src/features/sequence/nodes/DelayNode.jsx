// src/features/sequence/nodes/DelayNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Clock, Hourglass } from 'lucide-react';

const DelayNode = ({ data }) => {
  // Handle different data structures to ensure backward compatibility
  const getValue = () => {
    if (data.delay && typeof data.delay === 'object' && 'value' in data.delay) {
      return data.delay.value;
    } else if (typeof data.delay === 'number') {
      return data.delay;
    }
    return 1;
  };
  
  const getUnit = () => {
    if (data.delay && typeof data.delay === 'object' && 'unit' in data.delay) {
      return data.delay.unit;
    }
    return 'days';
  };
  
  const value = getValue();
  const unit = getUnit();

  // Capitalize plural if needed
  const pluralizedUnit = value === 1 ? unit.replace(/s$/, '') : `${unit.replace(/s$/, '')}s`;

  return (
    <div className="rounded-md border bg-gray-50 border-gray-200 shadow-sm px-4 py-3 min-w-[220px]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-gray-400" 
      />
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2 border border-gray-200">
            <Clock className="h-4 w-4 text-gray-600" />
          </div>
          <div className="font-semibold">Wait</div>
        </div>
        <div className="flex items-center bg-white p-2 rounded border border-gray-200 mb-1">
          <Hourglass className="h-4 w-4 text-amber-500 mr-2" />
          <div className="text-sm font-medium">
            {value} {pluralizedUnit}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          System will wait before proceeding
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-gray-400" 
      />
    </div>
  );
};

export default memo(DelayNode);