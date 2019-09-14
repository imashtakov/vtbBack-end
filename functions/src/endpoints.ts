const BASE_URL = 'http://89.208.84.235:31080/api/v1';

const session = `${BASE_URL}/session`;

const identifier = (identifier: string) => `${BASE_URL}/account/identifier/${identifier}`;

export default { session, identifier };
