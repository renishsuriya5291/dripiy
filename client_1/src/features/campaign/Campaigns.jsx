// src/features/campaign/Campaigns.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getCampaigns,
  startCampaign,
  pauseCampaign,
  deleteCampaign,
  reset,
} from './campaignSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  ListChecks, 
  Plus, 
  Loader2,
  Search
} from 'lucide-react';

function Campaigns() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { campaigns, isLoading } = useSelector((state) => state.campaign);
  const { accounts } = useSelector((state) => state.linkedin);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    dispatch(getCampaigns());
  }, [dispatch]);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, selectedStatus]);

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (campaign) => campaign.name?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(
        (campaign) => campaign.status === selectedStatus
      );
    }

    setFilteredCampaigns(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
  };

  const renderCampaignList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (campaigns.length === 0) {
      return (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No Campaigns Yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Create your first campaign to start automating your LinkedIn outreach
            and connect with potential leads.
          </p>
          <Button 
            onClick={() => navigate('/dashboard/campaigns/new')}
            className="bg-primary text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Campaign
          </Button>
        </div>
      );
    }

    if (filteredCampaigns.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No matching campaigns</h3>
          <p className="text-sm text-gray-500">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign._id} className="border rounded-lg p-4 bg-white shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">{campaign.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                  campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-1">
                Sequence: <span className="font-medium">{campaign.sequence?.name || 'N/A'}</span>
              </div>
              <div className="text-xs text-gray-400 mb-1">
                Created: {new Date(campaign.createdAt).toLocaleString()}
              </div>
              <div className="flex gap-4 mt-2">
                <div className="text-xs text-gray-500">Invites Sent: <span className="font-semibold">{campaign.analytics?.invitesSent ?? 0}</span></div>
                <div className="text-xs text-gray-500">Accepted: <span className="font-semibold">{campaign.analytics?.invitesAccepted ?? 0}</span></div>
                <div className="text-xs text-gray-500">Messages: <span className="font-semibold">{campaign.analytics?.messagesSent ?? 0}</span></div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/campaigns/${campaign._id}`)}>
                View
              </Button>
              {campaign.status === 'active' ? (
                <Button variant="outline" size="sm" onClick={() => dispatch(pauseCampaign(campaign._id))}>
                  Pause
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => dispatch(startCampaign(campaign._id))}>
                  Start
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => dispatch(deleteCampaign(campaign._id))}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-gray-500">
            Manage your automated LinkedIn outreach campaigns
          </p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/campaigns/new')} 
          className="bg-primary text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Tabs
            defaultValue="all"
            value={selectedStatus}
            onValueChange={handleStatusChange}
            className="w-full"
          >
            <TabsList className="w-full sm:w-auto grid sm:grid-cols-5 grid-cols-3 gap-x-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search campaigns..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Campaign List or Empty State */}
        {renderCampaignList()}
      </div>
    </div>
  );
}

export default Campaigns;