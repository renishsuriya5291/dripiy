// src/features/campaign/CampaignDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  getCampaignById,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  deleteCampaign,
  reset
} from './campaignSlice';
import {
  getCampaignActions,
  getCampaignActionStats,
  retryFailedActions
} from './campaignActionSlice';
import CampaignActions from './CampaignActions';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
  ArrowLeft,
  Pencil,
  Play,
  Pause,
  Square,
  Trash2,
  Loader2,
  AlertTriangle,
  Users,
  Send,
  MessageSquare,
  UserPlus,
  UserCheck,
  Eye,
  RefreshCw,
  BarChart
} from 'lucide-react';

function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { activeCampaign, isLoading, isError, message } = useSelector(
    (state) => state.campaign
  );
  const { actions, stats } = useSelector((state) => state.campaignAction);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Load campaign data
  useEffect(() => {
    if (id) {
      // dispatch(getCampaignById(id));
      // dispatch(getCampaignActions(id));
      // dispatch(getCampaignActionStats(id));
    }

    return () => {
      dispatch(reset());
    };
  }, [id, dispatch]);

  useEffect(() => {
    dispatch(getCampaignById(id));
    dispatch(getCampaignActions(id));
    dispatch(getCampaignActionStats(id));
  }, []);

  // Check for errors
  useEffect(() => {
    if (actions && actions.failed) {
      setHasErrors(actions.failed.length > 0);
      setErrorCount(actions.failed.length);
    }
  }, [actions]);

  // Show error toast if there's an API error
  useEffect(() => {
    if (isError) {
      toast.error(message);
    }
  }, [isError, message]);

  // Handlers for campaign actions
  const handleStartCampaign = async () => {
    setIsActionLoading(true);
    try {
      await dispatch(startCampaign(id)).unwrap();
      toast.success('Campaign started successfully');
      dispatch(getCampaignById(id));
    } catch (error) {
      toast.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseCampaign = async () => {
    setIsActionLoading(true);
    try {
      await dispatch(pauseCampaign(id)).unwrap();
      toast.success('Campaign paused successfully');
      dispatch(getCampaignById(id));
    } catch (error) {
      toast.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStopCampaign = async () => {
    setIsActionLoading(true);
    try {
      await dispatch(stopCampaign(id)).unwrap();
      toast.success('Campaign stopped successfully');
      dispatch(getCampaignById(id));
      setShowStopDialog(false);
    } catch (error) {
      toast.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    setIsActionLoading(true);
    try {
      await dispatch(deleteCampaign(id)).unwrap();
      toast.success('Campaign deleted successfully');
      navigate('/dashboard/campaigns');
    } catch (error) {
      toast.error(error);
    } finally {
      setIsActionLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleRetryFailed = () => {
    dispatch(retryFailedActions(id))
      .unwrap()
      .then(() => {
        toast.success('Failed actions scheduled for retry');
        dispatch(getCampaignActions(id));
      })
      .catch((error) => {
        toast.error(`Error retrying actions: ${error}`);
      });
  };

  const handleRefresh = () => {
    dispatch(getCampaignById(id));
    dispatch(getCampaignActions(id));
    dispatch(getCampaignActionStats(id));
    toast.info('Refreshing campaign data...');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeCampaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Campaign not found</h2>
        <p className="text-gray-500 mb-4">
          The campaign you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => navigate('/dashboard/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  // Helper to get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'stopped':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/campaigns')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-2xl font-bold">{activeCampaign.name}</h1>
          <div className="flex items-center">
            <Badge className={`${getStatusColor(activeCampaign.status)} mr-2`}>
              {(activeCampaign.status && typeof activeCampaign.status === 'string')
                ? activeCampaign.status.charAt(0).toUpperCase() + activeCampaign.status.slice(1)
                : 'Unknown'}
            </Badge>
            <p className="text-gray-500 text-sm">
              Created on {new Date(activeCampaign.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Campaign Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {activeCampaign.leadLists?.reduce((sum, list) => sum + (list.leadCount || 0), 0) || 0}
            </div>
            <p className="text-sm text-gray-500">
              Total leads in this campaign
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-primary" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {activeCampaign.analytics?.invitesAccepted || 0}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Out of {activeCampaign.analytics?.invitesSent || 0} invites sent
              </p>
              <div className="text-sm font-medium">
                {activeCampaign.analytics?.invitesSent
                  ? Math.round((activeCampaign.analytics.invitesAccepted / activeCampaign.analytics.invitesSent) * 100) + '%'
                  : '0%'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {activeCampaign.analytics?.messagesSent || 0}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {activeCampaign.analytics?.messagesReplied || 0} replies received
              </p>
              <div className="text-sm font-medium">
                {activeCampaign.analytics?.messagesSent
                  ? Math.round((activeCampaign.analytics.messagesReplied / activeCampaign.analytics.messagesSent) * 100) + '%'
                  : '0%'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {hasErrors && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                LinkedIn action errors detected
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  There {errorCount === 1 ? 'is' : 'are'} {errorCount} failed{' '}
                  {errorCount === 1 ? 'action' : 'actions'} in this campaign. This might
                  indicate an issue with your LinkedIn account or connection.
                </p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={handleRetryFailed}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Failed Actions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Campaign Controls</CardTitle>
          <CardDescription>
            Manage your campaign's status and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(activeCampaign.status === 'draft' || activeCampaign.status === 'paused' || activeCampaign.status === 'stopped') && (
              <Button
                onClick={handleStartCampaign}
                disabled={isActionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isActionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start Campaign
              </Button>
            )}

            {(activeCampaign.status === 'running' || activeCampaign.status === 'active') && (
              <Button
                onClick={handlePauseCampaign}
                disabled={isActionLoading}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isActionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                Pause Campaign
              </Button>
            )}

            {(activeCampaign.status === 'running' || activeCampaign.status === 'active' || activeCampaign.status === 'paused') && (
              <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isActionLoading}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop Campaign
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop Campaign</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to stop this campaign? This will halt all LinkedIn activity and you won't be able to resume it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleStopCampaign}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Yes, Stop Campaign
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/campaigns/edit/${id}`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Campaign
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isActionLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Campaign
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this campaign? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCampaign}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Yes, Delete Campaign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              onClick={handleRefresh}
              className="ml-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Actions */}
      <CampaignActions
        campaignId={id}
        campaignStatus={activeCampaign.status}
      />
    </div>
  );
}

export default CampaignDetail;