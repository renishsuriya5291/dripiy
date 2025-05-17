// src/features/settings/settingsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Base URL for API calls
const API_URL = import.meta.env.VITE_API_URL || '/api';
const DRIPIFY_URL = import.meta.env.VITE_API_URL;

// Get user profile
export const getUserProfile = createAsyncThunk(
  'settings/getUserProfile',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(`${API_URL}/user/profile`, config);
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.error) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get user settings
export const getUserSettings = createAsyncThunk(
  'settings/getUserSettings',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(`${API_URL}/user/settings`, config);
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.error) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'settings/updateUserProfile',
  async (profileData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      const response = await axios.put(`${API_URL}/user/profile`, profileData, config);
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.error) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update user password
export const updateUserPassword = createAsyncThunk(
  'settings/updateUserPassword',
  async (passwordData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.put(
        `${API_URL}/user/change-password`,
        passwordData,
        config
      );
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.error) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update user working hours
export const updateUserWorkingHours = createAsyncThunk(
  'settings/updateUserWorkingHours',
  async (workingHoursData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      // Use the dripify_url for working hours endpoint
      const response = await axios.put(
        `${DRIPIFY_URL}/user/working-hours`,
        workingHoursData,
        config
      );

      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.error) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update user daily limits
export const updateUserDailyLimits = createAsyncThunk(
  'settings/updateUserDailyLimits',
  async (limitsData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      // We're wrapping the limitsData in a settings object to match backend expectations
      const response = await axios.put(
        `${API_URL}/user/settings`,
        { settings: { dailyLimits: limitsData } },
        config
      );
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.error) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const initialState = {
  profileData: null,
  workingHours: null,
  dailyLimits: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    resetSettings: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Get user profile
      .addCase(getUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.profileData = action.payload;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get user settings
      .addCase(getUserSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUserSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.workingHours = action.payload.workingHours;
        state.dailyLimits = action.payload.settings?.dailyLimits;
      })
      .addCase(getUserSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = 'Profile updated successfully';

        // Update profile data in settings slice
        state.profileData = {
          ...state.profileData,
          ...action.payload
        };

      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update user password
      .addCase(updateUserPassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = 'Password updated successfully';
      })
      .addCase(updateUserPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update user working hours
      .addCase(updateUserWorkingHours.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserWorkingHours.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = 'Working hours updated successfully';
        state.workingHours = action.payload.workingHours;
      })
      .addCase(updateUserWorkingHours.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update user daily limits
      .addCase(updateUserDailyLimits.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserDailyLimits.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = 'Daily limits updated successfully';
        state.dailyLimits = action.payload.settings?.dailyLimits;
      })
      .addCase(updateUserDailyLimits.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;