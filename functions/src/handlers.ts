import axios from 'axios';
import endpoint from './endpoints';
import { createHash } from 'crypto';

const axiosConfig = { headers: { deviceId: 'metadevs', FPSID: null } };

type User = {
    address: string;
}

const getUserAddress = async (username: string): Promise<User> => {
    const { data: sessionData } = await axios.post(endpoint.session, {}, axiosConfig);
    axiosConfig.headers.FPSID = sessionData.data;
    const identifier = createHash('sha256').update(Buffer.from(username)).digest('hex');
    const { data: userData } = await axios.post(endpoint.identifier(identifier), {}, axiosConfig);
    return userData.data.address;
}

export { getUserAddress };
