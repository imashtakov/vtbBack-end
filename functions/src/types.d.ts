export type ApiResponse<T> = {
  data: T;
}

export type User = {
  address: string;
}

export type Payment = {
  id: string;
  participants: {
    address: string;
    amount: number;
    /**
     * 0 - Отменен
     * 1 - Успешно закрыт
     * 2 - В процессе
     */
    status: '0' | '1' | '2';
    invoiceNumber: string;
  }[];
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

type Payer = { address: string, amount: number };

type PaymentPayload = {
  username: string;
  payment: {
    participants: Payer[];
    description: string;
    ownerAmount: number;
    overallCost: number;
  };
}

export interface MetaDevsAPI {
  getUserAddress(username: string): Promise<ApiResponse<User>>;
  getUserPayments(username: string): Promise<ApiResponse<PaymentList>>;
  createPayment(paymentPayload: PaymentPayload): Promise<ApiResponse<null>>;
}
