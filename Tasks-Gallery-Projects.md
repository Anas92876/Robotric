# Tasks, Projects, and Gallery API Documentation

**Version:** 1.0.0  
**Last Updated:** 2026  
**For:** Mobile App Developers & Frontend Developers

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Tasks API](#tasks-api)
4. [Projects API](#projects-api)
5. [Gallery API](#gallery-api)
6. [Data Models](#data-models)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)
9. [Business Rules](#business-rules)

---

## Overview

This document describes three integrated systems:

- **Tasks**: Group-based assignments where trainers create tasks and students submit answers (MCQ, text, or images)
- **Projects**: Student-specific projects managed by trainers with image galleries
- **Gallery**: Group-based image gallery for moments and project showcases

All images are stored on **Cloudinary**. No video support.

### Base URLs

- **Development:** `http://localhost:4889/api`
- **Production:** `https://your-production-url.com/api`

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { /* response data */ },
  "pagination": { /* if applicable */ }
}
```

---

## Authentication

All endpoints require authentication via JWT token.

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

For file uploads:
```
Content-Type: multipart/form-data
```

### Token Storage

- **Web:** `localStorage.getItem('token')`
- **React Native:** `AsyncStorage.getItem('token')`

---

## Tasks API

### Student Endpoints

#### 1. Get My Tasks

**GET** `/api/student/tasks`

Get all tasks for the authenticated student.

**Query Parameters:**
- `status` (optional): Filter by status (`open`, `closed`)
- `courseId` (optional): Filter by course
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "task_id",
      "title": "Task Title",
      "titleAr": "عنوان المهمة",
      "description": "Task description",
      "deadline": "2024-12-31T23:59:59.000Z",
      "maxScore": 100,
      "hasQuestions": true,
      "status": "open",
      "groupId": {
        "_id": "group_id",
        "name": "Group Name"
      },
      "courseId": {
        "_id": "course_id",
        "title": "Course Title"
      },
      "createdBy": {
        "_id": "trainer_id",
        "name": "Trainer Name",
        "email": "trainer@example.com"
      },
      "submission": {
        "status": "pending_review",
        "score": null,
        "submittedAt": "2024-01-15T10:30:00.000Z",
        "isLate": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "total": 5
  }
}
```

#### 2. Get Task Details

**GET** `/api/student/tasks/:taskId`

Get detailed information about a specific task including questions and submission.

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "_id": "task_id",
      "title": "Task Title",
      "description": "Task description",
      "deadline": "2024-12-31T23:59:59.000Z",
      "maxScore": 100,
      "hasQuestions": true,
      "questions": [
        {
          "_id": "question_id",
          "questionText": "What is 2+2?",
          "questionTextAr": "ما هو 2+2؟",
          "answerType": "mcq",
          "type": "single_choice",
          "options": ["2", "3", "4", "5"],
          "points": 10,
          "order": 0,
          "required": true
        },
        {
          "_id": "question_id_2",
          "questionText": "Explain your answer",
          "answerType": "text",
          "points": 20,
          "order": 1,
          "required": false,
          "maxLength": 500
        },
        {
          "_id": "question_id_3",
          "questionText": "Upload a screenshot",
          "answerType": "image",
          "points": 15,
          "order": 2,
          "required": true,
          "maxImages": 2,
          "maxImageSize": 5
        }
      ],
      "allowLateSubmission": false,
      "status": "open"
    },
    "submission": {
      "_id": "submission_id",
      "answers": [
        {
          "questionId": "question_id",
          "answerType": "mcq",
          "selectedAnswers": [2]
        },
        {
          "questionId": "question_id_2",
          "answerType": "text",
          "textAnswer": "My explanation"
        },
        {
          "questionId": "question_id_3",
          "answerType": "image",
          "imageAnswers": [
            {
              "cloudinaryUrl": "https://res.cloudinary.com/...",
              "cloudinaryPublicId": "robotric/tasks/...",
              "filename": "screenshot.jpg",
              "size": 1024000,
              "mimeType": "image/jpeg"
            }
          ]
        }
      ],
      "status": "pending_review",
      "score": null,
      "submittedAt": "2024-01-15T10:30:00.000Z",
      "isLate": false
    }
  }
}
```

#### 3. Submit Task

**POST** `/api/student/tasks/:taskId/submit`

Submit answers for a task. Supports multipart/form-data for image uploads.

**Content-Type:** `multipart/form-data`

**Request Body:**
```
answers: JSON.stringify([
  {
    "questionId": "question_id",
    "answerType": "mcq",
    "selectedAnswers": [2]  // Array of option indices (0-based)
  },
  {
    "questionId": "question_id_2",
    "answerType": "text",
    "textAnswer": "My explanation"
  },
  {
    "questionId": "question_id_3",
    "answerType": "image",
    "imageFileIndices": [0, 1]  // Indices in the files array
  }
])
files: [File, File, ...]  // All image files
```

**Response:**
```json
{
  "success": true,
  "message": "Task submitted successfully",
  "data": {
    "_id": "submission_id",
    "taskId": "task_id",
    "studentId": "student_id",
    "answers": [ /* processed answers */ ],
    "status": "pending_review",
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "isLate": false
  }
}
```

**Answer Types:**

1. **MCQ Answer:**
   ```json
   {
     "questionId": "question_id",
     "answerType": "mcq",
     "selectedAnswers": [0, 2]  // Option indices
   }
   ```

2. **Text Answer:**
   ```json
   {
     "questionId": "question_id",
     "answerType": "text",
     "textAnswer": "My answer text"
   }
   ```

3. **Image Answer:**
   ```json
   {
     "questionId": "question_id",
     "answerType": "image",
     "imageFileIndices": [0, 1]  // Files array indices
   }
   ```

### Trainer Endpoints

#### 1. Create Task

**POST** `/api/trainer/tasks`

Create a new task for a group.

**Request Body:**
```json
{
  "groupId": "group_id",
  "courseId": "course_id",  // optional
  "title": "Task Title",
  "titleAr": "عنوان المهمة",  // optional
  "description": "Task description",
  "descriptionAr": "وصف المهمة",  // optional
  "deadline": "2024-12-31T23:59:59.000Z",
  "maxScore": 100,  // optional, default: 100
  "questions": [
    {
      "questionText": "What is 2+2?",
      "questionTextAr": "ما هو 2+2؟",  // optional
      "answerType": "mcq",
      "type": "single_choice",  // required for MCQ
      "options": ["2", "3", "4", "5"],  // required for MCQ, min 2
      "points": 10,
      "order": 0,
      "required": true
    },
    {
      "questionText": "Explain your answer",
      "answerType": "text",
      "points": 20,
      "order": 1,
      "required": false,
      "maxLength": 500  // optional
    },
    {
      "questionText": "Upload a screenshot",
      "answerType": "image",
      "points": 15,
      "order": 2,
      "required": true,
      "maxImages": 2,  // optional, default: 1
      "allowedImageTypes": ["image/jpeg", "image/png"],  // optional
      "maxImageSize": 5  // optional, in MB
    }
  ],
  "allowLateSubmission": false  // optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": { /* task object */ }
}
```

#### 2. Get Group Tasks

**GET** `/api/trainer/tasks/group/:groupId`

Get all tasks for a specific group.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [ /* array of tasks */ ]
}
```

#### 3. Update Task

**PUT** `/api/trainer/tasks/:taskId`

Update a task (only if no submissions exist).

**Request Body:** Same as create, all fields optional.

#### 4. Delete Task

**DELETE** `/api/trainer/tasks/:taskId`

Delete a task (only if no submissions exist).

#### 5. Get Task Submissions

**GET** `/api/trainer/tasks/:taskId/submissions`

Get all submissions for a task.

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "submission_id",
      "studentId": {
        "_id": "student_id",
        "name": "Student Name",
        "email": "student@example.com"
      },
      "answers": [ /* all answer types */ ],
      "status": "pending_review",
      "score": null,
      "submittedAt": "2024-01-15T10:30:00.000Z",
      "isLate": false
    }
  ]
}
```

#### 6. Grade Task Submission

**POST** `/api/trainer/tasks/:taskId/submissions/:submissionId/grade`

Grade a task submission.

**Request Body:**
```json
{
  "score": 85,  // optional, 0 to maxScore
  "feedback": "Good work!",  // optional
  "status": "graded"  // optional: "pending_review", "graded", "returned"
}
```

### CLO Endpoints

#### 1. Get All Tasks

**GET** `/api/clo/tasks`

Get all tasks with filtering and pagination.

**Query Parameters:**
- `courseId` (optional)
- `groupId` (optional)
- `status` (optional)
- `page` (optional)
- `limit` (optional)

#### 2. Get Task Details

**GET** `/api/clo/tasks/:taskId`

Get task details with all submissions.

#### 3. Get Task Results

**GET** `/api/clo/tasks/:taskId/results`

Get aggregated statistics for a task.

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_id",
    "taskTitle": "Task Title",
    "statistics": {
      "totalSubmissions": 15,
      "gradedSubmissions": 10,
      "pendingSubmissions": 5,
      "averageScore": 82.5,
      "completionRate": 75.0,
      "lateSubmissions": 2,
      "totalStudents": 20
    },
    "submissions": [ /* submission summaries */ ]
  }
}
```

---

## Projects API

### Student Endpoints

#### 1. Get My Projects

**GET** `/api/student/projects`

Get all projects for the authenticated student.

**Query Parameters:**
- `courseId` (optional)
- `status` (optional): `in_progress`, `completed`, `submitted`
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "project_id",
      "studentId": "student_id",
      "groupId": { "_id": "group_id", "name": "Group Name" },
      "courseId": { "_id": "course_id", "title": "Course Title" },
      "title": "Project Title",
      "description": "Project description",
      "images": [
        {
          "cloudinaryUrl": "https://res.cloudinary.com/...",
          "cloudinaryPublicId": "robotric/projects/...",
          "order": 0
        }
      ],
      "components": ["Component 1", "Component 2"],
      "technologies": ["React", "Node.js"],
      "status": "in_progress",
      "grade": null,
      "feedback": null,
      "createdBy": { "_id": "trainer_id", "name": "Trainer Name" }
    }
  ],
  "pagination": { /* pagination info */ }
}
```

#### 2. Get Project Details

**GET** `/api/student/projects/:projectId`

Get detailed information about a project.

### Trainer Endpoints

#### 1. Create Project

**POST** `/api/trainer/projects`

Create a new project for a student.

**Request Body:**
```json
{
  "studentId": "student_id",
  "groupId": "group_id",
  "courseId": "course_id",  // optional
  "title": "Project Title",
  "titleAr": "عنوان المشروع",  // optional
  "description": "Project description",
  "descriptionAr": "وصف المشروع",  // optional
  "components": ["Component 1", "Component 2"],  // optional
  "technologies": ["React", "Node.js"]  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": { /* project object */ }
}
```

#### 2. Get Group Projects

**GET** `/api/trainer/projects/group/:groupId`

Get all projects for a group.

#### 3. Upload Project Images

**POST** `/api/trainer/projects/:projectId/images`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
images: [File, File, ...]  // Array of image files
```

**Response:**
```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "project": { /* updated project */ },
    "uploadedImages": [ /* uploaded image objects */ ]
  }
}
```

#### 4. Delete Project Image

**DELETE** `/api/trainer/projects/:projectId/images/:imageIndex`

Delete an image by its index in the images array.

#### 5. Update Project

**PUT** `/api/trainer/projects/:projectId`

Update project details.

**Request Body:**
```json
{
  "title": "Updated Title",  // optional
  "titleAr": "عنوان محدث",  // optional
  "description": "Updated description",  // optional
  "descriptionAr": "وصف محدث",  // optional
  "components": ["New Component"],  // optional
  "technologies": ["New Tech"]  // optional
}
```

#### 6. Change Project Status

**PATCH** `/api/trainer/projects/:projectId/status`

Change project status.

**Request Body:**
```json
{
  "status": "completed"  // "in_progress", "completed", "submitted"
}
```

#### 7. Grade Project

**POST** `/api/trainer/projects/:projectId/grade`

Grade a project.

**Request Body:**
```json
{
  "grade": 95,  // optional
  "feedback": "Excellent work!"  // optional
}
```

### CLO Endpoints

#### 1. Get All Projects

**GET** `/api/clo/projects`

Get all projects with filtering and pagination.

**Query Parameters:**
- `courseId` (optional)
- `groupId` (optional)
- `status` (optional)
- `page` (optional)
- `limit` (optional)

#### 2. Get Project Details

**GET** `/api/clo/projects/:projectId`

Get detailed information about a project.

---

## Gallery API

### Student Endpoints

#### 1. Get Gallery

**GET** `/api/student/gallery`

Get gallery images from student's groups.

**Query Parameters:**
- `type` (optional): `moment`, `project`
- `courseId` (optional)
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "_id": "gallery_id",
      "groupId": { "_id": "group_id", "name": "Group Name" },
      "type": "moment",
      "cloudinaryUrl": "https://res.cloudinary.com/...",
      "thumbnailUrl": "https://res.cloudinary.com/...",
      "title": "Image Title",
      "description": "Image description",
      "uploadedBy": { "_id": "user_id", "name": "User Name" },
      "order": 0,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": { /* pagination info */ }
}
```

#### 2. Get Image Details

**GET** `/api/student/gallery/:imageId`

Get detailed information about a gallery image.

### Trainer Endpoints

#### 1. Upload Moment Image

**POST** `/api/trainer/gallery/moments`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
groupId: "group_id"
title: "Image Title"  // optional
description: "Image description"  // optional
image: File
```

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": { /* gallery object */ }
}
```

#### 2. Upload Project Image

**POST** `/api/trainer/gallery/projects`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
groupId: "group_id"
projectId: "project_id"
title: "Image Title"  // optional
description: "Image description"  // optional
image: File
```

#### 3. Get Group Gallery

**GET** `/api/trainer/gallery/group/:groupId`

Get all gallery images for a group.

#### 4. Delete Image

**DELETE** `/api/trainer/gallery/:imageId`

Delete a gallery image (only if uploaded by the trainer).

### Reception Endpoints

#### 1. Upload Moment Image

**POST** `/api/reception/gallery/moments`

Same as trainer endpoint.

#### 2. Get Group Gallery

**GET** `/api/reception/gallery/group/:groupId`

Get all gallery images for a group.

#### 3. Delete Image

**DELETE** `/api/reception/gallery/:imageId`

Delete a gallery image (only if uploaded by reception).

### CLO Endpoints

#### 1. Get All Gallery

**GET** `/api/clo/gallery`

Get all gallery images with filtering and pagination.

**Query Parameters:**
- `type` (optional): `moment`, `project`
- `courseId` (optional)
- `groupId` (optional)
- `page` (optional)
- `limit` (optional)

---

## Data Models

### Task

```typescript
interface Task {
  _id: string;
  groupId: string | Group;
  courseId?: string | Course;
  createdBy: string | User;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  deadline: Date;
  maxScore: number;
  hasQuestions: boolean;
  questions: Question[];
  allowLateSubmission: boolean;
  status: 'open' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

interface Question {
  _id: string;
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'image' | 'text';
  // For MCQ:
  type?: 'single_choice' | 'multiple_choice';
  options?: string[];
  // For all types:
  points: number;
  order: number;
  required: boolean;
  // For text:
  maxLength?: number;
  // For image:
  maxImages?: number;
  allowedImageTypes?: string[];
  maxImageSize?: number; // in MB
}
```

### TaskSubmission

```typescript
interface TaskSubmission {
  _id: string;
  taskId: string | Task;
  studentId: string | User;
  answers: Answer[];
  submittedAt: Date;
  isLate: boolean;
  status: 'not_submitted' | 'pending_review' | 'graded' | 'returned';
  score?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string | User;
  createdAt: Date;
  updatedAt: Date;
}

interface Answer {
  questionId: string;
  answerType: 'mcq' | 'image' | 'text';
  // For MCQ:
  selectedAnswers?: number[];
  // For text:
  textAnswer?: string;
  // For image:
  imageAnswers?: ImageAnswer[];
}

interface ImageAnswer {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}
```

### Project

```typescript
interface Project {
  _id: string;
  // Existing fields (inventory system):
  title: string;
  description?: string;
  ownerId: string | User;
  parts?: Part[];
  // New fields (student projects):
  studentId?: string | User;
  groupId?: string | Group;
  courseId?: string | Course;
  createdBy?: string | User;
  titleAr?: string;
  descriptionAr?: string;
  images: ProjectImage[];
  components?: string[];
  technologies?: string[];
  status?: 'in_progress' | 'completed' | 'submitted';
  grade?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string | User;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectImage {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  order: number;
}
```

### Gallery

```typescript
interface Gallery {
  _id: string;
  groupId: string | Group;
  type: 'moment' | 'project';
  uploadedBy: string | User;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  thumbnailUrl?: string;
  studentId?: string | User; // If type is 'project'
  projectId?: string | Project; // If type is 'project'
  title?: string;
  description?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request data |
| `VALIDATION_ERROR` | 400 | Validation failed |
| `GROUP_OWNERSHIP_REQUIRED` | 403 | Trainer does not own the group |
| `NOT_GROUP_MEMBER` | 403 | User is not a member of the group |
| `TASK_CLOSED` | 400 | Task is closed |
| `DEADLINE_PASSED` | 400 | Task deadline has passed |
| `SUBMISSIONS_EXIST` | 400 | Cannot modify task with existing submissions |
| `PROJECT_EXISTS` | 400 | Student already has a project |
| `INVALID_ANSWER_TYPE` | 400 | Answer type mismatch |
| `INVALID_FILE_TYPE` | 400 | File is not an image |
| `IMAGE_TOO_LARGE` | 400 | Image exceeds maximum size |
| `TOO_MANY_IMAGES` | 400 | Too many images for question |

### Error Handling Example

```typescript
try {
  const response = await api.post('/api/student/tasks/task_id/submit', formData);
  // Handle success
} catch (error) {
  if (error.response) {
    const { code, message } = error.response.data;
    switch (code) {
      case 'DEADLINE_PASSED':
        // Show deadline error
        break;
      case 'INVALID_ANSWER_TYPE':
        // Show validation error
        break;
      default:
        // Show generic error
    }
  }
}
```

---

## Code Examples

### React Native (Expo)

#### API Client Setup

```typescript
// api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4889/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

#### Get Tasks

```typescript
// api/tasks.ts
import apiClient from './client';

export const getMyTasks = async (params?: {
  status?: string;
  courseId?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await apiClient.get('/student/tasks', { params });
  return response.data;
};

export const getTaskDetails = async (taskId: string) => {
  const response = await apiClient.get(`/student/tasks/${taskId}`);
  return response.data;
};
```

#### Submit Task

```typescript
// api/tasks.ts
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export const submitTask = async (
  taskId: string,
  answers: Answer[],
  imageFiles: ImagePicker.ImagePickerAsset[]
) => {
  const formData = new FormData();

  // Add answers as JSON string
  formData.append('answers', JSON.stringify(answers));

  // Add image files
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const fileUri = file.uri;
    const fileName = fileUri.split('/').pop() || `image_${i}.jpg`;
    const fileType = file.type || 'image/jpeg';

    formData.append('files', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    } as any);
  }

  const response = await apiClient.post(
    `/student/tasks/${taskId}/submit`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// Usage
const handleSubmit = async () => {
  const answers = [
    {
      questionId: 'q1',
      answerType: 'mcq',
      selectedAnswers: [2],
    },
    {
      questionId: 'q2',
      answerType: 'text',
      textAnswer: 'My explanation',
    },
    {
      questionId: 'q3',
      answerType: 'image',
      imageFileIndices: [0, 1], // First two files
    },
  ];

  const images = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
  });

  if (!images.canceled) {
    await submitTask(taskId, answers, images.assets);
  }
};
```

#### Get Projects

```typescript
// api/projects.ts
export const getMyProjects = async (params?: {
  courseId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await apiClient.get('/student/projects', { params });
  return response.data;
};
```

#### Get Gallery

```typescript
// api/gallery.ts
export const getGallery = async (params?: {
  type?: 'moment' | 'project';
  courseId?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await apiClient.get('/student/gallery', { params });
  return response.data;
};
```

### React (Web)

#### API Client Setup

```typescript
// api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4889/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

#### Submit Task with React Query

```typescript
// hooks/useTasks.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

export const useMyTasks = (params?: {
  status?: string;
  courseId?: string;
  page?: number;
}) => {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const response = await apiClient.get('/student/tasks', { params });
      return response.data;
    },
  });
};

export const useSubmitTask = () => {
  return useMutation({
    mutationFn: async ({
      taskId,
      answers,
      files,
    }: {
      taskId: string;
      answers: Answer[];
      files: File[];
    }) => {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answers));
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiClient.post(
        `/student/tasks/${taskId}/submit`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
  });
};

// Component usage
const TaskSubmissionForm = ({ taskId }: { taskId: string }) => {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const submitMutation = useSubmitTask();

  const handleSubmit = () => {
    submitMutation.mutate({ taskId, answers, files });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

---

## Business Rules

### Tasks

1. **Creation:**
   - Only trainers can create tasks
   - Tasks are group-specific
   - MCQ questions must have at least 2 options
   - Question order must be unique

2. **Submission:**
   - Students can only submit tasks from their groups
   - All required questions must be answered
   - Deadline validation (late submissions allowed only if `allowLateSubmission` is true)
   - Image answers are uploaded to Cloudinary

3. **Grading:**
   - Only trainers can grade submissions
   - Score must be between 0 and `maxScore`

4. **Modification:**
   - Tasks cannot be updated/deleted if submissions exist

### Projects

1. **Creation:**
   - Only trainers can create projects
   - One project per student (enforced at database level)
   - Student must be in the trainer's group

2. **Images:**
   - Only trainers can upload/delete project images
   - Images are stored on Cloudinary

3. **Status:**
   - Only trainers can change project status
   - Valid transitions: `in_progress` → `completed` → `submitted`

4. **Grading:**
   - Only trainers can grade projects

### Gallery

1. **Upload:**
   - Trainers can upload moment and project images for their groups
   - Reception can upload moment images for any group
   - Images are stored on Cloudinary

2. **Access:**
   - Students can only view images from their groups
   - CLO can view all images (read-only)

3. **Deletion:**
   - Only the uploader can delete an image

### General

1. **Authentication:**
   - All endpoints require valid JWT token
   - Role-based access control enforced

2. **Pagination:**
   - Default: page 1, limit 20
   - All list endpoints support pagination

3. **Images:**
   - Maximum file size: 5MB (configurable per question)
   - Allowed types: JPEG, PNG, WebP
   - Images are automatically optimized by Cloudinary

---

## Cloudinary Integration

### Image URLs

All images are served from Cloudinary with the following structure:

```
https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}
```

### Thumbnails

Thumbnails are auto-generated by Cloudinary:

```
https://res.cloudinary.com/{cloud_name}/image/upload/w_300,h_300,c_fill/{public_id}
```

### Folder Structure

```
robotric/
├── tasks/{taskId}/submissions/{studentId}/questions/{questionId}/
├── projects/{projectId}/
└── gallery/{groupId}/
    ├── moments/
    └── projects/
```

### Image Optimization

Cloudinary automatically:
- Optimizes image format (WebP when supported)
- Adjusts quality for optimal file size
- Generates thumbnails
- Provides responsive image URLs

---

## Support

For questions or issues, contact the backend team or refer to the main API documentation.

**Last Updated:** 2024
