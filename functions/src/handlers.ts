import axios from 'axios';
import { createHash } from 'crypto';
import { v4 } from 'uuid';
import endpoint from './endpoints';
import { PaymentView } from './PaymentView';
import { db } from './db';

const deviceId = 'metadevs';

type User = {
    address: string;
}

type Payer = {
    address: string;
    amount: number;
    /**
     * 0 - Отменен
     * 1 - Успешно закрыт
     * 2 - В процессе
     */
    status: '0' | '1' | '2';
    invoiceNumber: string;
}

export type PaymentModel = {
    id: string;
    participants: Payer[];
    description: string;
    ownerAmount: number;
    overallCost: number;
};


export type Payment = {
    id: string;
    participants: Payer[];
    description: string;
    ownerAmount: number;
    overallCost: number;
    /**
     * 0 - Отменен
     * 1 - Успешно закрыт
     * 2 - В процессе
     */
    status: '0' | '1' | '2';
};

type PaymentList = {
    list: Payment[];
};

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

const getUserPayments = async (username: string): Promise<PaymentList | undefined> => {
    const userDocument = userCollention.doc(`${username}`);
    const userDocumentSnapshot = await userDocument.get();
    if (userDocumentSnapshot.exists) {
        const userPayments = userDocument.collection('payments');
        const userPaymentsSnapshot = await userPayments.get();
        if (!userPaymentsSnapshot.empty) {
            const payments = await Promise.all(userPaymentsSnapshot.docs.map(payment => payment.data()));
            return PaymentView.renderList(payments as PaymentModel[]);
        }
    }
    return {
        list: []
    };
}



const createPayment = async ({ username, payment }: { username: string, payment: Payment }): Promise<void> => {
    const userPayments = userCollention.doc(`${username}/payments`);
    payment.participants.map((payer: Payer) => {
        return {
            ...payer,
            invoiceNumber: v4()
        }
    });
    await userPayments.create(payment);
}

export { getUserAddress, getUserPayments, createPayment };
