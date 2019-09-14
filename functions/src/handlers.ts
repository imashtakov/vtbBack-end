import axios from 'axios';
import { createHash } from 'crypto';
import { v4 } from 'uuid';
import endpoint from './endpoints';
import { VtbAPI } from './vtb'
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
            const updateInvoiceStatus = async (participant: Payer, sessionId: string) => {
                const axiosConfig = { headers: { FPSID: sessionId } };
                if (participant.status === '2') {
                    const invoiceData: VtbAPI.InvoiceInfo = await axios.get(
                        endpoint.invoceInfo(participant.invoiceNumber, participant.address), 
                        axiosConfig
                    );
                    if (invoiceData.state === 5) {
                        participant.status = '1';
                    } else if (invoiceData.state === 1 || invoiceData.state === 2) {
                        participant.status = '2';
                    } else {
                        participant.status = '0';
                    }
                }
            }

            const payments: PaymentModel[] = 
                await Promise.all(userPaymentsSnapshot.docs.map((payment: any) => payment.data()));
            const sessionId: string = (await axios.post(endpoint.session, { deviceId })).data.data;
            for (let index = 0; index < payments.length; index++) {
                const payment = payments[index];
                await Promise.all(payment.participants.map(
                    user => updateInvoiceStatus(user, sessionId)
                ));
            }
            return PaymentView.renderList(payments);
        }
    }
    return {
        list: []
    };
}

const createPayment = async ({ username, payment }: { username: string, payment: Payment }): Promise<void> => {
    const userDocument = userCollention.doc(`${username}`);
    const userDocumentSnapshot = await userDocument.get();
    if (userDocumentSnapshot.exists) {
        const userPayments = userDocument.collection('payments');
        userPayments.add(payment.participants.map((payer: Payer) => {
            return {
                ...payer,
                invoiceNumber: v4()
            }
        }));
    }
}

export { getUserAddress, getUserPayments, createPayment };
