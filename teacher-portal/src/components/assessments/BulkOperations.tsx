import React, { useState } from 'react';
import { assessmentAPI, Question, Assessment } from '../../services/api/assessmentAPI';

interface BulkOperationsProps {
  onImportComplete?: (results: { imported: number; errors: string[] }) => void;
  selectedQuestions?: Question[];
  selectedAssessments?: Assessment[];
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  onImportComplete,
  selectedQuestions = [],
  selectedAssessments = []
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importType, setImportType] = useState<'questions' | 'assessments'>('questions');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'qti'>('json');
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      let results;
      
      if (importType === 'questions') {
        results = await assessmentAPI.bulkImportQuestions(file);
      } else {
        results = await assessmentAPI.bulkImportAssessments(file);
      }

      setSuccess(`Successfully imported ${results.data.imported} ${importType}`);
      
      if (results.data.errors.length > 0) {
        setError(`Some items had errors: ${results.data.errors.join(', ')}`);
      }

      onImportComplete?.(results.data);
    } catch (err: any) {
      setError(err.message || `Failed to import ${importType}`);
      console.error(`Error importing ${importType}:`, err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      let blob: Blob;
      let filename: string;

      if (importType === 'questions') {
        if (selectedQuestions.length === 0) {
          throw new Error('No questions selected for export');
        }
        
        const questionIds = selectedQuestions.map(q => q.id);
        blob = await assessmentAPI.exportQuestions(questionIds, exportFormat as 'json' | 'csv' | 'qti');
        filename = `questions_export.${exportFormat}`;
      } else {
        if (selectedAssessments.length === 0) {
          throw new Error('No assessments selected for export');
        }
        
        const assessmentIds = selectedAssessments.map(a => a.id);
        blob = await assessmentAPI.exportAssessments(assessmentIds, exportFormat as 'json' | 'qti');
        filename = `assessments_export.${exportFormat}`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Successfully exported ${importType === 'questions' ? selectedQuestions.length : selectedAssessments.length} ${importType}`);
    } catch (err: any) {
      setError(err.message || `Failed to export ${importType}`);
      console.error(`Error exporting ${importType}:`, err);
    } finally {
      setExporting(false);
    }
  };

  const getFileTypeDescription = () => {
    switch (exportFormat) {
      case 'json':
        return 'JSON format - Compatible with most systems';
      case 'csv':
        return 'CSV format - Spreadsheet compatible (questions only)';
      case 'qti':
        return 'QTI format - Standard for learning management systems';
      default:
        return '';
    }
  };

  const getSampleFileInfo = () => {
    if (importType === 'questions') {
      return {
        formats: ['JSON', 'CSV', 'QTI'],
        description: 'Upload questions in bulk using supported formats',
        sampleStructure: `{
  "questions": [
    {
      "type": "multiple_choice",
      "content": {
        "text": "What is 2 + 2?",
        "instructions": "Select the correct answer"
      },
      "options": [
        { "text": "3", "isCorrect": false },
        { "text": "4", "isCorrect": true }
      ],
      "points": 1,
      "difficulty": "beginner",
      "tags": ["math", "basic"]
    }
  ]
}`
      };
    } else {
      return {
        formats: ['JSON', 'QTI'],
        description: 'Upload complete assessments with questions',
        sampleStructure: `{
  "assessments": [
    {
      "title": "Math Quiz",
      "description": "Basic math assessment",
      "questions": [...],
      "settings": {
        "timeLimit": 30,
        "allowRetakes": false
      }
    }
  ]
}`
      };
    }
  };

  const sampleInfo = getSampleFileInfo();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Operations</h2>
        
        {/* Tabs */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'import'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📥 Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'export'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="text-green-800">{success}</div>
          </div>
        )}

        {/* Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {activeTab === 'import' ? 'Import Type' : 'Export Type'}
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="questions"
                checked={importType === 'questions'}
                onChange={(e) => setImportType(e.target.value as 'questions' | 'assessments')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Questions</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="assessments"
                checked={importType === 'assessments'}
                onChange={(e) => setImportType(e.target.value as 'questions' | 'assessments')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Assessments</span>
            </label>
          </div>
        </div>

        {activeTab === 'import' ? (
          <div>
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {uploading ? (
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Uploading and processing file...</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Drop your file here, or click to browse
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {sampleInfo.description}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Supported formats: {sampleInfo.formats.join(', ')}
                  </p>
                  <input
                    type="file"
                    accept=".json,.csv,.xml"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                  >
                    Choose File
                  </label>
                </div>
              )}
            </div>

            {/* Sample Format */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sample File Structure:</h4>
              <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
                {sampleInfo.sampleStructure}
              </pre>
            </div>

            {/* Import Guidelines */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Import Guidelines:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Ensure all required fields are present</li>
                <li>• Question types must be valid: multiple_choice, essay, true_false, etc.</li>
                <li>• Points must be positive numbers</li>
                <li>• Multiple choice questions must have at least one correct option</li>
                <li>• File size limit: 10MB</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            {/* Export Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'qti')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                {importType === 'questions' && <option value="csv">CSV</option>}
                <option value="qti">QTI</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {getFileTypeDescription()}
              </p>
            </div>

            {/* Selection Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Export Summary:</h4>
              <div className="text-sm text-gray-600">
                {importType === 'questions' ? (
                  <p>{selectedQuestions.length} questions selected for export</p>
                ) : (
                  <p>{selectedAssessments.length} assessments selected for export</p>
                )}
                <p>Format: {exportFormat.toUpperCase()}</p>
              </div>
            </div>

            {/* Export Button */}
            <div className="text-center">
              <button
                onClick={handleExport}
                disabled={
                  exporting || 
                  (importType === 'questions' && selectedQuestions.length === 0) ||
                  (importType === 'assessments' && selectedAssessments.length === 0)
                }
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </span>
                ) : (
                  `Export ${importType === 'questions' ? selectedQuestions.length : selectedAssessments.length} ${importType}`
                )}
              </button>
            </div>

            {/* Export Guidelines */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Export Information:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Exported files include all question data and metadata</li>
                <li>• QTI format is compatible with most LMS platforms</li>
                <li>• JSON format preserves all custom fields and settings</li>
                <li>• CSV format is simplified for spreadsheet editing (questions only)</li>
                <li>• Media files are referenced by URL in exports</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperations;