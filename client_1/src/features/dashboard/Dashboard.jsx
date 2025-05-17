// src/features/dashboard/Dashboard.jsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, CircleDollarSign, Users, ArrowUpRight,
  CheckCircle2, Clock, XCircle, PlayCircle, PauseCircle,
  Plus, ArrowRight, Linkedin
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { getLinkedInAccounts } from '../linkedin/linkedinSlice';
import { getCampaigns } from '../campaign/campaignSlice';
import { getLeadLists } from '../leads/leadsSlice';

const CampaignStatusBadge = ({ status }) => {
  const statusConfig = {
    active: { icon: PlayCircle, color: 'text-green-500 bg-green-50' },
    paused: { icon: PauseCircle, color: 'text-amber-500 bg-amber-50' },
    draft: { icon: Clock, color: 'text-blue-500 bg-blue-50' },
    completed: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
  };

  const StatusIcon = statusConfig[status]?.icon || XCircle;
  const colorClass = statusConfig[status]?.color || 'text-gray-500 bg-gray-50';

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <StatusIcon className="w-3.5 h-3.5 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
};

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { user } = useSelector((state) => state.auth);
  const { accounts } = useSelector((state) => state.linkedin);
  const { campaigns } = useSelector((state) => state.campaign);
  const leadLists = useSelector((state) => state.leads && state.leads.leadLists ? state.leads.leadLists : []);

  useEffect(() => {
    dispatch(getLinkedInAccounts());
    dispatch(getCampaigns());
    dispatch(getLeadLists());
  }, [dispatch]);

  // Calculate analytics
  const activeCampaigns = campaigns.filter(campaign => campaign.status === 'active').length;
  const totalLeads = leadLists.reduce((acc, list) => acc + (list.leads?.length || 0), 0);
  const totalInvitesSent = campaigns.reduce((acc, campaign) => acc + (campaign.analytics?.invitesSent || 0), 0);
  const totalInvitesAccepted = campaigns.reduce((acc, campaign) => acc + (campaign.analytics?.invitesAccepted || 0), 0);
  const totalMessagesSent = campaigns.reduce((acc, campaign) => acc + (campaign.analytics?.messagesSent || 0), 0);
  const totalMessagesReplied = campaigns.reduce((acc, campaign) => acc + (campaign.analytics?.messagesReplied || 0), 0);
  
  const acceptanceRate = totalInvitesSent > 0 
    ? Math.round((totalInvitesAccepted / totalInvitesSent) * 100) 
    : 0;
  
  const responseRate = totalMessagesSent > 0 
    ? Math.round((totalMessagesReplied / totalMessagesSent) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/campaigns/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Linkedin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Connect LinkedIn Account</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md">
              To get started, you need to connect your LinkedIn account. This will allow you to create campaigns and automate your outreach.
            </p>
            <Button onClick={() => navigate('/dashboard/linkedin-accounts')}>
              Connect LinkedIn Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <PlayCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCampaigns}</div>
                <p className="text-xs text-gray-500">
                  {campaigns.length} total campaigns
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeads}</div>
                <p className="text-xs text-gray-500">
                  {leadLists.length} lead lists
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{acceptanceRate}%</div>
                <p className="text-xs text-gray-500">
                  {totalInvitesAccepted} / {totalInvitesSent} invites accepted
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <BarChart className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{responseRate}%</div>
                <p className="text-xs text-gray-500">
                  {totalMessagesReplied} / {totalMessagesSent} messages replied
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="campaigns">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="campaigns">Recent Campaigns</TabsTrigger>
              <TabsTrigger value="leads">Recent Leads</TabsTrigger>
            </TabsList>
            <TabsContent value="campaigns" className="mt-6">
              <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {campaigns.length > 0 ? (
                    campaigns.slice(0, 5).map(campaign => (
                      <div key={campaign._id} className="p-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                              <div className="mt-1 flex items-center">
                                <CampaignStatusBadge status={campaign.status} />
                                <span className="ml-2 text-xs text-gray-500">
                                  {campaign.leadLists?.length || 0} lead lists • 
                                  {' '}{campaign.analytics?.invitesSent || 0} invites sent
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/campaigns/${campaign._id}`)}
                          >
                            <span className="sr-only">View campaign</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500">
                        No campaigns yet. Create your first campaign to start automating your outreach.
                      </p>
                      <Button variant="outline" className="mt-3" onClick={() => navigate('/dashboard/campaigns/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Campaign
                      </Button>
                    </div>
                  )}
                </div>
                {campaigns.length > 0 && (
                  <div className="bg-gray-50 px-4 py-3 sm:px-6">
                    <div className="flex justify-between">
                      <div className="text-sm">
                        Showing <span className="font-medium">5</span> of{' '}
                        <span className="font-medium">{campaigns.length}</span> campaigns
                      </div>
                      <Button
                        variant="link"
                        onClick={() => navigate('/dashboard/campaigns')}
                        className="text-sm font-medium text-primary"
                      >
                        View all
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="leads" className="mt-6">
              <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {leadLists.length > 0 ? (
                    leadLists.slice(0, 5).map(list => (
                      <div key={list._id} className="p-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-500" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{list.name}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {list.leads?.length || 0} leads •{' '}
                                <span className="capitalize">{list.source || 'Manual'}</span>
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/lead-lists`)}
                          >
                            <span className="sr-only">View lead list</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500">
                        No lead lists yet. Create your first lead list to start collecting leads.
                      </p>
                      <Button variant="outline" className="mt-3" onClick={() => navigate('/dashboard/lead-lists')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Lead List
                      </Button>
                    </div>
                  )}
                </div>
                {leadLists.length > 0 && (
                  <div className="bg-gray-50 px-4 py-3 sm:px-6">
                    <div className="flex justify-between">
                      <div className="text-sm">
                        Showing <span className="font-medium">5</span> of{' '}
                        <span className="font-medium">{leadLists.length}</span> lead lists
                      </div>
                      <Button
                        variant="link"
                        onClick={() => navigate('/dashboard/lead-lists')}
                        className="text-sm font-medium text-primary"
                      >
                        View all
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {campaigns.filter(c => c.status === 'active').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Overview of your active campaign performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {campaigns
                  .filter(c => c.status === 'active')
                  .slice(0, 3)
                  .map(campaign => (
                    <div key={campaign._id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{campaign.name}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => navigate(`/dashboard/campaigns/${campaign._id}`)}
                        >
                          View
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Connection Acceptance</span>
                            <span>
                              {campaign.analytics?.invitesAccepted || 0}/{campaign.analytics?.invitesSent || 0}
                            </span>
                          </div>
                          <Progress 
                            value={campaign.analytics?.acceptanceRate || 0} 
                            className="h-2" 
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Message Reply Rate</span>
                            <span>
                              {campaign.analytics?.messagesReplied || 0}/{campaign.analytics?.messagesSent || 0}
                            </span>
                          </div>
                          <Progress 
                            value={campaign.analytics?.replyRate || 0} 
                            className="h-2" 
                          />
                        </div>
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;