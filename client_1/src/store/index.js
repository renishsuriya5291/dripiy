// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import linkedinReducer from '../features/linkedin/linkedinSlice';
import campaignReducer from '../features/campaign/campaignSlice';
import leadsReducer from '../features/leads/leadsSlice';
import sequenceReducer from '../features/sequence/sequenceSlice';
import campaignActionReducer from '../features/campaign/campaignActionSlice';
import settingsReducer from '../features/settings/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    linkedin: linkedinReducer,
    campaign: campaignReducer,
    leads: leadsReducer,
    sequence: sequenceReducer,
    campaignAction: campaignActionReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;