// src/features/sequence/Sequences.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getSequences,
  deleteSequence,
  cloneSequence,
  reset,
} from './sequenceSlice';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Search,
  Workflow,
  FileText,
  ChevronDown,
  CheckCircle2,
  CopyCheck,
  Clock,
  Star,
  Filter,
  SortAsc,
  SortDesc,
  Info,
  Calendar,
  CheckCheck,
  X,
} from 'lucide-react';

function Sequences() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { sequences, isLoading, isError, message } = useSelector(
    (state) => state.sequence
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSequences, setFilteredSequences] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [sequenceToDelete, setSequenceToDelete] = useState(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  const [cloneData, setCloneData] = useState({
    sequenceId: '',
    name: '',
  });
  const [newSequenceData, setNewSequenceData] = useState({
    name: '',
    description: '',
    isTemplate: false,
  });

  useEffect(() => {
    dispatch(getSequences());
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    dispatch(reset());
  }, [isError, message, dispatch]);

  useEffect(() => {
    filterAndSortSequences();
  }, [sequences, searchTerm, selectedType, sortOrder]);

  const filterAndSortSequences = () => {
    let filtered = [...sequences];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sequence) => 
          sequence.name?.toLowerCase().includes(term) ||
          sequence.description?.toLowerCase().includes(term)
      );
    }

    // Filter by type
    if (selectedType === 'templates') {
      filtered = filtered.filter((sequence) => sequence.isTemplate);
    } else if (selectedType === 'custom') {
      filtered = filtered.filter((sequence) => !sequence.isTemplate);
    }

    // Sort sequences
    filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      } else if (sortOrder === 'oldest') {
        return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
      } else if (sortOrder === 'az') {
        return a.name.localeCompare(b.name);
      } else if (sortOrder === 'za') {
        return b.name.localeCompare(a.name);
      } else if (sortOrder === 'complexity') {
        return getNodeCount(b) - getNodeCount(a);
      }
      return 0;
    });

    setFilteredSequences(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDeleteSequence = (sequenceId) => {
    dispatch(deleteSequence(sequenceId))
      .unwrap()
      .then(() => {
        setSequenceToDelete(null);
        toast.success('Sequence deleted successfully');
      })
      .catch((error) => {
        toast.error(error);
      });
  };

  const handleCloneSequence = () => {
    if (!cloneData.name.trim()) {
      toast.error('Please enter a name for the cloned sequence');
      return;
    }

    dispatch(cloneSequence({
      sequenceId: cloneData.sequenceId,
      name: cloneData.name,
    }))
      .unwrap()
      .then(() => {
        setIsCloning(false);
        setCloneData({ sequenceId: '', name: '' });
        toast.success('Sequence cloned successfully');
      })
      .catch((error) => {
        toast.error(error);
      });
  };

  const openCloneDialog = (sequence) => {
    setCloneData({
      sequenceId: sequence._id,
      name: `Copy of ${sequence.name}`,
    });
    setIsCloning(true);
  };

  const handleCreateSequence = () => {
    if (!newSequenceData.name.trim()) {
      toast.error('Please enter a name for the sequence');
      return;
    }

    setIsCreateDialogOpen(false);
    navigate('/dashboard/sequences/new', { state: { initialData: newSequenceData } });
  };

  const getNodeCount = (sequence) => {
    if (!sequence.nodes) return 0;
    // Exclude start node from count to show only action nodes
    return sequence.nodes.filter(node => node.type !== 'start').length;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render sequence cards with different layouts based on view
  const renderSequenceCards = () => {
    if (isLoading) {
      return Array(6).fill().map((_, index) => (
        <Card key={index} className="overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardHeader>
          <CardContent className="pb-0 pt-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardContent>
          <CardFooter className="mt-auto pt-4">
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ));
    }

    if (sequences.length === 0) {
      return (
        <Card className="border-dashed border-2 col-span-full">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Workflow className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Sequences Yet</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md">
              Create your first sequence to start automating your LinkedIn
              outreach flow.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Sequence
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (filteredSequences.length === 0) {
      return (
        <div className="text-center py-12 col-span-full">
          <div className="rounded-full bg-gray-100 p-3 mb-4 inline-flex">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No matching sequences</h3>
          <p className="text-sm text-gray-500 mb-4">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setSelectedType('all');
          }}>
            Clear Filters
          </Button>
        </div>
      );
    }

    return filteredSequences.map((sequence) => (
      <Card key={sequence._id} className="overflow-hidden flex flex-col group hover:shadow-md transition-all">
        <CardHeader className="pb-2 flex flex-row items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base group-hover:text-primary transition-colors">{sequence.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {sequence.description || 'No description'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-70 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(`/dashboard/sequences/${sequence._id}`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCloneDialog(sequence)}>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setSequenceToDelete(sequence);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="pb-0 pt-2">
          <div className="flex flex-wrap gap-2">
            {sequence.isTemplate && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="mr-1 h-3 w-3" /> 
                Template
              </Badge>
            )}
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              <CheckCheck className="mr-1 h-3 w-3" />
              {getNodeCount(sequence)} {getNodeCount(sequence) === 1 ? 'action' : 'actions'}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Calendar className="mr-1 h-3 w-3" />
              {formatDate(sequence.updatedAt || sequence.createdAt)}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="mt-auto pt-4">
          <Button
            className="w-full group-hover:bg-primary group-hover:text-white transition-colors"
            onClick={() => navigate(`/dashboard/sequences/${sequence._id}`)}
            variant="outline"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Sequence
          </Button>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sequences</h1>
          <p className="text-gray-500">
            Design and manage your LinkedIn outreach sequences
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Sequence
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Tabs
              defaultValue="all"
              className="w-full sm:w-auto"
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search sequences..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-shrink-0">
                  <SortAsc className="mr-2 h-4 w-4" />
                  Sort
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setSortOrder('newest')}
                  className={sortOrder === 'newest' ? 'bg-primary/10 text-primary' : ''}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder('oldest')}
                  className={sortOrder === 'oldest' ? 'bg-primary/10 text-primary' : ''}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Oldest first
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder('az')}
                  className={sortOrder === 'az' ? 'bg-primary/10 text-primary' : ''}
                >
                  <SortAsc className="mr-2 h-4 w-4" />
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder('za')}
                  className={sortOrder === 'za' ? 'bg-primary/10 text-primary' : ''}
                >
                  <SortDesc className="mr-2 h-4 w-4" />
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder('complexity')}
                  className={sortOrder === 'complexity' ? 'bg-primary/10 text-primary' : ''}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Most actions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!isLoading && filteredSequences.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500 px-1">
            <span>{filteredSequences.length} {filteredSequences.length === 1 ? 'sequence' : 'sequences'} found</span>
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3 mr-1" />
                Clear search
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderSequenceCards()}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sequenceToDelete} onOpenChange={() => setSequenceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sequenceToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => handleDeleteSequence(sequenceToDelete._id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Sequence Dialog */}
      <Dialog open={isCloning} onOpenChange={setIsCloning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone Sequence</DialogTitle>
            <DialogDescription>
              Create a copy of this sequence with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">Sequence Name</Label>
              <Input
                id="clone-name"
                value={cloneData.name}
                onChange={(e) =>
                  setCloneData({ ...cloneData, name: e.target.value })
                }
                placeholder="Enter a name for the cloned sequence"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloning(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneSequence}>Clone Sequence</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Sequence Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Sequence</DialogTitle>
            <DialogDescription>
              Enter initial details for your new sequence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-sequence-name">Sequence Name<span className="text-red-500">*</span></Label>
              <Input
                id="new-sequence-name"
                value={newSequenceData.name}
                onChange={(e) =>
                  setNewSequenceData({ ...newSequenceData, name: e.target.value })
                }
                placeholder="e.g., Sales Outreach Sequence"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-sequence-description">Description</Label>
              <Input
                id="new-sequence-description"
                value={newSequenceData.description}
                onChange={(e) =>
                  setNewSequenceData({ ...newSequenceData, description: e.target.value })
                }
                placeholder="Brief description of this sequence"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="new-sequence-template"
                checked={newSequenceData.isTemplate}
                onChange={(e) =>
                  setNewSequenceData({ ...newSequenceData, isTemplate: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="new-sequence-template">Save as template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSequence}>Create & Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Sequences;