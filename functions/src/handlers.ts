import axios from 'axios';
import endpoint from './endpoints';
import { createHash } from 'crypto';

const deviceId = 'metadevs';

type User = {
    user: string;
}

const getUserAddress = async (username: string): Promise<User> => {
    const { data: sessionData } = await axios.post(endpoint.session, { deviceId });
    const axiosConfig = { headers: { FPSID: null } };
    axiosConfig.headers.FPSID = sessionData.data;
    const identifier = createHash('sha256').update(Buffer.from(username)).digest('hex');
    const { data: userData } = await axios.get(endpoint.identifier(identifier), axiosConfig);
    return { user: userData.data.address };
}

export { getUserAddress };
