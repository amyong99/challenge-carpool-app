export const awsConfig = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_PB4wFSBW2',
  userPoolWebClientId: 'dlebcqqt29shci4157dr7sd86',
  oauth: {
    domain: 'us-east-2pb4wfsbw2.auth.us-east-2.amazoncognito.com',
    scope: ['email', 'profile', 'openid', 'phone'],
    redirectSignIn: 'http://localhost:5173/',
    redirectSignOut: 'http://localhost:5173/',
    responseType: 'code'
  },
  apiEndpoint: 'https://n61ybb6g3j.execute-api.us-east-2.amazonaws.com'
};