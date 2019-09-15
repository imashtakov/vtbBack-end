const BASE_URL = 'http://89.208.84.235:31080/api/v1';

const session = `${BASE_URL}/session`;

const identifier = (identifier: string) => `${BASE_URL}/account/identifier/${identifier}`;

const invoice = `${BASE_URL}/invoice`;

const invoceInfo = (invoiceNumber: string, recipient: string) => `${BASE_URL}/invoice/810/${invoiceNumber}/${recipient}`;

export default { session, identifier, invoice, invoceInfo };
