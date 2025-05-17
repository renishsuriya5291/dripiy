// src/features/campaign/campaignActionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import campaignService from '../../services/campaignService';

// Get campaign actions
export const getCampaignActions = createAsyncThunk(
  'campaignAction/getActions',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.getCampaignActions(campaignId, token);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get campaign action stats
export const getCampaignActionStats = createAsyncThunk(
  'campaignAction/getStats',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.getCampaignActionStats(campaignId, token);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Retry failed actions
export const retryFailedActions = createAsyncThunk(
  'campaignAction/retry',
  async (campaignId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await campaignService.retryFailedActions(campaignId, token);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  actions: {
    completed: [],
    pending: [],
    failed: []
  },
  stats: {},
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

const campaignActionSlice = createSlice({
  name: 'campaignAction',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    }
  },
  extraReducers: (builder) => {
    builder
      // Get campaign actions
      .addCase(getCampaignActions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCampaignActions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.actions = action.payload;
      })
      .addCase(getCampaignActions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Get campaign action stats
      .addCase(getCampaignActionStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCampaignActionStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.stats = action.payload;
      })
      .addCase(getCampaignActionStats.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Retry failed actions
      .addCase(retryFailedActions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(retryFailedActions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = `${action.payload.modifiedCount} failed actions scheduled for retry`;
        // We would typically refetch actions after this
      })
      .addCase(retryFailedActions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset } = campaignActionSlice.actions;
export default campaignActionSlice.reducer;