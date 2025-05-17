// src/features/campaign/campaignSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import campaignService from '../../services/campaignService';

const initialState = {
  campaigns: [],
  activeCampaign: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};
export const stopCampaign = createAsyncThunk(
  'campaign/stop',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.stopCampaign(campaignId, token);
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


// Create campaign
export const createCampaign = createAsyncThunk(
  'campaign/create',
  async (campaignData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.createCampaign(campaignData, token);
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

// Get all campaigns
export const getCampaigns = createAsyncThunk(
  'campaign/getAll',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.getCampaigns(token);
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

// Get campaign by ID
export const getCampaignById = createAsyncThunk(
  'campaign/getById',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.getCampaignById(campaignId, token);
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

// Update campaign
export const updateCampaign = createAsyncThunk(
  'campaign/update',
  async ({ campaignId, campaignData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.updateCampaign(campaignId, campaignData, token);
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

// Delete campaign
export const deleteCampaign = createAsyncThunk(
  'campaign/delete',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.deleteCampaign(campaignId, token);
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

// Start campaign
export const startCampaign = createAsyncThunk(
  'campaign/start',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.startCampaign(campaignId, token);
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

// Pause campaign
export const pauseCampaign = createAsyncThunk(
  'campaign/pause',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.pauseCampaign(campaignId, token);
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

// Import leads to campaign
export const importLeadsToCampaign = createAsyncThunk(
  'campaign/importLeads',
  async ({ campaignId, file }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.importLeadsToCampaign(campaignId, file, token);
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

// Search leads for campaign
export const searchLeadsForCampaign = createAsyncThunk(
  'campaign/searchLeads',
  async ({ campaignId, searchParams }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const linkedInAccountId = thunkAPI.getState().linkedin.selectedAccount._id;
      
      if (!linkedInAccountId) {
        return thunkAPI.rejectWithValue('No LinkedIn account selected');
      }
      
      return await campaignService.searchLeadsForCampaign(
        campaignId, 
        searchParams, 
        linkedInAccountId, 
        token
      );
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

// Save campaign sequence
export const saveCampaignSequence = createAsyncThunk(
  'campaign/saveSequence',
  async ({ campaignId, sequenceData }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.saveCampaignSequence(campaignId, sequenceData, token);
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

const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setActiveCampaign: (state, action) => {
      state.activeCampaign = action.payload;
    },
    clearActiveCampaign: (state) => {
      state.activeCampaign = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create campaign
      .addCase(createCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns.push(action.payload);
        state.activeCampaign = action.payload;
      })
      .addCase(createCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get all campaigns
      .addCase(getCampaigns.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCampaigns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = action.payload;
      })
      .addCase(getCampaigns.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get campaign by ID
      .addCase(getCampaignById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCampaignById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.activeCampaign = action.payload;
      })
      .addCase(getCampaignById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update campaign
      .addCase(updateCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.map((campaign) =>
          campaign._id === action.payload._id ? action.payload : campaign
        );
        state.activeCampaign = action.payload;
      })
      .addCase(updateCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete campaign
      .addCase(deleteCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.filter(
          (campaign) => campaign._id !== action.payload.id
        );
        if (state.activeCampaign?._id === action.payload.id) {
          state.activeCampaign = null;
        }
      })
      .addCase(deleteCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Start campaign
      .addCase(startCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(startCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.map((campaign) =>
          campaign._id === action.payload._id ? action.payload : campaign
        );
        if (state.activeCampaign?._id === action.payload._id) {
          state.activeCampaign = action.payload;
        }
      })
      .addCase(startCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Pause campaign
      .addCase(pauseCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(pauseCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.map((campaign) =>
          campaign._id === action.payload._id ? action.payload : campaign
        );
        if (state.activeCampaign?._id === action.payload._id) {
          state.activeCampaign = action.payload;
        }
      })
      .addCase(pauseCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Import leads to campaign
      .addCase(importLeadsToCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(importLeadsToCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.map((campaign) =>
          campaign._id === action.payload._id ? action.payload : campaign
        );
        if (state.activeCampaign?._id === action.payload._id) {
          state.activeCampaign = action.payload;
        }
      })
      .addCase(importLeadsToCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Search leads for campaign
      .addCase(searchLeadsForCampaign.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchLeadsForCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.map((campaign) =>
          campaign._id === action.payload._id ? action.payload : campaign
        );
        if (state.activeCampaign?._id === action.payload._id) {
          state.activeCampaign = action.payload;
        }
      })
      .addCase(searchLeadsForCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Save campaign sequence
      .addCase(saveCampaignSequence.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(saveCampaignSequence.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.campaigns = state.campaigns.map((campaign) =>
          campaign._id === action.payload._id ? action.payload : campaign
        );
        if (state.activeCampaign?._id === action.payload._id) {
          state.activeCampaign = action.payload;
        }
      })
      .addCase(saveCampaignSequence.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, setActiveCampaign, clearActiveCampaign } = campaignSlice.actions;
export default campaignSlice.reducer;