import React, { useState, useEffect } from 'react';

const LoadingAnimation = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prevProgress + 1;
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="flex items-center mb-6">
          <svg 
            className="w-10 h-10 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            ></path>
          </svg>
          <h2 className="ml-3 text-xl font-semibold text-gray-800">Prospx.in</h2>
        </div>

        <div className="space-y-4">
          <div className="relative pt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Loading your campaigns</div>
              <div className="text-sm font-medium text-blue-600">{progress}%</div>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-blue-100">
              <div 
                style={{ width: `${progress}%` }}
                className="shadow-md flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300"
              ></div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <div className="animate-pulse flex space-x-4 items-center">
              <div className="rounded-full bg-blue-200 h-8 w-8"></div>
              <div className="h-2 bg-blue-200 rounded w-16"></div>
            </div>
            <div className="animate-pulse flex space-x-4 items-center">
              <div className="rounded-full bg-blue-200 h-8 w-8"></div>
              <div className="h-2 bg-blue-200 rounded w-16"></div>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <div className="grid grid-flow-col gap-2 text-center">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce mb-1" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce mb-1" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce mb-1" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <div className="text-gray-600 text-sm mb-2">Processing your LinkedIn campaigns</div>
        <div className="flex items-center justify-center space-x-2">
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}></div>
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;