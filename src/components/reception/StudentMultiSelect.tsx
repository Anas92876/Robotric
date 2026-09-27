/**
 * StudentMultiSelect Component
 *
 * Multi-select component for selecting students with search functionality
 */

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui';
import type { Student } from '../../hooks/common/useNotifications';

interface StudentMultiSelectProps {
  students: Student[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export const StudentMultiSelect: React.FC<StudentMultiSelectProps> = ({
  students,
  selectedIds,
  onChange,
  error,
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return students;
    }
    const query = searchQuery.toLowerCase();
    return students.filter(
      student =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const handleToggle = (studentId: string) => {
    if (disabled) return;

    if (selectedIds.includes(studentId)) {
      onChange(selectedIds.filter(id => id !== studentId));
    } else {
      onChange([...selectedIds, studentId]);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(filteredStudents.map(s => s._id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[#003300]">
          Select Students <span className="text-red-500">*</span>
        </label>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#003300]/60">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={disabled}
              className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#003300]/40" />
        <Input
          type="text"
          placeholder="Search students by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10"
        />
      </div>

      {/* Student list */}
      <div className="border border-[#003300]/10 rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#003300]/60">
            {searchQuery ? 'No students found matching your search' : 'No students available'}
          </div>
        ) : (
          <>
            {filteredStudents.length > 1 && (
              <div className="sticky top-0 bg-white border-b border-[#003300]/10 p-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={disabled}
                  className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  Select all ({filteredStudents.length})
                </button>
              </div>
            )}
            <div className="p-2 space-y-1">
              {filteredStudents.map(student => {
                const isSelected = selectedIds.includes(student._id);
                return (
                  <label
                    key={student._id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-[#003300]/10 bg-white hover:border-[#003300]/20'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(student._id)}
                      disabled={disabled}
                      className="rounded border-[#003300]/20 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#003300] truncate">
                        {student.name}
                      </div>
                      <div className="text-xs text-[#003300]/60 truncate">
                        {student.email}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {/* Selected count badge */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedIds.slice(0, 3).map(id => {
            const student = students.find(s => s._id === id);
            if (!student) return null;
            return (
              <div
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
              >
                <span>{student.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleToggle(id)}
                    className="hover:text-primary/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
          {selectedIds.length > 3 && (
            <div className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              +{selectedIds.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};
