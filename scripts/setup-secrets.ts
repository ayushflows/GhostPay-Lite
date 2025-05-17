const { SecretsManager } = require('aws-sdk');
const secretsManager = new SecretsManager({ region: process.env.AWS_REGION || 'ap-south-1' });

async function createSecret(name, value) {
  try {
    await secretsManager.createSecret({
      Name: name,
      SecretString: value,
      Description: `Secret for ${name}`,
      Tags: [
        {
          Key: 'Environment',
          Value: 'Production'
        },
        {
          Key: 'Service',
          Value: 'GhostCard'
        }
      ]
    }).promise();
    console.log(`Created secret: ${name}`);
  } catch (error) {
    if (error.code === 'ResourceExistsException') {
      console.log(`Secret ${name} already exists`);
    } else {
      console.error(`Error creating secret ${name}:`, error);
    }
  }
}

async function setupSecrets() {
  // Create JWT secret
  await createSecret('jwt-secret', process.env.JWT_SECRET || 'your-jwt-secret');

  // Create MongoDB URL secret
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/ghostcard';
  await createSecret('mongodb-url', mongoUrl);
}

setupSecrets().catch(console.error); 