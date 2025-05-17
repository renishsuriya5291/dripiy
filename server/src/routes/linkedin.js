// src/routes/linkedin.js
const express = require('express');
const router = express.Router();
const {
  getLinkedInAccounts,
  connectLinkedInAccount,
  deleteLinkedInAccount,
  testLinkedInAccount,
} = require('../controllers/linkedinController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes need authentication
router.use(authMiddleware);

// LinkedIn accounts routes
router.get('/accounts', getLinkedInAccounts);
router.post('/connect', connectLinkedInAccount);
router.delete('/accounts/:id', deleteLinkedInAccount);
router.get('/accounts/:id/test', testLinkedInAccount);

module.exports = router;