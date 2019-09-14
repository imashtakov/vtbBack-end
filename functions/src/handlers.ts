import axios from 'axios';
import { createHash } from 'crypto';
import endpoint from './endpoints';
import { db } from './db';

const deviceId = 'metadevs';

type User = {
    address: string;
}

const userCollention = db.collection('users');

const getUserAddress = async (username: string): Promise<User | undefined> => {
    let response = undefined;
    const userDocument = userCollention.doc(username);
    const userDocumentSnapshot = await userDocument.get();
    if (!userDocumentSnapshot.exists) {
        try {
            const { data: sessionData } = await axios.post(endpoint.session, { deviceId });
            const axiosConfig = { headers: { FPSID: null } };
            axiosConfig.headers.FPSID = sessionData.data;
            const identifier = createHash('sha256').update(Buffer.from(username)).digest('hex');
            const { data: userData } = await axios.get(endpoint.identifier(identifier), axiosConfig);
            const address = userData.data.address;
            await userDocument.create({ identifier, address });
            response = { address };
        } catch (err) {
            console.error(err);
        }
    } else {
        const addressData = userDocumentSnapshot.data();
        return { address: addressData!.address };
    }

    return response;
}

export { getUserAddress };
