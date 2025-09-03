import type { Metadata } from 'next';
import Link from 'next/link';
import { Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Manual | Financeiro RATC',
  description:
    'Passo a passo atualizado para importação, conciliação e categorização no app Financeiro RATC.',
};

export default function ManualPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manual</h1>
          <p className="text-gray-600 mt-1">
            Guia atualizado a partir do processo antigo (planilhas), adaptado à realidade do app.
          </p>
        </header>

        <section className="mb-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start">
              <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="ml-3 text-amber-900">
                <p className="font-semibold">Dica geral</p>
                <p className="mt-1">
                  Após importações e ajustes, use a página{' '}
                  <Link href="/integridade" className="text-amber-700 underline hover:text-amber-800">/integridade</Link>{' '}
                  para conferir saldos, transações pendentes e status de categorização. A visão{' '}
                  <Link href="/transacoes" className="text-amber-700 underline hover:text-amber-800">/transacoes</Link>{' '}
                  é a sua “Contas Unificadas”.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Conta Sicredi</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-800">
            <li>Baixe o extrato do Sicredi em formato OFX no Internet Banking.</li>
            <li>
              Acesse{' '}
              <Link href="/ofx-import" className="text-blue-600 hover:underline">/ofx-import</Link>{' '}
              e envie o arquivo. O preview já traz campos padronizados e, quando possível, sugestões de categorização.
            </li>
            <li>
              Salve as transações na conta bancária correspondente (ex.:{' '}
              <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">CC - Sicredi</code>). Ao final, valide se o saldo
              final bate com o do banco. Dica: confira também em{' '}
              <Link href="/integridade" className="text-blue-600 hover:underline">Integridade</Link>.
            </li>
            <li>
              As transações importadas já aparecem na visão unificada em{' '}
              <Link href="/transacoes" className="text-blue-600 hover:underline">Transações</Link>.
            </li>
            <li>
              Aplique categorização automática quando fizer sentido:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  Mantenha regras em{' '}
                  <Link href="/regras-categorizacao" className="text-blue-600 hover:underline">Regras</Link>{' '}
                  para recorrências.
                </li>
                <li>
                  Opcional: gere/aplique sugestões de IA a partir de{' '}
                  <Link href="/transacoes" className="text-blue-600 hover:underline">Transações</Link>.
                </li>
              </ul>
            </li>
            <li>Revise e finalize as categorias nas transações (não é necessário “colar” em planilhas).</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Conta Investimento Sicredi</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-800">
            <li>
              Em{' '}
              <Link href="/transacoes" className="text-blue-600 hover:underline">Transações</Link>, identifique as transferências entre contas
              (ex.: de <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">CC - Sicredi</code> para{' '}
              <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">CI - SicrediInvest</code>). Você pode filtrar por descrição/valor/data.
            </li>
            <li>
              Categorize as duas pontas como <span className="font-semibold">Transferência</span> (categoria do tipo{' '}
              <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">TRANSFER</code>). Isso garante que o DRE não seja afetado por movimentações entre contas.
            </li>
            <li>
              Verifique se o saldo de <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">CI - SicrediInvest</code> bate. Se houver diferença pequena por rendimentos/IOF,
              crie lançamentos de ajuste com a categoria “Juros/Rendimentos Bancários”.
            </li>
            <li>
              Após isso, as transações já ficam refletidas em{' '}
              <Link href="/transacoes" className="text-blue-600 hover:underline">Contas Unificadas</Link>.
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Conta Investimento XP</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-800">
            <li>
              Identifique em{' '}
              <Link href="/transacoes" className="text-blue-600 hover:underline">Transações</Link>{' '}as transferências destinadas à XP.
            </li>
            <li>
              Categorize ambas as pontas como <span className="font-semibold">Transferência</span> (tipo{' '}
              <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">TRANSFER</code>), relacionando a conta de origem/destino conforme o caso.
            </li>
            <li>
              Se necessário, crie lançamentos de “Juros/Rendimentos” para que o saldo da conta de investimento bata com o extrato.
            </li>
            <li>Revise os lançamentos — não há necessidade de “copiar e colar” para uma aba separada.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">PJBank</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-800">
            <li>
              Ajuste primeiro as transferências no Imobzi e verifique se o saldo bate exatamente com o PJBank. Para isso, baixe o extrato
              do mês no app do PJBank.
            </li>
            <li>
              Importe os dados em{' '}
              <Link href="/importacao-imobzi" className="text-blue-600 hover:underline">/importacao-imobzi</Link>.
            </li>
            <li>
              As transações ficarão disponíveis em{' '}
              <Link href="/transacoes" className="text-blue-600 hover:underline">Transações</Link>.
            </li>
            <li>
              Para facilitar o vínculo com imóveis/inquilinos, use o repositório de utilitários{' '}
              <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">ratc-scripts</code> (opcional):
              <pre className="mt-2 mb-0"><code>bun run src/inquilino-imovel/index.ts</code></pre>
            </li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Categorização de tudo</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-800">
            <li>
              Categorize todas as transações pendentes. Utilize Regras, Sugestões de IA e a marcação de “Revisado” para controlar o progresso.
              Acompanhe o percentual de categorização em{' '}
              <Link href="/integridade" className="text-blue-600 hover:underline">Integridade</Link>.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Verificação de Pagamentos</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-800">
            <li>Verifique todos os pagamentos no app do Imobzi.</li>
            <li>Liste e acompanhe os inadimplentes.</li>
            <li>No e-mail, use o ChatGPT para gerar um resumo amigável.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
