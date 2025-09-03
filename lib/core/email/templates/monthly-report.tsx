import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
} from '@react-email/components';

interface Inadimplente {
  id: string;
  nome: string;
  imovel?: string;
  valor: number;
  diasAtraso: number;
}

interface RentPayment {
  id: string;
  date: Date;
  propertyCode: string;
  propertyAddress: string;
  propertyCity: string;
  tenant: string;
  amount: number;
  bankAccount: string;
}

interface DREMonthData {
  label: string;
  values: {
    receitasOperacionais: number;
    despesasOperacionais: number;
    lucroOperacional: number;
    receitasEDespesasNaoOperacionais: number;
    resultadoDeCaixa: number;
  };
}

interface MonthlyReportEmailProps {
  month: number;
  year: number;
  inadimplentes: Inadimplente[];
  rentPayments: RentPayment[];
  dreData: DREMonthData[];
  dreReportUrl?: string;
  rentReportUrl?: string;
}

function sumByCategory(
  payments: (RentPayment & { category?: string | null })[],
  categoryName: string
): number {
  return payments
    .filter(
      (p) => (p.category || '').toLowerCase() === categoryName.toLowerCase()
    )
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function MonthlyReportEmail({
  month,
  year,
  inadimplentes,
  rentPayments,
  dreData,
  dreReportUrl,
  rentReportUrl,
}: MonthlyReportEmailProps) {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f6f6f6',
          padding: '20px',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '8px',
          }}
        >
          <Heading style={{ color: '#333333', marginBottom: '20px' }}>
            [RATC] Relatório Mensal - {monthName.replace(' ', ' de ')}
          </Heading>

          <Text style={{ color: '#666666', marginBottom: '30px' }}>
            Relatório financeiro mensal contendo inadimplentes, DRE e aluguéis
            recebidos.
          </Text>

          {/* Inadimplentes Section */}
          <Section style={{ marginBottom: '30px' }}>
            <Heading
              as="h2"
              style={{
                color: '#333333',
                fontSize: '18px',
                marginBottom: '15px',
              }}
            >
              Inadimplentes até o último dia do mês
            </Heading>

            {inadimplentes.length === 0 ? (
              <Text style={{ color: '#666666' }}>
                Sem inadimplentes no período.
              </Text>
            ) : (
              <div style={{ width: '100%', borderCollapse: 'collapse' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          textAlign: 'left',
                        }}
                      >
                        Nome
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          textAlign: 'left',
                        }}
                      >
                        Imóvel
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          textAlign: 'left',
                        }}
                      >
                        Valor
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          textAlign: 'left',
                        }}
                      >
                        Dias de Atraso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inadimplentes.map((item) => (
                      <tr key={item.id}>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                          }}
                        >
                          {item.nome}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                          }}
                        >
                          {item.imovel || '-'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                            color: '#dc3545',
                            fontWeight: 'bold',
                          }}
                        >
                          {formatCurrency(item.valor)}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                          }}
                        >
                          {item.diasAtraso} dias
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Hr style={{ margin: '30px 0', borderColor: '#dee2e6' }} />

          {/* DRE Section */}
          <Section style={{ marginBottom: '30px' }}>
            <Heading
              as="h2"
              style={{
                color: '#333333',
                fontSize: '18px',
                marginBottom: '15px',
              }}
            >
              DRE Resumo —{' '}
              {dreData.map((m) => m.label.toUpperCase()).join(', ')}
            </Heading>

            <div style={{ width: '100%', borderCollapse: 'collapse' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th
                      style={{
                        padding: '12px',
                        border: '1px solid #dee2e6',
                        textAlign: 'left',
                      }}
                    >
                      Linha
                    </th>
                    {dreData.map((month) => (
                      <th
                        key={month.label}
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          textAlign: 'left',
                        }}
                      >
                        {month.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{ padding: '12px', border: '1px solid #dee2e6' }}
                    >
                      Receitas operacionais
                    </td>
                    {dreData.map((month) => (
                      <td
                        key={`rec-${month.label}`}
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          color: '#28a745',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(month.values.receitasOperacionais)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{ padding: '12px', border: '1px solid #dee2e6' }}
                    >
                      Despesas operacionais
                    </td>
                    {dreData.map((month) => (
                      <td
                        key={`desp-${month.label}`}
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          color: '#dc3545',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(month.values.despesasOperacionais)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{ padding: '12px', border: '1px solid #dee2e6' }}
                    >
                      Lucro operacional
                    </td>
                    {dreData.map((month) => (
                      <td
                        key={`lucro-${month.label}`}
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          color:
                            month.values.lucroOperacional >= 0
                              ? '#28a745'
                              : '#dc3545',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(month.values.lucroOperacional)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{ padding: '12px', border: '1px solid #dee2e6' }}
                    >
                      Receitas e despesas não operacionais
                    </td>
                    {dreData.map((month) => (
                      <td
                        key={`nao-op-${month.label}`}
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          color:
                            month.values.receitasEDespesasNaoOperacionais >= 0
                              ? '#28a745'
                              : '#dc3545',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(
                          month.values.receitasEDespesasNaoOperacionais
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{ padding: '12px', border: '1px solid #dee2e6' }}
                    >
                      Resultado de caixa
                    </td>
                    {dreData.map((month) => (
                      <td
                        key={`caixa-${month.label}`}
                        style={{
                          padding: '12px',
                          border: '1px solid #dee2e6',
                          color:
                            month.values.resultadoDeCaixa >= 0
                              ? '#28a745'
                              : '#dc3545',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(month.values.resultadoDeCaixa)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {dreReportUrl && (
              <Text style={{ marginTop: '15px' }}>
                <Link
                  href={dreReportUrl}
                  style={{ color: '#007bff', textDecoration: 'underline' }}
                >
                  📊 Ver relatório DRE completo (PDF)
                </Link>
              </Text>
            )}
          </Section>

          <Hr style={{ margin: '30px 0', borderColor: '#dee2e6' }} />

          {/* Rent Payments Section */}
          <Section style={{ marginBottom: '30px' }}>
            <Heading
              as="h2"
              style={{
                color: '#333333',
                fontSize: '18px',
                marginBottom: '15px',
              }}
            >
              Aluguéis Recebidos - {monthName}
            </Heading>

            {rentPayments.length === 0 ? (
              <Text style={{ color: '#666666' }}>
                Nenhum aluguel recebido no período.
              </Text>
            ) : (
              <>
                <div style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                            fontWeight: 'bold',
                          }}
                        >
                          Total de Aluguéis Próprios Recebidos
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                            color: '#28a745',
                            fontWeight: 'bold',
                          }}
                        >
                          {formatCurrency(
                            sumByCategory(rentPayments, 'Aluguel')
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                            fontWeight: 'bold',
                          }}
                        >
                          Total de Aluguéis de Terceiros
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            border: '1px solid #dee2e6',
                            color: '#28a745',
                            fontWeight: 'bold',
                          }}
                        >
                          {formatCurrency(
                            sumByCategory(rentPayments, 'Aluguel de Terceiros')
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {rentReportUrl && (
                  <Text style={{ marginTop: '15px' }}>
                    <Link
                      href={rentReportUrl}
                      style={{ color: '#007bff', textDecoration: 'underline' }}
                    >
                      📄 Ver relatório de aluguéis completo (PDF)
                    </Link>
                  </Text>
                )}
              </>
            )}
          </Section>

          <Hr style={{ margin: '30px 0', borderColor: '#dee2e6' }} />

          <Text style={{ color: '#666666', fontSize: '12px' }}>
            Este é um relatório automático gerado pelo sistema financeiro. Para
            mais detalhes, acesse o sistema de gestão.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
