// src/components/common/NotFound.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { HomeIcon, ArrowLeft } from 'lucide-react';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50">
      <div className="max-w-md">
        <div className="text-6xl font-extrabold text-primary">404</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          Page not found
        </h1>
        <p className="mt-4 text-base text-gray-500">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <HomeIcon className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;