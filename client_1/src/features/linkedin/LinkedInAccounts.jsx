import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  getLinkedInAccounts,
  connectLinkedInAccount,
  deleteLinkedInAccount,
  setSelectedAccount,
  reset,
} from './linkedinSlice';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Loader2,
  Plus,
  Check,
  Trash2,
  ExternalLink,
  Linkedin,
  Shield,
  AlertCircle,
  X,
  Lock,
  User,
  Activity
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';

function LinkedInAccounts() {
  const dispatch = useDispatch();
  const { accounts, selectedAccount, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.linkedin
  );

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [connectionStep, setConnectionStep] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: '',
  });

  const { email, password, twoFactorCode } = formData;

  useEffect(() => {
    // Check if token exists before making API call
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      dispatch(getLinkedInAccounts());
    } else {
      toast.error('Authentication token not found. Please log in again.');
    }
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      toast.error(message || 'An error occurred');
      setConnectionStatus('error');
    }

    if (isSuccess && message) {
      toast.success(message);
      if (connectionStatus === 'connecting' || connectionStatus === 'verifying') {
        setConnectionStatus('success');
        setTimeout(() => {
          resetConnectionForm();
          // Refresh accounts list after successful connection
          dispatch(getLinkedInAccounts());
        }, 1500);
      }
    }

    dispatch(reset());
  }, [isError, isSuccess, message, dispatch, connectionStatus]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  // Only hide the form when explicitly closing or after success
  const resetConnectionForm = () => {
    setFormData({
      email: '',
      password: '',
      twoFactorCode: '',
    });
    setConnectionStep(1);
    setConnectionStatus('idle');
    setShowConnectForm(false);
  };

  const onSubmitCredentials = (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please provide both email and password');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Ensure token exists
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!token) {
      toast.error('Authentication token not found. Please log in again.');
      return;
    }

    setConnectionStatus('connecting');

    dispatch(connectLinkedInAccount({ email, password }))
      .unwrap()
      .then((response) => {
        if (response.requiresTwoFactor) {
          setConnectionStatus('requires2fa');
          setConnectionStep(2);
          toast.info('Please enter the verification code sent to your email or phone');
        } else {
          setConnectionStatus('success');
          toast.success('LinkedIn account connected successfully');
          setTimeout(() => {
            resetConnectionForm();
            // Refresh accounts list after successful connection
            dispatch(getLinkedInAccounts());
          }, 1500);
        }
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to connect LinkedIn account');
        setConnectionStatus('error');
      });
  };

  const onSubmitTwoFactor = (e) => {
    e.preventDefault();
    if (!twoFactorCode) {
      toast.error('Please enter the verification code');
      return;
    }

    // Validate verification code format (typically 6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(twoFactorCode)) {
      toast.error('Verification code should be 6 digits');
      return;
    }

    setConnectionStatus('verifying');

    dispatch(connectLinkedInAccount({
      email,
      twoFactorCode,
      verificationStep: true
    }))
      .unwrap()
      .then(() => {
        setConnectionStatus('success');
        toast.success('LinkedIn account connected successfully');
        setTimeout(() => {
          resetConnectionForm();
          // Refresh accounts list after successful connection
          dispatch(getLinkedInAccounts());
        }, 1500);
      })
      .catch((error) => {
        toast.error(error.message || 'Invalid verification code');
        setConnectionStatus('requires2fa');
      });
  };

  const handleSelectAccount = (account) => {
    dispatch(setSelectedAccount(account));
    toast.success(`Selected ${account.email}`);
  };

  const handleDeleteAccount = (accountId) => {
    if (!accountId) {
      toast.error('No account selected for deletion');
      return;
    }

    dispatch(deleteLinkedInAccount(accountId))
      .unwrap()
      .then(() => {
        setAccountToDelete(null);
        toast.success('LinkedIn account removed successfully');
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to remove account');
      });
  };

  const toggleConnectForm = () => {
    setShowConnectForm((prev) => {
      if (!prev) {
        // Opening the form: reset only the form data and step, but do NOT hide the form
        setFormData({
          email: '',
          password: '',
          twoFactorCode: '',
        });
        setConnectionStep(1);
        setConnectionStatus('idle');
      }
      return !prev;
    });
  };

  const getUsagePercentage = (account) => {
    // Parse the usage percentage or return default value
    if (!account || !account.dailyUsage) return 0;
    const match = account.dailyUsage.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Render connect form based on current step
  const renderConnectForm = () => {
    if (connectionStatus === 'success') {
      return (
        <Card className="border-green-200 bg-green-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-2 mr-3">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Account Connected Successfully!</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetConnectionForm}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-green-700 mb-4">
              Your LinkedIn account has been successfully connected and is ready for automation.
            </p>
            <Progress value={100} className="bg-green-100 h-2" />
          </CardContent>
        </Card>
      );
    }

    if (connectionStep === 1) {
      return (
        <Card className="mb-6 border-gray-200">
          <CardHeader className="bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-2 mr-3">
                  <Linkedin className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Connect LinkedIn Account</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleConnectForm}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Enter your LinkedIn credentials to connect your account for automation
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={onSubmitCredentials} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    LinkedIn Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={onChange}
                    required
                    placeholder="example@company.com"
                    disabled={connectionStatus === 'connecting'}
                    className="border-gray-300 focus:border-primary focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    LinkedIn Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={onChange}
                    required
                    placeholder="••••••••"
                    disabled={connectionStatus === 'connecting'}
                    className="border-gray-300 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-md flex items-start border border-blue-100">
                <Shield className="text-blue-500 h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Your credentials are securely processed and used only to establish a connection with LinkedIn.
                  We only store the cookies required for automation.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={connectionStatus === 'connecting'}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {connectionStatus === 'connecting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Linkedin className="mr-2 h-4 w-4" />
                      Connect Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      );
    }

    if (connectionStep === 2) {
      return (
        <Card className="mb-6 border-amber-200">
          <CardHeader className="bg-amber-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-full bg-amber-100 p-2 mr-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle>Verify Your LinkedIn Account</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleConnectForm}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Enter the verification code sent by LinkedIn to complete the connection
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md bg-amber-50 p-4 mb-6 border border-amber-100">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Verification Required</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      LinkedIn has sent a verification code to your email or phone.
                      Please enter it below to complete the connection.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmitTwoFactor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  Verification Code
                </Label>
                <Input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  value={twoFactorCode}
                  onChange={onChange}
                  required
                  placeholder="Enter verification code"
                  disabled={connectionStatus === 'verifying'}
                  className="text-center text-lg tracking-widest border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                />
                <p className="text-xs text-gray-500 text-center">Enter the 6-digit code sent to your email or phone</p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={connectionStatus === 'verifying'}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {connectionStatus === 'verifying' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Verify & Connect
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  // Updated function to match Campaigns.jsx empty state style
  const renderAccountsList = () => {
    if (isLoading && (!Array.isArray(accounts) || accounts.length === 0)) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Linkedin className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No LinkedIn Accounts</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Connect your LinkedIn account to start automating your outreach
            campaigns. You can connect multiple accounts for different purposes.
          </p>
          <Button
            onClick={toggleConnectForm}
            className="bg-primary text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Connect Your First Account
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card
            key={account._id}
            className={`overflow-hidden hover:shadow-md transition-all duration-200 ${
              selectedAccount && selectedAccount._id === account._id
                ? 'border-primary shadow ring-1 ring-primary/20'
                : 'border-gray-200'
            }`}
          >
            <CardHeader className={`pb-3 ${
              selectedAccount && selectedAccount._id === account._id
                ? 'bg-primary/5'
                : 'bg-gray-50'
            }`}>
              <div className="flex justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {account.status === 'active' ? 'Active' : 'Connecting...'}
                </span>
                {selectedAccount && selectedAccount._id === account._id && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Selected
                  </span>
                )}
              </div>
              <CardTitle className="flex items-center gap-2 mt-2 text-gray-800">
                <span className="truncate">{account.email}</span>
              </CardTitle>
              <CardDescription className="truncate text-gray-500">
                {account.name || 'LinkedIn User'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm space-y-4">
                <div className="flex justify-between py-1 items-center">
                  <div className="flex items-center text-gray-600">
                    <Activity className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Connection Status</span>
                  </div>
                  <span className="font-medium text-gray-700">
                    {account.connectionStatus || 'Connected'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Usage</span>
                    <span className="font-medium text-gray-700">
                      {account.dailyUsage || '0%'}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(account)}
                    className="h-2 bg-gray-100"
                    indicatorClassName={getUsagePercentage(account) > 80 ? "bg-red-500" : "bg-primary"}
                  />
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-gray-600">Last Used</span>
                  <span className="font-medium text-gray-700">
                    {account.lastUsed
                      ? new Date(account.lastUsed).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-3 border-t border-gray-100 bg-gray-50/50">
              <Button
                variant={selectedAccount && selectedAccount._id === account._id ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleSelectAccount(account)}
                disabled={selectedAccount && selectedAccount._id === account._id}
                className="font-medium"
              >
                {selectedAccount && selectedAccount._id === account._id ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Selected
                  </>
                ) : (
                  'Select'
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(`https://www.linkedin.com/in/${account.linkedInId || ''}`, '_blank')}
                  title="View LinkedIn Profile"
                  className="text-gray-500 hover:text-primary hover:bg-primary/10"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setAccountToDelete(account)}
                      title="Remove Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-gray-200">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-gray-800">
                        Remove LinkedIn Account
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-500">
                        Are you sure you want to remove this LinkedIn account?
                        All campaigns associated with this account will be
                        paused.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => handleDeleteAccount(accountToDelete?._id)}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">LinkedIn Accounts</h1>
          <p className="text-gray-500">
            Connect and manage your LinkedIn accounts for automation
          </p>
        </div>
        <Button 
          onClick={toggleConnectForm} 
          className="bg-primary text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Connect Account
        </Button>
      </div>

      {/* Connect Form Section - Inline instead of modal */}
      {showConnectForm && renderConnectForm()}

      {/* Account List or Empty State */}
      {renderAccountsList()}
    </div>
  );
}

export default LinkedInAccounts;