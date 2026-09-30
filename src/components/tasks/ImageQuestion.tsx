import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { type Question, type Answer, type ImageAnswer } from '../../hooks/student/useTasks';
import { CardComponent, CardBody, Button, Badge } from '../ui';

interface ImageQuestionProps {
  question: Question;
  answer?: Answer;
  onChange: (answer: Answer) => void;
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export const ImageQuestion: React.FC<ImageQuestionProps> = ({
  question,
  answer,
  onChange,
  onFilesChange,
  disabled = false,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const files = Array.from(e.target.files);
    const maxFiles = question.maxImages || 1;
    const allowedTypes = question.allowedImageTypes || ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = (question.maxImageSize || 5) * 1024 * 1024; // Convert MB to bytes

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.slice(0, maxFiles - selectedFiles.length).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} is not an allowed image type`);
        return;
      }
      if (file.size > maxSize) {
        alert(`File ${file.name} exceeds maximum size of ${question.maxImageSize}MB`);
        return;
      }
      validFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFilesChange(newFiles);

    onChange({
      questionId: question._id || '',
      answerType: 'image',
      imageFileIndices: newFiles.map((_, index) => index),
    });
  };

  const removeFile = (index: number) => {
    if (disabled) return;

    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onFilesChange(newFiles);

    onChange({
      questionId: question._id,
      answerType: 'image',
      imageFileIndices: newFiles.map((_, i) => i),
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <CardComponent variant="glass" className="mb-4">
      <CardBody>
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-base font-semibold text-ink">
              {question.questionText}
            </h4>
            <span className="text-sm text-ink/60">
              {question.points} {question.points === 1 ? 'point' : 'points'}
            </span>
          </div>
          {question.required && (
            <span className="text-xs text-red-600">Required</span>
          )}
          <div className="mt-2 text-xs text-ink/60">
            Max {question.maxImages || 1} image{question.maxImages !== 1 ? 's' : ''}
            {question.maxImageSize && ` • Max ${question.maxImageSize}MB per image`}
          </div>
        </div>

        <div className="space-y-3">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative border border-primary/20 rounded-lg overflow-hidden"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover"
              />
              <div className="p-3 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-ink/60" />
                  <span className="text-sm text-ink/60">
                    {selectedFiles[index]?.name}
                  </span>
                  <span className="text-xs text-ink/40">
                    ({formatFileSize(selectedFiles[index]?.size || 0)})
                  </span>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {selectedFiles.length < (question.maxImages || 1) && (
            <div
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-primary/60" />
              <p className="text-sm text-ink/70 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-ink/50">
                {question.allowedImageTypes?.join(', ') || 'JPEG, PNG, WebP'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={question.allowedImageTypes?.join(',') || 'image/*'}
                multiple={question.maxImages ? question.maxImages > 1 : false}
                onChange={handleFileSelect}
                disabled={disabled}
                className="hidden"
              />
            </div>
          )}

          {answer?.imageAnswers && answer.imageAnswers.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-ink mb-2">Submitted Images:</p>
              <div className="grid grid-cols-2 gap-3">
                {answer.imageAnswers.map((img, index) => (
                  <div key={index} className="relative border border-primary/20 rounded-lg overflow-hidden">
                    <img
                      src={img.cloudinaryUrl}
                      alt={img.filename || `Image ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </CardComponent>
  );
};
