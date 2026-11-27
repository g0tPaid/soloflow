import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExporterPage from "./page";
import { exporterOrderSchema } from "@flowbooks/shared";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { accessToken: "test-token", user: { id: "test-user" } },
  }),
}));
vi.mock("@/hooks/use-organization", () => ({
  useOrganizationId: () => ({ organizationId: "test-org", isReady: true }),
}));

describe("standalone exporter workspace", () => {
  it("excludes sample data from live metrics while keeping it accessible in the independent order list", async () => {
    const data = exporterOrderSchema.parse({
      customerId: "buyer",
      supplierId: "supplier",
      date: "2026-11-27",
      currency: "USD",
      purchaseCurrency: "CNY",
      lines: [
        {
          productId: "motor",
          description: "Sample motor",
          quantity: 1,
          purchasePrice: 250,
          salePrice: 100,
          packages: 0,
          netWeight: 0,
          grossWeight: 0,
          cbm: 0,
        },
      ],
      purchase: {},
      customs: { declaredQuantity: 0, declaredValue: 0, currency: "USD" },
      tax: {
        vatInvoiceAmount: 0,
        vatAmount: 0,
        rmbRate: 7,
        treatment: "UNCONFIRMED",
      },
      shipment: { status: "PENDING" },
    });
    api.mockResolvedValue({
      profile: null,
      directory: [],
      orders: [
        {
          id: "sample",
          number: "SAMPLE-ORDER-000001",
          sample: true,
          data,
          parties: {
            customer: { name: "Sample buyer" },
            supplier: { name: "Sample supplier" },
          },
          completedAt: null,
          documents: [],
          payments: [],
          attachments: [],
        },
      ],
    });
    render(<ExporterPage />);
    await screen.findByRole("heading", { name: "Recent export transactions" });
    const sales = screen.getByRole("heading", {
      name: "Total export sales",
    }).parentElement!;
    expect(within(sales).queryByText("USD 100.00")).not.toBeInTheDocument();
    expect(screen.getByText("SAMPLE-ORDER-000001")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Customers" }));
    expect(
      screen.getByRole("heading", { name: "Customers" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add record" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New independent buyer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/exporter/directory/customers",
        expect.objectContaining({ method: "POST", organizationId: "test-org" }),
      ),
    );
  });
});
