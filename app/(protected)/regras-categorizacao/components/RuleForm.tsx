'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button as UIButton } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CreateRuleRequest,
  UpdateRuleRequest,
  RuleWithRelations,
} from '@/lib/core/database/rule-management';
import type { RuleCriteria } from '@/lib/core/database/rule-types';
import type { FormData } from './CreateRuleDialog';
import DateCriteriaForm from './DateCriteriaForm';
import ValueCriteriaForm from './ValueCriteriaForm';
import DescriptionCriteriaForm from './DescriptionCriteriaForm';
import AccountCriteriaForm from './AccountCriteriaForm';

const ruleFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  propertyId: z.string().nullable().optional(),
  priority: z.number().min(0).max(100),
  criteria: z.object({
    date: z
      .object({
        dayRange: z
          .object({
            start: z.number().min(1).max(31),
            end: z.number().min(1).max(31),
          })
          .optional(),
        months: z.array(z.number().min(1).max(12)).optional(),
      })
      .optional(),
    value: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        operator: z
          .enum(['gt', 'gte', 'lt', 'lte', 'eq', 'between'])
          .optional(),
      })
      .optional(),
    description: z
      .object({
        keywords: z.array(z.string().min(1)),
        operator: z.enum(['and', 'or']),
        caseSensitive: z.boolean().optional(),
      })
      .optional(),
    accounts: z.array(z.string()).optional(),
  }),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface RuleFormProps {
  rule?: RuleWithRelations;
  formData: FormData;
  onSubmit: (data: CreateRuleRequest | UpdateRuleRequest) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function RuleForm({
  rule,
  formData,
  onSubmit,
  isSubmitting,
  onCancel,
}: RuleFormProps) {
  const { categories, properties, bankAccounts } = formData;

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: rule?.name || '',
      description: rule?.description || '',
      categoryId: rule?.categoryId || '',
      propertyId: rule?.propertyId || 'none',
      priority: rule?.priority || 0,
      criteria: (rule?.criteria as RuleCriteria) || {},
    },
  });

  const handleSubmit = async (values: RuleFormValues) => {
    // Convert null to undefined for propertyId to match API expectations
    const submitValues = {
      ...values,
      propertyId: values.propertyId ?? undefined,
    };
    await onSubmit(submitValues);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Defina o nome, descrição e prioridade da regra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Regra *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Aluguel Mensal" {...field} />
                </FormControl>
                <FormDescription>
                  Nome descritivo para identificar facilmente esta regra.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descrição opcional da regra..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormDescription>
                  Prioridade da regra (0-100). Regras com maior prioridade são
                  aplicadas primeiro.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Target Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Categorização</CardTitle>
          <CardDescription>
            Defina para qual categoria e propriedade as transações devem ser
            direcionadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Categoria *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <UIButton
                        type="button"
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'justify-between',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value
                          ? categories.find(
                              (category) => category.id === field.value
                            )?.name
                          : 'Selecione uma categoria'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </UIButton>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar categoria..." />
                      <CommandList>
                        <CommandEmpty>
                          Nenhuma categoria encontrada.
                        </CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => (
                            <CommandItem
                              key={category.id}
                              value={category.name}
                              onSelect={() => {
                                form.setValue('categoryId', category.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  category.id === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              {'  '.repeat(category.level - 1)}
                              {category.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="propertyId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Propriedade</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <UIButton
                        type="button"
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'justify-between',
                          !field.value || field.value === 'none'
                            ? 'text-muted-foreground'
                            : ''
                        )}
                      >
                        {field.value && field.value !== 'none'
                          ? (() => {
                              const property = properties.find(
                                (p) => p.id === field.value
                              );
                              return property
                                ? `${property.code}${
                                    property.description
                                      ? ` - ${property.description}`
                                      : ''
                                  }`
                                : 'Nenhuma propriedade';
                            })()
                          : 'Nenhuma propriedade'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </UIButton>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar propriedade..." />
                      <CommandList>
                        <CommandEmpty>
                          Nenhuma propriedade encontrada.
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              form.setValue('propertyId', 'none');
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === 'none' || !field.value
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            Nenhuma propriedade
                          </CommandItem>
                          {properties.map((property) => (
                            <CommandItem
                              key={property.id}
                              value={`${property.code} ${
                                property.description || ''
                              }`}
                              onSelect={() => {
                                form.setValue('propertyId', property.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  property.id === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              {property.code}
                              {property.description &&
                                ` - ${property.description}`}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Propriedade opcional a ser associada às transações que atendem
                  esta regra.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Rule Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Critérios da Regra</CardTitle>
          <CardDescription>
            Configure os critérios que uma transação deve atender para ser
            categorizada por esta regra. Todos os critérios definidos devem ser
            atendidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DateCriteriaForm form={form} />
          <Separator />
          <ValueCriteriaForm form={form} />
          <Separator />
          <DescriptionCriteriaForm form={form} />
          <Separator />
          <AccountCriteriaForm form={form} bankAccounts={bankAccounts} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {rule ? 'Atualizar Regra' : 'Criar Regra'}
        </Button>
      </div>
    </form>
  );
}
