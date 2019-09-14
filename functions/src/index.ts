import * as functions from 'firebase-functions';
import { getUserAddress as getUserAddressHandler } from './handlers';
import { getUserPayments as getUserPaymentsHandler } from './handlers';
import { createPayment as createPaymentHandler } from './handlers';
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

export const getUserAddress = functions.https.onCall(getUserAddressHandler);
export const getUserPayments = functions.https.onCall(getUserPaymentsHandler);
export const createPayment = functions.https.onCall(createPaymentHandler);
