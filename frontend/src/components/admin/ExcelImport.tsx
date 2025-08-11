import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadAPI } from '@/lib/api';
import { ErrorHandler } from '@/utils/errorHandling';

const ExcelImport: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('students');
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [importResults, setImportResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel') {
        setSelectedFile(file);
        setImportStatus('idle');
        setStatusMessage('');
      } else {
        ErrorHandler.handleFileUploadError(
          { message: 'Invalid file type. Only Excel files (.xlsx or .xls) are allowed.' },
          file.name
        );
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      ErrorHandler.showWarning('Please select a file to import');
      return;
    }

    setImportStatus('processing');
    setStatusMessage('Processing your Excel file...');
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('importType', importType);

      const response = await uploadAPI.importExcelData(formData);

      if (response.success) {
        setImportStatus('success');
        setStatusMessage(response.message);
        setImportResults(response.data);
        ErrorHandler.showSuccess('Excel data imported successfully');
      } else {
        setImportStatus('error');
        setStatusMessage(response.message || 'Import failed');
        ErrorHandler.handleApiError(response, 'Excel import');
      }
    } catch (error) {
      setImportStatus('error');
      setStatusMessage('Failed to import Excel data. Please try again.');
      ErrorHandler.handleFileUploadError(error, selectedFile.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Excel Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-type">Import Type</Label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger id="import-type">
                <SelectValue placeholder="Select import type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">Student Data</SelectItem>
                <SelectItem value="scores">Score Data</SelectItem>
                <SelectItem value="attendance">Attendance Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Excel File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button onClick={handleImport} disabled={!selectedFile || importStatus === 'processing'}>
                {importStatus === 'processing' ? (
                  'Processing...'
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground flex items-center mt-1">
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                {selectedFile.name}
              </p>
            )}
          </div>

          {importStatus === 'processing' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          {importStatus === 'success' && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                {statusMessage}
                {importResults && (
                  <div className="mt-2 text-sm">
                    <p>Total rows: {importResults.totalRows}</p>
                    <p>Successfully imported: {importResults.successCount}</p>
                    <p>Errors: {importResults.errorCount}</p>
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside">
                          {importResults.errors.slice(0, 5).map((error: string, index: number) => (
                            <li key={index} className="text-xs">{error}</li>
                          ))}
                          {importResults.errors.length > 5 && (
                            <li className="text-xs">... and {importResults.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {importStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground mt-4">
            <h4 className="font-medium mb-1">Import Instructions:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Excel template format for proper data import</li>
              <li>Ensure all required fields are filled in the Excel file</li>
              <li>Student IDs must be unique and match existing records for updates</li>
              <li>Maximum file size: 10MB</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExcelImport;
