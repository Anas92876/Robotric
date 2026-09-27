import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { StudentProject, ProjectImage } from '../student/useStudentProjects';

export interface CreateProjectData {
  studentId: string;
  groupId: string;
  courseId?: string;
  ownerId: string; // Required: ID of the trainer creating the project
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  components?: string[];
  technologies?: string[];
}

export interface UpdateProjectData {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  components?: string[];
  technologies?: string[];
}

interface UseTrainerProjectsReturn {
  projects: StudentProject[];
  projectDetails: StudentProject | null;
  isLoading: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<StudentProject>;
  getGroupProjects: (groupId: string) => Promise<void>;
  uploadProjectImages: (projectId: string, images: File[]) => Promise<void>;
  deleteProjectImage: (projectId: string, imageIndex: number) => Promise<void>;
  updateProject: (projectId: string, data: UpdateProjectData) => Promise<StudentProject>;
  changeProjectStatus: (projectId: string, status: 'in_progress' | 'completed' | 'submitted') => Promise<void>;
  gradeProject: (projectId: string, grade: number, feedback?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getProjectDetails: (projectId: string) => Promise<void>;
}

export const useTrainerProjects = (): UseTrainerProjectsReturn => {
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [projectDetails, setProjectDetails] = useState<StudentProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useCallback(async (data: CreateProjectData): Promise<StudentProject> => {
    try {
      setIsLoading(true);
      setError(null);

      // Log the data being sent for debugging
      console.log('[useTrainerProjects] Creating project with data:', data);
      console.log('[useTrainerProjects] ownerId value:', data.ownerId);
      
      // Validate ownerId is present
      if (!data.ownerId) {
        throw new Error('ownerId is required but was not provided');
      }

      const response = await api.post('/trainer/projects', data);
      const newProject = response.data.data;
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create project';
      setError(errorMsg);
      console.error('[useTrainerProjects] Error creating project:', err);
      console.error('[useTrainerProjects] Error response:', err.response?.data);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupProjects = useCallback(async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/trainer/projects/group/${groupId}`);
      setProjects(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch projects';
      setError(errorMsg);
      console.error('Error fetching group projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadProjectImages = useCallback(async (projectId: string, images: File[]) => {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await api.post(`/trainer/projects/${projectId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedProject = response.data.data.project;
      setProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      if (projectDetails?._id === projectId) {
        setProjectDetails(updatedProject);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to upload images';
      setError(errorMsg);
      console.error('Error uploading images:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [projectDetails]);

  const deleteProjectImage = useCallback(async (projectId: string, imageIndex: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.delete(`/trainer/projects/${projectId}/images/${imageIndex}`);
      const updatedProject = response.data.data;
      setProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      if (projectDetails?._id === projectId) {
        setProjectDetails(updatedProject);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete image';
      setError(errorMsg);
      console.error('Error deleting image:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [projectDetails]);

  const updateProject = useCallback(async (projectId: string, data: UpdateProjectData): Promise<StudentProject> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(`/trainer/projects/${projectId}`, data);
      const updatedProject = response.data.data;
      setProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      if (projectDetails?._id === projectId) {
        setProjectDetails(updatedProject);
      }
      return updatedProject;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update project';
      setError(errorMsg);
      console.error('Error updating project:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [projectDetails]);

  const changeProjectStatus = useCallback(async (
    projectId: string,
    status: 'in_progress' | 'completed' | 'submitted'
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.patch(`/trainer/projects/${projectId}/status`, { status });
      const updatedProject = response.data.data;
      setProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      if (projectDetails?._id === projectId) {
        setProjectDetails(updatedProject);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to change project status';
      setError(errorMsg);
      console.error('Error changing project status:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [projectDetails]);

  const gradeProject = useCallback(async (projectId: string, grade: number, feedback?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(`/trainer/projects/${projectId}/grade`, {
        grade,
        feedback,
      });
      const updatedProject = response.data.data;
      setProjects(prev => prev.map(p => p._id === projectId ? updatedProject : p));
      if (projectDetails?._id === projectId) {
        setProjectDetails(updatedProject);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to grade project';
      setError(errorMsg);
      console.error('Error grading project:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [projectDetails]);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/trainer/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p._id !== projectId));
      if (projectDetails?._id === projectId) {
        setProjectDetails(null);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete project';
      setError(errorMsg);
      console.error('Error deleting project:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [projectDetails]);

  const getProjectDetails = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/trainer/projects/${projectId}`);
      setProjectDetails(response.data.data || null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch project details';
      setError(errorMsg);
      console.error('Error fetching project details:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    projects,
    projectDetails,
    isLoading,
    error,
    createProject,
    getGroupProjects,
    uploadProjectImages,
    deleteProjectImage,
    updateProject,
    changeProjectStatus,
    gradeProject,
    deleteProject,
    getProjectDetails,
  };
};
