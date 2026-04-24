import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional(),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase().trim(),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
