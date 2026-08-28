const apiKey = process.env.OPENC_API_KEY?.trim();

if (!apiKey) {
  throw new Error('OPENC_API_KEY is not configured');
}

// Confirm only that configuration exists. Never print the credential.
console.log('OPENC_API_KEY is configured');
