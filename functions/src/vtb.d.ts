export namespace VtbAPI {
  export type InvoiceInfo = {
    data: {
      /**
       * 0 – Не определен
       * 1 – Создан
       * 2 – Выставлен
       * 3 – Ошибочный счет
       * 4 – Истекло время действия счета
       * 5 - Оплачен
       */
      state: 0 | 1 | 2 | 3 | 4 | 5;
    };
  }
}