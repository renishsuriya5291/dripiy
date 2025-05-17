// src/features/campaign/CampaignActions.jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  getCampaignActions,
  getCampaignActionStats,
  retryFailedActions,
  reset
} from './campaignActionSlice';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  MessageSquare,
  UserPlus,
  UserCheck,
  Eye,
} from 'lucide-react';

function CampaignActions({ campaignId, campaignStatus }) {
  const dispatch = useDispatch();
  const { actions, stats, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.campaignAction
  );
  
  const [activeTab, setActiveTab] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [showRetryDialog, setShowRetryDialog] = useState(false);

  // Load data on component mount
  useEffect(() => {
    // dispatch(getCampaignActions(campaignId));
    // dispatch(getCampaignActionStats(campaignId));
    return () => {
      dispatch(reset());
    };
  }, [dispatch, campaignId]);

  // Handle toast notifications for errors
  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    if (isSuccess && message) {
      toast.success(message);
    }
  }, [isError, isSuccess, message]);

  // Manual refresh handler
  const handleRefresh = () => {
    dispatch(getCampaignActions(campaignId));
    dispatch(getCampaignActionStats(campaignId));
    toast.info('Refreshing campaign actions...');
  };

  // Retry failed actions handler
  const handleRetryFailed = () => {
    dispatch(retryFailedActions(campaignId))
      .unwrap()
      .then(() => {
        toast.success('Failed actions scheduled for retry');
        dispatch(getCampaignActions(campaignId));
        setShowRetryDialog(false);
      })
      .catch((error) => {
        toast.error(`Error retrying actions: ${error}`);
      });
  };

  // Get counts by status
  const getStatusCounts = () => {
    const completed = actions?.completed?.length || 0;
    const pending = actions?.pending?.length || 0;
    const failed = actions?.failed?.length || 0;
    const total = completed + pending + failed;
    
    return { completed, pending, failed, total };
  };

  // Render action icon based on type
  const getActionIcon = (type) => {
    switch (type) {
      case 'invite_sent':
        return <UserPlus className="h-4 w-4" />;
      case 'invite_accepted':
        return <UserCheck className="h-4 w-4" />;
      case 'message_sent':
        return <Send className="h-4 w-4" />;
      case 'message_replied':
        return <MessageSquare className="h-4 w-4" />;
      case 'profile_viewed':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Render action status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const statusCounts = getStatusCounts();

  // Handle empty or loading state
  if (isLoading && (!actions || Object.keys(actions).length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Actions</CardTitle>
          <CardDescription>Loading actions data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If no actions at all
  if (!isLoading && (!actions || Object.keys(actions).length === 0 || statusCounts.total === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Actions</CardTitle>
          <CardDescription>
            Monitor outreach activity on LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-gray-100 p-3">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No LinkedIn actions yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            {campaignStatus === 'draft'
              ? 'Start your campaign to begin LinkedIn actions.'
              : campaignStatus === 'running' || campaignStatus === 'active'
              ? 'LinkedIn actions will appear here once they start processing.'
              : 'This campaign is not currently running LinkedIn actions.'}
          </p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>LinkedIn Actions</CardTitle>
          <CardDescription>
            Monitor outreach activity on LinkedIn
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {/* Action stats summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-md text-center">
            <div className="text-2xl font-semibold">{statusCounts.total}</div>
            <div className="text-sm text-gray-500">Total Actions</div>
          </div>
          <div className="bg-green-50 p-3 rounded-md text-center">
            <div className="text-2xl font-semibold text-green-700">
              {statusCounts.completed}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-md text-center">
            <div className="text-2xl font-semibold text-blue-700">
              {statusCounts.pending}
            </div>
            <div className="text-sm text-blue-700">Pending</div>
          </div>
          <div className="bg-red-50 p-3 rounded-md text-center">
            <div className="text-2xl font-semibold text-red-700">
              {statusCounts.failed}
            </div>
            <div className="text-sm text-red-700">Failed</div>
          </div>
        </div>

        {/* Action list tabs */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {[...(actions.completed || []), ...(actions.pending || []), ...(actions.failed || [])]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 15)
              .map((action) => (
                <div
                  key={action._id}
                  className="border rounded-lg p-3 flex flex-col sm:flex-row justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="mr-2">{getActionIcon(action.type)}</div>
                      <span className="font-medium capitalize">
                        {action.type.replace('_', ' ')}
                      </span>
                      <div className="ml-2">
                        {getStatusBadge(action.status)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Lead: {action.lead?.firstName} {action.lead?.lastName} - {action.lead?.position} at {action.lead?.company}
                    </div>
                    {action.actionData?.message && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                        Message: "{action.actionData.message}"
                      </div>
                    )}
                    {action.status === 'failed' && action.actionData?.error && (
                      <div className="text-sm text-red-500 mt-1">
                        Error: {action.actionData.error.message}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 sm:mt-0 sm:ml-4 sm:text-right">
                    <div>Created: {formatDate(action.createdAt)}</div>
                    {action.executedAt && (
                      <div>Executed: {formatDate(action.executedAt)}</div>
                    )}
                    {action.scheduledFor && action.status === 'pending' && (
                      <div>Scheduled: {formatDate(action.scheduledFor)}</div>
                    )}
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {(actions.completed || []).length > 0 ? (
              [...(actions.completed || [])]
                .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
                .slice(0, 15)
                .map((action) => (
                  <div
                    key={action._id}
                    className="border rounded-lg p-3 flex flex-col sm:flex-row justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="mr-2">{getActionIcon(action.type)}</div>
                        <span className="font-medium capitalize">
                          {action.type.replace('_', ' ')}
                        </span>
                        <div className="ml-2">
                          {getStatusBadge(action.status)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Lead: {action.lead?.firstName} {action.lead?.lastName} - {action.lead?.position} at {action.lead?.company}
                      </div>
                      {action.actionData?.message && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                          Message: "{action.actionData.message}"
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2 sm:mt-0 sm:ml-4 sm:text-right">
                      <div>Created: {formatDate(action.createdAt)}</div>
                      <div>Executed: {formatDate(action.executedAt)}</div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No completed actions found
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {(actions.pending || []).length > 0 ? (
              [...(actions.pending || [])]
                .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
                .slice(0, 15)
                .map((action) => (
                  <div
                    key={action._id}
                    className="border rounded-lg p-3 flex flex-col sm:flex-row justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="mr-2">{getActionIcon(action.type)}</div>
                        <span className="font-medium capitalize">
                          {action.type.replace('_', ' ')}
                        </span>
                        <div className="ml-2">
                          {getStatusBadge(action.status)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Lead: {action.lead?.firstName} {action.lead?.lastName} - {action.lead?.position} at {action.lead?.company}
                      </div>
                      {action.actionData?.message && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                          Message: "{action.actionData.message}"
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2 sm:mt-0 sm:ml-4 sm:text-right">
                      <div>Created: {formatDate(action.createdAt)}</div>
                      <div>Scheduled: {formatDate(action.scheduledFor)}</div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No pending actions found
              </div>
            )}
          </TabsContent>

          <TabsContent value="failed" className="space-y-4">
            {(actions.failed || []).length > 0 ? (
              [...(actions.failed || [])]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 15)
                .map((action) => (
                  <div
                    key={action._id}
                    className="border border-red-100 bg-red-50 rounded-lg p-3 flex flex-col sm:flex-row justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="mr-2">{getActionIcon(action.type)}</div>
                        <span className="font-medium capitalize">
                          {action.type.replace('_', ' ')}
                        </span>
                        <div className="ml-2">
                          {getStatusBadge(action.status)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        Lead: {action.lead?.firstName} {action.lead?.lastName} - {action.lead?.position} at {action.lead?.company}
                      </div>
                      {action.actionData?.message && (
                        <div className="text-sm text-gray-700 mt-1 line-clamp-1">
                          Message: "{action.actionData.message}"
                        </div>
                      )}
                      {action.actionData?.error && (
                        <div className="text-sm text-red-700 mt-2 font-medium">
                          Error: {action.actionData.error.message}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 sm:mt-0 sm:ml-4 sm:text-right">
                      <div>Created: {formatDate(action.createdAt)}</div>
                      <div>Failed at: {formatDate(action.executedAt)}</div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No failed actions found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setActiveTab(activeTab === 'all' ? 'failed' : 'all')
          }
        >
          {activeTab === 'all' ? 'View Failed Actions' : 'View All Actions'}
        </Button>
        {(actions.failed || []).length > 0 && (
          <AlertDialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Failed Actions ({(actions.failed || []).length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retry Failed Actions</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reschedule all failed LinkedIn actions to be tried again. 
                  Are you sure you want to continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRetryFailed}>
                  Yes, Retry Actions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}

export default CampaignActions;