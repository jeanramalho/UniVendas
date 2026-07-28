-- Migration to add cardholder fields to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cardholder_name text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cardholder_is_member boolean DEFAULT true;
