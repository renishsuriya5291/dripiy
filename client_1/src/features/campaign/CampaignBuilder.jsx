// src/features/campaign/CampaignBuilder.jsx
// The main issue appears to be with sequence handling in the component

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getCampaignById,
  createCampaign,
  updateCampaign,
  startCampaign,
  reset,
} from './campaignSlice';
import { getLinkedInAccounts, connectLinkedInAccount } from '../linkedin/linkedinSlice';
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
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
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
  Loader2,
  Save,
  Play,
  AlertTriangle,
  Info,
  Users,
  Workflow,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Upload,
  Linkedin,
  Plus,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import axios from 'axios';
import SequenceBuilder from '../sequence/SequenceBuilder';

function CampaignBuilder() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { activeCampaign, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.campaign
  );
  const { accounts, selectedAccount, isLoading: linkedinLoading } = useSelector((state) => state.linkedin);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignData, setCampaignData] = useState({
    name: '',
    leadList: {
      name: '',
      leads: [],
      source: 'csv',
    },
    sequence: {
      name: '',
      nodes: [],
      edges: [],
    },
    filters: {
      excludeLeadsInOtherCampaigns: true,
      excludeLimitedProfiles: true,
      excludeFreeAccounts: false,
      customFilters: {},
    },
  });
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);

  // Lead management
  const [showSearchLeadsDialog, setShowSearchLeadsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  // Sequence builder state
  const [isSequenceBuilderMode, setIsSequenceBuilderMode] = useState(false);
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  // Load campaign data if editing
  useEffect(() => {
    if (id) {
      dispatch(getCampaignById(id));
    }

    dispatch(getLinkedInAccounts());

    return () => {
      dispatch(reset());
    };
  }, [id, dispatch]);

  // Set form data when active campaign changes
  useEffect(() => {
    if (activeCampaign && id) {
      // Log the active campaign data for debugging
      console.log('Active Campaign Data:', activeCampaign);

      // Get leads from existing lead list if available
      let leadsData = [];
      let leadListId = null;

      // Handle if we have lead lists data
      if (activeCampaign.leadLists && activeCampaign.leadLists.length > 0) {
        const leadList = activeCampaign.leadLists[0];
        leadListId = leadList._id;

        // If we have direct leads array
        if (leadList.leads && leadList.leads.length > 0) {
          leadsData = leadList.leads;
        }
        // If we have leadCount but no leads (common for large lists)
        else if (leadList.leadCount > 0) {
          // Create placeholder lead objects that will be enough to validate
          // This prevents the "please add leads" error while editing
          leadsData = Array(leadList.leadCount).fill().map((_, i) => ({
            id: `placeholder-${i}`,
            name: `Lead ${i + 1}`,
            exists: true // Mark as existing leads
          }));
        }
      }

      setCampaignData({
        name: activeCampaign.name || '',
        leadList: {
          name: activeCampaign.leadLists?.[0]?.name || '',
          leads: leadsData, // Use our processed leads data
          source: 'existing',
          leadListId: leadListId,
          // Store the lead count if available for display purposes
          leadCount: activeCampaign.leadLists?.[0]?.leadCount || leadsData.length
        },
        sequence: activeCampaign.sequence || {
          name: '',
          nodes: [],
          edges: [],
        },
        filters: {
          excludeLeadsInOtherCampaigns:
            activeCampaign.filters?.excludeLeadsInOtherCampaigns ?? true,
          excludeLimitedProfiles:
            activeCampaign.filters?.excludeLimitedProfiles ?? true,
          excludeFreeAccounts:
            activeCampaign.filters?.excludeFreeAccounts ?? false,
          customFilters: activeCampaign.filters?.customFilters || {},
        },
      });
    }
  }, [activeCampaign, id]);

  // Handle errors and success
  useEffect(() => {
    if (isError) {
      toast.error(message);
      setIsSubmitting(false);
    }

    if (isSuccess && message) {
      toast.success(message);
    }
  }, [isError, isSuccess, message]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCampaignData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeadListNameChange = (e) => {
    setCampaignData((prev) => ({
      ...prev,
      leadList: {
        ...prev.leadList,
        name: e.target.value,
      },
    }));
  };

  const handleSequenceNameChange = (e) => {
    setCampaignData((prev) => ({
      ...prev,
      sequence: {
        ...prev.sequence,
        name: e.target.value,
      },
    }));
  };

  const handleFilterChange = (key, value) => {
    setCampaignData((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value,
      },
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a valid CSV file');
        return;
      }
      setImportFile(file);
    }
  };

  const handleImportLeads = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setImporting(true);
      setImportProgress(0);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('name', campaignData.leadList.name || 'Imported Leads');
      formData.append('description', 'Imported from CSV');

      const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
      if (!token) {
        toast.error('Please login to import leads');
        setImporting(false);
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leadlists/upload-csv`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setImportProgress(percentCompleted);
          },
        }
      );

      if (response.data) {
        setCampaignData((prev) => ({
          ...prev,
          leadList: {
            ...prev.leadList,
            leads: response.data.leads || [],
            source: 'csv',
            leadListId: response.data.leadList?._id,
          },
        }));
        toast.success('Leads imported successfully');
        setImportFile(null);
        setImportProgress(0);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  const handleSearchLeads = () => {
    if (!searchQuery) {
      toast.error('Please enter a search query');
      return;
    }

    // Mock search - in a real app this would call an API
    const mockLeads = Array.from({ length: 12 }, (_, i) => ({
      id: `lead-${i}`,
      name: `Lead ${i + 1}`,
      position: searchQuery,
      company: 'Various Companies',
      location: searchLocation || 'Various Locations',
    }));

    setCampaignData((prev) => ({
      ...prev,
      leadList: {
        ...prev.leadList,
        leads: mockLeads,
        source: 'linkedin_search',
      },
    }));

    setShowSearchLeadsDialog(false);
    toast.success('12 leads found and imported');
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !campaignData.name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (currentStep === 2) {
      // Check if we have a leadListId (existing leads) or new leads
      if (!campaignData.leadList.name || (!campaignData.leadList.leadListId && campaignData.leadList.leads.length === 0)) {
        toast.error('Please import leads or search LinkedIn');
        return;
      }
    }

    if (currentStep === 3 && !campaignData.sequence.name) {
      toast.error('Please create a sequence');
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const saveCampaign = async (startAfterSave = false) => {
    if (!campaignData.name.trim()) {
      toast.error('Please enter a campaign name');
      setCurrentStep(1);
      return;
    }

    // Different validation for new vs. existing campaigns
    if (!id) {
      // New campaign validation
      if (campaignData.leadList.leads.length === 0 && !campaignData.leadList.leadListId) {
        toast.error('Please add leads to your campaign');
        setCurrentStep(2);
        return;
      }
    } else {
      // For existing campaigns, we check if we have leads or a leadListId
      const hasLeads = campaignData.leadList.leads.length > 0 ||
        campaignData.leadList.leadListId ||
        (activeCampaign?.leadLists &&
          activeCampaign.leadLists.length > 0 &&
          (activeCampaign.leadLists[0].leadCount > 0 ||
            activeCampaign.leadLists[0].leads?.length > 0));

      if (!hasLeads) {
        toast.error('Please add leads to your campaign');
        setCurrentStep(2);
        return;
      }
    }

    if (!campaignData.sequence.name || !campaignData.sequence._id) {
      toast.error('Please create a sequence');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      const payload = {
        ...campaignData,
        sequenceId: campaignData.sequence._id,
        status: startAfterSave ? 'active' : id ? activeCampaign.status : 'draft',
        // Include existing leadLists if we're editing an existing campaign
        leadLists: id && activeCampaign?.leadLists?.length > 0
          ? activeCampaign.leadLists.map(list => list._id)
          : campaignData.leadList.leadListId
            ? [campaignData.leadList.leadListId]
            : [],
      };

      console.log('Saving campaign with payload:', payload);

      if (id) {
        response = await dispatch(
          updateCampaign({ campaignId: id, campaignData: payload })
        ).unwrap();
      } else {
        response = await dispatch(createCampaign(payload)).unwrap();
      }

      if (startAfterSave && response._id) {
        await dispatch(startCampaign(response._id)).unwrap();
        toast.success('Campaign started successfully');
      } else {
        toast.success(
          id ? 'Campaign updated successfully' : 'Campaign created successfully'
        );
      }
      navigate('/dashboard/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(typeof error === 'string' ? error : 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
      setShowStartConfirmation(false);
    }
  };

  // Get the total lead count
  const getTotalLeadCount = () => {
    if (id && activeCampaign?.leadLists?.[0]) {
      // For existing campaigns, use leadCount from API if available
      return activeCampaign.leadLists[0].leadCount ||
        activeCampaign.leadLists[0].leads?.length ||
        campaignData.leadList.leads.length || 0;
    }
    // For new campaigns
    return campaignData.leadList.leads.length || 0;
  };

  // Check if we can proceed to the next step
  const canProceed = () => {
    if (currentStep === 1) return campaignData.name.trim() !== '';
    if (currentStep === 2) {
      // Allow proceeding if we have a leadListId (existing leads) or new leads
      return campaignData.leadList.name.trim() !== '' &&
        (campaignData.leadList.leadListId || campaignData.leadList.leads.length > 0);
    }
    if (currentStep === 3) return campaignData.sequence.name.trim() !== '';
    return true;
  };

  // Check if we have all required data to save or start the campaign
  const isFormValid = () => {
    // For existing campaigns (editing mode)
    if (id && activeCampaign) {
      return (
        campaignData.name.trim() !== '' &&
        campaignData.sequence.name.trim() !== '' &&
        campaignData.sequence._id !== undefined &&
        // Either we have leads in the state, or we have a leadListId
        (campaignData.leadList.leads.length > 0 || campaignData.leadList.leadListId ||
          (activeCampaign.leadLists && activeCampaign.leadLists.length > 0 &&
            (activeCampaign.leadLists[0].leadCount > 0 ||
              (activeCampaign.leadLists[0].leads && activeCampaign.leadLists[0].leads.length > 0))))
      );
    }

    // For new campaigns
    return (
      campaignData.name.trim() !== '' &&
      campaignData.leadList.name.trim() !== '' &&
      (campaignData.leadList.leadListId || campaignData.leadList.leads.length > 0) &&
      campaignData.sequence.name.trim() !== '' &&
      campaignData.sequence._id !== undefined
    );
  };

  // Render step indicator
  const StepIndicator = ({ step, currentStep, title }) => (
    <div className="flex items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${step === currentStep
          ? 'bg-primary text-white'
          : step < currentStep
            ? 'bg-primary/20 text-primary'
            : 'bg-gray-100 text-gray-400'
          }`}
      >
        {step < currentStep ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <span>{step}</span>
        )}
      </div>
      <div
        className={`ml-3 font-medium ${step === currentStep
          ? 'text-primary'
          : step < currentStep
            ? 'text-gray-900'
            : 'text-gray-400'
          }`}
      >
        {title}
      </div>
    </div>
  );

  // Function to create a basic default sequence
  const createDefaultSequence = async () => {
    try {
      const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
      if (!token) {
        toast.error('Please login to create a sequence');
        return;
      }

      // First create the sequence on the backend
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sequences`,
        {
          name: 'Default Outreach Sequence',
          nodes: [
            {
              id: 'start-node',
              type: 'start',
              position: { x: 100, y: 100 },
              data: { label: 'Start' }
            },
            {
              id: 'send-invite-1',
              type: 'send_invite',
              position: { x: 100, y: 200 },
              data: {
                message: 'Hi {{first_name}}, I noticed we work in the same industry and thought we could connect!'
              }
            },
            {
              id: 'delay-1',
              type: 'delay',
              position: { x: 100, y: 300 },
              data: { delay: { value: 2, unit: 'days' } }  // Changed to object with value and unit
            },
            {
              id: 'send-message-1',
              type: 'send_message',
              position: { x: 100, y: 400 },
              data: {
                message: 'Thank you for connecting! I wanted to reach out about...'
              }
            }
          ],
          edges: [
            {
              id: 'edge-start-invite',
              source: 'start-node',
              target: 'send-invite-1'
            },
            {
              id: 'edge-invite-delay',
              source: 'send-invite-1',
              target: 'delay-1'
            },
            {
              id: 'edge-delay-message',
              source: 'delay-1',
              target: 'send-message-1'
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update the campaign data with the newly created sequence
      if (response.data && response.data._id) {
        setCampaignData((prev) => ({
          ...prev,
          sequence: {
            _id: response.data._id,
            name: response.data.name,
            nodes: response.data.nodes,
            edges: response.data.edges
          }
        }));
        toast.success('Default sequence created');
      }
    } catch (error) {
      console.error('Sequence creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create default sequence');
    }
  };
  // Handle LinkedIn connection
  const handleConnectLinkedIn = async () => {
    try {
      await dispatch(connectLinkedInAccount()).unwrap();
      // The OAuth window will open and handle the connection
      // The polling in the thunk will update the state when connected
    } catch (error) {
      toast.error(error || 'Failed to connect LinkedIn account');
    }
  };

  // This function should be added at the top of your CampaignBuilder.jsx file
  // Format a delay object to a readable string
  const formatDelay = (delay) => {
    if (!delay) return '1 day';

    if (typeof delay === 'object' && 'value' in delay && 'unit' in delay) {
      const value = delay.value || 1;
      const unit = delay.unit || 'days';
      const singularUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
      return `${value} ${value === 1 ? singularUnit : unit}`;
    }

    if (typeof delay === 'number') {
      return `${delay} ${delay === 1 ? 'day' : 'days'}`;
    }

    return '1 day'; // Default fallback
  };

  // Open SequenceBuilder and persist campaignData
  const openSequenceBuilder = () => {
    // Store current campaign data before opening sequence builder
    localStorage.setItem('campaignDataDraft', JSON.stringify(campaignData));
    setShowSequenceBuilder(true);
  };

  // Handler to save sequence from SequenceBuilder
  const handleSequenceSave = async (sequence) => {
    try {
      const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
      if (!token) {
        toast.error('Please login to save sequence');
        return;
      }

      // Prepare the API request data
      const sequenceData = {
        name: sequence.name,
        nodes: sequence.nodes,
        edges: sequence.edges,
      };

      let response;

      // Check if we're updating an existing sequence or creating a new one
      if (campaignData.sequence && campaignData.sequence._id) {
        // Update existing sequence
        response = await axios.put(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sequences/${campaignData.sequence._id}`,
          sequenceData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        // Create new sequence
        response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sequences`,
          sequenceData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Restore campaignData from localStorage
      const draft = localStorage.getItem('campaignDataDraft');
      let prev = draft ? JSON.parse(draft) : campaignData;

      // Update the campaign with the saved sequence data
      setCampaignData({
        ...prev,
        sequence: {
          _id: response.data._id,
          name: response.data.name,
          nodes: response.data.nodes,
          edges: response.data.edges,
        },
      });

      setShowSequenceBuilder(false);
      localStorage.removeItem('campaignDataDraft');
      toast.success('Sequence saved!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save sequence');
    }
  };

  // Handler to cancel sequence editing
  const handleSequenceCancel = () => {
    const draft = localStorage.getItem('campaignDataDraft');
    if (draft) setCampaignData(JSON.parse(draft));
    setShowSequenceBuilder(false);
    localStorage.removeItem('campaignDataDraft');
  };

  // Show SequenceBuilder in embedded mode if requested
  if (showSequenceBuilder) {
    console.log('Opening SequenceBuilder with campaign data:', campaignData.sequence);
    return (
      <SequenceBuilder
        initialNodes={campaignData.sequence.nodes}
        initialEdges={campaignData.sequence.edges}
        initialName={campaignData.sequence.name}
        sequenceId={campaignData.sequence._id} // Pass the sequence ID explicitly
        onSave={handleSequenceSave}
        onCancel={handleSequenceCancel}
        embedded={true}
      />
    );
  }

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
        <h1 className="text-2xl font-bold ml-2">
          {id ? 'Edit Campaign' : 'Create New Campaign'}
        </h1>
      </div>

      {/* Check if LinkedIn account is connected */}
      {accounts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                No LinkedIn account connected
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  You need to connect a LinkedIn account before creating a
                  campaign. This will be used to automate your outreach.
                </p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectLinkedIn}
                  disabled={linkedinLoading}
                >
                  {linkedinLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Linkedin className="mr-2 h-4 w-4" />
                      Connect LinkedIn Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading && !campaignData.name ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stepper */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8 w-full">
              <StepIndicator step={1} currentStep={currentStep} title="Campaign Info" />

              <div className="hidden md:block">
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </div>

              <StepIndicator step={2} currentStep={currentStep} title="Add Leads" />

              <div className="hidden md:block">
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </div>

              <StepIndicator step={3} currentStep={currentStep} title="Create Sequence" />

              <div className="hidden md:block">
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </div>

              <StepIndicator step={4} currentStep={currentStep} title="Review & Launch" />
            </div>
          </div>

          {/* Step content */}
          <div className="bg-white rounded-lg shadow">
            {currentStep === 1 && (
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Campaign Information</CardTitle>
                  <CardDescription>
                    Name your campaign and add basic details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      value={campaignData.name}
                      onChange={handleChange}
                      placeholder="e.g., Sales Outreach Q2 2025"
                    />
                  </div>

                  {selectedAccount && (
                    <div className="pt-4">
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium">Selected LinkedIn Account</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            This campaign will run using your LinkedIn account{' '}
                            <span className="font-medium">{selectedAccount.email}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard/campaigns')}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceed()}
                    className="bg-primary text-white"
                  >
                    Next Step
                  </Button>
                </CardFooter>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Add Leads</CardTitle>
                  <CardDescription>
                    Create a list of leads for this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="leadListName">Lead List Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="leadListName"
                        value={campaignData.leadList.name}
                        onChange={handleLeadListNameChange}
                        placeholder="e.g., Marketing Directors Q2 2025"
                      />
                    </div>
                    {/* Always-visible CSV import section */}
                    <div className="border rounded-lg p-4 mt-4 bg-gray-50">
                      <h3 className="font-medium mb-2">Import from CSV</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          id="file"
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="flex-1"
                          disabled={importing}
                        />
                        <Button
                          onClick={handleImportLeads}
                          disabled={!importFile || importing}
                          className="bg-primary text-white"
                        >
                          {importing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>Import</>
                          )}
                        </Button>
                      </div>
                      {importing && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${importProgress}%` }}
                          ></div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        The CSV should include columns for name, position, company, and LinkedIn URL.
                      </p>
                    </div>
                    {/* LinkedIn Search section remains as a separate block below */}
                    <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors mt-4"
                      onClick={() => setShowSearchLeadsDialog(true)}
                    >
                      <div className="rounded-full bg-primary/10 p-3 mb-4">
                        <Linkedin className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium mb-2">Search LinkedIn</h3>
                      <p className="text-sm text-gray-500 text-center">
                        Find leads on LinkedIn based on criteria
                      </p>
                    </div>
                    {/* Show imported or existing leads if any */}
                    {campaignData.leadList.leads.length > 0 && (
                      <div className="space-y-4 mt-4">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Leads in List</h3>
                              <p className="text-sm text-gray-500">
                                {campaignData.leadList.leads.length} leads from {
                                  campaignData.leadList.source === 'csv' ? 'CSV file' : campaignData.leadList.source === 'linkedin_search' ? 'LinkedIn search' : 'existing list'
                                }
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setImportFile(null)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add More
                            </Button>
                          </div>
                          <div className="p-4">
                            <div className="text-sm text-gray-500 mb-2">Sample leads:</div>
                            <div className="space-y-2">
                              {campaignData.leadList.leads.slice(0, 5).map((lead) => (
                                <div key={lead.id || lead._id} className="flex items-center p-2 border rounded">
                                  <div className="flex-1">
                                    <p className="font-medium">{lead.name || `${lead.firstName} ${lead.lastName}`}</p>
                                    <p className="text-sm text-gray-500">{lead.position} at {lead.company}</p>
                                  </div>
                                  <div className="text-xs text-gray-500">{lead.location}</div>
                                </div>
                              ))}
                              {campaignData.leadList.leads.length > 5 && (
                                <div className="text-center text-sm text-gray-500 pt-2">
                                  + {campaignData.leadList.leads.length - 5} more leads
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevStep}>
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceed()}
                    className="bg-primary text-white"
                  >
                    Next Step
                  </Button>
                </CardFooter>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Create Sequence</CardTitle>
                  <CardDescription>
                    Design the outreach flow for your leads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="sequenceName">Sequence Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="sequenceName"
                        value={campaignData.sequence.name}
                        onChange={handleSequenceNameChange}
                        placeholder="e.g., 3-Step Connection Sequence"
                      />
                    </div>

                    {/* If no sequence exists yet, show a create button */}
                    {(!campaignData.sequence.nodes || campaignData.sequence.nodes.length === 0) ? (
                      <div className="flex flex-col items-center justify-center gap-4 p-8 border rounded-lg border-dashed">
                        <Workflow className="h-12 w-12 text-gray-300" />
                        <h3 className="font-medium text-center">No Sequence Created Yet</h3>
                        <p className="text-sm text-gray-500 text-center">
                          Create a sequence to define the steps in your outreach campaign
                        </p>
                        <div className="flex gap-3 mt-2">
                          <Button
                            variant="outline"
                            onClick={createDefaultSequence}
                          >
                            Use Default Sequence
                          </Button>
                          <Button
                            onClick={openSequenceBuilder}
                            className="bg-primary text-white"
                          >
                            <Workflow className="h-4 w-4 mr-2" />
                            Create Sequence
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{campaignData.sequence.name}</h3>
                              <p className="text-sm text-gray-500">
                                {campaignData.sequence.nodes.filter(node => node.type !== 'start').length} actions in sequence
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openSequenceBuilder}
                            >
                              <Workflow className="h-4 w-4 mr-1" />
                              Edit Sequence
                            </Button>
                          </div>
                          <div className="p-4">
                            <div className="space-y-4">
                              {campaignData.sequence.nodes
                                .filter(node => node.type !== 'start')
                                .map((node, index) => (
                                  <div key={node.id} className="flex items-start p-3 border rounded bg-gray-50">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-0.5">
                                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium capitalize">
                                        {node.type.replace('_', ' ')}
                                      </p>
                                      {node.data?.message && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                          {node.data.message}
                                        </p>
                                      )}
                                      {node.type === 'delay' && node.data?.delay && (
                                        <p className="text-sm text-gray-500 mt-1">
                                          Wait {formatDelay(node.data.delay)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevStep}>
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceed()}
                    className="bg-primary text-white"
                  >
                    Next Step
                  </Button>
                </CardFooter>
              </Card>
            )}

            {currentStep === 4 && (
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Review & Launch</CardTitle>
                  <CardDescription>
                    Review your campaign details and launch when ready
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Campaign Summary</h3>
                          <div className="mt-3 space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Campaign Name:</span>
                              <span className="font-medium">{campaignData.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Lead List:</span>
                              <span className="font-medium">
                                {campaignData.leadList.name} ({getTotalLeadCount()} leads)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Sequence:</span>
                              <span className="font-medium">
                                {campaignData.sequence.name || 'None created'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">LinkedIn Account:</span>
                              <span className="font-medium">
                                {selectedAccount ? selectedAccount.email : 'None selected'}
                              </span>
                            </div>
                            {campaignData.sequence._id && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Sequence ID:</span>
                                <span className="font-medium text-xs text-gray-500">
                                  {campaignData.sequence._id}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Filter className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Lead Filters</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            These filters help ensure you're targeting the right leads
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-start">
                          <Checkbox
                            id="excludeLeadsInOtherCampaigns"
                            checked={campaignData.filters.excludeLeadsInOtherCampaigns}
                            onCheckedChange={(checked) =>
                              handleFilterChange('excludeLeadsInOtherCampaigns', checked)
                            }
                          />
                          <div className="ml-3">
                            <label
                              htmlFor="excludeLeadsInOtherCampaigns"
                              className="font-medium cursor-pointer"
                            >
                              Exclude leads in other campaigns
                            </label>
                            <p className="text-sm text-gray-500">
                              Avoid reaching out to the same leads in multiple campaigns
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <Checkbox
                            id="excludeLimitedProfiles"
                            checked={campaignData.filters.excludeLimitedProfiles}
                            onCheckedChange={(checked) =>
                              handleFilterChange('excludeLimitedProfiles', checked)
                            }
                          />
                          <div className="ml-3">
                            <label
                              htmlFor="excludeLimitedProfiles"
                              className="font-medium cursor-pointer"
                            >
                              Exclude limited profiles
                            </label>
                            <p className="text-sm text-gray-500">
                              Skip LinkedIn profiles with limited visibility or information
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <Checkbox
                            id="excludeFreeAccounts"
                            checked={campaignData.filters.excludeFreeAccounts}
                            onCheckedChange={(checked) =>
                              handleFilterChange('excludeFreeAccounts', checked)
                            }
                          />
                          <div className="ml-3">
                            <label
                              htmlFor="excludeFreeAccounts"
                              className="font-medium cursor-pointer"
                            >
                              Exclude free accounts
                            </label>
                            <p className="text-sm text-gray-500">
                              Only target LinkedIn users with premium accounts
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handlePrevStep}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => saveCampaign(false)}
                      disabled={isSubmitting || !isFormValid()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save as Draft
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowStartConfirmation(true)}
                      disabled={isSubmitting || !isFormValid()}
                      className="bg-primary text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Launch Campaign
                        </>
                      )}
                    </Button>

                    <AlertDialog
                      open={showStartConfirmation}
                      onOpenChange={setShowStartConfirmation}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Launch Campaign</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to launch this campaign? Once started,
                            the system will begin reaching out to leads based on your
                            sequence.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => saveCampaign(true)}
                            className="bg-primary text-white"
                          >
                            Launch Campaign
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Search Leads Dialog */}
      <Dialog open={showSearchLeadsDialog} onOpenChange={setShowSearchLeadsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search LinkedIn for Leads</DialogTitle>
            <DialogDescription>
              Find leads on LinkedIn based on your criteria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="searchQuery">Search Query <span className="text-red-500">*</span></Label>
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Marketing Director"
                required
              />
              <p className="text-xs text-gray-500">
                Enter job title or keywords to search for
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="searchLocation">Location (Optional)</Label>
              <Input
                id="searchLocation"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchLeadsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSearchLeads}
              disabled={!searchQuery}
              className="bg-primary text-white"
            >
              Search Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CampaignBuilder;