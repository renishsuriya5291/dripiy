// src/features/sequence/sequenceSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import sequenceService from '../../services/sequenceService';

const initialState = {
  sequences: [],
  activeSequence: null,
  flowElements: {
    nodes: [],
    edges: [],
  },
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

// Create new sequence
export const createSequence = createAsyncThunk(
  'sequence/create',
  async (sequenceData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.createSequence(sequenceData, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all sequences
export const getSequences = createAsyncThunk(
  'sequence/getAll',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.getSequences(token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get sequence by ID
export const getSequenceById = createAsyncThunk(
  'sequence/getById',
  async (sequenceId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.getSequenceById(sequenceId, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Clone sequence
export const cloneSequence = createAsyncThunk(
  'sequence/clone',
  async ({ sequenceId, name }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.cloneSequence(sequenceId, name, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update sequence
export const updateSequence = createAsyncThunk(
  'sequence/update',
  async ({ sequenceId, sequenceData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.updateSequence(sequenceId, sequenceData, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete sequence
export const deleteSequence = createAsyncThunk(
  'sequence/delete',
  async (sequenceId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.deleteSequence(sequenceId, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Save flow elements (nodes and edges)
export const saveFlowElements = createAsyncThunk(
  'sequence/saveFlow',
  async ({ sequenceId, flowData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await sequenceService.saveFlowElements(sequenceId, flowData, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const sequenceSlice = createSlice({
  name: 'sequence',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setActiveSequence: (state, action) => {
      state.activeSequence = action.payload;
    },
    clearActiveSequence: (state) => {
      state.activeSequence = null;
      state.flowElements = {
        nodes: [],
        edges: [],
      };
    },
    setFlowElements: (state, action) => {
      state.flowElements = action.payload;
    },
    updateNode: (state, action) => {
      const { id, data } = action.payload;
      state.flowElements.nodes = state.flowElements.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      );
    },
    addNode: (state, action) => {
      state.flowElements.nodes.push(action.payload);
    },
    removeNode: (state, action) => {
      const nodeId = action.payload;
      state.flowElements.nodes = state.flowElements.nodes.filter(
        (node) => node.id !== nodeId
      );
      state.flowElements.edges = state.flowElements.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
    },
    addEdge: (state, action) => {
      state.flowElements.edges.push(action.payload);
    },
    removeEdge: (state, action) => {
      const edgeId = action.payload;
      state.flowElements.edges = state.flowElements.edges.filter(
        (edge) => edge.id !== edgeId
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Create sequence
      .addCase(createSequence.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createSequence.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sequences.push(action.payload);
        state.activeSequence = action.payload;
        
        // Initialize flow elements with start node
        const startNode = {
          id: 'start-node',
          type: 'start',
          position: { x: 250, y: 50 },
          data: { label: 'Start' },
        };
        
        state.flowElements = {
          nodes: [startNode],
          edges: [],
        };
      })
      .addCase(createSequence.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get all sequences
      .addCase(getSequences.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSequences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sequences = action.payload;
      })
      .addCase(getSequences.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Clone sequence
      .addCase(cloneSequence.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(cloneSequence.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sequences.push(action.payload);
      })
      .addCase(cloneSequence.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get sequence by ID
      .addCase(getSequenceById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSequenceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.activeSequence = action.payload;
        
        // Load flow elements from sequence
        if (action.payload.nodes && action.payload.edges) {
          state.flowElements = {
            nodes: action.payload.nodes,
            edges: action.payload.edges,
          };
        } else {
          // Initialize flow elements with start node if no existing flow
          const startNode = {
            id: 'start-node',
            type: 'start',
            position: { x: 250, y: 50 },
            data: { label: 'Start' },
          };
          
          state.flowElements = {
            nodes: [startNode],
            edges: [],
          };
        }
      })
      .addCase(getSequenceById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update sequence
      .addCase(updateSequence.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateSequence.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sequences = state.sequences.map((sequence) =>
          sequence._id === action.payload._id ? action.payload : sequence
        );
        state.activeSequence = action.payload;
      })
      .addCase(updateSequence.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete sequence
      .addCase(deleteSequence.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteSequence.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.sequences = state.sequences.filter(
          (sequence) => sequence._id !== action.payload.id
        );
        if (state.activeSequence?._id === action.payload.id) {
          state.activeSequence = null;
          state.flowElements = {
            nodes: [],
            edges: [],
          };
        }
      })
      .addCase(deleteSequence.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Save flow elements
      .addCase(saveFlowElements.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(saveFlowElements.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.activeSequence = action.payload;
        
        // Update local sequence object in the list
        state.sequences = state.sequences.map((sequence) =>
          sequence._id === action.payload._id ? action.payload : sequence
        );
      })
      .addCase(saveFlowElements.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const {
  reset,
  setActiveSequence,
  clearActiveSequence,
  setFlowElements,
  updateNode,
  addNode,
  removeNode,
  addEdge,
  removeEdge,
} = sequenceSlice.actions;
export default sequenceSlice.reducer;