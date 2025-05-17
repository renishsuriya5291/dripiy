// src/features/leads/leadsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import leadsService from '../../services/leadsService';

const initialState = {
  leads: [],
  leadLists: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

// Create lead list
export const createLeadList = createAsyncThunk(
  'leads/createList',
  async (listData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.createLeadList(listData, token);
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

// Get all lead lists
export const getLeadLists = createAsyncThunk(
  'leads/getLists',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.getLeadLists(token);
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

// Get single lead list
export const getLeadList = createAsyncThunk(
  'leads/getList',
  async (listId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.getLeadList(listId, token);
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

// Delete lead list
export const deleteLeadList = createAsyncThunk(
  'leads/deleteList',
  async (listId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.deleteLeadList(listId, token);
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

// Import leads from CSV
export const importLeadsFromCSV = createAsyncThunk(
  'leads/importCSV',
  async ({ file, leadListId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.importLeadsFromCSV(file, leadListId, token);
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

// Search leads from LinkedIn
export const searchLeadsFromLinkedIn = createAsyncThunk(
  'leads/searchLinkedIn',
  async ({ searchParams, leadListId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const linkedInAccount = thunkAPI.getState().linkedin.selectedAccount;
      
      if (!linkedInAccount) {
        return thunkAPI.rejectWithValue('No LinkedIn account selected');
      }
      
      return await leadsService.searchLeadsFromLinkedIn(
        searchParams,
        leadListId,
        linkedInAccount._id,
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

// Get leads from specific list
export const getLeadsFromList = createAsyncThunk(
  'leads/getFromList',
  async (listId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.getLeadsFromList(listId, token);
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

// Remove lead from list
export const removeLead = createAsyncThunk(
  'leads/remove',
  async ({ leadId, listId }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      return await leadsService.removeLead(leadId, listId, token);
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

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Create lead list
      .addCase(createLeadList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createLeadList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.leadLists.push(action.payload);
      })
      .addCase(createLeadList.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get all lead lists
      .addCase(getLeadLists.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLeadLists.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.leadLists = action.payload;
      })
      .addCase(getLeadLists.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get single lead list
      .addCase(getLeadList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLeadList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // No need to update state here as we get the list with leads in getLeadsFromList
      })
      .addCase(getLeadList.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete lead list
      .addCase(deleteLeadList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteLeadList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.leadLists = state.leadLists.filter(
          (list) => list._id !== action.payload.id
        );
      })
      .addCase(deleteLeadList.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Import leads from CSV
      .addCase(importLeadsFromCSV.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(importLeadsFromCSV.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the list with the new leads
        const updatedList = action.payload;
        state.leadLists = state.leadLists.map((list) =>
          list._id === updatedList._id ? updatedList : list
        );
      })
      .addCase(importLeadsFromCSV.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Search leads from LinkedIn
      .addCase(searchLeadsFromLinkedIn.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchLeadsFromLinkedIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the list with the new leads
        const updatedList = action.payload;
        state.leadLists = state.leadLists.map((list) =>
          list._id === updatedList._id ? updatedList : list
        );
      })
      .addCase(searchLeadsFromLinkedIn.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get leads from specific list
      .addCase(getLeadsFromList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLeadsFromList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.leads = action.payload;
      })
      .addCase(getLeadsFromList.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Remove lead from list
      .addCase(removeLead.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(removeLead.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.leads = state.leads.filter(
          (lead) => lead._id !== action.payload.leadId
        );
      })
      .addCase(removeLead.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = leadsSlice.actions;
export default leadsSlice.reducer;