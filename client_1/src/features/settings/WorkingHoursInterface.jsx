import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label"
import { toast } from "sonner";

import { useDispatch } from 'react-redux';
import { updateUserWorkingHours } from '../settings/settingsSlice';


const WorkingHoursInterface = () => {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);
  const [timezone, setTimezone] = useState('UTC-03:00');
  const [workingHours, setWorkingHours] = useState([
    { day: 'Sunday', enabled: false, startTime: '9:00 am', endTime: '5:00 pm' },
    { day: 'Monday', enabled: true, startTime: '9:00 am', endTime: '5:00 pm' },
    { day: 'Tuesday', enabled: true, startTime: '9:00 am', endTime: '5:00 pm' },
    { day: 'Wednesday', enabled: true, startTime: '9:00 am', endTime: '5:00 pm' },
    { day: 'Thursday', enabled: true, startTime: '9:00 am', endTime: '5:00 pm' },
    { day: 'Friday', enabled: true, startTime: '9:00 am', endTime: '5:00 pm' },
    { day: 'Saturday', enabled: false, startTime: '9:00 am', endTime: '5:00 pm' },
  ]);

  const toggleDay = (index) => {
    const updatedHours = [...workingHours];
    updatedHours[index].enabled = !updatedHours[index].enabled;
    setWorkingHours(updatedHours);
  };

  const updateStartTime = (index, value) => {
    const updatedHours = [...workingHours];
    updatedHours[index].startTime = value;
    setWorkingHours(updatedHours);
  };

  const updateEndTime = (index, value) => {
    const updatedHours = [...workingHours];
    updatedHours[index].endTime = value;
    setWorkingHours(updatedHours);
  };
  const saveWorkingHoursHandler = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const backendPayload = {
        workingHours: {
          timezone,
          days: workingHours.map(wh => ({
            day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(wh.day),
            enabled: wh.enabled,
            start: wh.startTime,
            end: wh.endTime
          }))
        }
      };

      await dispatch(updateUserWorkingHours(backendPayload)).unwrap();
      toast.success("Working hours updated successfully!");
    } catch (error) {
      toast.error("Failed to update working hours. Please try again.");
      console.error('Failed to update working hours:', error);
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <CardContent>
      <form onSubmit={saveWorkingHoursHandler}>
        <div className="space-y-6">
          {/* Timezone selection */}
          <div className="space-y-4">
            <Label>Timezone</Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="UTC-03:00">UTC-03:00</option>
              <option value="UTC-05:00">UTC-05:00</option>
              <option value="UTC+00:00">UTC+00:00</option>
              <option value="UTC+01:00">UTC+01:00</option>
              <option value="UTC+05:30">UTC+05:30</option>
            </select>
          </div>

          {/* Working days table */}
          <div className="space-y-4">
            <Label>Working Days & Hours</Label>

            <div className="border rounded-md overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 bg-gray-50 p-4 border-b">
                <div className="font-medium">Day</div>
                <div className="font-medium text-center">Enabled</div>
                <div className="font-medium">Start Time</div>
                <div className="font-medium">End Time</div>
              </div>

              {/* Table rows */}
              <div>
                {workingHours.map((day, index) => (
                  <div key={day.day} className={`grid grid-cols-4 p-4 items-center ${index < workingHours.length - 1 ? 'border-b' : ''}`}>
                    <div className="font-medium">{day.day}</div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`w-10 h-5 flex items-center rounded-full p-1 ${day.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <div className={`bg-white rounded-full w-4 h-4 shadow-md transform transition-transform duration-300 ${day.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                    <div>
                      <select
                        disabled={!day.enabled}
                        value={day.startTime}
                        onChange={(e) => updateStartTime(index, e.target.value)}
                        className={`block w-full px-3 py-1.5 border border-gray-300 rounded-md ${!day.enabled ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                      >
                        <option value="6:00 am">6:00 am</option>
                        <option value="6:30 am">6:30 am</option>
                        <option value="7:00 am">7:00 am</option>
                        <option value="7:30 am">7:30 am</option>
                        <option value="8:00 am">8:00 am</option>
                        <option value="8:30 am">8:30 am</option>
                        <option value="9:00 am">9:00 am</option>
                        <option value="9:30 am">9:30 am</option>
                        <option value="10:00 am">10:00 am</option>
                      </select>
                    </div>
                    <div>
                      <select
                        disabled={!day.enabled}
                        value={day.endTime}
                        onChange={(e) => updateEndTime(index, e.target.value)}
                        className={`block w-full px-3 py-1.5 border border-gray-300 rounded-md ${!day.enabled ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                      >
                        <option value="4:00 pm">4:00 pm</option>
                        <option value="4:30 pm">4:30 pm</option>
                        <option value="5:00 pm">5:00 pm</option>
                        <option value="5:30 pm">5:30 pm</option>
                        <option value="6:00 pm">6:00 pm</option>
                        <option value="6:30 pm">6:30 pm</option>
                        <option value="7:00 pm">7:00 pm</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save button - styled to match the Daily Limits save button */}
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Working Hours
              </>
            )}
          </Button>
        </div>
      </form>
    </CardContent>
  );
};

export default WorkingHoursInterface;
