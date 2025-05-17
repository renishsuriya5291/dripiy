const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const LeadList = require('../models/LeadList');
const Lead = require('../models/Lead');
const authMiddleware = require('../middleware/authMiddleware');
const csv = require('csv-parser');

const router = express.Router();

// Configure multer for CSV upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Expanded and normalized mapping for robust extraction
const leadFieldKeywords = {
  name: ['name', 'full name', 'fullname', 'contact name', 'person name', 'lead name'],
  firstName: ['first name', 'firstname', 'given name', 'first'],
  lastName: ['last name', 'lastname', 'surname', 'family name', 'last'],
  linkedInUrl: [
    'linkedin', 'linkedin url', 'linkedin profile', 'profile', 'linkedin_url', 
    'linkedinprofile', 'url', 'linked in u', 'linkedin u match cat', 'linkedin link',
    'linked in', 'linked-in', 'link', 'linkedin address', 'profile url', 'linkedin_profile'
  ],
  linkedInId: ['linkedin id', 'profile id', 'linkedin_id', 'li_id'],
  headline: ['headline', 'summary', 'description', 'persona', 'bio', 'profile summary', 'about'],
  company: ['company', 'company name', 'employer', 'current company', 'organization', 'firm', 'business'],
  position: ['position', 'job title', 'title', 'role', 'current position', 'job', 'designation', 'current role'],
  location: ['location', 'city', 'address', 'country', 'region', 'state', 'province', 'area'],
  profilePictureUrl: ['profile picture', 'avatar', 'image', 'photo', 'picture', 'profile image', 'profile photo'],
  email: ['email', 'email address', 'e-mail', 'mail', 'contact email', 'business email'],
  phone: ['phone', 'phone number', 'contact', 'mobile', 'telephone', 'cell', 'contact number', 'business phone'],
  tags: ['tags', 'labels', 'categories', 'tag', 'category', 'classification', 'group'],
  notes: ['notes', 'comments', 'remarks', 'persona rationale', 'persona relation', 'description', 'details', 'additional info'],
  matchCategory: ['match category', 'match', 'match type', 'matching', 'match score', 'matching category', 'fit'],
};

/**
 * Normalize string by removing spaces, underscores, quotes and converting to lowercase
 */
function normalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/["']/g, '')
    .trim();
}

/**
 * Find the best matching column for a given field based on keywords
 */
function findBestColumn(columns, keywords) {
  const normalizedColumns = columns.map(normalize);
  
  // First try exact matches
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    for (let i = 0; i < normalizedColumns.length; i++) {
      if (normalizedColumns[i] === normalizedKeyword) {
        return columns[i];
      }
    }
  }
  
  // Then try partial matches
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    for (let i = 0; i < normalizedColumns.length; i++) {
      if (normalizedColumns[i].includes(normalizedKeyword) || 
          normalizedKeyword.includes(normalizedColumns[i])) {
        return columns[i];
      }
    }
  }
  
  return null;
}

/**
 * Parse a row from the CSV into a lead object with consistent field names
 */
function parseLeadRow(row, columns) {
  const lead = {};
  
  // Find and map fields based on keywords
  for (const field in leadFieldKeywords) {
    const col = findBestColumn(columns, leadFieldKeywords[field]);
    if (col && row[col] !== undefined) {
      lead[field] = row[col];
    } else {
      lead[field] = '';
    }
  }
  
  // Fallback for name if first/last name exists
  if (!lead.name && (lead.firstName || lead.lastName)) {
    lead.name = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  }
  
  // Handle tags as array
  if (lead.tags && typeof lead.tags === 'string') {
    lead.tags = lead.tags.split(',').map(t => t.trim()).filter(Boolean);
  } else if (!lead.tags) {
    lead.tags = [];
  }
  
  // Add match category to tags if present
  if (lead.matchCategory && lead.matchCategory.length > 0) {
    if (!lead.tags.includes(lead.matchCategory)) {
      lead.tags.push(lead.matchCategory);
    }
  }
  
  return lead;
}

/**
 * Normalize LinkedIn URL to a consistent format
 */
function normalizeLinkedInUrl(url) {
  if (!url) return '';
  
  let normalizedUrl = url.trim();
  
  // Add https:// prefix if missing
  if (!normalizedUrl.startsWith('http')) {
    if (normalizedUrl.startsWith('www.')) {
      normalizedUrl = `https://${normalizedUrl}`;
    } else if (normalizedUrl.match(/^linkedin\.com/i)) {
      normalizedUrl = `https://www.${normalizedUrl}`;
    } else {
      normalizedUrl = `https://www.linkedin.com/in/${normalizedUrl}`;
    }
  }
  
  // Remove trailing slash
  normalizedUrl = normalizedUrl.replace(/\/$/, '');
  
  // Remove query parameters if not needed (optional)
  // normalizedUrl = normalizedUrl.split('?')[0];
  
  return normalizedUrl;
}

// POST /api/leadlists/upload-csv
router.post('/upload-csv', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { campaignId } = req.body;
    const leads = [];
    const errors = [];
    let columns = [];

    // Read and parse CSV file
    const csvRows = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('headers', (headers) => {
          columns = headers;
          console.log('CSV Headers:', headers);
        })
        .on('data', (data) => {
          csvRows.push(data);
        })
        .on('end', resolve)
        .on('error', (err) => {
          console.error('CSV parsing error:', err);
          reject(err);
        });
    });

    if (csvRows.length === 0) {
      return res.status(400).json({ error: 'CSV file contains no data' });
    }

    console.log('Sample row:', csvRows[0]);
    
    // Find the column that contains LinkedIn URLs
    const linkedInUrlColumn = findBestColumn(Object.keys(csvRows[0]), leadFieldKeywords.linkedInUrl);
    console.log('LinkedIn URL column found:', linkedInUrlColumn);

    // Process each row in the CSV
    for (const row of csvRows) {
      // Parse row into lead object with consistent field names
      const parsedLead = parseLeadRow(row, Object.keys(row));
      
      // Check if we have a LinkedIn URL (using both the parsed field and direct column check)
      let linkedInUrl = parsedLead.linkedInUrl;
      
      // Add fallback to check common variations directly in case parsing missed it
      if (!linkedInUrl && linkedInUrlColumn) {
        linkedInUrl = row[linkedInUrlColumn];
      }
      
      if (!linkedInUrl) {
        for (const key of Object.keys(row)) {
          const normalizedKey = normalize(key);
          if (normalizedKey.includes('linkedin') || normalizedKey.includes('profileurl')) {
            linkedInUrl = row[key];
            break;
          }
        }
      }
      
      // Skip rows without LinkedIn URL
      if (!linkedInUrl) {
        errors.push(`Missing LinkedIn URL for row: ${JSON.stringify(row)}`);
        continue;
      }

      // Normalize the LinkedIn URL to a consistent format
      const normalizedUrl = normalizeLinkedInUrl(linkedInUrl);
      
      // Create lead object for database insertion
      leads.push({
        owner: req.user.userId,
        name: parsedLead.name || [parsedLead.firstName, parsedLead.lastName].filter(Boolean).join(' ') || '',
        firstName: parsedLead.firstName || '',
        lastName: parsedLead.lastName || '',
        linkedInUrl: normalizedUrl,
        linkedInId: parsedLead.linkedInId || '',
        headline: parsedLead.headline || '',
        email: parsedLead.email || '',
        phone: parsedLead.phone || '',
        company: parsedLead.company || '',
        position: parsedLead.position || '',
        location: parsedLead.location || '',
        notes: parsedLead.notes || '',
        tags: parsedLead.tags || [],
        source: 'csv',
        status: 'active',
        campaigns: campaignId ? [campaignId] : [],
      });
    }

    console.log(`Processed ${csvRows.length} rows, found ${leads.length} valid leads`);

    // Insert leads into database
    let createdLeads = [];
    if (leads.length > 0) {
      createdLeads = await Lead.insertMany(leads);
    }
    const leadIds = createdLeads.map(lead => lead._id);

    // Create lead list
    const leadList = new LeadList({
      name: req.file.originalname,
      description: `Imported from ${req.file.originalname}`,
      owner: req.user.userId,
      campaign: campaignId,
      leads: leadIds,
      source: 'csv',
      leadCount: leadIds.length
    });
    await leadList.save();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Return response
    res.json({
      success: true,
      leadList,
      leads: createdLeads,
      importedCount: leadIds.length,
      errorCount: errors.length,
      errors: errors
    });
  } catch (err) {
    console.error('CSV upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new lead list
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, campaignId } = req.body;
    const leadList = new LeadList({
      name,
      description,
      owner: req.user.userId,
      campaign: campaignId
    });
    await leadList.save();
    res.status(201).json(leadList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all lead lists for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const leadLists = await LeadList.find({ owner: req.user.userId })
      .populate('campaign', 'name status')
      .sort({ createdAt: -1 });
    res.json(leadLists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific lead list
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const leadList = await LeadList.findOne({
      _id: req.params.id,
      owner: req.user.userId
    }).populate('campaign', 'name status');
    
    if (!leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }
    
    res.json(leadList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a lead list
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const leadList = await LeadList.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }

    // Delete associated leads
    await Lead.deleteMany({ _id: { $in: leadList.leads } });
    
    // Delete the lead list
    // Note: Using remove() is deprecated in newer Mongoose versions
    await LeadList.deleteOne({ _id: leadList._id });

    res.json({ message: 'Lead list and associated leads deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;