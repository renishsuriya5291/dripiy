// src/features/leads/LeadLists.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getLeadLists,
  createLeadList,
  deleteLeadList,
  importLeadsFromCSV,
  searchLeadsFromLinkedIn,
  reset,
} from './leadsSlice';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Loader2,
  Plus,
  Search,
  Upload,
  Linkedin,
  Users,
  Trash2,
  MoreHorizontal,
  FileText,
  Eye,
  ArrowUpRight,
  User,
  Building,
  MapPin,
  Briefcase,
  ListFilter,
} from 'lucide-react';

function LeadLists() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { leadLists, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.leads
  );
  const { accounts, selectedAccount } = useSelector((state) => state.linkedin);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLeadLists, setFilteredLeadLists] = useState([]);
  const [listToDelete, setListToDelete] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [importData, setImportData] = useState({
    file: null,
    leadListId: '',
  });
  const [searchData, setSearchData] = useState({
    query: '',
    location: '',
    industry: '',
    leadListId: '',
    limit: 50,
  });
  const [selectedTab, setSelectedTab] = useState('all');

  useEffect(() => {
    dispatch(getLeadLists());
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    if (isSuccess && message) {
      toast.success(message);
    }

    dispatch(reset());
  }, [isError, isSuccess, message, dispatch]);

  useEffect(() => {
    filterLeadLists();
  }, [leadLists, searchTerm, selectedTab]);

  const filterLeadLists = () => {
    let filtered = [...leadLists];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (list) =>
          list.name?.toLowerCase().includes(term) ||
          list.description?.toLowerCase().includes(term)
      );
    }

    // Filter by source type
    if (selectedTab !== 'all') {
      filtered = filtered.filter((list) => list.source === selectedTab);
    }

    setFilteredLeadLists(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImportDataChange = (e) => {
    const { name, value } = e.target;
    setImportData({ ...importData, [name]: value });
  };

  const handleSearchDataChange = (e) => {
    const { name, value } = e.target;
    setSearchData({ ...searchData, [name]: value });
  };

  const handleFileChange = (e) => {
    setImportData({ ...importData, file: e.target.files[0] });
  };

  const createNewLeadList = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a name for the lead list');
      return;
    }

    try {
      await dispatch(createLeadList(formData)).unwrap();
      setFormData({ name: '', description: '' });
      setIsCreateDialogOpen(false);
      toast.success('Lead list created successfully');
    } catch (error) {
      toast.error(error);
    }
  };

  const importLeadsFromFile = async (e) => {
    e.preventDefault();

    if (!importData.file) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!importData.leadListId) {
      toast.error('Please select a lead list');
      return;
    }

    try {
      await dispatch(importLeadsFromCSV({
        file: importData.file,
        leadListId: importData.leadListId,
      })).unwrap();
      
      setImportData({ file: null, leadListId: '' });
      setIsImportDialogOpen(false);
      toast.success('Leads imported successfully');
    } catch (error) {
      toast.error(error);
    }
  };

  const searchLeadsFromLinkedInAPI = async (e) => {
    e.preventDefault();

    if (!searchData.query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (!searchData.leadListId) {
      toast.error('Please select a lead list');
      return;
    }

    if (!selectedAccount) {
      toast.error('Please select a LinkedIn account');
      return;
    }

    try {
      await dispatch(searchLeadsFromLinkedIn({
        searchParams: {
          query: searchData.query,
          location: searchData.location,
          industry: searchData.industry,
          limit: searchData.limit,
        },
        leadListId: searchData.leadListId,
      })).unwrap();
      
      setSearchData({
        query: '',
        location: '',
        industry: '',
        leadListId: '',
        limit: 50,
      });
      setIsSearchDialogOpen(false);
      toast.success('Leads search initiated');
    } catch (error) {
      toast.error(error);
    }
  };

  const deleteLeadListHandler = async (listId) => {
    try {
      await dispatch(deleteLeadList(listId)).unwrap();
      setListToDelete(null);
      toast.success('Lead list deleted successfully');
    } catch (error) {
      toast.error(error);
    }
  };

  const viewLeadList = (list) => {
    setSelectedList(list);
    navigate(`/dashboard/leads?list=${list._id}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lead Lists</h1>
          <p className="text-gray-500">
            Manage and organize your LinkedIn leads
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Leads
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Import Methods</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                <span>Create Empty List</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Import from CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (accounts.length === 0) {
                    toast.error('Please connect a LinkedIn account first');
                    return;
                  }
                  setIsSearchDialogOpen(true);
                }}
              >
                <Linkedin className="mr-2 h-4 w-4" />
                <span>Search LinkedIn</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Tabs
            defaultValue="all"
            className="w-full sm:w-auto"
            onValueChange={setSelectedTab}
          >
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="basic_search">LinkedIn Search</TabsTrigger>
              <TabsTrigger value="sales_navigator">Sales Navigator</TabsTrigger>
              <TabsTrigger value="url">URL Import</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search lead lists..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leadLists.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Lead Lists Yet</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                Create your first lead list to start organizing and managing your contacts.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Lead List
              </Button>
            </CardContent>
          </Card>
        ) : filteredLeadLists.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No matching lead lists</h3>
            <p className="text-sm text-gray-500">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeadLists.map((list) => (
              <Card key={list._id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{list.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {list.description || 'No description'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => viewLeadList(list)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Leads
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Import Leads
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setListToDelete(list);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lead List</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this lead list? This
                                action cannot be undone and will remove all leads in the list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => deleteLeadListHandler(listToDelete._id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pb-0 pt-2">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {list.leads?.length || 0} leads
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {list.source || 'manual'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created {new Date(list.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter className="mt-auto pt-4">
                  <Button
                    className="w-full"
                    onClick={() => viewLeadList(list)}
                    variant="outline"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Leads
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Lead List Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Lead List</DialogTitle>
            <DialogDescription>
              Create a new list to organize your leads.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createNewLeadList}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">List Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Marketing Directors"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the purpose of this lead list..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create List</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import leads into a list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={importLeadsFromFile}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="leadListId">Select List</Label>
                <select
                  id="leadListId"
                  name="leadListId"
                  value={importData.leadListId}
                  onChange={handleImportDataChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select a lead list</option>
                  {leadLists.map((list) => (
                    <option key={list._id} value={list._id}>
                      {list.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Or{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    create a new list
                  </Button>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  required
                />
                <p className="text-xs text-gray-500">
                  CSV should include columns for name, position, company, and LinkedIn URL.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Import</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LinkedIn Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search LinkedIn for Leads</DialogTitle>
            <DialogDescription>
              Find and import leads from LinkedIn based on search criteria.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={searchLeadsFromLinkedInAPI}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="leadListId">Select List</Label>
                <select
                  id="leadListId"
                  name="leadListId"
                  value={searchData.leadListId}
                  onChange={handleSearchDataChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select a lead list</option>
                  {leadLists.map((list) => (
                    <option key={list._id} value={list._id}>
                      {list.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Or{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => {
                      setIsSearchDialogOpen(false);
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    create a new list
                  </Button>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="query">Search Query <span className="text-red-500">*</span></Label>
                <Input
                  id="query"
                  name="query"
                  value={searchData.query}
                  onChange={handleSearchDataChange}
                  placeholder="e.g., Marketing Director"
                  required
                />
                <p className="text-xs text-gray-500">
                  Job title, skills, or other keywords
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={searchData.location}
                  onChange={handleSearchDataChange}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  name="industry"
                  value={searchData.industry}
                  onChange={handleSearchDataChange}
                  placeholder="e.g., Software"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Result Limit</Label>
                <Input
                  id="limit"
                  name="limit"
                  type="number"
                  min={1}
                  max={100}
                  value={searchData.limit}
                  onChange={handleSearchDataChange}
                />
                <p className="text-xs text-gray-500">
                  Maximum number of leads to retrieve (1-100)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsSearchDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Search</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeadLists;