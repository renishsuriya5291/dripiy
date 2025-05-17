const axios = require('axios');

async function triggerWebhook(event, campaign, payload) {
  if (!campaign.webhooks || !Array.isArray(campaign.webhooks)) return;
  const webhooks = campaign.webhooks.filter(w => w.event === event && w.active);
  for (const webhook of webhooks) {
    try {
      await axios.post(webhook.url, payload);
    } catch (err) {
      // Optionally log error
      console.error(`Webhook failed for ${webhook.url}:`, err.message);
    }
  }
}

module.exports = triggerWebhook;
