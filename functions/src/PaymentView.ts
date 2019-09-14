import { PaymentModel, Payment } from './handlers';

class PaymentView {
  public static render(payment: PaymentModel): Payment {
    let status: '0' | '1' | '2' = '1';
    if (payment.participants.filter(user => user.status === '0').length) {
      status = '0';
    } else if (payment.participants.filter(user => user.status === '1').length) {
      status = '1';
    } else if (payment.participants.filter(user => user.status === '2').length) {
      status = '2';
    }
    return Object.assign(payment, { status });
  }

  public static renderList(paymentList: PaymentModel[]): { list: Payment[]; } {
    return {
      list: paymentList.map(PaymentView.render)
    };
  }
}

export { PaymentView };
