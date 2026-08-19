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
    refetch,
  } = useQuery({
    queryKey: ["invoices", societyId, unitId],
    queryFn: async () => {
      if (!societyId) return [];
      const endpoint = unitId
        ? `/societies/${societyId}/billing/invoices?unit_id=${unitId}`
        : `/societies/${societyId}/billing/invoices`;
      return apiClient<InvoiceItem[]>(endpoint).catch(() => []);
    },
    enabled: Boolean(societyId),
  });

  // Mutation: Pay invoice
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

  return {
    invoices,
    isLoading,
    refetch,
    payInvoice: payInvoiceMutation.mutateAsync,
  };
}
