import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExcelImport from '@/components/admin/ExcelImport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Database, History } from 'lucide-react';
import { useTerm } from '@/contexts/TermContext';

const DataImport: React.FC = () => {
  const { selectedTerm } = useTerm();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Data Import</h1>
        <p className="text-muted-foreground">
          Import data from Excel files and manage data synchronization.
        </p>
        <div className="mt-2">
          <Badge variant="outline" className="text-sm">
            {selectedTerm?.name || 'Current Term'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="excel">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="excel">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel Import
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database Sync
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Import History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="excel">
          <ExcelImport />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Synchronization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Database synchronization features are coming soon.
                <br />
                Please use Excel import for now.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                No import history available yet.
                <br />
                Import history will be displayed here after your first data import.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataImport;
