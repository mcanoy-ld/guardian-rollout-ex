// const clientSideID = "67804e7920d76b09607759e1"
// const flagKey = 'flightStatus';

const context = {
  kind: 'user',
  key: 'client-side-user-key',
  name: 'Mandy'
};

let ldclient;
let flagKey = "xxxx";

async function getConfig() {
fetch('/clientsideidandflag')
    .then(response => response.json())
    .then(data => {
        console.log(data.clientSideID);
        flagKey = data.flagKey;
        console.log(flagKey);
        ldclient = LDClient.initialize(data.clientSideID, context);
        ldclient.on('initialized', () => {
          console.log('init!!')
        });
    })
    .catch(error => console.error('Error fetching data:', error));
}

getConfig();

  const generateRandomUser = () => {
    return `jsuser-${Math.random().toString(36).substring(2, 6)}`
  }

  async function sendError(flagValue, errorARate, errorBRate) {
    const randomError = flagValue ? 
      Math.floor(Math.random() * 100) < errorBRate : 
      Math.floor(Math.random() * 100) < errorARate
  
    if(randomError) {
      
      ldclient.track('KM tutorial errors', context);
      console.log(`sending error event `);
      return true;
    }
    return false;
  }

  context.key = generateRandomUser()


  async function identify() {
    await ldclient.identify(context); 
    const flagValue = await ldclient.variation(featureFlagKey, context, false);
  }
