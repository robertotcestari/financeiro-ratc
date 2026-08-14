import { z } from '@hono/zod-openapi'

export const VendorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    document: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    notes: z.string().nullable(),
    isActive: z.boolean(),
    defaultCategoryId: z.string().nullable(),
    defaultPropertyId: z.string().nullable(),
  })
  .openapi('Vendor')

export const VendorInputSchema = z
  .object({
    name: z.string().min(1),
    document: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    defaultCategoryId: z.string().nullable().optional(),
    defaultPropertyId: z.string().nullable().optional(),
  })
  .openapi('VendorInput')

export const VendorListResponseSchema = z
  .object({ data: z.array(VendorSchema) })
  .openapi('VendorListResponse')

export const VendorDetailResponseSchema = z
  .object({ data: VendorSchema })
  .openapi('VendorDetailResponse')
