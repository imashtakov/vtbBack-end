import axios from 'axios';
import { createHash } from 'crypto';
import endpoint from './endpoints';
import { PaymentView } from './PaymentView';
import { db } from './db';
import { pubsub } from 'firebase-functions';

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
    id?: string;
    participants: Payer[];
    description: string;
    ownerAmount: number;
    overallCost: number;
};


export type Payment = {
    id?: string;
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

type Invoice = {
    amount: number;
    payer: string;
    recipient: string;
    recipientName: string;
    paymentId: string;
    /**
     * 0 - Отменен
     * 1 - Успешно закрыт
     * 2 - В процессе
     */
    status: '0' | '1' | '2';
    updateTime: number;
};

const userCollention = db.collection('users');
const invoiceCollention = db.collection('invoices');

const scheduledFunction = pubsub.schedule('every 1 minutes').onRun(async (_context) => {
    const invoicesInProgress = await invoiceCollention
        .orderBy('updateTime', 'asc')
        .where('status', '==', '2')
        .limit(3)
        .get();
    if (!invoicesInProgress.empty) {
        axiosConfig.headers.FPSID = await getFpsId();
        invoicesInProgress.forEach(async invoice => {
            const { recipient, recipientName, paymentId } = invoice.data();
            let status = '2';
            const updateTime = Date.now();
            try {
                const { data: { data: { state } } } = await axios.get(
                    endpoint.invoceInfo(invoice.id, recipient),
                    axiosConfig
                );
                status = getInvoiceStatus(state);
            } catch (err) {
                console.error(err);
            }
            await invoice.ref.update({ status, updateTime });
            const userPaymentRef = db.doc(`users/${recipientName}/payments/${paymentId}`);
            const userPaymentDocument = await userPaymentRef.get();
            const userPayment = userPaymentDocument.data() as Payment;
            if (userPayment) {
                const { participants } = userPayment;
                participants.map((user: Payer) => {
                    return {
                        ...user,
                        status: user.invoiceNumber === invoice.id ? status : user.status
                    }
                });
                await userPaymentRef.update({ participants });
            }
        });
    }
});

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

const createPayment = async (createPayment: string | { username: string, payment: Payment }): Promise<void> => {
    let username: string;
    let payment: Payment
    if (createPayment instanceof Object) {
        username = createPayment.username;
        payment = createPayment.payment;
    } else {
        const parsedPayment = JSON.parse(createPayment);
        username = parsedPayment.username;
        payment = parsedPayment.payment;
    }
    const userDocument = userCollention.doc(username);
    const userDocumentSnapshot = await userDocument.get();
    const userData = userDocumentSnapshot.data();
    if (userData) {
        axiosConfig.headers.FPSID = await getFpsId();
        const userPayments = userDocument.collection('payments');
        const userPaymentRef = await userPayments.add({});
        payment.participants = await Promise.all(payment.participants.map(async (payer: Payer) => {
            const invoiceRef = await invoiceCollention.add({
                amount: payer.amount,
                payer: payer.address,
                recipient: userData.address,
                recipientName: username,
                status: '2',
                paymentId: userPaymentRef.id,
                updateTime: Date.now()
            } as Invoice);
            const createInvoice = {
                currencyCode,
                amount: payer.amount,
                description: payment.description,
                payer: payer.address,
                recipient: userData.address,
                number: invoiceRef.id
            };
            await axios.post(endpoint.invoice, createInvoice, axiosConfig);
            return {
                ...payer,
                status: '2',
                invoiceNumber: invoiceRef.id
            } as Payer;
        }));
        await userPaymentRef.update(payment);
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
            const payments: PaymentModel[] = userPaymentsSnapshot.docs.map((payment) => {
                return {
                    ...payment.data() as PaymentModel,
                    id: payment.id
                }
            });
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

const getInvoiceStatus = (state: number) => {
    let status = '0';
    if (state === 5) {
        status = '1';
    } else if (state === 1 || state === 2) {
        status = '2';
    }
    return status;
}

export { getUserAddress, getUserPayments, createPayment, scheduledFunction };
