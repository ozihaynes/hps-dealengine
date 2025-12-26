import { z } from "zod";

export const DealContractStatusSchema = z.enum([
  "under_contract",
  "closed",
  "cancelled",
]);

export type DealContractStatus = z.infer<typeof DealContractStatusSchema>;

export const DealContractUpsertInputSchema = z
  .object({
    deal_id: z.string().uuid(),
    status: DealContractStatusSchema,
    executed_contract_price: z.number().nullable().optional(),
    executed_contract_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (val) => val.status !== "under_contract" || val.executed_contract_price != null,
    {
      message: "executed_contract_price is required when status is under_contract",
    },
  );

export type DealContractUpsertInput = z.infer<
  typeof DealContractUpsertInputSchema
>;

export const DealContractUpsertResultSchema = z.object({
  deal_contract_id: z.string().uuid(),
});

export type DealContractUpsertResult = z.infer<
  typeof DealContractUpsertResultSchema
>;
