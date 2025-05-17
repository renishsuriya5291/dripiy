// src/features/linkedin/linkedinSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import linkedinService from '../../services/linkedinService';

const initialState = {
  accounts: [],
  selectedAccount: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

// Get user's LinkedIn accounts
export const getLinkedInAccounts = createAsyncThunk(
  'linkedin/getAccounts',
  async (_, thunkAPI) => {
    try {
      const response = await linkedinService.getAccounts();
      // Ensure we always return an array, even if the API returns null, undefined, or a non-array
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Connect a LinkedIn account
export const connectLinkedInAccount = createAsyncThunk(
  'linkedin/connectAccount',
  async (accountData, thunkAPI) => {
    try {
      return await linkedinService.connectAccount(accountData);
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete a LinkedIn account
export const deleteLinkedInAccount = createAsyncThunk(
  'linkedin/deleteAccount',
  async (accountId, thunkAPI) => {
    try {
      return await linkedinService.deleteAccount(accountId);
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const linkedinSlice = createSlice({
  name: 'linkedin',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setSelectedAccount: (state, action) => {
      state.selectedAccount = action.payload;
      localStorage.setItem('selectedLinkedInAccount', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getLinkedInAccounts.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getLinkedInAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        
        // Ensure accounts is always an array
        state.accounts = Array.isArray(action.payload) ? action.payload : [];
        
        // If we have accounts but no selected account, select the first one
        if (state.accounts.length > 0 && !state.selectedAccount) {
          const savedAccountJson = localStorage.getItem('selectedLinkedInAccount');
          
          if (savedAccountJson) {
            try {
              const parsedAccount = JSON.parse(savedAccountJson);
              // Check if the saved account still exists in the accounts array
              const accountStillExists = Array.isArray(state.accounts) && 
                state.accounts.find(account => account && account._id === parsedAccount._id);
                
              if (accountStillExists) {
                state.selectedAccount = accountStillExists;
              } else {
                state.selectedAccount = state.accounts[0];
                localStorage.setItem('selectedLinkedInAccount', JSON.stringify(state.accounts[0]));
              }
            } catch (e) {
              // If parsing fails, just use the first account
              state.selectedAccount = state.accounts[0];
              localStorage.setItem('selectedLinkedInAccount', JSON.stringify(state.accounts[0]));
            }
          } else {
            state.selectedAccount = state.accounts[0];
            localStorage.setItem('selectedLinkedInAccount', JSON.stringify(state.accounts[0]));
          }
        }
      })
      .addCase(getLinkedInAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        // Ensure accounts is always an array, even on error
        state.accounts = [];
      })
      .addCase(connectLinkedInAccount.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(connectLinkedInAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        
        // Check if it's just a 2FA response or a full account add
        if (action.payload.requiresTwoFactor) {
          state.message = 'Verification required';
        } else {
          // Make sure accounts is an array before trying to use array methods
          if (!Array.isArray(state.accounts)) {
            state.accounts = [];
          }
          
          // Add the new account to the accounts array if it's not a verification step
          if (!action.payload.verificationStep) {
            state.accounts.push(action.payload);
          } else {
            // Update accounts after verification is complete
            const updatedAccounts = state.accounts.map(account => 
              account._id === action.payload._id ? action.payload : account
            );
            state.accounts = updatedAccounts;
          }
          state.message = 'LinkedIn account connected successfully';
        }
      })
      .addCase(connectLinkedInAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteLinkedInAccount.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(deleteLinkedInAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        
        // Make sure accounts is an array before trying to use array methods
        if (!Array.isArray(state.accounts)) {
          state.accounts = [];
        } else {
          state.accounts = state.accounts.filter(
            (account) => account && account._id !== action.payload.id
          );
        }
        
        // If the deleted account was selected, select another one
        if (state.selectedAccount && state.selectedAccount._id === action.payload.id) {
          state.selectedAccount = state.accounts.length > 0 ? state.accounts[0] : null;
          if (state.selectedAccount) {
            localStorage.setItem('selectedLinkedInAccount', JSON.stringify(state.selectedAccount));
          } else {
            localStorage.removeItem('selectedLinkedInAccount');
          }
        }
        
        state.message = 'LinkedIn account removed successfully';
      })
      .addCase(deleteLinkedInAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, setSelectedAccount } = linkedinSlice.actions;
export default linkedinSlice.reducer;