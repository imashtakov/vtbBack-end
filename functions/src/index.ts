import * as functions from 'firebase-functions';
import { getUserAddress as getUserAddressHandler } from './handlers';
import { getUserPayments as getUserPaymentsHandler } from './handlers';
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

export const getUserAddress = functions.https.onCall(getUserAddressHandler);

export const getUserPayments = functions.https.onCall(getUserPaymentsHandler);
