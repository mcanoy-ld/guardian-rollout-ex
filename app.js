import 'dotenv/config';
import  express from 'express';
import { init } from '@launchdarkly/node-server-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 3000
const app = express()

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const staticRoot = path.dirname(__filename) + "/public"; // get the name of the directory

// Set sdkKey to your LaunchDarkly SDK key.
const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY ?? 'your-sdk-key';

if (!sdkKey) {
  console.log('*** Please edit index.js to set sdkKey to your LaunchDarkly SDK key first.');
  process.exit(1);
}

const ldClient = init(sdkKey);

const featureFlagKey = process.env.LAUNCHDARKLY_FLAG_KEY ?? 'sample-feature';
const errorMetricKey= process.env.LAUNCHDARKLY_METRIC_KEY ?? 'error event key';
//The client id for the sdk (project+env value)
const clientSideID= process.env.LAUNCHDARKLY_CLIENT_SIDE_ID ?? 'xxxxxxxx';

let trueVariantCount=0;
let falseVariantCount=0;
let trueErrorCount=0;
let falseErrorCount=0;
let errorARate=process.env.ERROR_A_RATE ? parseInt(process.env.ERROR_A_RATE) : 5;
let errorBRate=process.env.ERROR_B_RATE ? parseInt(process.env.ERROR_B_RATE) : 80;
let requestInterval=process.env.REQUEST_INTERVAL ? parseInt(process.env.REQUEST_INTERVAL) : 1000;

const generateRandomUser = () => {
  return `nodeuser-${Math.random().toString(36).substring(2, 6)}`
}

const setAge = () => {
  return Math.floor(Math.random() * 50) + 20;
}

function printValueAndBanner(flagValue) {
  console.log(`*** The '${featureFlagKey}' feature flag evaluates to ${flagValue}.`);
}

// Set up the context properties. Each call will randomly simulate a user
const context = {
  kind: 'user',
  key: generateRandomUser(),
  name: process.env.DEFAULT_USER_NAME ?? 'Sandy',
  location: process.env.DEFAULT_USER_LOCATION ?? 'US-West',
  age: process.env.DEFAULT_USER_AGE ? parseInt(process.env.DEFAULT_USER_AGE) : 20
};

app.use('/', express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('ab.html', {root: staticRoot});
});

// error handler
app.get('/flag', async (req, res) => {
  context.key = generateRandomUser();
  context.age = setAge();

  await ldClient.identify(context); 
  const flagValue = await ldClient.variation(featureFlagKey, context, false);

  flagValue ? trueVariantCount++ : falseVariantCount++;
  const rsp = await sendError(flagValue);
  res.setHeader('Content-Type', 'application/json');

  const jsonResponse = {
    error: rsp,
    context: context,
    variant: flagValue,
    errorARate: errorARate,
    errorBRate: errorBRate,
    requestInterval: requestInterval,
    trueVariantCount: trueVariantCount,
    falseVariantCount:falseVariantCount,
    trueErrorCount: trueErrorCount,
    falseErrorCount: falseErrorCount
  };
  res.status(200).send(JSON.stringify(jsonResponse));

});

app.get('/clientside', async (req, res) => {
  const flagValue = req.query.flagValue === "true";
  const errorValue = req.query.error === "true";
  context.key = req.query.context;
  flagValue ? trueVariantCount++ : falseVariantCount++;
  errorValue && flagValue && trueErrorCount++;
  errorValue && !flagValue && falseErrorCount++;

  res.setHeader('Content-Type', 'application/json');

  const jsonResponse = {
    error: errorValue,
    context: context,
    variant: flagValue,
    errorARate: errorARate,
    errorBRate: errorBRate,
    requestInterval: requestInterval,
    trueVariantCount: trueVariantCount,
    falseVariantCount:falseVariantCount,
    trueErrorCount: trueErrorCount,
    falseErrorCount: falseErrorCount
  };
  res.status(200).send(JSON.stringify(jsonResponse));
});

app.get('/clientsideidandflag', async (req, res) => {
  const jsonResponse = {
    clientSideID: clientSideID,
    flagKey: featureFlagKey
  }
  res.status(200).send(JSON.stringify(jsonResponse));
});

app.get('/interval', async (req, res) => {
  const rate = parseInt(req.query.rate);
  requestInterval = rate;

  res.status(200).send("{}");
});

app.get('/errorrate', async (req, res) => {
  const rate = parseInt(req.query.rate);
  req.query.group === 'treatment' ? 
    errorBRate = rate :
    errorARate = rate;

  res.status(200).send("{}");
});

app.get('/resetcounter', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const flagValue = await ldClient.variation(featureFlagKey, context, false);
  trueVariantCount=0;
  falseVariantCount=0;
  trueErrorCount=0;
  falseErrorCount=0;
  const jsonResponse = {
    error: false,
    context: context,
    variant: flagValue,
    trueVariantCount: trueVariantCount,
    falseVariantCount:falseVariantCount,
    trueErrorCount: trueErrorCount,
    falseErrorCount: falseErrorCount
  };
  res.status(200).send(JSON.stringify(jsonResponse));
});

app.listen(PORT, function (err) {
  if (err) console.log(err)
  console.log(`Server listening on PORT ${PORT}`)
});

async function sendError(flagValue) {
  const randomError = flagValue ? 
    Math.floor(Math.random() * 100) < errorBRate : 
    Math.floor(Math.random() * 100) < errorARate

  if(randomError) {
    
    ldClient.track(errorMetricKey, context);
    flagValue ? trueErrorCount++ : falseErrorCount++;
    console.log(`sending error event ${errorMetricKey}. flag is ${flagValue}. Control Errors ${ falseErrorCount} / ${falseVariantCount} Treatment Errors ${ trueErrorCount} / ${trueVariantCount}`);
    return true;
  }
  return false;
}

async function main() {
  try {
    await ldClient.waitForInitialization({timeout: 10});

    console.log('*** SDK successfully initialized!');

    const eventKey = `update:${featureFlagKey}`;
    ldClient.on(eventKey, async () => {
      const flagValue = await ldClient.variation(featureFlagKey, context, false);
      printValueAndBanner(flagValue);
    });

    const flagValue = await ldClient.variation(featureFlagKey, context, false);
    printValueAndBanner(flagValue);

    if (typeof process.env.CI !== "undefined") {
      process.exit(0);
    }
  } catch (error) {
    console.log(`*** SDK failed to initialize: ${error}`);
    process.exit(1);
  }

}

main();
