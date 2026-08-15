'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPayableAction, createVendorAction } from '../actions';
import { isoDate } from '@/lib/core/payables/dates';
import { paymentMethodLabels } from '@/lib/core/payables/labels';
import type { PayablePaymentMethod } from '@/app/generated/prisma';

type Option = {
  id: string;
  name?: string;
  code?: string;
  defaultCategoryId?: string | null;
  defaultPropertyId?: string | null;
};

type InstallmentDraft = {
  dueDate: string;
  amount: string;
  paymentMethod: PayablePaymentMethod;
  boletoLine: string;
};

const paymentMethodOptions = Object.entries(paymentMethodLabels) as Array<
  [PayablePaymentMethod, string]
>;

export function PayableForm({
  vendors,
  categories,
  properties,
}: {
  vendors: Option[];
  categories: { id: string; name: string }[];
  properties: { id: string; code: string }[];
}) {
  const router = useRouter();
  const today = isoDate(new Date());
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [competenceDate, setCompetenceDate] = useState(
    `${today.slice(0, 7)}-01`
  );
  const [categoryId, setCategoryId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { dueDate: today, amount: '', paymentMethod: 'BOLETO', boletoLine: '' },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        value: vendor.id,
        label: vendor.name ?? vendor.id,
      })),
    [vendors]
  );

  const onVendorChange = (id: string) => {
    setVendorId(id);
    const vendor = vendors.find((item) => item.id === id);
    if (vendor?.defaultCategoryId) setCategoryId(vendor.defaultCategoryId);
    if (vendor?.defaultPropertyId) setPropertyId(vendor.defaultPropertyId);
  };

  const updateInstallment = (
    index: number,
    patch: Partial<InstallmentDraft>
  ) => {
    setInstallments((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const addInstallment = () => {
    setInstallments((current) => [
      ...current,
      {
        dueDate: current[current.length - 1]?.dueDate || today,
        amount: '',
        paymentMethod: current[0]?.paymentMethod ?? 'BOLETO',
        boletoLine: '',
      },
    ]);
  };

  const removeInstallment = (index: number) => {
    setInstallments((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index)
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    let resolvedVendorId = vendorId;
    if (creatingVendor) {
      if (!newVendorName.trim()) {
        setLoading(false);
        setError('Informe o nome do novo fornecedor.');
        return;
      }
      const created = await createVendorAction({ name: newVendorName.trim() });
      if (!created.success) {
        setLoading(false);
        setError(created.error);
        return;
      }
      resolvedVendorId = created.vendor.id;
    }

    if (!resolvedVendorId) {
      setLoading(false);
      setError('Selecione um fornecedor ou cadastre um novo.');
      return;
    }

    const result = await createPayableAction({
      vendorId: resolvedVendorId,
      description,
      documentNumber,
      issueDate,
      competenceDate,
      categoryId: categoryId || null,
      propertyId: propertyId || null,
      notes,
      installments: installments.map((item) => ({
        dueDate: item.dueDate,
        amount: Number(item.amount.replace(',', '.')),
        paymentMethod: item.paymentMethod,
        boletoLine: item.boletoLine || null,
      })),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/contas-a-pagar/${result.id}`);
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Dados do título</CardTitle>
          <CardDescription>
            Informe quem receberá o pagamento, o valor e o vencimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Não foi possível salvar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldSet>
              <FieldLegend>Fornecedor</FieldLegend>
              {creatingVendor ? (
                <Field>
                  <FieldLabel htmlFor="new-vendor">
                    Nome do novo fornecedor
                  </FieldLabel>
                  <Input
                    id="new-vendor"
                    required
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="Ex: Energisa, Condomínio Village Damha"
                  />
                  <FieldDescription>
                    O fornecedor será cadastrado ao criar o título.
                  </FieldDescription>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto w-fit px-0"
                    onClick={() => {
                      setCreatingVendor(false);
                      setNewVendorName('');
                    }}
                  >
                    Escolher um fornecedor já cadastrado
                  </Button>
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Fornecedor cadastrado</FieldLabel>
                  <Combobox
                    options={vendorOptions}
                    value={vendorId}
                    onValueChange={onVendorChange}
                    placeholder="Selecione o fornecedor"
                    searchPlaceholder="Buscar fornecedor..."
                    emptyMessage="Nenhum fornecedor encontrado."
                    allowClear={false}
                    className="w-full"
                  />
                  <FieldDescription>
                    Quem vai receber este pagamento.
                  </FieldDescription>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto w-fit px-0"
                    onClick={() => {
                      setCreatingVendor(true);
                      setVendorId('');
                    }}
                  >
                    Cadastrar novo fornecedor
                  </Button>
                </Field>
              )}
            </FieldSet>

            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="description">Descrição</FieldLabel>
                <Input
                  id="description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Condomínio agosto, Energia sala 12"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="document-number">
                  Número do documento
                </FieldLabel>
                <Input
                  id="document-number"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="NF, boleto ou referência (opcional)"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-date">Emissão</FieldLabel>
                <Input
                  id="issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="competence-date">Competência</FieldLabel>
                <Input
                  id="competence-date"
                  type="date"
                  value={competenceDate}
                  onChange={(e) => setCompetenceDate(e.target.value)}
                />
                <FieldDescription>
                  Mês a que a despesa se refere. Não altera o DRE.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Categoria</FieldLabel>
                <Combobox
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Selecione a categoria"
                  searchPlaceholder="Buscar categoria..."
                  emptyMessage="Nenhuma categoria encontrada."
                  clearLabel="Nenhuma"
                  className="w-full"
                />
              </Field>
              <Field>
                <FieldLabel>Imóvel</FieldLabel>
                <Combobox
                  options={properties.map((property) => ({
                    value: property.id,
                    label: property.code,
                  }))}
                  value={propertyId}
                  onValueChange={setPropertyId}
                  placeholder="Selecione o imóvel"
                  searchPlaceholder="Buscar imóvel..."
                  emptyMessage="Nenhum imóvel encontrado."
                  clearLabel="Nenhum"
                  className="w-full"
                />
              </Field>
            </FieldGroup>

            <FieldSet>
              <FieldLegend>Parcelas</FieldLegend>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <FieldDescription className="mb-0">
                  Informe o vencimento e o valor de cada pagamento.
                </FieldDescription>
                <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                  <Plus data-icon="inline-start" />
                  Adicionar parcela
                </Button>
              </div>
              {installments.map((item, index) => (
                <FieldGroup
                  key={index}
                  className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  {installments.length > 1 && (
                    <div className="flex items-center justify-between md:col-span-2 xl:col-span-4">
                      <p className="text-sm font-medium">Parcela {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInstallment(index)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Remover
                      </Button>
                    </div>
                  )}
                  <Field>
                    <FieldLabel htmlFor={`due-date-${index}`}>
                      Vencimento
                    </FieldLabel>
                    <Input
                      id={`due-date-${index}`}
                      type="date"
                      required
                      value={item.dueDate}
                      onChange={(e) =>
                        updateInstallment(index, { dueDate: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`amount-${index}`}>Valor</FieldLabel>
                    <Input
                      id={`amount-${index}`}
                      required
                      inputMode="decimal"
                      placeholder="0,00"
                      value={item.amount}
                      onChange={(e) =>
                        updateInstallment(index, { amount: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Forma de pagamento</FieldLabel>
                    <Select
                      value={item.paymentMethod}
                      onValueChange={(value) =>
                        updateInstallment(index, {
                          paymentMethod: value as PayablePaymentMethod,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {paymentMethodOptions.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`boleto-${index}`}>
                      Linha digitável
                    </FieldLabel>
                    <Input
                      id={`boleto-${index}`}
                      value={item.boletoLine}
                      onChange={(e) =>
                        updateInstallment(index, { boletoLine: e.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </Field>
                </FieldGroup>
              ))}
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="notes">Observações</FieldLabel>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes internos, se precisar"
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar título'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
