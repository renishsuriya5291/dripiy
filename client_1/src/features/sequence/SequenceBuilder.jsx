// src/features/sequence/SequenceBuilder.jsx
import React from 'react';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  getSequenceById,
  createSequence,
  updateSequence,
  saveFlowElements,
  reset,
  setFlowElements,
} from './sequenceSlice';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
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
  Plus,
  Trash2,
  MessageSquare,
  UserPlus,
  Clock,
  Mail,
  Eye,
  Award,
  UserCheck,
  ThumbsUp,
  Search,
  Send,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  AlertCircle,
  ChevronRight,
  Check,
} from 'lucide-react';
// Custom node types
import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';
import SendInviteNode from './nodes/SendInviteNode';
import SendMessageNode from './nodes/SendMessageNode';
import DelayNode from './nodes/DelayNode';
import ConditionNode from './nodes/ConditionNode';
import ViewProfileNode from './nodes/ViewProfileNode';
import { Separator } from '@/components/ui/separator';

// Define node types
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  send_invite: SendInviteNode,
  send_message: SendMessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  view_profile: ViewProfileNode,
};

// Node configuration options
const nodeConfig = {
  start: {
    label: 'Start',
    icon: <Clock className="h-4 w-4" />,
    description: 'Starting point of sequence',
    color: 'bg-gray-100 border-gray-300',
  },
  end: {
    label: 'End',
    icon: <Clock className="h-4 w-4" />,
    description: 'End point of sequence',
    color: 'bg-gray-100 border-gray-300',
  },
  send_invite: {
    label: 'Send Connection',
    icon: <UserPlus className="h-4 w-4" />,
    description: 'Send a connection request',
    color: 'bg-blue-50 border-blue-200',
  },
  send_message: {
    label: 'Send Message',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Send a direct message',
    color: 'bg-green-50 border-green-200',
  },
  view_profile: {
    label: 'View Profile',
    icon: <Eye className="h-4 w-4" />,
    description: 'View a LinkedIn profile',
    color: 'bg-purple-50 border-purple-200',
  },
  endorse_skills: {
    label: 'Endorse Skills',
    icon: <Award className="h-4 w-4" />,
    description: 'Endorse skills on a profile',
    color: 'bg-yellow-50 border-yellow-200',
  },
  follow: {
    label: 'Follow Profile',
    icon: <UserCheck className="h-4 w-4" />,
    description: 'Follow a LinkedIn profile',
    color: 'bg-indigo-50 border-indigo-200',
  },
  like_post: {
    label: 'Like Post',
    icon: <ThumbsUp className="h-4 w-4" />,
    description: 'Like a post or update',
    color: 'bg-pink-50 border-pink-200',
  },
  find_email: {
    label: 'Find Email',
    icon: <Search className="h-4 w-4" />,
    description: 'Find contact email',
    color: 'bg-orange-50 border-orange-200',
  },
  send_email: {
    label: 'Send Email',
    icon: <Mail className="h-4 w-4" />,
    description: 'Send an email',
    color: 'bg-red-50 border-red-200',
  },
  delay: {
    label: 'Delay',
    icon: <Clock className="h-4 w-4" />,
    description: 'Wait for a specified time',
    color: 'bg-gray-50 border-gray-200',
  },
  condition: {
    label: 'Condition',
    icon: <HelpCircle className="h-4 w-4" />,
    description: 'Branch based on a condition',
    color: 'bg-amber-50 border-amber-200',
  },
};

function SequenceBuilder({
  initialNodes = [],
  initialEdges = [],
  initialName = '',
  onSave,
  onCancel,
  embedded = false,
  sequenceId
}) {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const { activeSequence, flowElements, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.sequence
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [sequenceData, setSequenceData] = useState({
    name: initialName,
    description: '',
    isTemplate: false,
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [newNodePosition, setNewNodePosition] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [connectionError, setConnectionError] = useState(null);

  // Load sequence data if editing
  useEffect(() => {
    if (id) {
      dispatch(getSequenceById(sequenceId));
    } else {
      // Initialize with a start node for a new sequence
      const initialNode = {
        id: 'start-node',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
      };

      dispatch(setFlowElements({
        nodes: [initialNode],
        edges: []
      }));
    }

    return () => {
      dispatch(reset());
    };
  }, [id, dispatch]);

  // Update local state when flow elements change
  useEffect(() => {
    if (flowElements.nodes.length > 0) {
      setNodes(flowElements.nodes);
      setEdges(flowElements.edges);
    }
  }, [flowElements, setNodes, setEdges]);

  // Set form data when active sequence changes
  useEffect(() => {
    if (activeSequence && id) {
      setSequenceData({
        name: activeSequence.name || '',
        description: activeSequence.description || '',
        isTemplate: activeSequence.isTemplate || false,
      });
    }
  }, [activeSequence, id]);

  // Track unsaved changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setUnsavedChanges(true);
    }
  }, [nodes, edges, sequenceData]);

  // Handle errors and success
  useEffect(() => {
    if (isError) {
      toast.error(message);
      setIsSaving(false);
    }

    if (isSuccess && message) {
      toast.success(message);
      setUnsavedChanges(false);
    }
  }, [isError, isSuccess, message]);

  // Check for connection errors
  useEffect(() => {
    // Check if there's any dangling nodes (except end nodes)
    const checkConnectionErrors = () => {
      const nodeMap = new Map(nodes.map(node => [node.id, node]));
      const connectedNodeIds = new Set();

      // Add source nodes to connected set
      edges.forEach(edge => {
        connectedNodeIds.add(edge.target);
      });

      // Find nodes that have no incoming connections (except start node)
      const danglingNodes = nodes.filter(node =>
        node.type !== 'start' &&
        node.type !== 'end' &&
        !connectedNodeIds.has(node.id)
      );

      if (danglingNodes.length > 0) {
        setConnectionError(`${danglingNodes.length} node(s) not connected to sequence flow`);
      } else {
        setConnectionError(null);
      }
    };

    if (nodes.length > 1) {
      checkConnectionErrors();
    } else {
      setConnectionError(null);
    }
  }, [nodes, edges]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onConnect = useCallback(
    (params) => {
      // Check if connection already exists
      const connectionExists = edges.some(
        edge => edge.source === params.source && edge.target === params.target
      );

      if (connectionExists) {
        toast.error("Connection already exists");
        return;
      }

      // Create a unique ID for the new edge
      const id = `edge-${params.source}-${params.target}-${Date.now()}`;
      const newEdge = { ...params, id, animated: true };

      setEdges((eds) => addEdge(newEdge, eds));
      setUnsavedChanges(true);
    },
    [edges, setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // Check if the dropped element is valid
      if (!type || !nodeConfig[type]) {
        return;
      }

      // Get the position of the drop relative to the flow container
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create a unique ID for the new node
      const id = `${type}-${Date.now()}`;

      // Create a new node
      const newNode = {
        id,
        type,
        position,
        data: {
          label: nodeConfig[type].label,
          nodeType: type,
        },
      };

      // Add some default data based on node type
      if (type === 'send_invite') {
        newNode.data.message = '';
      } else if (type === 'send_message') {
        newNode.data.message = '';
        newNode.data.variants = [];
      } else if (type === 'delay') {
        newNode.data.delay = {
          value: 1,
          unit: 'days'
        };
      } else if (type === 'condition') {
        newNode.data.condition = 'invite_accepted';
      }

      setNodes((nds) => nds.concat(newNode));
      setUnsavedChanges(true);

      // Show toast for successful node addition
      toast.success(`Added ${nodeConfig[type].label} node`);
    },
    [reactFlowInstance, setNodes]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSequenceData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setUnsavedChanges(true);
  };

  const handleNodeClick = (event, node) => {
    // Don't select start node as it can't be configured
    if (node.type === 'start') return;

    setSelectedNode(node);
    setIsNodeDialogOpen(true);
  };

  // Fix: Handle node updates without closing modal
  const handleNodeDataChange = (updatedData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedData,
            },
          };
        }
        return node;
      })
    );

    // Update the selectedNode state to reflect changes
    setSelectedNode(prev => ({
      ...prev,
      data: {
        ...prev.data,
        ...updatedData
      }
    }));

    setUnsavedChanges(true);
  };

  // This function is used when we want to save and close dialog
  const handleUpdateNode = () => {
    // Just close the dialog - the data is already updated by handleNodeDataChange
    setIsNodeDialogOpen(false);
  };

  const handleDeleteNode = (nodeId) => {
    setIsDeletingNode(false);
    setIsNodeDialogOpen(false);

    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) =>
      eds.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )
    );

    toast.success("Node deleted");
    setUnsavedChanges(true);
  };

  const handleAddNodeClick = (e, position) => {
    e.preventDefault();
    setNewNodePosition(position);
    setIsAddingNode(true);
  };

  const handleAddNode = (type) => {
    const id = `${type}-${Date.now()}`;

    const newNode = {
      id,
      type,
      position: newNodePosition,
      data: {
        label: nodeConfig[type].label,
        nodeType: type,
      },
    };

    // Add some default data based on node type
    if (type === 'send_invite') {
      newNode.data.message = '';
    } else if (type === 'send_message') {
      newNode.data.message = '';
      newNode.data.variants = [];
    } else if (type === 'delay') {
      newNode.data.delay = {
        value: 1,
        unit: 'days'
      };
    } else if (type === 'condition') {
      newNode.data.condition = 'invite_accepted';
    }

    setNodes((nds) => nds.concat(newNode));
    setIsAddingNode(false);
    setUnsavedChanges(true);
    toast.success(`Added ${nodeConfig[type].label} node`);
  };

  const addEndNode = () => {
    // Check if end node already exists
    const hasEndNode = nodes.some(node => node.type === 'end');
    if (hasEndNode) {
      toast.error("End node already exists");
      return;
    }

    const id = `end-node-${Date.now()}`;

    // Find the lowest node in the flow to position the end node below it
    let lowestY = 0;
    nodes.forEach(node => {
      if (node.position.y > lowestY) {
        lowestY = node.position.y;
      }
    });

    const newNode = {
      id,
      type: 'end',
      position: { x: 250, y: lowestY + 150 },
      data: {
        label: 'End',
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.success("Added End node");
    setUnsavedChanges(true);
  };

  const saveSequence = async () => {
    if (!sequenceData.name.trim()) {
      toast.error('Please enter a sequence name');
      return;
    }

    if (nodes.length < 2) {
      toast.error('Sequence must have at least one action node');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare flow data for saving
      const flowData = {
        nodes,
        edges,
      };

      let response;
      if (id) {
        // Update existing sequence
        response = await dispatch(
          updateSequence({
            sequenceId: sequenceId,
            sequenceData: {
              ...sequenceData,
              nodes: nodes,
              edges: edges,
            }
          })
        ).unwrap();

        // Save flow elements
        await dispatch(
          saveFlowElements({
            sequenceId: sequenceId,
            flowData,
          })
        ).unwrap();
      } else {
        // Create new sequence
        response = await dispatch(
          createSequence({
            ...sequenceData,
            nodes: nodes,
            edges: edges,
          })
        ).unwrap();
      }

      toast.success(
        id ? 'Sequence updated successfully' : 'Sequence created successfully'
      );

      setUnsavedChanges(false);

      if (!embedded) {
        navigate('/dashboard/sequences');
      }
    } catch (error) {
      toast.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-layout function to organize the flow
  const autoLayout = () => {
    if (nodes.length < 2) return;

    // Find the start node
    const startNode = nodes.find(node => node.type === 'start');
    if (!startNode) return;

    // Reset start node position
    const updatedNodes = [...nodes];
    const startNodeIndex = updatedNodes.findIndex(node => node.id === startNode.id);
    updatedNodes[startNodeIndex] = {
      ...startNode,
      position: { x: 250, y: 50 }
    };

    // Create a directed graph from the connections
    const connections = {};
    nodes.forEach(node => {
      connections[node.id] = [];
    });

    edges.forEach(edge => {
      if (!connections[edge.source]) connections[edge.source] = [];
      connections[edge.source].push(edge.target);
    });

    // BFS traversal to position nodes in layers
    const visited = new Set();
    const queue = [startNode.id];
    const nodeLayers = {};
    nodeLayers[startNode.id] = 0;
    visited.add(startNode.id);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentLayer = nodeLayers[currentId];

      // Process connections
      const neighbors = connections[currentId] || [];
      neighbors.forEach((neighborId, index) => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nodeLayers[neighborId] = currentLayer + 1;
          queue.push(neighborId);
        }
      });
    }

    // Position nodes based on layers
    const layerCounts = {};
    const layerOffsets = {};
    const horizontalSpacing = 200;
    const verticalSpacing = 150;

    // Count nodes per layer
    Object.entries(nodeLayers).forEach(([nodeId, layer]) => {
      if (!layerCounts[layer]) layerCounts[layer] = 0;
      layerCounts[layer]++;
    });

    // Calculate starting X offsets for each layer for centering
    Object.entries(layerCounts).forEach(([layer, count]) => {
      layerOffsets[layer] = 0;
    });

    // Position each node
    Object.entries(nodeLayers).forEach(([nodeId, layer]) => {
      const nodeIndex = updatedNodes.findIndex(node => node.id === nodeId);
      if (nodeIndex === -1) return;

      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        position: {
          x: 250 + (layerOffsets[layer] * horizontalSpacing) - ((layerCounts[layer] - 1) * horizontalSpacing / 2),
          y: 50 + (layer * verticalSpacing)
        }
      };

      layerOffsets[layer]++;
    });

    // Handle orphaned nodes (not visited in BFS)
    let orphanY = 50;
    updatedNodes.forEach((node, index) => {
      if (!visited.has(node.id) && node.type !== 'start') {
        orphanY += 100;
        updatedNodes[index] = {
          ...node,
          position: { x: 500, y: orphanY }
        };
      }
    });

    setNodes(updatedNodes);

    // Wait for next tick to fit view
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 50);

    toast.success("Layout organized");
  };

  // Render node configuration dialog based on node type
  const renderNodeConfigDialog = () => {
    if (!selectedNode) return null;

    const nodeType = selectedNode.type;
    const dialogTitle = `Configure ${nodeConfig[nodeType]?.label || 'Node'}`;

    return (
      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Configure the settings for this node.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {nodeType === 'send_invite' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Connection Message</Label>
                  <span className={`text-xs ${(selectedNode.data.message?.length || 0) > 250 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                    {300 - (selectedNode.data.message?.length || 0)} chars left
                  </span>
                </div>
                <Textarea
                  value={selectedNode.data.message || ''}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) {
                      handleNodeDataChange({ message: e.target.value });
                    }
                  }}
                  placeholder="Hi {first_name}, I noticed..."
                  rows={4}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2 flex-wrap">
                  {['{first_name}', '{last_name}', '{company}', '{position}'].map((varName) => (
                    <Button
                      key={varName}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      type="button"
                      onClick={() => {
                        const newMessage = (selectedNode.data.message || '') + varName;
                        if (newMessage.length <= 300) {
                          handleNodeDataChange({ message: newMessage });
                        }
                      }}
                    >
                      {varName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {nodeType === 'send_message' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Message Variants (A/B Testing)</Label>
                  {selectedNode.data.variants?.map((variant, index) => (
                    <div key={index} className="relative group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium">Variant {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const newVariants = selectedNode.data.variants.filter((_, i) => i !== index);
                            handleNodeDataChange({ variants: newVariants });
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                      <Textarea
                        value={variant.content}
                        onChange={(e) => {
                          const newVariants = [...selectedNode.data.variants];
                          newVariants[index].content = e.target.value;
                          handleNodeDataChange({ variants: newVariants });
                        }}
                        rows={4}
                        placeholder={`Message variant #${index + 1}`}
                        className="mb-2"
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const newVariants = [...(selectedNode.data.variants || []), {
                        content: '',
                        weight: 1
                      }];
                      handleNodeDataChange({ variants: newVariants });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variant
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label>Common Variables</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['{first_name}', '{last_name}', '{company}', '{position}', '{email}'].map((varName) => (
                      <Button
                        key={varName}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        type="button"
                        onClick={() => {
                          const variants = [...(selectedNode.data.variants || [])];
                          // If no variants exist, create one
                          if (variants.length === 0) {
                            variants.push({
                              content: varName,
                              weight: 1
                            });
                          } else {
                            // Add to the last variant
                            const lastIndex = variants.length - 1;
                            variants[lastIndex].content += varName;
                          }
                          handleNodeDataChange({ variants });
                        }}
                      >
                        {varName}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {nodeType === 'delay' && (
              <div className="space-y-4">
                <Label>Delay Configuration</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={
                      typeof selectedNode.data.delay === 'object' && 'value' in selectedNode.data.delay
                        ? selectedNode.data.delay.value
                        : (typeof selectedNode.data.delay === 'number' ? selectedNode.data.delay : 1)
                    }
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1));
                      handleNodeDataChange({
                        delay: {
                          value: value,
                          unit: typeof selectedNode.data.delay === 'object' && 'unit' in selectedNode.data.delay
                            ? selectedNode.data.delay.unit
                            : 'days'
                        }
                      });
                    }}
                    className="w-24"
                  />
                  <Select
                    value={
                      typeof selectedNode.data.delay === 'object' && 'unit' in selectedNode.data.delay
                        ? selectedNode.data.delay.unit
                        : 'days'
                    }
                    onValueChange={(value) =>
                      handleNodeDataChange({
                        delay: {
                          value: typeof selectedNode.data.delay === 'object' && 'value' in selectedNode.data.delay
                            ? selectedNode.data.delay.value
                            : (typeof selectedNode.data.delay === 'number' ? selectedNode.data.delay : 1),
                          unit: value
                        }
                      })
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500">
                  System will wait this duration before proceeding to the next action.
                </p>
              </div>
            )}

            {nodeType === 'condition' && (
              <div className="space-y-4">
                <Label htmlFor="condition-type">Condition Type</Label>
                <Select
                  value={selectedNode.data.condition || 'invite_accepted'}
                  onValueChange={(value) =>
                    handleNodeDataChange({ condition: value })
                  }
                >
                  <SelectTrigger id="condition-type">
                    <SelectValue placeholder="Select condition type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invite_accepted">Connection Accepted</SelectItem>
                    <SelectItem value="message_read">Message Read</SelectItem>
                    <SelectItem value="profile_open">Profile Viewed Back</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-amber-50 p-3 rounded-md mt-2 text-sm">
                  <div className="flex items-start">
                    <HelpCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5" />
                    <p className="text-amber-800">
                      This node will branch your sequence based on the condition. Connect the bottom handle for "Yes" path and right handle for "No" path.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsDeletingNode(true)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Node
            </Button>
            <Button onClick={handleUpdateNode} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render node selection dialog for adding new nodes
  const renderNodeSelectionDialog = () => {
    return (
      <Dialog open={isAddingNode} onOpenChange={setIsAddingNode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
            <DialogDescription>
              Select the type of node you want to add to your sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {Object.keys(nodeConfig)
              .filter(type => !['start', 'end'].includes(type)) // Exclude start and end nodes
              .map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  className={`h-auto py-3 px-4 justify-start ${nodeConfig[type].color}`}
                  onClick={() => handleAddNode(type)}
                >
                  <div className="flex items-center">
                    {nodeConfig[type].icon}
                    <div className="ml-2 text-left">
                      <div className="font-medium">{nodeConfig[type].label}</div>
                      <div className="text-xs text-gray-500">{nodeConfig[type].description}</div>
                    </div>
                  </div>
                </Button>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingNode(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render confirmation dialog for node deletion
  const renderDeleteConfirmationDialog = () => {
    if (!selectedNode) return null;

    return (
      <AlertDialog open={isDeletingNode} onOpenChange={setIsDeletingNode}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {nodeConfig[selectedNode.type]?.label} node? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => handleDeleteNode(selectedNode.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Render unsaved changes warning dialog
  const renderUnsavedChangesDialog = () => {
    return (
      <AlertDialog open={unsavedChanges && !embedded} onOpenChange={() => { }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you leave this page. Would you like to save your sequence?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate('/dashboard/sequences')}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={saveSequence}
            >
              Save Sequence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (unsavedChanges) {
                // Handle showing unsaved changes warning
                renderUnsavedChangesDialog();
              } else {
                navigate('/dashboard/sequences');
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">
            {id ? 'Edit Sequence' : 'Create New Sequence'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={autoLayout}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Auto-organize layout
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </Button>

          <Button
            onClick={() => onSave({ name: sequenceData.name, nodes, edges })} disabled={isSaving}
            className='text-white'
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Sequence
              </>
            )}
          </Button>
        </div>
      </div>

      {connectionError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
          <span className="text-amber-800">{connectionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-4">
          <Tabs
            defaultValue="flow"
            className="w-full mb-4"
          >
            <TabsList className="w-full justify-start">
              <TabsTrigger value="flow" className="flex-1">Flow Builder</TabsTrigger>
              <TabsTrigger value="details" className="flex-1">Sequence Details</TabsTrigger>
            </TabsList>
            <TabsContent value="flow" className="mt-4">
              <Card className="h-[calc(100vh-280px)]">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-lg">Sequence Flow Builder</CardTitle>
                  <CardDescription>
                    Drag action nodes from the sidebar and connect them to build your sequence.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-70px)]">
                  <div className="h-full" ref={reactFlowWrapper}>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={onInit}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        onNodeClick={handleNodeClick}
                        onPaneContextMenu={handleAddNodeClick}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.2}
                        maxZoom={2}
                        defaultEdgeOptions={{
                          animated: true,
                          style: { strokeWidth: 2, stroke: '#999' }
                        }}
                        style={{ width: '100%', height: '100%' }}
                        proOptions={{ hideAttribution: true }}
                      >
                        <Background size={1.5} gap={25} />
                        <Controls showInteractive={false} />
                        <MiniMap
                          nodeColor={(node) => {
                            switch (node.type) {
                              case 'start': return '#4ade80';
                              case 'end': return '#f87171';
                              case 'send_invite': return '#93c5fd';
                              case 'send_message': return '#86efac';
                              case 'delay': return '#d1d5db';
                              case 'condition': return '#fcd34d';
                              case 'view_profile': return '#c4b5fd';
                              default: return '#e5e7eb';
                            }
                          }}
                        />
                        <Panel position="top-right" className="bg-white p-2 rounded-md shadow-sm border">
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={addEndNode}
                                    className="h-8 w-8 text-slate-600 hover:text-slate-900"
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Add End Node
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      if (reactFlowInstance) {
                                        reactFlowInstance.zoomIn();
                                      }
                                    }}
                                    className="h-8 w-8 text-slate-600 hover:text-slate-900"
                                  >
                                    <ZoomIn className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Zoom In
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      if (reactFlowInstance) {
                                        reactFlowInstance.zoomOut();
                                      }
                                    }}
                                    className="h-8 w-8 text-slate-600 hover:text-slate-900"
                                  >
                                    <ZoomOut className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Zoom Out
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </Panel>
                      </ReactFlow>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Sequence Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      value={sequenceData.name}
                      onChange={handleChange}
                      placeholder="e.g., Sales Outreach Sequence"
                    />
                    <p className="text-xs text-gray-500">Choose a descriptive name for your sequence</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={sequenceData.description}
                      onChange={handleChange}
                      placeholder="Describe the purpose of this sequence..."
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">Add details about who this sequence targets and what it aims to achieve</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isTemplate"
                      name="isTemplate"
                      checked={sequenceData.isTemplate}
                      onCheckedChange={(checked) => {
                        setSequenceData(prev => ({ ...prev, isTemplate: checked }));
                      }}
                    />
                    <Label
                      htmlFor="isTemplate"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Save as template
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 -mt-4 ml-6">Templates can be reused as starting points for new sequences</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Available Actions</CardTitle>
              <CardDescription>
                Drag these actions onto the canvas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.keys(nodeConfig)
                  .filter(type => !['start', 'end'].includes(type)) // Exclude start and end nodes
                  .map((type) => (
                    <div
                      key={type}
                      className={`p-3 rounded-md border cursor-grab flex items-center ${nodeConfig[type].color} hover:shadow-md transition-shadow`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/reactflow', type);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <div className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center mr-2">
                        {nodeConfig[type].icon}
                      </div>
                      <span className="font-medium">{nodeConfig[type].label}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {showHelp && (
            <Card className="mt-4">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Help & Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-1 rounded-full mr-2">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Getting Started</p>
                      <p className="text-blue-700 mt-1">
                        Drag actions from the sidebar onto the canvas. The sequence flow starts at the Start node and follows connections between nodes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">Creating Connections</p>
                      <p className="text-gray-600">
                        Click and drag from a node's output handle (bottom/right) to another node's input handle (top) to create connections.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">Configure Nodes</p>
                      <p className="text-gray-600">
                        Click on any node to configure its settings, including message content and conditions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">Right-click to Add Nodes</p>
                      <p className="text-gray-600">
                        Right-click anywhere on the canvas to add a new node at that position.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">Auto-organize Layout</p>
                      <p className="text-gray-600">
                        Use the auto-layout button to organize your sequence flow in a clean, hierarchical layout.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-4">
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Sequence Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Nodes:</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Action Steps:</span>
                <span className="font-medium">{nodes.filter(node => node.type !== 'start').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Messages:</span>
                <span className="font-medium">{nodes.filter(node => node.type === 'send_message').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Connections:</span>
                <span className="font-medium">{nodes.filter(node => node.type === 'send_invite').length}</span>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {renderNodeConfigDialog()}
      {renderNodeSelectionDialog()}
      {renderDeleteConfirmationDialog()}

      {embedded && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
            
          <Button className='text-white' onClick={() => onSave({ name: sequenceData.name, nodes, edges })}>
            Save & Return
          </Button>
        </div>
      )}
    </div>
  );
}

export default SequenceBuilder;