// src/features/settings/Settings.jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../components/ui/avatar';
import {
  Loader2,
  Save,
  User,
  Lock,
  Clock,
  Calendar,
  Upload,
} from 'lucide-react';

// Timezones array for the timezone select
const TIMEZONES = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00',
  'UTC-06:00', 'UTC-05:00', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00',
  'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00', 'UTC+05:00',
  'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00',
  'UTC+12:00'
];

// Days of the week
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Helper function to generate time options
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourString = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'am' : 'pm';
    options.push(`${hourString}:00 ${ampm}`);
    options.push(`${hourString}:30 ${ampm}`);
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Create these actions in settingsSlice.js
import {
  updateUserProfile,
  updateUserPassword,
  updateUserWorkingHours,
  updateUserDailyLimits,
  getUserProfile
} from './settingsSlice';
import WorkingHoursInterface from './WorkingHoursInterface';

function Settings() {
  const dispatch = useDispatch();
  const { user, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.auth
  );

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatarUrl: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [workingHours, setWorkingHours] = useState({
    timezone: 'UTC+00:00',
    days: DAYS_OF_WEEK.map(day => ({
      day: day.value,
      enabled: true,
      start: '9:00 am',
      end: '5:00 pm',
    })),
  });

  const [dailyLimits, setDailyLimits] = useState({
    connections: 25,
    messages: 50,
    profileViews: 30,
    endorsements: 15,
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingWorkingHours, setIsUpdatingWorkingHours] = useState(false);
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  // Load user data on component mount
  useEffect(() => {
    dispatch(getUserProfile());
  }, [dispatch]);

  // Update local state when user data is available
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.user.name || '',
        email: user.user.email || '',
        avatarUrl: user.user.avatarUrl || '',
      });

      if (user.user.workingHours) {
        setWorkingHours(user.user.workingHours);
      } else {
        // Initialize with default working hours if not set
        setWorkingHours({
          timezone: 'UTC+00:00',
          days: DAYS_OF_WEEK.map(day => ({
            day: day.value,
            enabled: true,
            start: '9:00 am',
            end: '5:00 pm',
          })),
        });
      }

      if (user.user.settings?.dailyLimits) {
        setDailyLimits(user.user.settings.dailyLimits);
      }
    }
  }, [user]);

  // Handle API responses
  useEffect(() => {
    if (isError) {
      toast.error(message || 'An error occurred');
      setIsUpdatingProfile(false);
      setIsUpdatingPassword(false);
      setIsUpdatingWorkingHours(false);
      setIsUpdatingLimits(false);
    }

    if (isSuccess && message) {
      toast.success(message);
      setIsUpdatingProfile(false);
      setIsUpdatingPassword(false);
      setIsUpdatingWorkingHours(false);
      setIsUpdatingLimits(false);

      // Clear password fields after successful update
      if (isUpdatingPassword) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    }
  }, [isError, isSuccess, message, isUpdatingPassword]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleDailyLimitChange = (name, value) => {
    setDailyLimits((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleWorkingHourChange = (dayIndex, field, value) => {
    setWorkingHours((prevState) => {
      const updatedDays = [...prevState.days];
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        [field]: value,
      };
      return {
        ...prevState,
        days: updatedDays,
      };
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatar(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prevState) => ({
          ...prevState,
          avatarUrl: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileHandler = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    // Create FormData for avatar upload
    const formData = new FormData();
    formData.append('name', profileData.name);
    formData.append('email', profileData.email);
    if (selectedAvatar) {
      formData.append('avatar', selectedAvatar);
    }

    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      setSelectedAvatar(null);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const updatePasswordHandler = async (e) => {
    e.preventDefault();
    setIsUpdatingPassword(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsUpdatingPassword(false);
      return;
    }

    try {
      await dispatch(updateUserPassword(passwordData)).unwrap();
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error(error?.error || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const updateWorkingHoursHandler = async (e) => {
    e.preventDefault();
    setIsUpdatingWorkingHours(true);

    try {
      await dispatch(updateUserWorkingHours(workingHours)).unwrap();
      toast.success('Working hours updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update working hours');
    } finally {
      setIsUpdatingWorkingHours(false);
    }
  };

  const updateLimitsHandler = async (e) => {
    e.preventDefault();
    setIsUpdatingLimits(true);

    try {
      await dispatch(updateUserDailyLimits(dailyLimits)).unwrap();
      toast.success('Daily limits updated successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to update daily limits');
    } finally {
      setIsUpdatingLimits(false);
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!profileData.name) return 'U';
    const nameParts = profileData.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0);
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full sm:w-auto mb-4 grid sm:grid-cols-4 grid-cols-2 gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="working-hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Working Hours</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Limits</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateProfileHandler}>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex flex-col items-center space-y-2">

                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={profileData.name}
                          onChange={handleProfileChange}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          readOnly
                          value={profileData.email}
                          onChange={handleProfileChange}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updatePasswordHandler}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Working Hours Settings */}
        <TabsContent value="working-hours">
          <Card>
            <CardHeader>
              <CardTitle>Working Hours Settings</CardTitle>
              <CardDescription>
                Set your available working days and hours
              </CardDescription>
            </CardHeader>
            <WorkingHoursInterface />
          </Card>
        </TabsContent>


        {/* Daily Limits Settings */}
        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle>Daily Limits</CardTitle>
              <CardDescription>
                Set the maximum number of actions to perform daily for each account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateLimitsHandler}>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label>Connection Requests</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={dailyLimits.connections}
                        onChange={(e) =>
                          handleDailyLimitChange('connections', parseInt(e.target.value))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">
                        requests per day (recommended: 20-25)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Messages</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        value={dailyLimits.messages}
                        onChange={(e) =>
                          handleDailyLimitChange('messages', parseInt(e.target.value))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">
                        messages per day (recommended: 50-75)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Profile Views</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={dailyLimits.profileViews}
                        onChange={(e) =>
                          handleDailyLimitChange('profileViews', parseInt(e.target.value))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">
                        profile views per day (recommended: 30-40)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Skill Endorsements</Label>
                    <div className="flex space-x-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={dailyLimits.endorsements}
                        onChange={(e) =>
                          handleDailyLimitChange('endorsements', parseInt(e.target.value))
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">
                        endorsements per day (recommended: 10-15)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingLimits}
                  >
                    {isUpdatingLimits ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Limits
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Settings;

// Add this comment to ensure proper export
// Export default statement for Settings component