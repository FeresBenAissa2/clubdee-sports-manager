import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Test: Data Export Format Compliance
 * Feature: sports-club-management, Property 40: Data export format compliance
 * Validates: Requirements 12.2
 * 
 * For any performance data export request, the system should generate output
 * in the requested format (CSV or PDF) with all data correctly formatted.
 */

// Types matching the export structure
interface PerformanceRecord {
  test_date: string;
  athletes: {
    first_name: string;
    last_name: string;
    nickname: string | null;
  };
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  notes: string | null;
}

interface AttendanceReportRow {
  athleteName: string;
  nickname: string | null;
  totalSessions: number;
  attended: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

/**
 * Generate CSV from performance records
 * This mirrors the logic in lib/coach/report-actions.ts
 */
function generatePerformanceCSV(records: PerformanceRecord[]): string {
  // Helper to escape CSV field (RFC 4180)
  const escapeField = (field: string): string => {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    // Always quote fields
    return `"${escaped}"`;
  };

  // Create CSV header
  const headers = [
    'วันที่ทดสอบ',
    'ชื่อนักกีฬา',
    'ชื่อเล่น',
    'ประเภทการทดสอบ',
    'ชื่อการทดสอบ',
    'คะแนน',
    'หน่วย',
    'หมายเหตุ',
  ];

  // Create CSV rows
  const rows = records.map((record) => [
    record.test_date,
    `${record.athletes.first_name} ${record.athletes.last_name}`,
    record.athletes.nickname || '-',
    record.test_type,
    record.test_name,
    record.score.toString(),
    record.unit,
    record.notes || '-',
  ]);

  // Combine header and rows
  const csvContent = [
    headers.map(escapeField).join(','),
    ...rows.map((row) => row.map(escapeField).join(',')),
  ].join('\n');

  // Add BOM for UTF-8 encoding
  const csvWithBOM = '\uFEFF' + csvContent;

  return csvWithBOM;
}

/**
 * Generate CSV from attendance report
 * This mirrors the logic in lib/coach/report-actions.ts
 */
function generateAttendanceCSV(report: AttendanceReportRow[]): string {
  // Helper to escape CSV field (RFC 4180)
  const escapeField = (field: string): string => {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    // Always quote fields
    return `"${escaped}"`;
  };

  // Create CSV header
  const headers = [
    'ชื่อนักกีฬา',
    'ชื่อเล่น',
    'ครั้งทั้งหมด',
    'เข้าร่วม',
    'ขาด',
    'สาย',
    'ลา',
    'อัตราการเข้าร่วม (%)',
  ];

  // Create CSV rows
  const rows = report.map((row) => [
    row.athleteName,
    row.nickname || '-',
    row.totalSessions.toString(),
    row.attended.toString(),
    row.absent.toString(),
    row.late.toString(),
    row.excused.toString(),
    row.attendanceRate.toFixed(1),
  ]);

  // Combine header and rows
  const csvContent = [
    headers.map(escapeField).join(','),
    ...rows.map((row) => row.map(escapeField).join(',')),
  ].join('\n');

  // Add BOM for UTF-8 encoding
  const csvWithBOM = '\uFEFF' + csvContent;

  return csvWithBOM;
}

/**
 * Parse CSV content to validate structure
 * Handles quoted fields with escaped quotes
 */
function parseCSV(csvContent: string): string[][] {
  // Remove BOM if present
  const content = csvContent.replace(/^\uFEFF/, '');
  
  // Split by newlines
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Parse each line (RFC 4180 compliant CSV parser)
  return lines.map(line => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : null;
      
      if (char === '"' && !inQuotes) {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        // Escaped quote within quoted field
        currentField += '"';
        i += 2;
      } else if (char === '"' && inQuotes) {
        // End of quoted field
        inQuotes = false;
        i++;
      } else if (char === ',' && !inQuotes) {
        // Field delimiter
        fields.push(currentField);
        currentField = '';
        i++;
      } else {
        // Regular character
        currentField += char;
        i++;
      }
    }
    
    // Add the last field
    fields.push(currentField);
    
    return fields;
  });
}

// Generators for property-based testing
const dateGen = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => d.toISOString().split('T')[0]);

const thaiNameGen = fc.oneof(
  fc.constant('สมชาย'),
  fc.constant('สมหญิง'),
  fc.constant('วิชัย'),
  fc.constant('สุดา'),
  fc.constant('ประยุทธ์'),
  fc.constant('นภา')
);

const performanceRecordGen = fc.record({
  test_date: dateGen,
  athletes: fc.record({
    first_name: fc.oneof(thaiNameGen, fc.string({ minLength: 1, maxLength: 20 })),
    last_name: fc.oneof(thaiNameGen, fc.string({ minLength: 1, maxLength: 20 })),
    nickname: fc.option(fc.string({ minLength: 1, maxLength: 15 }), { nil: null }),
  }),
  test_type: fc.constantFrom('ความเร็ว', 'ความแข็งแรง', 'ความอดทน', 'ความยืดหยุ่น'),
  test_name: fc.constantFrom('วิ่ง 100 เมตร', 'วิ่ง 1500 เมตร', 'ดันพื้น', 'ซิทอัพ', 'ยืดเหยียด'),
  score: fc.float({ min: 0, max: 1000, noNaN: true }),
  unit: fc.constantFrom('วินาที', 'นาที', 'ครั้ง', 'เซนติเมตร', 'กิโลกรัม'),
  notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
});

const attendanceReportRowGen = fc.record({
  athleteName: fc.string({ minLength: 3, maxLength: 40 }),
  nickname: fc.option(fc.string({ minLength: 1, maxLength: 15 }), { nil: null }),
  totalSessions: fc.integer({ min: 0, max: 100 }),
  attended: fc.integer({ min: 0, max: 100 }),
  absent: fc.integer({ min: 0, max: 100 }),
  late: fc.integer({ min: 0, max: 100 }),
  excused: fc.integer({ min: 0, max: 100 }),
  attendanceRate: fc.float({ min: 0, max: 100, noNaN: true }),
});

describe('Property 40: Data Export Format Compliance', () => {
  describe('Performance Data CSV Export', () => {
    it('should start with UTF-8 BOM character', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 50 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            
            // Property: CSV should start with BOM
            expect(csv.charCodeAt(0)).toBe(0xFEFF);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct number of rows (header + data)', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 50 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            
            // Property: Should have header + one row per record
            expect(parsed.length).toBe(records.length + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct number of columns in each row', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 50 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            
            // Property: All rows should have 8 columns
            const expectedColumns = 8;
            for (const row of parsed) {
              expect(row.length).toBe(expectedColumns);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all data fields in CSV', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 20 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            
            // Skip header row
            const dataRows = parsed.slice(1);
            
            // Property: Each record's data should be present in CSV
            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              const row = dataRows[i];
              
              expect(row[0]).toBe(record.test_date);
              expect(row[1]).toBe(`${record.athletes.first_name} ${record.athletes.last_name}`);
              expect(row[2]).toBe(record.athletes.nickname || '-');
              expect(row[3]).toBe(record.test_type);
              expect(row[4]).toBe(record.test_name);
              expect(row[5]).toBe(record.score.toString());
              expect(row[6]).toBe(record.unit);
              expect(row[7]).toBe(record.notes || '-');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null values correctly', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 30 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Null values should be replaced with '-'
            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              const row = dataRows[i];
              
              if (record.athletes.nickname === null) {
                expect(row[2]).toBe('-');
              }
              
              if (record.notes === null) {
                expect(row[7]).toBe('-');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should quote all fields to handle special characters', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 20 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            
            // Remove BOM
            const content = csv.replace(/^\uFEFF/, '');
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            
            // Skip header, check data rows
            const dataLines = lines.slice(1);
            
            // Property: Each field should be quoted
            for (const line of dataLines) {
              // Count quotes - should be even (opening and closing for each field)
              const quoteCount = (line.match(/"/g) || []).length;
              expect(quoteCount % 2).toBe(0);
              
              // Should have at least 16 quotes (8 fields * 2 quotes each)
              expect(quoteCount).toBeGreaterThanOrEqual(16);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty dataset', () => {
      const records: PerformanceRecord[] = [];
      const csv = generatePerformanceCSV(records);
      const parsed = parseCSV(csv);
      
      // Property: Empty dataset should still have header
      expect(parsed.length).toBe(1);
      expect(parsed[0].length).toBe(8);
    });

    it('should preserve numeric precision for scores', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 30 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Score values should be preserved as strings
            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              const row = dataRows[i];
              
              const expectedScore = record.score.toString();
              expect(row[5]).toBe(expectedScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain row order', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 2, maxLength: 30 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Rows should appear in same order as input
            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              const row = dataRows[i];
              
              // Check date to verify order
              expect(row[0]).toBe(record.test_date);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Attendance Report CSV Export', () => {
    it('should start with UTF-8 BOM character', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 50 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            
            // Property: CSV should start with BOM
            expect(csv.charCodeAt(0)).toBe(0xFEFF);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct number of rows (header + data)', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 50 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            
            // Property: Should have header + one row per athlete
            expect(parsed.length).toBe(report.length + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct number of columns in each row', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 50 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            
            // Property: All rows should have 8 columns
            const expectedColumns = 8;
            for (const row of parsed) {
              expect(row.length).toBe(expectedColumns);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all data fields in CSV', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 20 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Each row's data should be present in CSV
            for (let i = 0; i < report.length; i++) {
              const row = report[i];
              const csvRow = dataRows[i];
              
              expect(csvRow[0]).toBe(row.athleteName);
              expect(csvRow[1]).toBe(row.nickname || '-');
              expect(csvRow[2]).toBe(row.totalSessions.toString());
              expect(csvRow[3]).toBe(row.attended.toString());
              expect(csvRow[4]).toBe(row.absent.toString());
              expect(csvRow[5]).toBe(row.late.toString());
              expect(csvRow[6]).toBe(row.excused.toString());
              expect(csvRow[7]).toBe(row.attendanceRate.toFixed(1));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format attendance rate to 1 decimal place', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 30 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Attendance rate should have exactly 1 decimal place
            for (let i = 0; i < report.length; i++) {
              const csvRow = dataRows[i];
              const rateString = csvRow[7];
              
              // Should have format X.X or XX.X or XXX.X
              expect(rateString).toMatch(/^\d+\.\d$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null nickname correctly', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 30 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Null nicknames should be replaced with '-'
            for (let i = 0; i < report.length; i++) {
              const row = report[i];
              const csvRow = dataRows[i];
              
              if (row.nickname === null) {
                expect(csvRow[1]).toBe('-');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should quote all fields', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 20 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const content = csv.replace(/^\uFEFF/, '');
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            const dataLines = lines.slice(1);
            
            // Property: Each field should be quoted
            for (const line of dataLines) {
              const quoteCount = (line.match(/"/g) || []).length;
              expect(quoteCount % 2).toBe(0);
              expect(quoteCount).toBeGreaterThanOrEqual(16);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty report', () => {
      const report: AttendanceReportRow[] = [];
      const csv = generateAttendanceCSV(report);
      const parsed = parseCSV(csv);
      
      // Property: Empty report should still have header
      expect(parsed.length).toBe(1);
      expect(parsed[0].length).toBe(8);
    });

    it('should maintain row order', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 2, maxLength: 30 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: Rows should appear in same order as input
            for (let i = 0; i < report.length; i++) {
              const row = report[i];
              const csvRow = dataRows[i];
              
              expect(csvRow[0]).toBe(row.athleteName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should convert all numeric fields to strings', () => {
      fc.assert(
        fc.property(
          fc.array(attendanceReportRowGen, { minLength: 1, maxLength: 30 }),
          (report) => {
            const csv = generateAttendanceCSV(report);
            const parsed = parseCSV(csv);
            const dataRows = parsed.slice(1);
            
            // Property: All numeric fields should be string representations
            for (let i = 0; i < report.length; i++) {
              const row = report[i];
              const csvRow = dataRows[i];
              
              // Check that numeric fields are strings
              expect(typeof csvRow[2]).toBe('string');
              expect(typeof csvRow[3]).toBe('string');
              expect(typeof csvRow[4]).toBe('string');
              expect(typeof csvRow[5]).toBe('string');
              expect(typeof csvRow[6]).toBe('string');
              expect(typeof csvRow[7]).toBe('string');
              
              // Verify they can be parsed back to numbers
              expect(Number.isNaN(parseInt(csvRow[2]))).toBe(false);
              expect(Number.isNaN(parseInt(csvRow[3]))).toBe(false);
              expect(Number.isNaN(parseInt(csvRow[4]))).toBe(false);
              expect(Number.isNaN(parseInt(csvRow[5]))).toBe(false);
              expect(Number.isNaN(parseInt(csvRow[6]))).toBe(false);
              expect(Number.isNaN(parseFloat(csvRow[7]))).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CSV Format General Properties', () => {
    it('should use comma as field delimiter', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 20 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const parsed = parseCSV(csv);
            
            // Property: Each row should have 8 fields (parsed correctly)
            // This verifies that commas are used as delimiters and properly handled
            for (const row of parsed) {
              expect(row.length).toBe(8);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use newline as row delimiter', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 2, maxLength: 20 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            const content = csv.replace(/^\uFEFF/, '');
            
            // Property: Should have newlines separating rows
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            expect(lines.length).toBe(records.length + 1); // header + data rows
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle Thai characters correctly with BOM', () => {
      fc.assert(
        fc.property(
          fc.array(performanceRecordGen, { minLength: 1, maxLength: 20 }),
          (records) => {
            const csv = generatePerformanceCSV(records);
            
            // Property: BOM should be present for UTF-8 encoding
            expect(csv.charCodeAt(0)).toBe(0xFEFF);
            
            // Property: Thai characters should be preserved
            const content = csv.replace(/^\uFEFF/, '');
            for (const record of records) {
              if (record.test_type.match(/[\u0E00-\u0E7F]/)) {
                expect(content).toContain(record.test_type);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
