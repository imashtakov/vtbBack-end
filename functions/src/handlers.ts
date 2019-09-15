import axios from 'axios';
import { createHash } from 'crypto';
import { v4 } from 'uuid';
import endpoint from './endpoints';
import { VtbAPI } from './vtb'
import { PaymentView } from './PaymentView';
import { db } from './db';

const deviceId = 'metadevs';
const currencyCode = 810;
const axiosConfig = { headers: { FPSID: '' } };

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
            axiosConfig.headers.FPSID = await getFpsId();
            const identifier = createHash('sha256').update(Buffer.from(username)).digest('hex');
            const { data: { data: { address } } } = await axios.get(endpoint.identifier(identifier), axiosConfig);
            await userDocument.create({ identifier, address });
            response = { address };
        } catch (err) {
            console.error(err);
        }
    } else {
        const data = userDocumentSnapshot.data();
        return data ? { address: data.address } : undefined;
    }
    return response;
}

const createPayment = async ({ username, payment }: { username: string, payment: Payment }): Promise<void> => {
    const userDocument = userCollention.doc(username);
    const userDocumentSnapshot = await userDocument.get();
    const userData = userDocumentSnapshot.data();
    if (userData) {
        axiosConfig.headers.FPSID = await getFpsId();
        const userPayments = userDocument.collection('payments');
        payment.participants = payment.participants.map((payer: Payer) => {
            return {
                ...payer,
                status: '2',
                invoiceNumber: v4()
            }
        });
        payment.participants.forEach(async (payer: Payer) => {
            const createInvoice = {
                currencyCode,
                amount: payer.amount,
                description: payment.description,
                payer: payer.address,
                recipient: userData.address,
                number: payer.invoiceNumber
            }
            await axios.post(endpoint.invoice, createInvoice, axiosConfig);
        });

        await userPayments.add(payment);
    }
}

const getUserPayments = async (username: string): Promise<PaymentList | undefined> => {
    const userDocument = userCollention.doc(`${username}`);
    const userDocumentSnapshot = await userDocument.get();
    const userData = userDocumentSnapshot.data();
    if (userData) {
        const userPayments = userDocument.collection('payments');
        const userPaymentsSnapshot = await userPayments.get();
        if (!userPaymentsSnapshot.empty) {
            const sessionId = await getFpsId();
            const payments: PaymentModel[] = await Promise.all(userPaymentsSnapshot.docs.map((payment) => {
                const { participants } = payment.data();
                participants.map((user: Payer) => updateInvoiceStatus(user, userData.address, sessionId));
                payment.ref.update({ participants });
                return payment.data() as PaymentModel;
            }));
            return PaymentView.renderList(payments);
        }
    }
    return {
        list: []
    };
}

const getFpsId = async (): Promise<string> => {
    const { data: { data } } = await axios.post(endpoint.session, { deviceId });
    return data;
}

const updateInvoiceStatus = async (participant: Payer, recipient: string, sessionId: string) => {
    const axiosConfig = { headers: { FPSID: sessionId } };
    if (participant.status === '2') {
        const invoiceData: VtbAPI.InvoiceInfo = (await axios.get(
            endpoint.invoceInfo(participant.invoiceNumber, recipient),
            axiosConfig
        )).data;
        if (invoiceData.data.state === 5) {
            participant.status = '1';
        } else if (invoiceData.data.state === 1 || invoiceData.data.state === 2) {
            participant.status = '2';
        } else {
            participant.status = '0';
        }
    }
}

export { getUserAddress, getUserPayments, createPayment };
