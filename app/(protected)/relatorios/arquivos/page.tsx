import { listSavedFiles } from '@/lib/core/database/saved-files';
import { requirePermissions } from '@/lib/core/auth/permission-helpers';
import { REPORT_VIEW_PERMISSION } from '@/lib/core/auth/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CopyPathButton from './components/CopyPathButton';

function getPublicUrlFromPath(path: string): string | null {
  if (path.startsWith('s3://')) {
    const without = path.replace('s3://', '');
    const [bucket, ...rest] = without.split('/');
    const key = rest.join('/');
    const base = process.env.S3_PUBLIC_BASE_URL || (process.env.AWS_REGION ? `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com` : null);
    if (base) return `${base.replace(/\/$/, '')}/${key}`;
  }
  return null;
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('pt-BR');
}

export default async function SavedFilesPage() {
  await requirePermissions(REPORT_VIEW_PERMISSION);
  const files = await listSavedFiles(100);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Arquivos Salvos</h1>
          <p className="text-gray-600">Histórico de PDFs e outros arquivos gerados pelo sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listagem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Caminho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => {
                    const publicUrl = getPublicUrlFromPath(file.path);
                    return (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.fileName}</TableCell>
                        <TableCell>{file.type}</TableCell>
                        <TableCell>{formatDateTime(file.savedAt)}</TableCell>
                        <TableCell className="truncate max-w-[360px]" title={file.path}>{file.path}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <CopyPathButton text={file.path} />
                          {publicUrl && (
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Abrir
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
