// src/features/sequence/nodes/SendInviteNode.jsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { UserPlus, MessageCircle } from 'lucide-react';

const SendInviteNode = ({ data }) => {
  // Take the first 60 characters of the message for preview
  const getPreviewText = () => {
    if (data.message) {
      return data.message.length > 60 ? `${data.message.substring(0, 60)}...` : data.message;
    }
    return '';
  };

  const previewText = getPreviewText();

  return (
    <div className="rounded-md border bg-blue-50 border-blue-200 shadow-sm px-4 py-3 min-w-[220px]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-blue-400" 
      />
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 border border-blue-200">
            <UserPlus className="h-4 w-4 text-blue-600" />
          </div>
          <div className="font-semibold">Send Connection</div>
        </div>
        
        {previewText ? (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border border-blue-100 line-clamp-2 mb-1">
            "{previewText}"
          </div>
        ) : (
          <div className="bg-white p-2 rounded border border-blue-200 text-xs text-gray-400 mb-1 flex items-center">
            <MessageCircle className="h-3 w-3 mr-1" />
            No message added
          </div>
        )}
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-blue-400" 
      />
    </div>
  );
};

export default memo(SendInviteNode);