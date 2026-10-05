import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface TransactionItem {
  id: string;
  invoice_id: string;
  transaction_ref: string;
  receipt_number: string;
  payment_method: string;
  amount: number;
  status: string;
  paid_at: string;
}

export interface InvoiceItem {
  id: string;
  society_id: string;
  unit_id: string;
  unit_number?: string;
  invoice_number: string;
  billing_period: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  penalty_amount: number;
  total_amount: number;
  paid_amount: number;
  status: "UNPAID" | "PAID" | "OVERDUE" | "PARTIAL";
  line_items: Array<{ title: string; amount: number; category: string }>;
  created_at: string;
  paid_at?: string;
  transactions: TransactionItem[];
}

export interface PaymentOrderSession {
  invoice_id: string;
  order_id: string;
  cf_order_id?: string;
  payment_session_id: string;
  order_amount: number;
  order_currency: string;
  customer_name: string;
  customer_phone: string;
}

export interface LedgerStats {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate_pct: number;
}

export function useBilling() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const societyId = user?.societyId;
  const unitId = user?.unitId;

  // Query: Invoices for resident unit
  const {
    data: invoices = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoices", societyId, unitId],
    queryFn: async () => {
      if (!societyId) return [];
      const endpoint = unitId
        ? `/societies/${societyId}/billing/invoices?unit_id=${unitId}`
        : `/societies/${societyId}/billing/invoices`;
      return apiClient<InvoiceItem[]>(endpoint);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Pay invoice (Direct)
  const payInvoiceMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      paymentMethod = "UPI",
      amount,
    }: {
      invoiceId: string;
      paymentMethod?: string;
      amount?: number;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<TransactionItem>(
        `/societies/${societyId}/billing/invoices/${invoiceId}/pay`,
        {
          method: "POST",
          body: JSON.stringify({ payment_method: paymentMethod, amount }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", societyId] });
    },
  });

  // Mutation: Initiate Cashfree Payment Order
  const initiatePaymentMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      returnUrl,
    }: {
      invoiceId: string;
      amount?: number;
      returnUrl?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<PaymentOrderSession>(
        `/societies/${societyId}/billing/invoices/${invoiceId}/initiate-payment`,
        {
          method: "POST",
          body: JSON.stringify({ amount, return_url: returnUrl }),
        }
      );
    },
  });

  // Mutation: Verify Cashfree Payment
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      orderId,
      paymentMethod = "UPI",
      paymentRef,
    }: {
      invoiceId: string;
      orderId: string;
      paymentMethod?: string;
      paymentRef?: string;
    }) => {
      if (!societyId) throw new Error("Missing society context");
      return apiClient<TransactionItem>(
        `/societies/${societyId}/billing/invoices/${invoiceId}/verify-payment`,
        {
          method: "POST",
          body: JSON.stringify({
            order_id: orderId,
            payment_method: paymentMethod,
            payment_ref: paymentRef,
          }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", societyId] });
    },
  });

  return {
    invoices,
    isLoading,
    isError,
    error,
    refetch,
    payInvoice: payInvoiceMutation.mutateAsync,
    initiatePayment: initiatePaymentMutation.mutateAsync,
    verifyPayment: verifyPaymentMutation.mutateAsync,
  };
}

